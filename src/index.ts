import express, { NextFunction, Request, Response } from "express";
import { prisma } from "@/db";

const app = express();
// 기본 3000. 다른 포트로 켜려면: PORT=3200 npm run dev
const port = Number(process.env.PORT ?? 3000);

// PostgreSQL integer(Int)의 최댓값. 이보다 큰 id로 찾으면 DB 에러가 나요.
const MAX_DB_INT = 2147483647;

app.use(express.json());

// URL의 :id를 숫자로 바꿔요. DB에 있을 수 없는 값(abc, 0, 너무 큰 수)이면 null
const parseId = (value: string) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > MAX_DB_INT) return null;
  return id;
};

// DB 작업은 시간이 걸려서 await로 기다려요. 그래서 핸들러가 async예요.

app.get("/memos", async (req, res) => {
  const memos = await prisma.memo.findMany({ orderBy: { id: "desc" } });
  res.json(memos);
});

app.get("/memos/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const memo =
    id === null ? null : await prisma.memo.findUnique({ where: { id } });

  if (!memo) {
    res.status(404).json({ message: "메모를 찾을 수 없습니다." });
    return;
  }

  res.json(memo);
});

app.post("/memos", async (req, res) => {
  const { userId, title, content, imageUrl } = req.body;

  if (!title || !content) {
    res.status(400).json({ message: "title과 content는 필수입니다." });
    return;
  }

  // 없는 사용자의 메모는 만들 수 없어요(외래 키). 미리 확인해서 400으로 알려 줘요.
  const authorId = userId ?? 1;
  const author =
    typeof authorId === "number" && parseId(String(authorId)) !== null
      ? await prisma.user.findUnique({ where: { id: authorId } })
      : null;
  if (!author) {
    res.status(400).json({ message: "존재하지 않는 사용자입니다." });
    return;
  }

  // id, createdAt은 DB가 자동으로 정해요.
  const newMemo = await prisma.memo.create({
    data: { userId: author.id, title, content, imageUrl: imageUrl ?? "" },
  });

  res.status(201).json(newMemo);
});

app.patch("/memos/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const memo =
    id === null ? null : await prisma.memo.findUnique({ where: { id } });

  if (!memo) {
    res.status(404).json({ message: "메모를 찾을 수 없습니다." });
    return;
  }

  // undefined인 칸은 Prisma가 건드리지 않아요 → 보낸 칸만 바뀌어요.
  const { title, content, imageUrl } = req.body;
  const updatedMemo = await prisma.memo.update({
    where: { id: memo.id },
    data: { title, content, imageUrl },
  });

  res.json(updatedMemo);
});

app.delete("/memos/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const memo =
    id === null ? null : await prisma.memo.findUnique({ where: { id } });

  if (!memo) {
    res.status(404).json({ message: "메모를 찾을 수 없습니다." });
    return;
  }

  await prisma.memo.delete({ where: { id: memo.id } });
  res.sendStatus(204);
});

// 에러 처리: 핸들러에서 예상 못 한 에러(예: DB가 꺼져 있음)가 나면 여기로 와요.
// Express 5는 async 핸들러의 에러도 자동으로 여기로 보내 줘요.
// 맨 마지막에 두어야 하고, 인자가 4개여야 에러 처리용으로 인식돼요.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "서버에 문제가 생겼습니다." });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
