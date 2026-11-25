import { MemoType } from "@/types";

// DB의 날짜(Date) → 프론트에서 쓰는 문자열 "2026-11-09T21:30:00" (내 컴퓨터 시간 기준)
// 프론트는 이 문자열을 잘라서(slice) 날짜와 시간을 보여 줘요.
const toDateString = (date: Date) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19);
};

// 메모를 가져올 때 작성자 이름도 같이 가져오도록 하는 옵션
export const withUsername = {
  include: { user: { select: { username: true } } },
} as const;

type MemoWithUsername = {
  id: number;
  userId: number;
  title: string;
  content: string;
  imageUrl: string;
  createdAt: Date;
  user: { username: string };
};

// DB에서 꺼낸 메모 → 프론트에 보낼 모양(MemoType)
export const toMemoResponse = ({
  user,
  ...memo
}: MemoWithUsername): MemoType => ({
  ...memo,
  createdAt: toDateString(memo.createdAt),
  username: user.username,
});
