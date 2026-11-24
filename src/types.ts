export type UserType = {
  id: number;
  email: string;
  password: string;
  username: string;
  createdAt: string;
};

export type MemoRecordType = {
  id: number;
  userId: number;
  title: string;
  content: string;
  imageUrl: string;
  createdAt: string;
};

// 프론트에 보내는 메모 모양 (작성자 이름 포함)
export type MemoType = MemoRecordType & {
  username: string;
};

// GET /memos 응답: 메모 15개 + 다음 페이지를 불러올 때 쓸 커서
export type MemoPageType = {
  memos: MemoType[];
  nextCursor: number | null;
};

// 비밀번호를 뺀 사용자 정보 (GET /me 응답)
export type PublicUserType = Omit<UserType, "password">;

// 에러 응답은 항상 { type, message } 모양이에요.
// 프론트는 type을 보고 어떤 에러인지 구분해요.
export type ErrorType =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DUPLICATE_EMAIL"
  | "LOGIN_FAILED"
  | "UNAUTHORIZED"
  | "SERVER_ERROR";

export type ErrorResponseType = {
  type: ErrorType;
  message: string;
};
