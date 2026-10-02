/**
 * Test tích hợp chạy trên Postgres thật: toàn bộ app, guard, transaction, khoá dòng.
 * Chỉ chạy trên database có tên kết thúc bằng _test vì test xoá dữ liệu trước khi chạy.
 *
 *   pnpm test:db
 *
 * Storage dùng bản giả trong bộ nhớ nên không cần MinIO.
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import {
  IELTS_READING_META,
  ieltsReadingGroups,
  READING_STIMULUS,
} from '../src/modules/practice/content/fixtures';
import { MemoryObjectStorage } from '../src/modules/storage/memory-object-storage';
import { OBJECT_STORAGE } from '../src/modules/storage/object-storage';
import { PrismaService } from '../src/prisma/prisma.service';

// DATABASE_URL được test/db-env.ts trỏ tới database _test trước khi file này chạy.

const PASSWORD = 'Password123!';
/** Các khoá chỉ được có trong đáp án, không bao giờ trong nội dung khi đang làm bài. */
const SECRET_KEYS = [
  'answer',
  'accepted',
  'explanation',
  'evidence',
  'transcript',
  'source',
  'correctAnswer',
];

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeys(child, keys);
    }
  }
  return keys;
}

interface QuestionView {
  id: string;
  displayNumber: number;
  input: { kind: string; multiple?: boolean };
}

type Sections = Array<{
  items: Array<{ groups: Array<{ questions: QuestionView[] }> }>;
}>;

function questionsOf(
  sections: Array<{
    items: Array<{ groups: Array<{ questions: QuestionView[] }> }>;
  }>,
): QuestionView[] {
  return sections.flatMap((section) =>
    section.items.flatMap((item) =>
      item.groups.flatMap((group) => group.questions),
    ),
  );
}

describe('Module luyện tập trên Postgres thật', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const storage = new MemoryObjectStorage();
  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};

  const http = () => request(app.getHttpServer());
  const as = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OBJECT_STORAGE)
      .useValue(storage)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE attempt_answers, attempts, test_releases, test_items, tests,
        item_set_releases, questions, question_groups, item_sets, assets,
        xp_transactions, user_lesson_progress, enrollments, lesson_blocks, lessons,
        courses, refresh_tokens, users CASCADE`);

    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    for (const [who, role] of [
      ['admin', 'ADMIN'],
      ['learner', 'USER'],
      ['poor', 'USER'],
      ['racer', 'USER'],
      ['student', 'USER'],
    ] as const) {
      const user = await prisma.user.create({
        data: {
          email: `${who}@test.local`,
          passwordHash,
          role,
          emailVerifiedAt: new Date(),
        },
      });
      userIds[who] = user.id;
      const res = await http()
        .post('/auth/login')
        .send({ email: `${who}@test.local`, password: PASSWORD })
        .expect(200);
      tokens[who] = res.body.data.accessToken;
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  // ---------- Admin soạn đề ----------

  let readingSetId: string;
  let readingTestId: string;

  it('admin: bộ câu hỏi sai bị chặn và báo đúng vị trí lỗi', async () => {
    const groups = ieltsReadingGroups();
    groups[0].questions[0].answer = { kind: 'OPTION', keys: ['MAYBE'] };
    const res = await http()
      .post('/admin/item-sets')
      .set(as('admin'))
      .send({
        code: 'T-READ-BAD',
        title: 'Bad',
        ...IELTS_READING_META,
        stimulus: READING_STIMULUS,
        groups,
      })
      .expect(400);
    expect(res.body.errors.join(' | ')).toContain(
      'groups[0].questions[0].answer',
    );
  });

  it('admin: tạo, phát hành, sửa, phát hành lại tạo bản mới', async () => {
    const created = await http()
      .post('/admin/item-sets')
      .set(as('admin'))
      .send({
        code: 't-read-001',
        title: 'Urban beekeeping',
        ...IELTS_READING_META,
        stimulus: READING_STIMULUS,
        groups: ieltsReadingGroups(),
      })
      .expect(201);
    readingSetId = created.body.data.id;
    expect(created.body.data).toMatchObject({
      code: 'T-READ-001',
      questionCount: 7,
      totalMarks: 8,
      status: 'DRAFT',
    });

    const first = await http()
      .post(`/admin/item-sets/${readingSetId}/publish`)
      .set(as('admin'))
      .expect(200);
    expect(first.body.data).toMatchObject({
      status: 'PUBLISHED',
      releaseVersion: 1,
      hasUnpublishedChanges: false,
    });

    await http()
      .post(`/admin/item-sets/${readingSetId}/publish`)
      .set(as('admin'))
      .expect(200);
    expect(
      await prisma.itemSetRelease.count({ where: { itemSetId: readingSetId } }),
    ).toBe(1);

    const detail = await http()
      .get(`/admin/item-sets/${readingSetId}`)
      .set(as('admin'))
      .expect(200);
    const groups = detail.body.data.groups;
    groups[0].questions[1].explanation = 'Giải thích mới';
    const replaced = await http()
      .put(`/admin/item-sets/${readingSetId}/questions`)
      .set(as('admin'))
      .send({ groups })
      .expect(200);
    expect(replaced.body.data.hasUnpublishedChanges).toBe(true);
    // Sửa giữ nguyên id câu hỏi để thống kê theo câu không bị đứt.
    expect(replaced.body.data.groups[0].questions[1].id).toBe(
      groups[0].questions[1].id,
    );

    const second = await http()
      .post(`/admin/item-sets/${readingSetId}/publish`)
      .set(as('admin'))
      .expect(200);
    expect(second.body.data.releaseVersion).toBe(2);
  });

  it('admin: Listening cần audio đã upload xong mới phát hành được', async () => {
    const created = await http()
      .post('/admin/item-sets')
      .set(as('admin'))
      .send({
        code: 'T-TOEIC-P1-001',
        title: 'Photo',
        exam: 'TOEIC',
        skill: 'LISTENING',
        part: 1,
        groups: [
          {
            type: 'TOEIC_PHOTOGRAPH',
            content: { imageUrl: 'https://cdn.example.com/p1.jpg' },
            questions: [{ answer: { kind: 'OPTION', keys: ['C'] } }],
          },
        ],
      })
      .expect(201);
    const id = created.body.data.id;
    const noAudio = await http()
      .post(`/admin/item-sets/${id}/publish`)
      .set(as('admin'))
      .expect(400);
    expect(noAudio.body.errors).toContain('Bộ Listening cần có audio');

    const ticket = await http()
      .post('/admin/uploads')
      .set(as('admin'))
      .send({
        purpose: 'AUDIO',
        fileName: 'p1.mp3',
        contentType: 'audio/mpeg',
        sizeBytes: 1000,
      })
      .expect(201);
    const asset = ticket.body.data.asset;
    expect(ticket.body.data.uploadUrl).toContain(asset.key);
    await http()
      .patch(`/admin/item-sets/${id}`)
      .set(as('admin'))
      .send({ audioAssetId: asset.id })
      .expect(200);
    const pending = await http()
      .post(`/admin/item-sets/${id}/publish`)
      .set(as('admin'))
      .expect(400);
    expect(pending.body.errors).toContain('Audio chưa upload xong');

    await http()
      .post(`/admin/uploads/${asset.id}/complete`)
      .set(as('admin'))
      .send({})
      .expect(400);
    storage.simulateUpload('PRIVATE', asset.key as string, 1000, 'audio/mpeg');
    const done = await http()
      .post(`/admin/uploads/${asset.id}/complete`)
      .set(as('admin'))
      .send({ durationSeconds: 12 })
      .expect(200);
    expect(done.body.data).toMatchObject({
      status: 'READY',
      durationSeconds: 12,
    });
    await http()
      .post(`/admin/item-sets/${id}/publish`)
      .set(as('admin'))
      .expect(200);
    await http()
      .delete(`/admin/uploads/${asset.id}`)
      .set(as('admin'))
      .expect(409);
  });

  it('admin: đề TOEIC FULL thiếu câu bị báo cụ thể từng part', async () => {
    const setId = (
      await prisma.itemSet.findUniqueOrThrow({
        where: { code: 'T-TOEIC-P1-001' },
      })
    ).id;
    const test = await http()
      .post('/admin/tests')
      .set(as('admin'))
      .send({
        code: 'T-TOEIC-FULL',
        title: 'Full',
        exam: 'TOEIC',
        kind: 'FULL',
        itemSetIds: [setId],
      })
      .expect(201);
    expect(test.body.data.blueprint.ok).toBe(false);
    expect(test.body.data.blueprint.errors).toContain(
      'Listening Photographs: cần 6 câu, hiện có 1',
    );
    await http()
      .post(`/admin/tests/${test.body.data.id}/publish`)
      .set(as('admin'))
      .expect(400);
  });

  it('admin: ghép và phát hành đề luyện tập IELTS', async () => {
    const test = await http()
      .post('/admin/tests')
      .set(as('admin'))
      .send({
        code: 'T-IELTS-READ-PRACTICE',
        title: 'IELTS Reading practice',
        exam: 'IELTS',
        module: 'ACADEMIC',
        kind: 'PRACTICE',
        skill: 'READING',
        itemSetIds: [readingSetId],
      })
      .expect(201);
    readingTestId = test.body.data.id;
    expect(test.body.data.blueprint.ok).toBe(true);
    const published = await http()
      .post(`/admin/tests/${readingTestId}/publish`)
      .set(as('admin'))
      .expect(200);
    expect(published.body.data).toMatchObject({
      status: 'PUBLISHED',
      releaseVersion: 1,
    });
  });

  // ---------- Người học làm bài ----------

  let attemptId: string;
  let questions: QuestionView[];

  it('khách xem được thư viện nhưng không bắt đầu làm bài được', async () => {
    const list = await http().get('/tests').expect(200);
    expect(
      list.body.data.items.map((test: { code: string }) => test.code),
    ).toContain('T-IELTS-READ-PRACTICE');
    expect(list.body.data.items[0].me).toBeNull();
    await http().post(`/tests/${readingTestId}/attempts`).send({}).expect(401);
  });

  it('bắt đầu làm bài: có nội dung đề, không lộ đáp án', async () => {
    const res = await http()
      .post(`/tests/${readingTestId}/attempts`)
      .set(as('learner'))
      .send({})
      .expect(200);
    const data = res.body.data;
    attemptId = data.attempt.id;
    expect(data.attempt).toMatchObject({
      mode: 'PRACTICE',
      status: 'IN_PROGRESS',
      questionCount: 7,
      maxScore: 8,
    });
    expect(data.resumed).toBe(false);
    const keys = collectKeys(data.sections);
    for (const secret of SECRET_KEYS) {
      expect(keys.has(secret)).toBe(false);
    }
    const text = JSON.stringify(data);
    expect(text).not.toContain('Đoạn B nói');
    expect(text).not.toContain('roofs');
    questions = questionsOf(data.sections as Sections);
    expect(questions.map((question) => question.displayNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);

    const again = await http()
      .post(`/tests/${readingTestId}/attempts`)
      .set(as('learner'))
      .send({})
      .expect(200);
    expect(again.body.data).toMatchObject({
      resumed: true,
      attempt: { id: attemptId },
    });
  });

  it('người khác gọi vào bài của mình nhận 404', async () => {
    await http().get(`/attempts/${attemptId}`).set(as('poor')).expect(404);
  });

  it('lưu nháp: bỏ qua lần lưu cũ, chặn câu lạ và sai kiểu', async () => {
    const [q1, q2] = questions;
    const saved = await http()
      .put(`/attempts/${attemptId}/draft`)
      .set(as('learner'))
      .send({ seq: 2, answers: { [q1.id]: 'TRUE', [q2.id]: 'NOT_GIVEN' } })
      .expect(200);
    expect(saved.body.data).toMatchObject({ accepted: true, draftSeq: 2 });

    const stale = await http()
      .put(`/attempts/${attemptId}/draft`)
      .set(as('learner'))
      .send({ seq: 1, answers: {} })
      .expect(200);
    expect(stale.body.data.accepted).toBe(false);

    await http()
      .put(`/attempts/${attemptId}/draft`)
      .set(as('learner'))
      .send({
        seq: 3,
        answers: { '01927f3a-7c1e-7000-8000-000000000999': 'A' },
      })
      .expect(400);
    await http()
      .put(`/attempts/${attemptId}/draft`)
      .set(as('learner'))
      .send({ seq: 3, answers: { [q1.id]: ['TRUE'] } })
      .expect(400);

    const detail = await http()
      .get(`/attempts/${attemptId}`)
      .set(as('learner'))
      .expect(200);
    expect(detail.body.data.draft).toEqual({
      [q1.id]: 'TRUE',
      [q2.id]: 'NOT_GIVEN',
    });
  });

  it('luyện tập: xem đáp án một câu thì câu đó bị khoá', async () => {
    const [q1] = questions;
    const checked = await http()
      .post(`/attempts/${attemptId}/check`)
      .set(as('learner'))
      .send({ questionId: q1.id, response: 'TRUE' })
      .expect(200);
    expect(checked.body.data).toMatchObject({
      displayNumber: 1,
      isCorrect: false,
      correctAnswer: { kind: 'OPTION', keys: ['FALSE'] },
    });
    await http()
      .put(`/attempts/${attemptId}/draft`)
      .set(as('learner'))
      .send({ seq: 4, answers: { [q1.id]: 'FALSE' } })
      .expect(200);
    const detail = await http()
      .get(`/attempts/${attemptId}`)
      .set(as('learner'))
      .expect(200);
    expect(detail.body.data.draft[q1.id]).toBe('TRUE');
    expect(Object.keys(detail.body.data.checked as object)).toEqual([q1.id]);
  });

  it('nộp bài: chấm một lần, gọi lại trả kết quả cũ, sau đó không sửa được', async () => {
    const [, q2, q3, q4, q5, q6, q7] = questions;
    const answers = {
      [q2.id]: 'NOT_GIVEN',
      [q3.id]: 'ii',
      [q4.id]: 'iii',
      [q5.id]: 'Rooftops.',
      [q6.id]: 'honey',
      [q7.id]: ['C', 'A'],
    };
    const submitted = await http()
      .post(`/attempts/${attemptId}/submit`)
      .set(as('learner'))
      .send({ seq: 10, answers })
      .expect(200);
    expect(submitted.body.data.attempt).toMatchObject({
      status: 'GRADED',
      rawScore: 7,
      maxScore: 8,
      percent: 88,
    });
    expect(submitted.body.data.result.overall).toEqual({
      kind: 'PERCENT',
      value: 88,
    });

    const again = await http()
      .post(`/attempts/${attemptId}/submit`)
      .set(as('learner'))
      .send({})
      .expect(200);
    expect(again.body.data.attempt.rawScore).toBe(7);
    expect(await prisma.attemptAnswer.count({ where: { attemptId } })).toBe(7);

    await http()
      .put(`/attempts/${attemptId}/draft`)
      .set(as('learner'))
      .send({ seq: 11, answers: {} })
      .expect(409);
  });

  it('xem lại: có đáp án, giải thích, kết quả từng câu', async () => {
    const res = await http()
      .get(`/attempts/${attemptId}/review`)
      .set(as('learner'))
      .expect(200);
    const reviewed = res.body.data.sections[0].items[0].groups[0].questions[0];
    expect(reviewed).toMatchObject({
      displayNumber: 1,
      correctAnswer: { kind: 'OPTION', keys: ['FALSE'] },
      explanation: 'Đoạn B nói ong thành phố cho nhiều mật hơn.',
      result: { response: 'TRUE', isCorrect: false },
    });
  });

  it('nộp bài được cộng XP điểm danh và XP hoàn thành đề', async () => {
    const xp = await http().get('/me/xp').set(as('learner')).expect(200);
    expect(xp.body.data).toMatchObject({
      xpBalance: 35,
      xpTotal: 35,
      streakDays: 1,
      activeToday: true,
    });
  });

  // ---------- Song song ----------

  it('bấm bắt đầu nhiều lần cùng lúc chỉ tạo một bài', async () => {
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        http()
          .post(`/tests/${readingTestId}/attempts`)
          .set(as('racer'))
          .send({}),
      ),
    );
    expect(responses.map((res) => res.status)).toEqual([
      200, 200, 200, 200, 200,
    ]);
    const ids = new Set(responses.map((res) => res.body.data.attempt.id));
    expect(ids.size).toBe(1);
    expect(
      await prisma.attempt.count({
        where: { userId: userIds.racer, status: 'IN_PROGRESS' },
      }),
    ).toBe(1);
  });

  it('nộp nhiều lần cùng lúc chỉ chấm một lần', async () => {
    const attempt = await prisma.attempt.findFirstOrThrow({
      where: { userId: userIds.racer },
    });
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        http().post(`/attempts/${attempt.id}/submit`).set(as('racer')).send({}),
      ),
    );
    expect(responses.every((res) => res.status === 200)).toBe(true);
    expect(
      await prisma.attemptAnswer.count({ where: { attemptId: attempt.id } }),
    ).toBe(7);
    const completions = await prisma.xpTransaction.count({
      where: { userId: userIds.racer, reason: 'TEST_COMPLETED' },
    });
    expect(completions).toBe(1);
  });

  // ---------- Thi thử có giờ ----------

  it('hết giờ: lưu nháp bị chặn và bài được nộp tự động', async () => {
    await prisma.test.update({
      where: { id: readingTestId },
      data: { durationMinutes: 20 },
    });
    await http()
      .post(`/admin/tests/${readingTestId}/publish`)
      .set(as('admin'))
      .expect(200);
    const started = await http()
      .post(`/tests/${readingTestId}/attempts`)
      .set(as('student'))
      .send({ mode: 'EXAM' })
      .expect(200);
    const id = started.body.data.attempt.id;
    expect(started.body.data.timer.remainingSeconds).toBeGreaterThan(1190);

    await http()
      .post(`/attempts/${id}/check`)
      .set(as('student'))
      .send({
        questionId: questionsOf(started.body.data.sections as Sections)[0].id,
      })
      .expect(403);

    await prisma.attempt.update({
      where: { id },
      data: { deadlineAt: new Date(Date.now() - 5 * 60 * 1000) },
    });
    await http()
      .put(`/attempts/${id}/draft`)
      .set(as('student'))
      .send({ seq: 1, answers: {} })
      .expect(409);
    const detail = await http()
      .get(`/attempts/${id}`)
      .set(as('student'))
      .expect(200);
    expect(detail.body.data.attempt).toMatchObject({
      status: 'GRADED',
      submitReason: 'TIMEOUT',
    });
  });

  // ---------- XP và mở khoá đề ----------

  it('mở khoá đề bằng XP: thiếu XP trả 402, mở hai lần chỉ trừ một lần', async () => {
    await prisma.test.update({
      where: { id: readingTestId },
      data: { xpCost: 20 },
    });
    await http()
      .post(`/tests/${readingTestId}/attempts`)
      .set(as('poor'))
      .send({})
      .expect(403);
    const denied = await http()
      .post(`/tests/${readingTestId}/unlock`)
      .set(as('poor'))
      .expect(402);
    expect(denied.body.message).toBe('Cần 20 XP, bạn đang có 0 XP');

    await prisma.user.update({
      where: { id: userIds.poor },
      data: { xpBalance: 25, xpTotal: 25 },
    });
    const unlocks = await Promise.all([
      http().post(`/tests/${readingTestId}/unlock`).set(as('poor')),
      http().post(`/tests/${readingTestId}/unlock`).set(as('poor')),
    ]);
    expect(unlocks.map((res) => res.status)).toEqual([200, 200]);
    expect(unlocks.map((res) => res.body.data.xpSpent).sort()).toEqual([0, 20]);
    const me = await prisma.user.findUniqueOrThrow({
      where: { id: userIds.poor },
    });
    expect(me.xpBalance).toBe(5);
    await http()
      .post(`/tests/${readingTestId}/attempts`)
      .set(as('poor'))
      .send({})
      .expect(200);
    await prisma.test.update({
      where: { id: readingTestId },
      data: { xpCost: 0 },
    });
  });

  // ---------- Học trong unit ----------

  it('block trong unit: cần ghi danh, nộp bài thì block xong, đủ block thì unit xong', async () => {
    const [reading, vocabulary] = await Promise.all([
      prisma.skill.upsert({
        where: { name: 'Reading' },
        create: { name: 'Reading' },
        update: {},
      }),
      prisma.skill.upsert({
        where: { name: 'Vocabulary' },
        create: { name: 'Vocabulary' },
        update: {},
      }),
    ]);
    const course = await http()
      .post('/admin/courses')
      .set(as('admin'))
      .send({ code: 'T-COURSE', title: 'Course', isLocked: true })
      .expect(201);
    const lesson = await http()
      .post('/admin/lessons')
      .set(as('admin'))
      .send({
        courseId: course.body.data.id,
        code: 'UNIT-01',
        title: 'Unit 1',
        xpReward: 50,
      })
      .expect(201);
    const lessonId = lesson.body.data.id;
    const blocks = await http()
      .put(`/admin/lessons/${lessonId}/blocks`)
      .set(as('admin'))
      .send({
        blocks: [
          {
            kind: 'READING',
            skillId: reading.id,
            title: 'Reading',
            xpReward: 20,
            testId: readingTestId,
          },
          {
            kind: 'VOCABULARY',
            skillId: vocabulary.id,
            title: 'Words',
            xpReward: 10,
          },
        ],
      })
      .expect(200);
    const [readingBlock, vocabBlock] = blocks.body.data.blocks;
    expect(readingBlock.testId).toBe(readingTestId);
    await http()
      .post(`/admin/lessons/${lessonId}/publish`)
      .set(as('admin'))
      .expect(200);
    await http()
      .post(`/admin/courses/${course.body.data.id}/publish`)
      .set(as('admin'))
      .expect(200);

    await http()
      .post(`/lesson-blocks/${readingBlock.id}/attempts`)
      .set(as('student'))
      .send({})
      .expect(403);
    await prisma.enrollment.create({
      data: {
        userId: userIds.student,
        courseId: course.body.data.id,
        source: 'ADMIN',
      },
    });

    const lessonView = await http()
      .get(`/lessons/${lessonId}`)
      .set(as('student'))
      .expect(200);
    expect(lessonView.body.data.blocks[0].test).toMatchObject({
      id: readingTestId,
      questionCount: 7,
    });
    expect(lessonView.body.data.progress).toBeNull();

    const started = await http()
      .post(`/lesson-blocks/${readingBlock.id}/attempts`)
      .set(as('student'))
      .send({})
      .expect(200);
    await http()
      .post(`/lesson-blocks/${readingBlock.id}/complete`)
      .set(as('student'))
      .expect(400);
    await http()
      .post(`/attempts/${started.body.data.attempt.id}/submit`)
      .set(as('student'))
      .send({})
      .expect(200);

    const done = await http()
      .post(`/lesson-blocks/${vocabBlock.id}/complete`)
      .set(as('student'))
      .expect(200);
    expect(done.body.data).toEqual({
      newlyCompleted: true,
      lessonCompleted: true,
      completedBlocks: 2,
      totalBlocks: 2,
    });
    const repeat = await http()
      .post(`/lesson-blocks/${vocabBlock.id}/complete`)
      .set(as('student'))
      .expect(200);
    expect(repeat.body.data.newlyCompleted).toBe(false);

    const reasons = await prisma.xpTransaction.findMany({
      where: {
        userId: userIds.student,
        reason: { in: ['BLOCK_COMPLETED', 'LESSON_COMPLETED'] },
      },
      select: { reason: true, amount: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(reasons).toEqual([
      { reason: 'BLOCK_COMPLETED', amount: 20 },
      { reason: 'BLOCK_COMPLETED', amount: 10 },
      { reason: 'LESSON_COMPLETED', amount: 50 },
    ]);
    const after = await http()
      .get(`/lessons/${lessonId}`)
      .set(as('student'))
      .expect(200);
    expect(after.body.data.progress).toMatchObject({
      status: 'COMPLETED',
      completedBlocks: 2,
      totalBlocks: 2,
    });
  });

  // ---------- Luyện theo part ----------

  it('luyện theo dạng câu: hệ thống bốc bộ đã phát hành', async () => {
    const catalog = await http()
      .get('/practice/catalog')
      .query({ exam: 'IELTS' })
      .expect(200);
    expect(catalog.body.data.parts).toEqual([
      {
        skill: 'READING',
        part: 1,
        name: 'Bài đọc 1',
        itemSets: 1,
        questions: 8,
      },
    ]);
    const session = await http()
      .post('/practice/sessions')
      .set(as('learner'))
      .send({
        exam: 'IELTS',
        skill: 'READING',
        questionType: 'IELTS_MATCHING_HEADINGS',
        questionCount: 5,
      })
      .expect(201);
    expect(session.body.data.attempt).toMatchObject({
      source: 'CUSTOM',
      mode: 'PRACTICE',
      title: 'Luyện IELTS Academic: Nối tiêu đề với đoạn văn',
    });
    await http()
      .post('/practice/sessions')
      .set(as('learner'))
      .send({ exam: 'TOEIC', skill: 'READING', part: 5 })
      .expect(404);
  });
});
