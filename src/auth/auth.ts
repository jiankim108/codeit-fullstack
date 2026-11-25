// Better Auth 설정
// 회원가입, 로그인, 로그아웃, 세션(로그인 상태) 관리를 Better Auth가 대신 해 줘요.
// - index.ts에서 /api/auth/* 주소로 연결해요. (예: POST /api/auth/sign-in/email)
// - 로그인하면 브라우저 쿠키에 세션 토큰이 저장돼요. 프론트는 토큰을 직접 다루지 않아요.
import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { ALLOWED_ORIGINS } from "@/cors";
import { prisma } from "@/db";
import { hashPassword, verifyPassword } from "@/password";

// 프론트(lib/sign-up-schema.ts)와 같은 규칙이에요.
const MIN_PASSWORD_LENGTH = 8;
const MAX_USERNAME_LENGTH = 5;
const PASSWORD_RULES = [
  {
    pattern: /[a-z]/,
    message: "비밀번호에 영문 소문자를 1개 이상 넣어 주세요.",
  },
  {
    pattern: /[A-Z]/,
    message: "비밀번호에 영문 대문자를 1개 이상 넣어 주세요.",
  },
  {
    pattern: /[!-/:-@[-`{-~]/,
    message: "비밀번호에 특수문자를 1개 이상 넣어 주세요.",
  },
];

const validationError = (message: string) =>
  new APIError("BAD_REQUEST", { code: "VALIDATION_ERROR", message });

export const auth = betterAuth({
  // 세션 쿠키 서명에 쓰는 비밀 키와 이 서버의 주소 (.env.example 참고)
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3002",
  // 이 출처(프론트)에서 온 요청만 받아요. CORS 화이트리스트와 같은 목록이에요.
  trustedOrigins: ALLOWED_ORIGINS,

  database: prismaAdapter(prisma, { provider: "postgresql" }),

  advanced: {
    database: {
      // id를 Better Auth가 만들지 않고 DB의 자동 증가 번호(1, 2, 3...)를 써요.
      // 그래서 Memo.userId(Int)와 그대로 연결돼요.
      generateId: "serial",
    },
  },

  user: {
    // Better Auth의 name 칸을 우리 DB의 username 칸에 저장해요.
    fields: { name: "username" },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    // 회원가입하면 바로 로그인돼요.
    autoSignIn: true,
    // 기존 사용자 비밀번호가 bcrypt로 저장돼 있어서, Better Auth도 bcrypt를 쓰게 해요.
    // (Better Auth 기본값은 scrypt예요.)
    password: {
      hash: hashPassword,
      verify: ({ hash, password }) => verifyPassword(password, hash),
    },
  },

  // 회원가입 요청이 Better Auth에 들어가기 전에 우리 규칙으로 한 번 더 검사해요.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;

      const { password, name } = (ctx.body ?? {}) as {
        password?: unknown;
        name?: unknown;
      };

      if (typeof password === "string") {
        const brokenRule = PASSWORD_RULES.find(
          (rule) => !rule.pattern.test(password),
        );
        if (brokenRule) throw validationError(brokenRule.message);
      }

      if (typeof name !== "string" || name.trim() === "") {
        throw validationError("유저네임을 입력해 주세요.");
      }
      if (name.length > MAX_USERNAME_LENGTH) {
        throw validationError(
          `유저네임은 ${MAX_USERNAME_LENGTH}자 이하로 입력해 주세요.`,
        );
      }
    }),
  },
});
