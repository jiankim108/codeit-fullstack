// 서비스: 실제 일(DB 작업)을 하는 곳이에요.
// 요청(req)이나 응답(res)은 모르고, 받은 값으로 일만 해요.
import { prisma } from "@/db";
import { hashPassword, verifyPassword } from "@/password";
import { toDateString } from "@/memo-response";
import { createAccessToken, readValidToken } from "@/token";

export type LoginInput = {
  email: string;
  password: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  username: string;
};

// 사용자를 만들어요. 이미 가입된 이메일이면 null을 돌려줘요.
// 비밀번호는 bcrypt로 암호화해서 저장해요. (DB에는 원래 비밀번호가 남지 않아요.)
export const createUser = async ({
  email,
  password,
  username,
}: SignUpInput) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return null;
  }

  return prisma.user.create({
    data: { email, password: await hashPassword(password), username },
    // 비밀번호는 돌려주지 않아요.
    select: { id: true, email: true, username: true, createdAt: true },
  });
};

// 로그인: 이메일과 비밀번호가 맞으면 JWT 액세스 토큰 1개를 돌려줘요. 틀리면 null.
// 이메일이 없는지, 비밀번호가 틀렸는지는 구분하지 않아요. (어느 쪽인지 알려 주면 가입된 이메일을 알아낼 수 있어요.)
export const login = async ({ email, password }: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email } });
  // DB에는 암호화된 비밀번호가 있어서 ===로 비교할 수 없어요. bcrypt로 비교해요.
  if (!user || !(await verifyPassword(password, user.password))) {
    return null;
  }

  // JWT 액세스 토큰 1개 (15초 뒤 만료)
  return createAccessToken(user.id);
};

// 내 정보: 토큰이 올바르면 그 사용자의 정보(비밀번호 제외)를 돌려줘요.
// 토큰이 위조됐거나, 망가졌거나, 만료됐거나, 사용자가 없으면 null.
export const getMe = async (token: string) => {
  const payload = readValidToken(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, username: true, createdAt: true },
  });
  if (!user) {
    return null;
  }

  return { ...user, createdAt: toDateString(user.createdAt) };
};
