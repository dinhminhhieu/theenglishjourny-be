import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '../../common/constants/roles.constant';
import type { AppUser } from '../../common/types/app-user.type';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface CourseAccess {
  hasAccess: boolean;
  /** Ngày hết hạn quyền học. null khi khoá mở, quyền trọn đời, hoặc chưa có quyền. */
  accessExpiresAt: Date | null;
}

export const NO_ACCESS: CourseAccess = {
  hasAccess: false,
  accessExpiresAt: null,
};

type LockableCourse = { id: string; isLocked: boolean };

/** Enrollment còn hiệu lực tại thời điểm `now`: đã bắt đầu và chưa hết hạn. */
export function activeEnrollmentWhere(now: Date): Prisma.EnrollmentWhereInput {
  return {
    startsAt: { lte: now },
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

/**
 * Quyết định ai được học khoá nào. Khoá mở thì ai cũng học được, kể cả khách.
 * Khoá bị khoá cần Enrollment còn hiệu lực; admin được xem để duyệt nội dung.
 */
@Injectable()
export class CourseAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Quyền học trên nhiều khoá, tối đa một truy vấn enrollment. */
  async resolveMany(
    courses: LockableCourse[],
    user?: AppUser,
  ): Promise<Map<string, CourseAccess>> {
    const result = new Map<string, CourseAccess>();
    const needEnrollment: string[] = [];

    for (const course of courses) {
      if (!course.isLocked || user?.role === Role.ADMIN) {
        result.set(course.id, { hasAccess: true, accessExpiresAt: null });
        continue;
      }
      result.set(course.id, NO_ACCESS);
      if (user) {
        needEnrollment.push(course.id);
      }
    }

    if (user && needEnrollment.length > 0) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          userId: user.id,
          courseId: { in: needEnrollment },
          ...activeEnrollmentWhere(new Date()),
        },
        select: { courseId: true, expiresAt: true },
      });
      for (const enrollment of enrollments) {
        result.set(enrollment.courseId, {
          hasAccess: true,
          accessExpiresAt: enrollment.expiresAt,
        });
      }
    }
    return result;
  }

  async resolve(course: LockableCourse, user?: AppUser): Promise<CourseAccess> {
    const access = await this.resolveMany([course], user);
    return access.get(course.id) ?? NO_ACCESS;
  }

  /** Khách nhận 401 để FE mở màn đăng nhập, người đã đăng nhập nhận 403 để FE mời mua khoá. */
  async assertCanLearn(course: LockableCourse, user?: AppUser): Promise<void> {
    const { hasAccess } = await this.resolve(course, user);
    if (hasAccess) {
      return;
    }
    if (!user) {
      throw new UnauthorizedException('Vui lòng đăng nhập để học khoá này');
    }
    throw new ForbiddenException(
      'Bạn chưa ghi danh khoá học này hoặc quyền học đã hết hạn',
    );
  }
}
