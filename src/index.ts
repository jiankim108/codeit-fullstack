import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@/auth/auth";
import { getUserId, requireAuth } from "@/auth/require-auth";
import { ALLOWED_ORIGINS } from "@/cors";
import { prisma } from "@/db";
import { isFilledString, sendError } from "@/http";
import { toMemoResponse, withUsername } from "@/memo-response";

const app = express();
// 기본 3002. (3000은 프론트 Next.js, 3001은 프론트 프로젝트 안의 예전 서버)
// 다른 포트로 켜려면: PORT=3200 npm run dev
const port = Number(process.env.PORT ?? 3002);

// PostgreSQL integer(Int)의 최댓값. 이보다 큰 id로 찾으면 DB 에러가 나요.
const MAX_DB_INT = 2147483647;
// 메모 목록 한 페이지에 보여 줄 개수
const MEMO_LIMIT = 15;

// CORS 화이트리스트(ALLOWED_ORIGINS)는 src/cors.ts에 있어요.
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
    // 다른 출처(프론트)에서 쿠키를 주고받으려면 필요해요. 로그인 세션이 쿠키에 있어요.
    credentials: true,
  }),
);

// /api/auth/* 요청(회원가입, 로그인, 로그아웃, 세션 확인)은 Better Auth가 처리해요.
// ⚠️ express.json()보다 먼저 연결해야 해요. Better Auth가 요청 본문을 직접 읽어요.
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// 숫자로 바꿔요. DB에 있을 수 없는 값(abc, 0, 너무 큰 수)이면 null
const parseId = (value: unknown) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > MAX_DB_INT) return null;
  return id;
};

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

// POST /memos  body: { title, content, imageUrl } → 메모 생성 (로그인 필요)
// 작성자는 body가 아니라 로그인한 사용자(세션)로 정해요. 다른 사람 이름으로 쓸 수 없어요.
app.post("/memos", requireAuth, async (req, res) => {
  const { title, content, imageUrl } = req.body ?? {};

  if (!isFilledString(title) || !isFilledString(content)) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "제목과 내용을 입력해 주세요.",
    );
  }

  // id, createdAt은 DB가 자동으로 정해요.
  const newMemo = await prisma.memo.create({
    ...withUsername,
    data: {
      userId: getUserId(res),
      title,
      content,
      imageUrl: typeof imageUrl === "string" ? imageUrl : "",
    },
  });

  res.status(201).json(toMemoResponse(newMemo));
});

// PATCH /memos/100  body: { title?, content?, imageUrl? } → 보낸 칸만 수정 (작성자만)
app.patch("/memos/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  const memo =
    id === null ? null : await prisma.memo.findUnique({ where: { id } });

  if (!memo) {
    return sendError(res, 404, "NOT_FOUND", "메모를 찾을 수 없어요.");
  }
  if (memo.userId !== getUserId(res)) {
    return sendError(res, 403, "FORBIDDEN", "내가 쓴 메모만 수정할 수 있어요.");
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

// DELETE /memos/100 → 삭제 (204: 성공, 돌려줄 내용 없음) (작성자만)
app.delete("/memos/:id", requireAuth, async (req, res) => {
  const id = parseId(req.params.id);
  const memo =
    id === null ? null : await prisma.memo.findUnique({ where: { id } });

  if (!memo) {
    return sendError(res, 404, "NOT_FOUND", "메모를 찾을 수 없어요.");
  }
  if (memo.userId !== getUserId(res)) {
    return sendError(res, 403, "FORBIDDEN", "내가 쓴 메모만 삭제할 수 있어요.");
  }

  await prisma.memo.delete({ where: { id: memo.id } });
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// 인증
// ---------------------------------------------------------------------------

// Better Auth가 만들어 주는 주소 (설정: src/auth/auth.ts)
// - POST /api/auth/sign-up/email  body: { email, password, name } → 회원가입 + 바로 로그인
// - POST /api/auth/sign-in/email  body: { email, password }       → 로그인 (세션 쿠키 발급)
// - POST /api/auth/sign-out                                       → 로그아웃
// - GET  /api/auth/get-session                                    → 내 정보 + 세션 (로그인 안 했으면 null)

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
