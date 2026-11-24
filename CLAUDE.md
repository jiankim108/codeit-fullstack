# CLAUDE.md

Express 5 + TypeScript 백엔드 프로젝트 (메모 서비스).
프론트(`codeit-it-5-frontend-master`, http://localhost:3000)가 이 서버의 API를 사용한다.

## 명령어

- `npm run dev` — tsx watch로 개발 서버 실행 (http://localhost:3002, `PORT`로 변경 가능)
- `npm run build` — `tsc && tsc-alias`로 `dist/`에 빌드
- `npm start` — 빌드 결과(`dist/index.js`) 실행
- `npm run typecheck` — 타입 검사만 수행
- `npm run format` / `npm run format:check` — Prettier 포맷 적용 / 검사
- `npm run db:migrate` — `prisma/schema.prisma` 변경을 DB에 반영 (마이그레이션 생성)
- `npm run db:seed` — `fake-database.ts` 데이터로 DB 초기화
- `npm run db:reset` — DB를 비우고 마이그레이션 + 시드 다시 실행
- `npm run db:studio` — 브라우저에서 DB 보기/수정

작업을 마치면 `npm run typecheck`와 `npm run format:check`가 통과하는지 확인한다.

## 구조

- `src/index.ts` — 앱 진입점, 모든 라우트 (`/memos`, `/signup`, `/login`, `/me`). CORS 화이트리스트(`ALLOWED_ORIGINS`)도 여기 있다.
- `src/types.ts` — 공용 타입 (`UserType`, `MemoRecordType`, `MemoType`, `MemoPageType`, `ErrorResponseType` 등)
- `src/memo-response.ts` — DB 메모 → 응답 모양 변환 (`createdAt`은 로컬 시간 문자열 `YYYY-MM-DDTHH:mm:ss`, `username` 포함)
- `src/token.ts` — 연습용 로그인 토큰 (서명 없는 base64)
- `src/db.ts` — Prisma 클라이언트 (`prisma`). PostgreSQL 접속 주소는 `.env`의 `DATABASE_URL` (`.env.example` 참고)
- `src/fake-database.ts` — 시드용 데이터 (`FAKE_USERS`, `FAKE_MEMOS`). `prisma/seed.ts`가 DB에 넣는다.
- `src/generated/prisma/` — Prisma가 생성하는 코드. 직접 수정하지 않고 git에도 올리지 않는다 (`npm install` 시 `prisma generate`로 생성).
- `prisma/schema.prisma` — DB 모델 (`User`, `Memo`), `prisma/migrations/` — 마이그레이션 기록

## 코드 규칙

- ES Modules (`"type": "module"`). `require` 대신 `import` 사용.
- `src/` 내부 import는 `@/` 별칭을 사용한다 (`import { UserType } from "@/types"`).
- import에 확장자를 붙이지 않는다. `moduleResolution: "Bundler"`라서 생략 가능하며, 빌드 시 `tsc-alias`(`resolveFullPaths`)가 `@/`와 확장자를 상대 경로 `.js`로 바꿔 준다. `tsc`만 단독으로 실행한 빌드 결과는 Node에서 동작하지 않는다.
- `strict` 모드. `any` 사용을 피한다.
- 에러 응답은 항상 `{ type, message }` 모양 (`sendError` 사용). 프론트 axios 인터셉터가 `type`으로 에러를 구분한다.
- 포맷은 Prettier 설정(`.prettierrc`)을 따른다: 큰따옴표, 세미콜론, trailing comma `all`, 2칸 들여쓰기.
