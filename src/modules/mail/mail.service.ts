import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EnvironmentVariables } from '../../config/env.validation';
import { BRAND_NAME, renderOtpEmail } from './templates/otp-email.template';

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Gửi email qua SMTP (nodemailer). Nếu chưa cấu hình SMTP_HOST thì chỉ in nội dung
 * ra console để dev đọc OTP từ log server.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter?: nodemailer.Transporter;

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  onModuleInit(): void {
    const host = this.config.get('SMTP_HOST', { infer: true });
    if (!host) {
      this.logger.warn(
        'SMTP_HOST chưa cấu hình: email sẽ được in ra console thay vì gửi thật',
      );
      return;
    }

    const port = this.config.get('SMTP_PORT', { infer: true });
    const user = this.config.get('SMTP_USER', { infer: true });
    const pass = this.config.get('SMTP_PASS', { infer: true });

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
    this.logger.log(`SMTP sẵn sàng: ${host}:${port}`);
  }

  async send(options: SendMailOptions): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[console transport] to=${options.to} subject="${options.subject}"\n${options.text}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      ...options,
    });
  }

  sendEmailVerificationOtp(
    to: string,
    displayName: string | null,
    code: string,
    ttlMinutes: number,
  ): Promise<void> {
    const name = displayName?.trim() || to;
    const subject = `${code} là mã xác thực email của bạn`;
    const text = [
      `Xin chào ${name},`,
      '',
      `Mã xác thực email của bạn là: ${code}`,
      `Mã có hiệu lực trong ${ttlMinutes} phút. Không chia sẻ mã này với bất kỳ ai.`,
      '',
      'Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.',
      '',
      BRAND_NAME,
    ].join('\n');
    const html = renderOtpEmail({
      title: 'Xác thực email',
      displayName: name,
      introHtml: `Cảm ơn bạn đã đăng ký <strong style="color:#18181b;">${BRAND_NAME}</strong>. Nhập mã OTP bên dưới trong ứng dụng để xác thực email của bạn.`,
      code,
      ttlMinutes,
      disclaimer:
        'Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này. Không ai có thể dùng email của bạn khi chưa nhập đúng mã.',
    });
    return this.send({ to, subject, text, html });
  }
}
