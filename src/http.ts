import { Response } from "express";
import { ErrorType } from "@/types";

// 에러 응답은 항상 { type, message } 모양으로 보내요.
export const sendError = (
  res: Response,
  status: number,
  type: ErrorType,
  message: string,
) => {
  res.status(status).json({ type, message });
};

export const isFilledString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";
