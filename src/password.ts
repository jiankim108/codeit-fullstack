// 비밀번호 암호화 (bcrypt)
// - hash: 되돌릴 수 없는 문자열로 바꿔요. salt(무작위 값)가 결과 안에 같이 들어가요.
// - compare: 입력한 비밀번호를 같은 방식으로 바꿔서 저장된 값과 같은지 비교해요.
import bcrypt from "bcrypt";

// 얼마나 여러 번 섞을지. 클수록 안전하지만 느려져요. (보통 10~12)
const SALT_ROUNDS = 10;

export const hashPassword = (password: string) =>
  bcrypt.hash(password, SALT_ROUNDS);

export const verifyPassword = (password: string, hashedPassword: string) =>
  bcrypt.compare(password, hashedPassword);
