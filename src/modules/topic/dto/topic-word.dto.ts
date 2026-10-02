import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export const MAX_TOPIC_WORDS_PER_REQUEST = 2000;

export class CheckTopicWordsDto {
  @ApiProperty({
    type: [String],
    example: ['check-in', 'boarding pass', 'luggage'],
    description: `Các từ cần dò trong từ điển, tối đa ${MAX_TOPIC_WORDS_PER_REQUEST} từ`,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_TOPIC_WORDS_PER_REQUEST)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  words: string[];
}

export class TopicWordCheckItemDto {
  @ApiProperty({
    example: 'boarding pass',
    description: 'Từ đã chuẩn hoá: bỏ khoảng trắng thừa, chữ thường',
  })
  word: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'null khi từ không có trong từ điển',
  })
  vocabularyId: string | null;

  @ApiProperty({ type: String, nullable: true, example: '/ˈbɔːdɪŋ pɑːs/' })
  pronunciation: string | null;

  @ApiProperty({ type: String, nullable: true })
  shortMeaning: string | null;

  @ApiProperty({ description: 'Từ đã nằm trong chủ đề này' })
  inTopic: boolean;
}

export class TopicWordCheckDto {
  @ApiProperty({ type: [TopicWordCheckItemDto] })
  items: TopicWordCheckItemDto[];
}

export class AddTopicWordsDto {
  @ApiProperty({ type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_TOPIC_WORDS_PER_REQUEST)
  @IsUUID('all', { each: true })
  vocabularyIds: string[];
}

export class AddTopicWordsResultDto {
  @ApiProperty({ example: 42, description: 'Số từ được gắn mới' })
  added: number;

  @ApiProperty({
    example: 3,
    description:
      'Số từ bỏ qua vì đã có trong chủ đề hoặc không còn trong từ điển',
  })
  skipped: number;
}
