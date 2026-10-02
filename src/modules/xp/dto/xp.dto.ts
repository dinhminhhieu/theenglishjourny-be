import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { XpKind, XpReason } from '../../../generated/prisma/enums';

export class XpSummaryDto {
  @ApiProperty({ description: 'XP đang có để tiêu' })
  xpBalance: number;

  @ApiProperty({ description: 'XP tích luỹ trọn đời' })
  xpTotal: number;

  @ApiProperty({ description: 'Số ngày học liên tiếp' })
  streakDays: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-09-30',
    description: 'Ngày học gần nhất theo giờ Việt Nam',
  })
  lastActiveDate: string | null;

  @ApiProperty({ description: 'Hôm nay đã học chưa' })
  activeToday: boolean;
}

export class XpTransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: XpReason, enumName: 'XpReason' })
  @IsOptional()
  @IsEnum(XpReason)
  reason?: XpReason;
}

export class XpTransactionDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: XpKind, enumName: 'XpKind' })
  kind: XpKind;

  @ApiProperty({ enum: XpReason, enumName: 'XpReason' })
  reason: XpReason;

  @ApiProperty({ description: 'Dương khi cộng, âm khi tiêu' })
  amount: number;

  @ApiProperty({ type: String, nullable: true })
  refId: string | null;

  @ApiProperty()
  balanceAfter: number;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;
}
