import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateCourseDto } from '../../modules/course/dto/course.dto';
import { CreateLessonDto } from '../../modules/course/dto/lesson.dto';
import { CreateGrammarCategoryDto } from '../../modules/grammar/dto/grammar-category.dto';
import { TestFieldsDto } from '../../modules/practice/test/dto/test.dto';
import { CreateTopicDto } from '../../modules/topic/dto/create-topic.dto';

const IMAGE_FIELDS: [string, ClassConstructor<object>, string][] = [
  ['topic', CreateTopicDto, 'imageUrl'],
  ['grammar category', CreateGrammarCategoryDto, 'imageUrl'],
  ['course', CreateCourseDto, 'thumbnailUrl'],
  ['lesson', CreateLessonDto, 'thumbnailUrl'],
  ['test', TestFieldsDto, 'thumbnailUrl'],
];

function urlErrors(
  dto: ClassConstructor<object>,
  property: string,
  value: string,
) {
  return validateSync(plainToInstance(dto, { [property]: value })).filter(
    (error) => error.property === property,
  );
}

describe.each(IMAGE_FIELDS)('%s', (_name, dto, property) => {
  it('nhận URL ảnh MinIO local lẫn CDN', () => {
    expect(
      urlErrors(
        dto,
        property,
        'http://localhost:9000/theenglishjourney-public/images/a.png',
      ),
    ).toEqual([]);
    expect(urlErrors(dto, property, 'https://cdn.example.com/a.png')).toEqual(
      [],
    );
  });

  it('từ chối URL thiếu giao thức', () => {
    expect(urlErrors(dto, property, 'localhost/a.png')).toHaveLength(1);
  });
});
