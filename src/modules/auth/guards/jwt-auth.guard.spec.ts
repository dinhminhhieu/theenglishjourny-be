import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../../common/constants/roles.constant';
import { IS_OPTIONAL_AUTH_KEY } from '../../../common/decorators/optional-auth.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import type { AppUser } from '../../../common/types/app-user.type';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

const USER: AppUser = {
  id: '01927f3a-7c1e-7000-8000-0000000000aa',
  email: 'learner@example.com',
  displayName: 'Learner',
  role: Role.USER,
  avatarUrl: null,
  isEmailVerified: true,
  isActive: true,
};

type RouteKind = 'protected' | 'public' | 'optional';

function setup(kind: RouteKind, authorization?: string) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === IS_PUBLIC_KEY) return kind === 'public';
      if (key === IS_OPTIONAL_AUTH_KEY) return kind === 'optional';
      return undefined;
    }),
  };
  const jwt = {
    verifyAsync: jest.fn((token: string) =>
      token === 'good-token'
        ? Promise.resolve({ sub: USER.id, email: USER.email, role: USER.role })
        : Promise.reject(new Error('jwt expired')),
    ),
  };
  const auth = { validateUserById: jest.fn().mockResolvedValue(USER) };
  const request: { headers: Record<string, string>; appUser?: AppUser } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    getHandler: () => setup,
    getClass: () => JwtAuthGuard,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  const guard = new JwtAuthGuard(
    reflector as unknown as Reflector,
    jwt as unknown as JwtService,
    auth as unknown as AuthService,
  );
  return { guard, context, request, jwt, auth };
}

describe('JwtAuthGuard', () => {
  it('route thường: thiếu token thì 401', async () => {
    const { guard, context } = setup('protected');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('route thường: token hợp lệ thì gắn appUser', async () => {
    const { guard, context, request } = setup('protected', 'Bearer good-token');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.appUser).toEqual(USER);
  });

  it('route @Public: cho qua, không đụng tới token', async () => {
    const { guard, context, request, jwt } = setup('public', 'Bearer whatever');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
    expect(request.appUser).toBeUndefined();
  });

  it('route @OptionalAuth: không gửi token thì vào như khách', async () => {
    const { guard, context, request, jwt } = setup('optional');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
    expect(request.appUser).toBeUndefined();
  });

  it('route @OptionalAuth: token hợp lệ thì gắn appUser', async () => {
    const { guard, context, request, auth } = setup(
      'optional',
      'Bearer good-token',
    );
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(auth.validateUserById).toHaveBeenCalledWith(USER.id);
    expect(request.appUser).toEqual(USER);
  });

  it('route @OptionalAuth: token hỏng vẫn 401, không âm thầm coi là khách', async () => {
    const { guard, context, request } = setup('optional', 'Bearer expired');
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.appUser).toBeUndefined();
  });
});
