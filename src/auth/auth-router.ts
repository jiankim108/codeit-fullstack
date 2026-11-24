// 라우터: 요청이 올바른지 검사하고, 문제가 없으면 서비스에 일을 맡겨요.
// index.ts에서 app.use("/auth", authRouter)로 연결해서 주소 앞에 /auth가 붙어요.
import { Router } from "express";
import { createUser, getMe, login } from "@/auth/auth-service";
import { isFilledString, sendError } from "@/http";

// 프론트(lib/sign-up-schema.ts)와 같은 규칙이에요.
const MAX_USERNAME_LENGTH = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULES = [
  {
    pattern: /[a-z]/,
    message: "비밀번호에 영문 소문자를 1개 이상 넣어 주세요.",
  },
  {
    pattern: /[A-Z]/,
    message: "비밀번호에 영문 대문자를 1개 이상 넣어 주세요.",
  },
  {
    pattern: /[!-/:-@[-`{-~]/,
    message: "비밀번호에 특수문자를 1개 이상 넣어 주세요.",
  },
];

export const authRouter = Router();

// POST /auth/signup  body: { email, password, username } → 회원가입 (201)
authRouter.post("/signup", async (req, res) => {
  const { email, password, username } = req.body ?? {};

  // 1. 세 칸이 모두 글자로 왔는지
  if (
    !isFilledString(email) ||
    !isFilledString(password) ||
    !isFilledString(username)
  ) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "이메일, 비밀번호, 이름을 모두 입력해 주세요.",
    );
  }

  // 2. 이메일 형식
  if (!EMAIL_PATTERN.test(email)) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "올바른 이메일 형식으로 입력해 주세요.",
    );
  }

  // 3. 비밀번호 규칙
  const brokenRule = PASSWORD_RULES.find(
    (rule) => !rule.pattern.test(password),
  );
  if (brokenRule) {
    return sendError(res, 400, "VALIDATION_ERROR", brokenRule.message);
  }

  // 4. 유저네임 길이
  if (username.length > MAX_USERNAME_LENGTH) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      `유저네임은 ${MAX_USERNAME_LENGTH}자 이하로 입력해 주세요.`,
    );
  }

  // 검사를 통과했으면 서비스에서 사용자를 만들어요.
  const user = await createUser({ email, password, username });
  if (!user) {
    return sendError(res, 409, "DUPLICATE_EMAIL", "이미 가입된 이메일이에요.");
  }

  res.sendStatus(201);
});

// POST /auth/login  body: { email, password } → { token } (JWT 액세스 토큰 1개, 10분 뒤 만료)
authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  // 1. 두 칸이 모두 글자로 왔는지
  if (!isFilledString(email) || !isFilledString(password)) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "이메일과 비밀번호를 입력해 주세요.",
    );
  }

  // 검사를 통과했으면 서비스에서 로그인을 처리해요.
  const token = await login({ email, password });
  if (!token) {
    return sendError(
      res,
      401,
      "LOGIN_FAILED",
      "이메일 또는 비밀번호가 맞지 않아요.",
    );
  }

  res.json({ token });
});

// GET /auth/me  header: Authorization: Bearer <token> → 내 정보 (비밀번호 제외)
authRouter.get("/me", async (req, res) => {
  // "Bearer 토큰" 모양에서 토큰만 꺼내요.
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");

  const me = await getMe(token);
  if (!me) {
    return sendError(res, 401, "UNAUTHORIZED", "로그인이 필요해요.");
  }

  res.json(me);
});
