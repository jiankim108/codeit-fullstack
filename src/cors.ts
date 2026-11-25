// CORS 화이트리스트: 이 서버에 요청을 보낼 수 있는 프론트 주소(출처)
// 프론트(3000)와 이 서버(3002)는 포트가 달라서 "다른 출처"예요.
// 여기 없는 출처에서 온 요청은 브라우저가 응답을 막아요(CORS 에러).
// Better Auth의 trustedOrigins(src/auth/auth.ts)도 이 목록을 같이 써요.
export const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];
