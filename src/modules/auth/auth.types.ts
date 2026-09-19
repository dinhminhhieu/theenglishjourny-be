import { Role } from '../../common/constants/roles.constant';
import { AppUser } from '../../common/types/app-user.type';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: AppUser;
}

/** Trả về sau khi gửi OTP, để FE hiển thị đếm ngược hết hạn và nút gửi lại. */
export interface OtpSentResult {
  email: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
}
