// Prisma 설정 파일 (prisma CLI가 읽어요)
// .env의 DATABASE_URL로 DB에 접속해요.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // npm run db:seed (또는 db:reset) 때 실행할 명령
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
