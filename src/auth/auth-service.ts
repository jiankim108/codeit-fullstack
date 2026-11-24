// 서비스: 실제 일(DB 작업)을 하는 곳이에요.
// 요청(req)이나 응답(res)은 모르고, 받은 값으로 일만 해요.
import { prisma } from "@/db";
import { hashPassword } from "@/password";

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
