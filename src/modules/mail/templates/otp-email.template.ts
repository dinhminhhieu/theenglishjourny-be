export const BRAND_NAME = 'The English Journey';

export interface OtpEmailParams {
  /** Hành động của email, dùng cho <title>. Vd "Xác thực email". */
  title: string;
  /** Tên hiển thị của người nhận. Sẽ được escape. */
  displayName: string;
  /** Đoạn mở đầu, là HTML do code viết (không nhận từ user). */
  introHtml: string;
  code: string;
  ttlMinutes: number;
  /** Nội dung khung cảnh báo vàng, là HTML do code viết. */
  warningHtml?: string;
  /** Dòng nhắc cuối, plain text. */
  disclaimer: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Email OTP dạng table-based để hiển thị ổn trên Gmail, Outlook, Apple Mail. */
export function renderOtpEmail(params: OtpEmailParams): string {
  const displayName = escapeHtml(params.displayName);
  const disclaimer = escapeHtml(params.disclaimer);
  const digits = params.code
    .split('')
    .map(
      (digit) => `
                          <td style="padding:0 3px;">
                            <div style="width:32px;height:40px;line-height:40px;
                                        text-align:center;
                                        color:#18181b;
                                        font-size:26px;font-weight:700;
                                        font-family:'Courier New',monospace;">
                              ${escapeHtml(digit)}
                            </div>
                          </td>`,
    )
    .join('');
  const warningHtml =
    params.warningHtml ??
    `Mã có hiệu lực trong <strong>${params.ttlMinutes} phút</strong>. Không chia sẻ mã này với bất kỳ ai.`;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.title)} – ${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#f4f4f5;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0"
               style="max-width:560px;width:100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <span style="font-size:22px;font-weight:700;letter-spacing:2px;color:#18181b;">
                ✦ ${BRAND_NAME.toUpperCase()}
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;
                       border:1px solid #e4e4e7;padding:44px 40px;
                       box-shadow:0 1px 3px rgba(0,0,0,0.06);">

              <!-- Greeting -->
              <p style="margin:0 0 6px;font-size:13px;color:#a1a1aa;
                         text-transform:uppercase;letter-spacing:1px;">Xin chào,</p>
              <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#18181b;">
                ${displayName} 👋
              </h1>

              <p style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#52525b;">
                ${params.introHtml}
              </p>

              <!-- OTP Digits -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>${digits}
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry note -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="margin-bottom:32px;">
                <tr>
                  <td style="background:#fffbeb;border:1px solid #fde68a;
                              border-radius:8px;padding:14px 18px;">
                    <p style="margin:0;font-size:13px;color:#b45309;line-height:1.6;">
                      ⚠ &nbsp;${warningHtml}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #f4f4f5;margin:0 0 24px;" />

              <!-- Disclaimer -->
              <p style="margin:0;font-size:12px;line-height:1.7;color:#a1a1aa;">
                ${disclaimer}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0 0 6px;font-size:12px;color:#a1a1aa;">
                © ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;">
                <a href="#" style="color:#a1a1aa;text-decoration:none;">Chính sách bảo mật</a>
                &nbsp;·&nbsp;
                <a href="#" style="color:#a1a1aa;text-decoration:none;">Điều khoản sử dụng</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
