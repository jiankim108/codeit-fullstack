// 데이터베이스 연결 (PostgreSQL + Prisma)
// - 접속 주소는 .env의 DATABASE_URL에서 읽어요.
// - 데이터는 PostgreSQL에 저장돼서 서버를 다시 켜도 남아 있어요.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7은 "어댑터"로 DB에 연결해요. PostgreSQL은 PrismaPg를 써요.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
