import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { trimString } from '../../../common/transforms/query.transforms';
import { LessonBlockKind } from '../../../generated/prisma/enums';

/** Một block gửi lên khi thay toàn bộ block của unit. Có id = cập nhật, không id = tạo mới. */
export class LessonBlockInputDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Bỏ trống để tạo mới' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ enum: LessonBlockKind, enumName: 'LessonBlockKind' })
  @IsEnum(LessonBlockKind)
  kind: LessonBlockKind;

  @ApiProperty({ format: 'uuid', description: 'Kỹ năng của block' })
  @IsUUID()
  skillId: string;

  @ApiProperty({ example: 'Ngữ pháp: Thì hiện tại đơn', maxLength: 200 })
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string | null;

  @ApiPropertyOptional({ default: 20, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  xpReward?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'Bắt buộc khi kind = GRAMMAR, các kind khác phải bỏ trống',
  })
  @IsOptional()
  @IsUUID()
  grammarLessonId?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Đề luyện tập của block. Block có đề thì hoàn thành khi nộp bài, không có đề thì học viên tự bấm hoàn thành',
  })
  @IsOptional()
  @IsUUID()
  testId?: string | null;
}

export class ReplaceLessonBlocksDto {
  @ApiProperty({
    type: [LessonBlockInputDto],
    description: 'Thứ tự trong mảng là thứ tự hiển thị',
  })
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => LessonBlockInputDto)
  blocks: LessonBlockInputDto[];
}

export class LessonBlockDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: LessonBlockKind, enumName: 'LessonBlockKind' })
  kind: LessonBlockKind;

  @ApiProperty({ format: 'uuid' })
  skillId: string;

  @ApiProperty({ example: 'Grammar' })
  skillName: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ type: String, nullable: true })
  instructions: string | null;

  @ApiProperty()
  xpReward: number;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  grammarLessonId: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  testId: string | null;

  @ApiProperty()
  sortOrder: number;
}
