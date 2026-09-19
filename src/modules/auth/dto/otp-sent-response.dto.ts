import { ApiProperty } from '@nestjs/swagger';
import { OtpSentResult } from '../auth.types';

export class OtpSentResponseDto implements OtpSentResult {
  @ApiProperty({ example: 'hieu@example.com' })
  email: string;

  @ApiProperty({ example: 600, description: 'Số giây OTP còn hiệu lực' })
  expiresInSeconds: number;

  @ApiProperty({
    example: 60,
    description: 'Số giây phải đợi trước khi gửi lại',
  })
  resendCooldownSeconds: number;
}
