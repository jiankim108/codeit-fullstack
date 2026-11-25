// 처음 데이터 넣기 (시드)
// 실행: npm run db:seed  (npm run db:reset 할 때도 자동으로 실행돼요)
// src/fake-database.ts의 사용자와 메모를 DB에 넣어요.
import { prisma } from "../src/db";
import { FAKE_MEMOS, FAKE_USERS } from "../src/fake-database";
import { hashPassword } from "../src/password";

const main = async () => {
  // 지우고 다시 넣어요. 메모·세션·계정이 사용자를 가리키니까 그것들부터 지워요.
  await prisma.memo.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // 사용자 정보는 User에, 비밀번호는 Account에 넣어요. (Better Auth 방식)
  // 비밀번호는 암호화(bcrypt)해서 넣어야 로그인할 수 있어요.
  await prisma.user.createMany({
    data: FAKE_USERS.map(({ password: _password, ...user }) => ({
      ...user,
      createdAt: new Date(user.createdAt),
    })),
  });
  await prisma.account.createMany({
    data: await Promise.all(
      FAKE_USERS.map(async (user) => ({
        userId: user.id,
        accountId: String(user.id),
        providerId: "credential", // 이메일+비밀번호 로그인
        password: await hashPassword(user.password),
      })),
    ),
  });
  await prisma.memo.createMany({
    data: FAKE_MEMOS.map((memo) => ({
      ...memo,
      createdAt: new Date(memo.createdAt),
    })),
  });

  // id를 직접 넣었으니 자동 증가 번호를 가장 큰 id 다음으로 맞춰요.
  // (안 그러면 다음에 만드는 메모가 id 1을 받으려다 "이미 있는 id" 에러가 나요.)
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"User"', 'id'), (SELECT MAX(id) FROM "User"))`;
  await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Memo"', 'id'), (SELECT MAX(id) FROM "Memo"))`;

  console.log(
    `시드 완료: 사용자 ${FAKE_USERS.length}명, 메모 ${FAKE_MEMOS.length}개`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
