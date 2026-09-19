import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { EnvironmentVariables } from '../../config/env.validation';
import { User, VerificationPurpose } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OtpSentResult } from './auth.types';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Cấp và kiểm tra mã OTP. Mã chỉ lưu dưới dạng HMAC(secret, userId:code) nên
 * lộ DB cũng không dò ngược được; số lần nhập sai bị giới hạn để chặn brute-force.
 */
@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /** Vô hiệu mã cũ, tạo mã mới và gửi email xác thực. */
  async sendEmailVerification(user: User): Promise<OtpSentResult> {
    const purpose = VerificationPurpose.EMAIL_VERIFICATION;
    await this.assertResendAllowed(user.id, purpose);

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await this.prisma.$transaction([
      this.prisma.verificationCode.deleteMany({
        where: { userId: user.id, purpose },
      }),
      this.prisma.verificationCode.create({
        data: {
          userId: user.id,
          purpose,
          codeHash: this.hash(user.id, code),
          expiresAt,
        },
      }),
    ]);

    await this.mail.sendEmailVerificationOtp(
      user.email,
      user.displayName,
      code,
      OTP_TTL_MINUTES,
    );

    return {
      email: user.email,
      expiresInSeconds: OTP_TTL_MINUTES * 60,
      resendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    };
  }

  /** Kiểm tra mã, ném lỗi nếu sai/hết hạn. Đúng thì đánh dấu đã dùng. */
  async consume(
    userId: string,
    purpose: VerificationPurpose,
    code: string,
  ): Promise<void> {
    const record = await this.prisma.verificationCode.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException(
        'Mã OTP không tồn tại hoặc đã hết hạn, vui lòng yêu cầu mã mới',
      );
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(
        'Bạn đã nhập sai quá số lần cho phép, vui lòng yêu cầu mã mới',
      );
    }

    const expected = Buffer.from(record.codeHash);
    const actual = Buffer.from(this.hash(userId, code));
    const matches =
      expected.length === actual.length && timingSafeEqual(expected, actual);

    if (!matches) {
      const { attempts } = await this.prisma.verificationCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      const remaining = OTP_MAX_ATTEMPTS - attempts;
      throw new BadRequestException(
        remaining > 0
          ? `Mã OTP không đúng, bạn còn ${remaining} lần thử`
          : 'Mã OTP không đúng, vui lòng yêu cầu mã mới',
      );
    }

    await this.prisma.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }

  private async assertResendAllowed(
    userId: string,
    purpose: VerificationPurpose,
  ): Promise<void> {
    const latest = await this.prisma.verificationCode.findFirst({
      where: { userId, purpose },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (!latest) {
      return;
    }

    const elapsedMs = Date.now() - latest.createdAt.getTime();
    const waitSeconds = Math.ceil(
      (OTP_RESEND_COOLDOWN_SECONDS * 1000 - elapsedMs) / 1000,
    );
    if (waitSeconds > 0) {
      throw new HttpException(
        `Vui lòng đợi ${waitSeconds} giây trước khi gửi lại mã`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private generateCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private hash(userId: string, code: string): string {
    const secret = this.config.get('JWT_ACCESS_SECRET', { infer: true });
    return createHmac('sha256', secret)
      .update(`otp:${userId}:${code}`)
      .digest('hex');
  }
}
