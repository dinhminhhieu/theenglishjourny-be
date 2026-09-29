import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Role } from '../../common/constants/roles.constant';
import type { AppUser } from '../../common/types/app-user.type';
import { PrismaService } from '../../prisma/prisma.service';
import { CourseAccessService } from './course-access.service';

const LEARNER: AppUser = {
  id: '01927f3a-7c1e-7000-8000-0000000000aa',
  email: 'learner@example.com',
  displayName: 'Learner',
  role: Role.USER,
  avatarUrl: null,
  isEmailVerified: true,
  isActive: true,
};
const ADMIN: AppUser = { ...LEARNER, id: 'admin-id', role: Role.ADMIN };

const FREE = { id: 'course-free', isLocked: false };
const PAID = { id: 'course-paid', isLocked: true };
const PAID_2 = { id: 'course-paid-2', isLocked: true };

function setup(enrollments: { courseId: string; expiresAt: Date | null }[]) {
  const findMany = jest.fn().mockResolvedValue(enrollments);
  const prisma = { enrollment: { findMany } } as unknown as PrismaService;
  return { service: new CourseAccessService(prisma), findMany };
}

describe('CourseAccessService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-29T03:00:00.000Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('khoá mở: khách cũng học được, không truy vấn enrollment', async () => {
    const { service, findMany } = setup([]);
    await expect(service.resolve(FREE)).resolves.toEqual({
      hasAccess: true,
      accessExpiresAt: null,
    });
    await expect(service.assertCanLearn(FREE)).resolves.toBeUndefined();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('khoá bị khoá: khách nhận 401, không truy vấn enrollment', async () => {
    const { service, findMany } = setup([]);
    await expect(service.assertCanLearn(PAID)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findMany).not.toHaveBeenCalled();
  });

  it('khoá bị khoá: người chưa ghi danh nhận 403', async () => {
    const { service } = setup([]);
    await expect(service.assertCanLearn(PAID, LEARNER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('chỉ tính enrollment đã bắt đầu và chưa hết hạn', async () => {
    const { service, findMany } = setup([]);
    await service.resolve(PAID, LEARNER);
    const now = new Date('2026-09-29T03:00:00.000Z');
    expect(findMany).toHaveBeenCalledWith({
      where: {
        userId: LEARNER.id,
        courseId: { in: [PAID.id] },
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { courseId: true, expiresAt: true },
    });
  });

  it('có enrollment còn hạn thì được học và trả ngày hết hạn', async () => {
    const expiresAt = new Date('2027-01-01T00:00:00.000Z');
    const { service } = setup([{ courseId: PAID.id, expiresAt }]);
    await expect(service.resolve(PAID, LEARNER)).resolves.toEqual({
      hasAccess: true,
      accessExpiresAt: expiresAt,
    });
    await expect(
      service.assertCanLearn(PAID, LEARNER),
    ).resolves.toBeUndefined();
  });

  it('admin xem được khoá bị khoá mà không cần enrollment', async () => {
    const { service, findMany } = setup([]);
    await expect(service.assertCanLearn(PAID, ADMIN)).resolves.toBeUndefined();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('resolveMany: một truy vấn cho nhiều khoá, chỉ hỏi các khoá bị khoá', async () => {
    const { service, findMany } = setup([
      { courseId: PAID.id, expiresAt: null },
    ]);
    const access = await service.resolveMany([FREE, PAID, PAID_2], LEARNER);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where.courseId).toEqual({
      in: [PAID.id, PAID_2.id],
    });
    expect(access.get(FREE.id)?.hasAccess).toBe(true);
    expect(access.get(PAID.id)?.hasAccess).toBe(true);
    expect(access.get(PAID_2.id)?.hasAccess).toBe(false);
  });
});
