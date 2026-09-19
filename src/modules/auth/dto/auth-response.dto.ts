import { ApiProperty } from '@nestjs/swagger';
import { AuthResult } from '../auth.types';
import { UserResponseDto } from './user-response.dto';

export class AuthResponseDto implements AuthResult {
  @ApiProperty({
    description: 'JWT ngắn hạn, gửi qua header Authorization: Bearer',
  })
  accessToken: string;

  @ApiProperty({
    description:
      'Token dài hạn để lấy access token mới. Lưu an toàn phía client.',
  })
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
