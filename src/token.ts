// 로그인 토큰 (연습용)
// { userId, exp(만료 시각) }를 JSON으로 만들어 base64로 바꾼 문자열이에요.
// ⚠️ 서명이 없어서 누구나 위조할 수 있어요. 실제 서비스에서는 JWT처럼 서명된 토큰을 써야 해요.
type TokenPayload = {
  userId: number;
  exp: number;
};

export const createToken = (userId: number, expiresAt: Date) => {
  const payload: TokenPayload = { userId, exp: expiresAt.getTime() };
  return btoa(JSON.stringify(payload));
};

// 토큰을 읽어서, 망가졌거나 만료됐으면 null
export const readValidToken = (token: string): TokenPayload | null => {
  try {
    const payload: TokenPayload = JSON.parse(atob(token));
    if (typeof payload.userId !== "number" || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};
