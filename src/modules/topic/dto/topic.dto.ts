import { ApiProperty } from '@nestjs/swagger';

/** Response shape của Topic, khớp với Prisma model `Topic`. */
export class TopicDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Travel' })
  name: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Từ vựng khi đi du lịch.',
  })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  imageUrl: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'Khác null nghĩa là đã xoá mềm. Chỉ admin thấy topic đã xoá.',
  })
  deletedAt: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date;
}
