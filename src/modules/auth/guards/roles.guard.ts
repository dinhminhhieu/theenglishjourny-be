import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Role } from '../../../common/constants/roles.constant';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

/** Chạy sau JwtAuthGuard. Chỉ kiểm tra khi route có @Roles(...). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { appUser } = context.switchToHttp().getRequest<Request>();
    if (!appUser) {
      throw new UnauthorizedException('Chưa đăng nhập');
    }
    if (!requiredRoles.includes(appUser.role)) {
      throw new ForbiddenException('Bạn không có quyền truy cập');
    }
    return true;
  }
}
