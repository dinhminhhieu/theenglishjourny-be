import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import type { AppUser } from '../../common/types/app-user.type';
import { EnvironmentVariables } from '../../config/env.validation';
import {
  User,
  UserStatus,
  VerificationPurpose,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toAppUser } from '../users/users.mapper';
import { UsersService } from '../users/users.service';
import {
  AuthResult,
  AuthTokens,
  JwtPayload,
  OtpSentResult,
} from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { VerificationService } from './verification.service';

const BCRYPT_ROUNDS = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly verification: VerificationService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /** Tạo tài khoản và gửi OTP. Chưa cấp token: user phải xác thực email trước. */
  async register(dto: RegisterDto): Promise<OtpSentResult> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName ?? null,
    });

    return this.verification.sendEmailVerification(user);
  }

  /** Xác thực OTP; đúng thì đánh dấu email đã xác thực và đăng nhập luôn. */
  async verifyEmail(dto: VerifyOtpDto): Promise<AuthResult> {
    const user = await this.findUnverifiedUser(dto.email);
    await this.verification.consume(
      user.id,
      VerificationPurpose.EMAIL_VERIFICATION,
      dto.code,
    );

    const verifiedUser = await this.users.markEmailVerified(user.id);
    this.assertUsable(verifiedUser);

    const [loggedInUser, tokens] = await Promise.all([
      this.users.markLoggedIn(verifiedUser.id),
      this.issueTokens(verifiedUser),
    ]);
    return { ...tokens, user: toAppUser(loggedInUser) };
  }

  async resendVerification(dto: ResendOtpDto): Promise<OtpSentResult> {
    const user = await this.findUnverifiedUser(dto.email);
    return this.verification.sendEmailVerification(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.users.findByEmail(dto.email);
    // Không phân biệt "email không tồn tại" và "sai mật khẩu" để tránh lộ email đã đăng ký.
    const invalidCredentials = new UnauthorizedException(
      'Email hoặc mật khẩu không đúng',
    );

    if (!user || !user.passwordHash || user.deletedAt) {
      throw invalidCredentials;
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw invalidCredentials;
    }

    this.assertUsable(user);

    const [loggedInUser, tokens] = await Promise.all([
      this.users.markLoggedIn(user.id),
      this.issueTokens(user),
    ]);
    return { ...tokens, user: toAppUser(loggedInUser) };
  }

  /** Đổi refresh token lấy cặp token mới. Token cũ bị thu hồi (rotation). */
  async refresh(rawToken: string): Promise<AuthResult> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    // Token đã thu hồi mà vẫn được dùng lại: khả năng bị lộ, thu hồi toàn bộ của user.
    if (stored.revokedAt) {
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException(
        'Refresh token đã bị thu hồi, vui lòng đăng nhập lại',
      );
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token đã hết hạn');
    }

    if (stored.user.deletedAt) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }
    this.assertUsable(stored.user);

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(stored.user);
    return { ...tokens, user: toAppUser(stored.user) };
  }

  /** Thu hồi một refresh token. Idempotent: token không tồn tại hoặc đã thu hồi thì bỏ qua. */
  async logout(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Dùng bởi JwtAuthGuard: tải user mới nhất từ DB để chặn ngay user bị khoá/xoá. */
  async validateUserById(id: string): Promise<AppUser> {
    const user = await this.users.findById(id);
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }
    this.assertUsable(user);
    return toAppUser(user);
  }

  private async findUnverifiedUser(email: string): Promise<User> {
    const user = await this.users.findByEmail(email);
    if (!user || user.deletedAt) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }
    if (user.emailVerifiedAt) {
      throw new BadRequestException('Email đã được xác thực, hãy đăng nhập');
    }
    return user;
  }

  /** Điều kiện chung để được cấp/dùng token: chưa bị khoá và đã xác thực email. */
  private assertUsable(user: User): void {
    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException(
        user.banReason
          ? `Tài khoản đã bị khoá: ${user.banReason}`
          : 'Tài khoản đã bị khoá',
      );
    }
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Tài khoản đã bị vô hiệu hoá');
    }
    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Email chưa được xác thực, vui lòng nhập mã OTP đã gửi tới email của bạn',
      );
    }
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = randomBytes(48).toString('base64url');
    const ttlDays = this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + ttlDays * MS_PER_DAY),
      },
    });

    return { accessToken, refreshToken };
  }

  private revokeAllForUser(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
