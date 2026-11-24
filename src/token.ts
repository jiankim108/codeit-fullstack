// 로그인 토큰 (JWT 액세스 토큰)
// JWT = "헤더.내용.서명" 세 부분으로 된 문자열이에요.
// - 내용(payload)에는 userId와 만료 시각(exp)이 들어 있어요. 누구나 읽을 수 있으니 비밀번호 같은 건 넣지 않아요.
// - 서명은 서버만 아는 JWT_SECRET으로 만들어서, 내용을 바꾸면 검증에 실패해요(위조 방지).
import "dotenv/config";
import jwt from "jsonwebtoken";

// 연습용으로 아주 짧게 15초. 실제 서비스는 보통 15분~1시간이에요.
const ACCESS_TOKEN_EXPIRES_IN = "15s";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      ".env에 JWT_SECRET이 없어요. .env.example을 참고해 주세요.",
    );
  }
  return secret;
};

type TokenPayload = {
  userId: number;
};

// 액세스 토큰 1개를 만들어요. 만료 시각(exp)은 jsonwebtoken이 넣어 줘요.
export const createAccessToken = (userId: number) => {
  const payload: TokenPayload = { userId };
  return jwt.sign(payload, getSecret(), {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
};

// 토큰을 검증해요. 서명이 틀렸거나(위조), 망가졌거나, 만료됐으면 null
export const readValidToken = (token: string): TokenPayload | null => {
  try {
    const payload = jwt.verify(token, getSecret());
    if (typeof payload === "string" || typeof payload.userId !== "number") {
      return null;
    }
    return { userId: payload.userId };
  } catch {
    return null;
  }
};
