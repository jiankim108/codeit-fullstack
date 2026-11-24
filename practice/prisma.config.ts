// 연습용 Prisma 설정 파일
// 진짜 DB(codeit_backend_live) 대신 연습용 DB(codeit_practice)에 연결해요.
// 그래서 여기서 마음껏 만들고 지워도 앱 데이터는 안전해요.
// 경로는 이 파일(practice/) 기준이에요.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
  },
  datasource: {
    url: process.env["PRACTICE_DATABASE_URL"],
  },
});
