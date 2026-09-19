import { AppUser } from './app-user.type';

declare global {
  namespace Express {
    interface Request {
      /** Được JwtAuthGuard gắn vào sau khi xác thực access token. */
      appUser?: AppUser;
    }
  }
}

export {};
