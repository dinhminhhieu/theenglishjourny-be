import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { URL_OPTIONS } from '../../../common/constants/url.constant';

export class CreateTopicDto {
  @ApiProperty({
    example: 'Travel',
    maxLength: 100,
    description: 'Tên chủ đề, duy nhất',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Tên chủ đề không được để trống' })
  @MaxLength(100, { message: 'Tên chủ đề tối đa 100 ký tự' })
  name: string;

  @ApiPropertyOptional({
    example: 'Từ vựng và mẫu câu khi đi du lịch.',
    nullable: true,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/demo/topics/travel.png',
    nullable: true,
  })
  @IsOptional()
  @IsUrl(URL_OPTIONS, { message: 'imageUrl phải là URL hợp lệ' })
  @MaxLength(2048)
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
