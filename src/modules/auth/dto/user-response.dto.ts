import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/constants/roles.constant';
import { AppUser } from '../../../common/types/app-user.type';

export class UserResponseDto implements AppUser {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'hieu@example.com' })
  email: string;

  @ApiProperty({ type: String, nullable: true, example: 'Minh Hiếu' })
  displayName: string | null;

  @ApiProperty({ enum: Role, enumName: 'Role' })
  role: Role;

  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: false })
  isEmailVerified: boolean;

  @ApiProperty({ example: true })
  isActive: boolean;
}
