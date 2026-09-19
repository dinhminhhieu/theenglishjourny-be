import { AppUser } from '../../common/types/app-user.type';
import { User, UserStatus } from '../../generated/prisma/client';

export function toAppUser(user: User): AppUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isEmailVerified: user.emailVerifiedAt !== null,
    isActive: user.status === UserStatus.ACTIVE,
  };
}
