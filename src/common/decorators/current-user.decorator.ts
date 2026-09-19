import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AppUser } from '../types/app-user.type';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AppUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.appUser;
  },
);
