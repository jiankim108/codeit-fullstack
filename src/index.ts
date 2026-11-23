import express from "express";
import { FAKE_MEMOS } from "@/fake-database";
import { MemoRecordType } from "@/types";

const app = express();
const port = 3000;

app.use(express.json());

app.get("/memos", (req, res) => {
  res.json(FAKE_MEMOS);
});

app.get("/memos/:id", (req, res) => {
  const id = Number(req.params.id);
  const memo = FAKE_MEMOS.find((memo) => memo.id === id);

  if (!memo) {
    res.status(404).json({ message: "메모를 찾을 수 없습니다." });
    return;
  }

  res.json(memo);
});

app.post("/memos", (req, res) => {
  const { userId, title, content, imageUrl } = req.body;

  if (!title || !content) {
    res.status(400).json({ message: "title과 content는 필수입니다." });
    return;
  }

  const newMemo: MemoRecordType = {
    id: Math.max(0, ...FAKE_MEMOS.map((memo) => memo.id)) + 1,
    userId: userId ?? 1,
    title,
    content,
    imageUrl: imageUrl ?? "",
    createdAt: new Date().toISOString(),
  };

  FAKE_MEMOS.unshift(newMemo);
  res.status(201).json(newMemo);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
