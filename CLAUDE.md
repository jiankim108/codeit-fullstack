# CLAUDE.md

Express 5 + TypeScript 백엔드 프로젝트 (메모 서비스).

## 명령어

- `npm run dev` — tsx watch로 개발 서버 실행 (http://localhost:3000)
- `npm run build` — `tsc && tsc-alias`로 `dist/`에 빌드
- `npm start` — 빌드 결과(`dist/index.js`) 실행
- `npm run typecheck` — 타입 검사만 수행
- `npm run format` / `npm run format:check` — Prettier 포맷 적용 / 검사

작업을 마치면 `npm run typecheck`와 `npm run format:check`가 통과하는지 확인한다.

## 구조

- `src/index.ts` — 앱 진입점
- `src/types.ts` — 공용 타입 (`UserType`, `MemoRecordType`)
- `src/fake-database.ts` — 인메모리 가짜 데이터 (`FAKE_USERS`, `FAKE_MEMOS`). 실제 DB 없음.

## 코드 규칙

- ES Modules (`"type": "module"`). `require` 대신 `import` 사용.
- `src/` 내부 import는 `@/` 별칭을 사용한다 (`import { UserType } from "@/types"`).
- import에 확장자를 붙이지 않는다. `moduleResolution: "Bundler"`라서 생략 가능하며, 빌드 시 `tsc-alias`(`resolveFullPaths`)가 `@/`와 확장자를 상대 경로 `.js`로 바꿔 준다. `tsc`만 단독으로 실행한 빌드 결과는 Node에서 동작하지 않는다.
- `strict` 모드. `any` 사용을 피한다.
- 포맷은 Prettier 설정(`.prettierrc`)을 따른다: 큰따옴표, 세미콜론, trailing comma `all`, 2칸 들여쓰기.
