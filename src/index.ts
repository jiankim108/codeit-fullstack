import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { prisma } from "@/db";
import { toDateString, toMemoResponse, withUsername } from "@/memo-response";
import { createToken, readValidToken } from "@/token";
import { ErrorType } from "@/types";

const app = express();
// 기본 3002. (3000은 프론트 Next.js, 3001은 프론트 프로젝트 안의 예전 서버)
// 다른 포트로 켜려면: PORT=3200 npm run dev
const port = Number(process.env.PORT ?? 3002);

// PostgreSQL integer(Int)의 최댓값. 이보다 큰 id로 찾으면 DB 에러가 나요.
const MAX_DB_INT = 2147483647;
// 메모 목록 한 페이지에 보여 줄 개수
const MEMO_LIMIT = 15;
const TOKEN_EXPIRES_IN_MS = 24 * 60 * 60 * 1000; // 하루

// CORS 화이트리스트: 이 서버에 요청을 보낼 수 있는 프론트 주소(출처)
// 프론트(3000)와 이 서버(3002)는 포트가 달라서 "다른 출처"예요.
// 여기 없는 출처에서 온 요청은 브라우저가 응답을 막아요(CORS 에러).
const ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // origin이 없으면 브라우저가 아닌 요청이에요(curl, Postman 등) → 허용
      if (origin === undefined || ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`CORS 차단: ${origin} 은(는) 화이트리스트에 없어요.`);
      callback(null, false);
    },
  }),
);
app.use(express.json());

// 에러 응답은 항상 { type, message } 모양으로 보내요.
const sendError = (
  res: Response,
  status: number,
  type: ErrorType,
  message: string,
) => {
  res.status(status).json({ type, message });
};

// 숫자로 바꿔요. DB에 있을 수 없는 값(abc, 0, 너무 큰 수)이면 null
const parseId = (value: unknown) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > MAX_DB_INT) return null;
  return id;
};

const isFilledString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

// DB 작업은 시간이 걸려서 await로 기다려요. 그래서 핸들러가 async예요.

// ---------------------------------------------------------------------------
// 메모
// ---------------------------------------------------------------------------

// GET /memos?cursor=86 → 메모 15개씩 (커서 기반 페이지네이션)
// cursor가 없으면 최신 메모부터, 있으면 그 id보다 작은(더 오래된) 메모부터
app.get("/memos", async (req, res) => {
  const cursor =
    req.query.cursor === undefined ? null : parseId(req.query.cursor);
  if (req.query.cursor !== undefined && cursor === null) {
    return sendError(res, 400, "VALIDATION_ERROR", "cursor가 올바르지 않아요.");
  }

  // 다음 페이지가 있는지 알려고 1개 더 가져와요.
  const rows = await prisma.memo.findMany({
    ...withUsername,
    where: cursor === null ? {} : { id: { lt: cursor } },
    orderBy: { id: "desc" },
    take: MEMO_LIMIT + 1,
  });

  const memos = rows.slice(0, MEMO_LIMIT);
  const hasNext = rows.length > MEMO_LIMIT;

  res.json({
    memos: memos.map(toMemoResponse),
    nextCursor: hasNext ? memos[memos.length - 1].id : null,
  });
});

// GET /memos/100 → 메모 하나 (없으면 404 NOT_FOUND)
app.get("/memos/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const memo =
    id === null
      ? null
      : await prisma.memo.findUnique({ ...withUsername, where: { id } });

  if (!memo) {
    return sendError(res, 404, "NOT_FOUND", "메모를 찾을 수 없어요.");
  }

  res.json(toMemoResponse(memo));
});

// POST /memos  body: { userId, title, content, imageUrl } → 메모 생성
app.post("/memos", async (req, res) => {
  const { userId, title, content, imageUrl } = req.body ?? {};

  if (!isFilledString(title) || !isFilledString(content)) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "제목과 내용을 입력해 주세요.",
    );
  }

  // 없는 사용자의 메모는 만들 수 없어요(외래 키). 미리 확인해서 400으로 알려 줘요.
  const authorId = parseId(userId ?? 1);
  const author =
    authorId === null
      ? null
      : await prisma.user.findUnique({ where: { id: authorId } });
  if (!author) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "작성자 정보가 올바르지 않아요.",
    );
  }

  // id, createdAt은 DB가 자동으로 정해요.
  const newMemo = await prisma.memo.create({
    ...withUsername,
    data: {
      userId: author.id,
      title,
      content,
      imageUrl: typeof imageUrl === "string" ? imageUrl : "",
    },
  });

  res.status(201).json(toMemoResponse(newMemo));
});

// PATCH /memos/100  body: { title?, content?, imageUrl? } → 보낸 칸만 수정
app.patch("/memos/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const memo =
    id === null ? null : await prisma.memo.findUnique({ where: { id } });

  if (!memo) {
    return sendError(res, 404, "NOT_FOUND", "메모를 찾을 수 없어요.");
  }

  // undefined인 칸은 Prisma가 건드리지 않아요 → 보낸 칸만 바뀌어요.
  const { title, content, imageUrl } = req.body ?? {};
  const updatedMemo = await prisma.memo.update({
    ...withUsername,
    where: { id: memo.id },
    data: { title, content, imageUrl },
  });

  res.json(toMemoResponse(updatedMemo));
});

// DELETE /memos/100 → 삭제 (204: 성공, 돌려줄 내용 없음)
app.delete("/memos/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const memo =
    id === null ? null : await prisma.memo.findUnique({ where: { id } });

  if (!memo) {
    return sendError(res, 404, "NOT_FOUND", "메모를 찾을 수 없어요.");
  }

  await prisma.memo.delete({ where: { id: memo.id } });
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// 인증
// ---------------------------------------------------------------------------

// POST /signup  body: { email, password, username } → 회원가입 (201)
app.post("/signup", async (req, res) => {
  const { email, password, username } = req.body ?? {};
  if (
    !isFilledString(email) ||
    !isFilledString(password) ||
    !isFilledString(username)
  ) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "이메일, 비밀번호, 이름을 모두 입력해 주세요.",
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return sendError(res, 409, "DUPLICATE_EMAIL", "이미 가입된 이메일이에요.");
  }

  await prisma.user.create({ data: { email, password, username } });
  res.sendStatus(201);
});

// POST /login  body: { email, password } → { token }
app.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!isFilledString(email) || !isFilledString(password)) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "이메일과 비밀번호를 입력해 주세요.",
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.password !== password) {
    return sendError(
      res,
      401,
      "LOGIN_FAILED",
      "이메일 또는 비밀번호가 맞지 않아요.",
    );
  }

  const expiresAt = new Date(Date.now() + TOKEN_EXPIRES_IN_MS);
  res.json({ token: createToken(user.id, expiresAt) });
});

// GET /me  header: Authorization: Bearer <token> → 내 정보 (비밀번호 제외)
app.get("/me", async (req, res) => {
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  // 토큰 안의 userId가 DB에 있을 수 없는 값이면(예: 다른 서버에서 받은 토큰) 로그인 안 된 것으로 봐요.
  const userId = parseId(readValidToken(token)?.userId);

  const user =
    userId === null
      ? null
      : await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, username: true, createdAt: true },
        });
  if (!user) {
    return sendError(res, 401, "UNAUTHORIZED", "로그인이 필요해요.");
  }

  res.json({ ...user, createdAt: toDateString(user.createdAt) });
});

// 에러 처리: 핸들러에서 예상 못 한 에러(예: DB가 꺼져 있음)가 나면 여기로 와요.
// Express 5는 async 핸들러의 에러도 자동으로 여기로 보내 줘요.
// 맨 마지막에 두어야 하고, 인자가 4개여야 에러 처리용으로 인식돼요.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  sendError(res, 500, "SERVER_ERROR", "서버에 문제가 생겼어요.");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
