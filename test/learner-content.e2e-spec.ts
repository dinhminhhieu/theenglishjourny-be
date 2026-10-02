import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '../src/common/constants/roles.constant';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import type { AppUser } from '../src/common/types/app-user.type';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtAuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { CourseModule } from '../src/modules/course/course.module';
import { GrammarModule } from '../src/modules/grammar/grammar.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Test mức HTTP cho API người học. Router, guard, pipe, interceptor, filter là thật;
 * chỉ Prisma và việc verify JWT là giả lập nên không cần database.
 */

const COURSE_ID = '01927f3a-7c1e-7000-8000-000000000001';
const LESSON_ID = '01927f3a-7c1e-7000-8000-000000000002';
const GRAMMAR_ID = '01927f3a-7c1e-7000-8000-000000000003';
const CATEGORY_ID = '01927f3a-7c1e-7000-8000-000000000004';
const AT = new Date('2026-09-01T00:00:00.000Z');

const LEARNER: AppUser = {
  id: '01927f3a-7c1e-7000-8000-0000000000aa',
  email: 'learner@example.com',
  displayName: 'Learner',
  role: Role.USER,
  avatarUrl: null,
  isEmailVerified: true,
  isActive: true,
};
const ADMIN: AppUser = {
  ...LEARNER,
  id: '01927f3a-7c1e-7000-8000-0000000000bb',
  email: 'admin@example.com',
  role: Role.ADMIN,
};
const USERS_BY_TOKEN: Record<string, AppUser> = {
  'learner-token': LEARNER,
  'admin-token': ADMIN,
};

const PUBLISHED = { deletedAt: null, status: 'PUBLISHED' };
const ADMIN_ONLY_FIELDS = [
  'status',
  'sortOrder',
  'isActive',
  'deletedAt',
  'createdAt',
  'updatedAt',
  'createdBy',
  'updatedBy',
];

const audit = {
  createdBy: ADMIN.id,
  updatedBy: ADMIN.id,
  deletedAt: null,
  createdAt: AT,
  updatedAt: AT,
};

const categoryRow = () => ({
  id: CATEGORY_ID,
  title: 'Thì & Thời',
  subtitle: null,
  description: null,
  imageUrl: null,
  sortOrder: 1,
  isActive: true,
  ...audit,
  _count: { lessons: 3 },
});

const grammarLessonRow = () => ({
  id: GRAMMAR_ID,
  code: 'MOD-01-TENSE',
  title: 'Thì hiện tại đơn',
  subtitle: null,
  summary: null,
  tier: 'CORE',
  levelFrom: 'A1',
  levelTo: 'B1',
  highlights: [{ label: 'Công thức', value: '5 cấu trúc' }],
  estimatedMinutes: 25,
  sortOrder: 0,
  status: 'PUBLISHED',
  publishedAt: AT,
  ...audit,
  grammarCategoryId: CATEGORY_ID,
  levelId: null,
  _count: { sections: 1 },
  category: { title: 'Thì & Thời' },
  sections: [
    {
      id: '01927f3a-7c1e-7000-8000-000000000005',
      type: 'RICH_TEXT',
      code: '01',
      title: 'Cách dùng',
      subtitle: null,
      content: { html: '<p>...</p>' },
      sortOrder: 0,
      createdAt: AT,
      updatedAt: AT,
      grammarLessonId: GRAMMAR_ID,
    },
  ],
});

const courseRow = (overrides: Record<string, unknown> = {}) => ({
  id: COURSE_ID,
  code: 'IELTS-4-5',
  title: 'IELTS 4.0 đến 5.0',
  subtitle: null,
  description: null,
  thumbnailUrl: null,
  levelFrom: 'A2',
  levelTo: 'B1',
  targetBandFrom: { toString: () => '4' },
  targetBandTo: { toString: () => '5' },
  isLocked: true,
  price: 499000,
  currency: 'VND',
  accessDays: 365,
  sortOrder: 0,
  status: 'PUBLISHED',
  publishedAt: AT,
  ...audit,
  _count: { lessons: 1 },
  ...overrides,
});

const lessonSummaryRow = () => ({
  id: LESSON_ID,
  code: 'UNIT-01',
  title: 'Unit 1: Travel',
  subtitle: null,
  description: null,
  thumbnailUrl: null,
  xpReward: 50,
  estimatedMinutes: 30,
  sortOrder: 0,
  status: 'PUBLISHED',
  publishedAt: AT,
  ...audit,
  courseId: COURSE_ID,
  topicId: null,
  _count: { blocks: 2 },
});

const blockRow = (id: string, grammarStatus: 'PUBLISHED' | 'DRAFT') => ({
  id,
  kind: 'GRAMMAR',
  title: 'Ngữ pháp',
  instructions: null,
  xpReward: 20,
  sortOrder: 0,
  createdAt: AT,
  updatedAt: AT,
  lessonId: LESSON_ID,
  skillId: '01927f3a-7c1e-7000-8000-000000000006',
  grammarLessonId: GRAMMAR_ID,
  skill: { name: 'Grammar' },
  grammarLesson: {
    id: GRAMMAR_ID,
    code: 'MOD-01-TENSE',
    title: 'Thì hiện tại đơn',
    status: grammarStatus,
    deletedAt: null,
    category: { isActive: true, deletedAt: null },
  },
});

const lessonDetailRow = (isLocked: boolean) => ({
  ...lessonSummaryRow(),
  course: {
    id: COURSE_ID,
    code: 'IELTS-4-5',
    title: 'IELTS 4.0 đến 5.0',
    isLocked,
  },
  blocks: [
    blockRow('01927f3a-7c1e-7000-8000-000000000007', 'PUBLISHED'),
    blockRow('01927f3a-7c1e-7000-8000-000000000008', 'DRAFT'),
  ],
});

describe('API người học (e2e, Prisma giả lập)', () => {
  let app: INestApplication<App>;

  const prisma = {
    grammarCategory: { count: jest.fn(), findMany: jest.fn() },
    grammarLesson: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    course: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    lesson: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    enrollment: { findMany: jest.fn() },
    userLessonProgress: { findUnique: jest.fn() },
  };

  const jwt = {
    verifyAsync: jest.fn((token: string) => {
      const user = USERS_BY_TOKEN[token];
      return user
        ? Promise.resolve({ sub: user.id, email: user.email, role: user.role })
        : Promise.reject(new Error('invalid token'));
    }),
  };
  const auth = {
    validateUserById: jest.fn((id: string) =>
      Promise.resolve(
        Object.values(USERS_BY_TOKEN).find((user) => user.id === id),
      ),
    ),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, GrammarModule, CourseModule],
      providers: [
        { provide: JwtService, useValue: jwt },
        { provide: AuthService, useValue: auth },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
        { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
        {
          provide: APP_PIPE,
          useValue: new ValidationPipe({ whitelist: true, transform: true }),
        },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    for (const model of Object.values(prisma)) {
      for (const fn of Object.values(model)) {
        fn.mockReset();
      }
    }
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.userLessonProgress.findUnique.mockResolvedValue(null);
  });

  const http = () => request(app.getHttpServer());

  describe('Điểm 1: chỉ trả bản đã phát hành, giấu trường quản trị', () => {
    it('GET /grammar/categories: khách gọi được, chỉ lấy chủ điểm đang bật', async () => {
      prisma.grammarCategory.count.mockResolvedValue(1);
      prisma.grammarCategory.findMany.mockResolvedValue([categoryRow()]);

      const res = await http().get('/grammar/categories').expect(200);

      const args = prisma.grammarCategory.findMany.mock.calls[0][0];
      expect(args.where).toEqual({ deletedAt: null, isActive: true });
      expect(args.include._count.select.lessons.where).toEqual(PUBLISHED);
      expect(res.body.data.items).toEqual([
        {
          id: CATEGORY_ID,
          title: 'Thì & Thời',
          subtitle: null,
          description: null,
          imageUrl: null,
          lessonCount: 3,
        },
      ]);
      expect(res.body.data.meta.totalResults).toBe(1);
    });

    it('GET /grammar/lessons: lọc PUBLISHED, chưa xoá, chủ điểm đang bật', async () => {
      prisma.grammarLesson.count.mockResolvedValue(1);
      prisma.grammarLesson.findMany.mockResolvedValue([grammarLessonRow()]);

      const res = await http()
        .get('/grammar/lessons')
        .query({ level: 'B1', tier: 'CORE' })
        .expect(200);

      expect(prisma.grammarLesson.findMany.mock.calls[0][0].where).toEqual({
        ...PUBLISHED,
        category: { deletedAt: null, isActive: true },
        tier: 'CORE',
        levelFrom: { in: ['A1', 'A2', 'B1'] },
        levelTo: { in: ['B1', 'B2', 'C1', 'C2'] },
      });
      const [item] = res.body.data.items;
      expect(item.code).toBe('MOD-01-TENSE');
      for (const field of ADMIN_ONLY_FIELDS) {
        expect(item).not.toHaveProperty(field);
      }
    });

    it('GET /grammar/lessons: query sai enum thì 400', async () => {
      await http().get('/grammar/lessons').query({ level: 'Z9' }).expect(400);
      expect(prisma.grammarLesson.findMany).not.toHaveBeenCalled();
    });

    it('GET /grammar/lessons/:code: mã không phân biệt hoa thường, kèm sections', async () => {
      prisma.grammarLesson.findFirst.mockResolvedValue(grammarLessonRow());

      const res = await http().get('/grammar/lessons/mod-01-tense').expect(200);

      expect(prisma.grammarLesson.findFirst.mock.calls[0][0].where).toEqual({
        ...PUBLISHED,
        category: { deletedAt: null, isActive: true },
        code: 'MOD-01-TENSE',
      });
      expect(res.body.data.categoryTitle).toBe('Thì & Thời');
      expect(res.body.data.sections).toHaveLength(1);
      expect(res.body.data).not.toHaveProperty('status');
    });

    it('GET /grammar/lessons/:code: bài nháp hoặc không tồn tại thì 404', async () => {
      prisma.grammarLesson.findFirst.mockResolvedValue(null);
      const res = await http().get('/grammar/lessons/DRAFT-ONE').expect(404);
      expect(res.body.success).toBe(false);
    });

    it('GET /courses/:code: chỉ liệt kê unit đã phát hành', async () => {
      prisma.course.findFirst.mockResolvedValue(
        courseRow({ lessons: [lessonSummaryRow()] }),
      );

      const res = await http().get('/courses/ielts-4-5').expect(200);

      const args = prisma.course.findFirst.mock.calls[0][0];
      expect(args.where).toEqual({ ...PUBLISHED, code: 'IELTS-4-5' });
      expect(args.include.lessons.where).toEqual(PUBLISHED);
      expect(args.include._count.select.lessons.where).toEqual(PUBLISHED);
      expect(res.body.data.targetBandFrom).toBe(4);
      expect(res.body.data.lessons).toEqual([
        {
          id: LESSON_ID,
          code: 'UNIT-01',
          title: 'Unit 1: Travel',
          subtitle: null,
          description: null,
          thumbnailUrl: null,
          xpReward: 50,
          estimatedMinutes: 30,
          blockCount: 2,
        },
      ]);
      for (const field of ADMIN_ONLY_FIELDS) {
        expect(res.body.data).not.toHaveProperty(field);
      }
    });

    it('GET /courses/:code: khoá nháp hoặc không tồn tại thì 404', async () => {
      prisma.course.findFirst.mockResolvedValue(null);
      await http().get('/courses/NOPE').expect(404);
    });
  });

  describe('Điểm 2: khoá bị khoá cần Enrollment còn hạn', () => {
    const listCourses = () => {
      prisma.course.count.mockResolvedValue(2);
      prisma.course.findMany.mockResolvedValue([
        courseRow(),
        courseRow({
          id: '01927f3a-7c1e-7000-8000-000000000009',
          code: 'TRIAL',
          isLocked: false,
          price: null,
        }),
      ]);
    };

    it('GET /courses: khách xem được danh mục, khoá bị khoá có hasAccess = false', async () => {
      listCourses();

      const res = await http().get('/courses').expect(200);

      expect(prisma.course.findMany.mock.calls[0][0].where).toEqual(PUBLISHED);
      expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
      expect(
        res.body.data.items.map((c: { code: string; hasAccess: boolean }) => [
          c.code,
          c.hasAccess,
        ]),
      ).toEqual([
        ['IELTS-4-5', false],
        ['TRIAL', true],
      ]);
    });

    it('GET /courses: người đã ghi danh thấy hasAccess = true và ngày hết hạn', async () => {
      listCourses();
      prisma.enrollment.findMany.mockResolvedValue([
        { courseId: COURSE_ID, expiresAt: new Date('2027-01-01T00:00:00Z') },
      ]);

      const res = await http()
        .get('/courses')
        .set('Authorization', 'Bearer learner-token')
        .expect(200);

      const where = prisma.enrollment.findMany.mock.calls[0][0].where;
      expect(where.userId).toBe(LEARNER.id);
      expect(where.courseId).toEqual({ in: [COURSE_ID] });
      expect(where.OR).toEqual([
        { expiresAt: null },
        { expiresAt: { gt: expect.any(Date) } },
      ]);
      expect(res.body.data.items[0]).toMatchObject({
        code: 'IELTS-4-5',
        hasAccess: true,
        accessExpiresAt: '2027-01-01T00:00:00.000Z',
      });
    });

    it('GET /courses: token hỏng thì 401, không âm thầm coi là khách', async () => {
      await http()
        .get('/courses')
        .set('Authorization', 'Bearer expired')
        .expect(401);
      expect(prisma.course.findMany).not.toHaveBeenCalled();
    });

    it('GET /lessons/:id: khoá mở thì khách đọc được nội dung', async () => {
      prisma.lesson.findFirst.mockResolvedValue(lessonDetailRow(false));

      const res = await http().get(`/lessons/${LESSON_ID}`).expect(200);

      expect(prisma.lesson.findFirst.mock.calls[0][0].where).toEqual({
        ...PUBLISHED,
        id: LESSON_ID,
        course: PUBLISHED,
      });
      expect(res.body.data).toMatchObject({
        id: LESSON_ID,
        courseCode: 'IELTS-4-5',
        blockCount: 2,
      });
      expect(res.body.data.blocks).toHaveLength(2);
    });

    it('GET /lessons/:id: block trỏ tới bài ngữ pháp nháp thì grammarLesson = null', async () => {
      prisma.lesson.findFirst.mockResolvedValue(lessonDetailRow(false));

      const res = await http().get(`/lessons/${LESSON_ID}`).expect(200);

      expect(res.body.data.blocks[0].grammarLesson).toEqual({
        id: GRAMMAR_ID,
        code: 'MOD-01-TENSE',
        title: 'Thì hiện tại đơn',
      });
      expect(res.body.data.blocks[1].grammarLesson).toBeNull();
    });

    it('GET /lessons/:id: khoá bị khoá, khách nhận 401 và không lộ nội dung', async () => {
      prisma.lesson.findFirst.mockResolvedValue(lessonDetailRow(true));

      const res = await http().get(`/lessons/${LESSON_ID}`).expect(401);

      expect(res.body.data).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('Ngữ pháp');
    });

    it('GET /lessons/:id: khoá bị khoá, người chưa ghi danh nhận 403', async () => {
      prisma.lesson.findFirst.mockResolvedValue(lessonDetailRow(true));

      const res = await http()
        .get(`/lessons/${LESSON_ID}`)
        .set('Authorization', 'Bearer learner-token')
        .expect(403);

      expect(res.body.data).toBeUndefined();
    });

    it('GET /lessons/:id: khoá bị khoá, người có Enrollment còn hạn đọc được', async () => {
      prisma.lesson.findFirst.mockResolvedValue(lessonDetailRow(true));
      prisma.enrollment.findMany.mockResolvedValue([
        { courseId: COURSE_ID, expiresAt: null },
      ]);

      const res = await http()
        .get(`/lessons/${LESSON_ID}`)
        .set('Authorization', 'Bearer learner-token')
        .expect(200);

      expect(res.body.data.blocks).toHaveLength(2);
    });

    it('GET /lessons/:id: người đã học thấy block nào xong và tiến độ unit', async () => {
      prisma.lesson.findFirst.mockResolvedValue(lessonDetailRow(false));
      prisma.userLessonProgress.findUnique.mockResolvedValue({
        status: 'IN_PROGRESS',
        completedBlockIds: ['01927f3a-7c1e-7000-8000-000000000007'],
        completedAt: null,
      });

      const res = await http()
        .get(`/lessons/${LESSON_ID}`)
        .set('Authorization', 'Bearer learner-token')
        .expect(200);

      expect(
        res.body.data.blocks.map(
          (block: { completed: boolean }) => block.completed,
        ),
      ).toEqual([true, false]);
      expect(res.body.data.progress).toEqual({
        status: 'IN_PROGRESS',
        completedBlocks: 1,
        totalBlocks: 2,
        completedAt: null,
      });
      expect(res.body.data.blocks[0].test).toBeNull();
    });

    it('GET /lessons/:id: khách không có tiến độ', async () => {
      prisma.lesson.findFirst.mockResolvedValue(lessonDetailRow(false));
      const res = await http().get(`/lessons/${LESSON_ID}`).expect(200);
      expect(res.body.data.progress).toBeNull();
      expect(prisma.userLessonProgress.findUnique).not.toHaveBeenCalled();
    });

    it('GET /lessons/:id: admin xem được khoá bị khoá để duyệt nội dung', async () => {
      prisma.lesson.findFirst.mockResolvedValue(lessonDetailRow(true));

      await http()
        .get(`/lessons/${LESSON_ID}`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
    });

    it('GET /lessons/:id: unit nháp hoặc thuộc khoá nháp thì 404', async () => {
      prisma.lesson.findFirst.mockResolvedValue(null);
      await http().get(`/lessons/${LESSON_ID}`).expect(404);
    });

    it('GET /lessons/:id: id không phải UUID thì 400', async () => {
      await http().get('/lessons/not-a-uuid').expect(400);
      expect(prisma.lesson.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('Swagger', () => {
    it('sinh được tài liệu cho route người học, schema không chứa trường quản trị', () => {
      const document = SwaggerModule.createDocument(
        app,
        new DocumentBuilder().build(),
      );

      expect(Object.keys(document.paths)).toEqual(
        expect.arrayContaining([
          '/grammar/categories',
          '/grammar/lessons',
          '/grammar/lessons/{code}',
          '/courses',
          '/courses/{code}',
          '/lessons/{id}',
        ]),
      );
      const schemas = document.components?.schemas ?? {};
      const course = schemas.PublicCourseDto as {
        properties: Record<string, unknown>;
      };
      expect(Object.keys(course.properties)).toEqual(
        expect.arrayContaining([
          'code',
          'isLocked',
          'hasAccess',
          'lessonCount',
        ]),
      );
      for (const field of ADMIN_ONLY_FIELDS) {
        expect(course.properties).not.toHaveProperty(field);
      }
    });
  });

  describe('Điểm 3: controller admin giữ nguyên hành vi', () => {
    it.each([
      '/admin/courses',
      '/admin/lessons',
      '/admin/grammar/categories',
      '/admin/grammar/lessons',
    ])('GET %s: khách nhận 401', async (path) => {
      await http().get(path).expect(401);
    });

    it('GET /admin/courses: người học nhận 403', async () => {
      await http()
        .get('/admin/courses')
        .set('Authorization', 'Bearer learner-token')
        .expect(403);
      expect(prisma.course.findMany).not.toHaveBeenCalled();
    });

    it('GET /admin/courses: admin vẫn thấy cả khoá nháp', async () => {
      prisma.course.count.mockResolvedValue(1);
      prisma.course.findMany.mockResolvedValue([
        courseRow({ status: 'DRAFT' }),
      ]);

      const res = await http()
        .get('/admin/courses')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(prisma.course.findMany.mock.calls[0][0].where).toEqual({
        deletedAt: null,
      });
      expect(res.body.data.items[0].status).toBe('DRAFT');
    });
  });
});
