import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { EXAM_FORMATS, ExamFormat } from './exam-formats';
import { QUESTION_TYPE_LIST, QuestionTypeSpec } from './question-types';

/**
 * Định dạng kỳ thi và các dạng câu. Admin dựng form soạn đề theo đây, FE người học lấy tên part.
 * Không có dữ liệu nhạy cảm nên công khai.
 */
@ApiTags('Exam formats')
@Public()
@Controller('exam-formats')
export class ExamFormatController {
  @Get()
  @ApiOperation({ summary: 'Định dạng các kỳ thi và bảng dạng câu hỏi' })
  @ApiOkResponse({
    description: '{ formats: ExamFormat[], questionTypes: QuestionTypeSpec[] }',
  })
  list(): { formats: ExamFormat[]; questionTypes: QuestionTypeSpec[] } {
    return {
      formats: Object.values(EXAM_FORMATS),
      questionTypes: [...QUESTION_TYPE_LIST],
    };
  }
}
