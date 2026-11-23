import express from "express";
import { FAKE_MEMOS } from "./fake-database";

const app = express();
const port = 3000;

app.get("/memos", (req, res) => {
  res.json(FAKE_MEMOS);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
