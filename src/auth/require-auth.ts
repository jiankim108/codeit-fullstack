// 로그인한 사용자만 통과시키는 미들웨어
// 요청에 담긴 세션 쿠키를 Better Auth로 확인하고, 로그인한 사용자의 id를 res.locals.userId에 넣어 줘요.
// 사용법: app.post("/memos", requireAuth, async (req, res) => { const userId = getUserId(res); ... })
import { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/auth/auth";
import { sendError } from "@/http";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session) {
    return sendError(res, 401, "UNAUTHORIZED", "로그인이 필요해요.");
  }

  // Better Auth는 id를 문자열("3")로 돌려줘요. DB의 userId(Int)와 비교하려고 숫자로 바꿔요.
  res.locals.userId = Number(session.user.id);
  next();
};

// requireAuth를 거친 핸들러에서 로그인한 사용자의 id를 꺼내요.
export const getUserId = (res: Response): number => res.locals.userId;
