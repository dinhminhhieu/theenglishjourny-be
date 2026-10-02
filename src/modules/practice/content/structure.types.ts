import type { ExamSkill, TestKind } from '../../../generated/prisma/enums';
import type { FormatKey } from '../formats/exam-formats';

export interface StructureItem {
  itemSetReleaseId: string;
  itemSetId: string;
  part: number | null;
  /** Số hiển thị của câu đầu tiên trong bộ. */
  firstNumber: number;
  questionCount: number;
  totalMarks: number;
}

export interface StructureSection {
  skill: ExamSkill;
  title: string;
  durationMinutes: number | null;
  items: StructureItem[];
}

/** Cấu trúc một đề hoặc một bài làm: các phần, bộ câu hỏi và số câu. Lưu trong TestRelease và Attempt. */
export interface AttemptStructure {
  formatKey: FormatKey;
  /** CUSTOM = bài luyện do hệ thống bốc theo part hoặc dạng câu. */
  kind: TestKind | 'CUSTOM';
  sections: StructureSection[];
}
