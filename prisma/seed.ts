// 처음 데이터 넣기 (시드)
// 실행: npm run db:seed  (npm run db:reset 할 때도 자동으로 실행돼요)
// src/fake-database.ts의 사용자와 메모를 DB에 넣어요.
import { prisma } from "../src/db";
import { FAKE_MEMOS, FAKE_USERS } from "../src/fake-database";
import { hashPassword } from "../src/password";

const main = async () => {
  // 지우고 다시 넣어요. 메모가 사용자를 가리키니까 메모부터 지워요.
  await prisma.memo.deleteMany();
  await prisma.user.deleteMany();

  // 시드 사용자 비밀번호도 암호화해서 넣어야 로그인할 수 있어요.
  await prisma.user.createMany({
    data: await Promise.all(
      FAKE_USERS.map(async (user) => ({
        ...user,
        password: await hashPassword(user.password),
        createdAt: new Date(user.createdAt),
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
