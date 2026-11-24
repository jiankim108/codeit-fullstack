# 연습용 스키마 정답

먼저 직접 써 보고, 막혔을 때만 열어 보세요. 🙂

## 미션 1: Memo 모델

```prisma
model Memo {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  imageUrl  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

`npm run practice:migrate` 후 `practice/migrations/…/migration.sql`을 열어 보면
Prisma가 대신 써 준 SQL을 볼 수 있어요.

```sql
CREATE TABLE "Memo" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memo_pkey" PRIMARY KEY ("id")
);
```

- `Int @id @default(autoincrement())` → `SERIAL` + `PRIMARY KEY`
- `String` → `TEXT NOT NULL`, `String?` → `TEXT` (NULL 허용)
- `@updatedAt`은 DB가 아니라 Prisma가 수정할 때마다 값을 넣어 줘서 SQL에는 DEFAULT가 없어요.

## 미션 2: User와 연결하기

```prisma
model User {
  id       Int    @id @default(autoincrement())
  email    String @unique
  username String

  memos Memo[] // 이 사용자가 쓴 메모들 (DB에 칸이 생기지는 않아요)
}

model Memo {
  id        Int      @id @default(autoincrement())
  title     String
  content   String
  imageUrl  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId Int // 실제로 DB에 생기는 칸 (외래 키)
  user   User @relation(fields: [userId], references: [id])
}
```

> 미션 1의 테이블에 데이터가 있는 상태에서 `userId`(필수 칸)를 추가하면,
> 기존 메모에 넣을 값이 없어서 Prisma가 DB를 초기화할지 물어봐요.
> 연습용 DB니까 초기화해도 괜찮아요.
