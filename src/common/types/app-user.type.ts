import { Role } from '../constants/roles.constant';

export interface AppUser {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
}
