import type {
  ItemSetAnswerKey,
  PublicItemSetContent,
  PublicQuestion,
} from '../content/content.types';
import type { AttemptStructure } from '../content/structure.types';
import type { ResponseValue, SlotResult } from '../scoring/answer.types';

export interface ReleaseData {
  content: PublicItemSetContent;
  audioAssetId: string | null;
}

export interface AnswerRow {
  questionId: string;
  response: unknown;
  score: number;
  marks: number;
  isCorrect: boolean;
  slots: unknown;
}

/**
 * Nội dung đề để làm bài: theo đúng cấu trúc, mỗi câu thêm displayNumber, mỗi bộ thêm link audio.
 * Chỉ dùng nội dung công khai của bản phát hành nên không có đáp án.
 */
export function buildSectionsView(
  structure: AttemptStructure,
  releases: ReadonlyMap<string, ReleaseData>,
  audioUrls: ReadonlyMap<string, string>,
): Record<string, unknown>[] {
  return structure.sections.map((section) => ({
    skill: section.skill,
    title: section.title,
    durationMinutes: section.durationMinutes,
    items: section.items.map((item) => {
      const release = requireRelease(releases, item.itemSetReleaseId);
      return {
        releaseId: item.itemSetReleaseId,
        firstNumber: item.firstNumber,
        audioUrl: release.audioAssetId
          ? (audioUrls.get(release.audioAssetId) ?? null)
          : null,
        ...withDisplayNumbers(release.content, item.firstNumber),
      };
    }),
  }));
}

/** Nội dung xem lại: thêm câu trả lời, đúng sai, đáp án, giải thích, transcript. */
export function buildReviewView(
  structure: AttemptStructure,
  releases: ReadonlyMap<string, ReleaseData & { answerKey: ItemSetAnswerKey }>,
  answers: ReadonlyMap<string, AnswerRow>,
  audioUrls: ReadonlyMap<string, string>,
): Record<string, unknown>[] {
  return structure.sections.map((section) => ({
    skill: section.skill,
    title: section.title,
    durationMinutes: section.durationMinutes,
    items: section.items.map((item) => {
      const release = requireRelease(releases, item.itemSetReleaseId);
      const content = withDisplayNumbers(release.content, item.firstNumber);
      return {
        releaseId: item.itemSetReleaseId,
        firstNumber: item.firstNumber,
        audioUrl: release.audioAssetId
          ? (audioUrls.get(release.audioAssetId) ?? null)
          : null,
        transcript: release.answerKey.transcript,
        ...content,
        groups: content.groups.map((group) => ({
          ...group,
          questions: group.questions.map((question) => {
            const key = release.answerKey.questions[question.id];
            const answer = answers.get(question.id);
            return {
              ...question,
              result: answer
                ? {
                    response: answer.response as ResponseValue,
                    score: answer.score,
                    maxScore: answer.marks,
                    isCorrect: answer.isCorrect,
                    slots: answer.slots as SlotResult[],
                  }
                : null,
              correctAnswer: key?.answer ?? null,
              explanation: key?.explanation ?? null,
              evidence: key?.evidence ?? null,
              tags: key?.tags ?? [],
              grammarLessonId: key?.grammarLessonId ?? null,
            };
          }),
        })),
      };
    }),
  }));
}

function withDisplayNumbers(
  content: PublicItemSetContent,
  firstNumber: number,
) {
  return {
    ...content,
    groups: content.groups.map((group) => ({
      ...group,
      questions: group.questions.map((question: PublicQuestion) => ({
        ...question,
        displayNumber: firstNumber + question.number - 1,
      })),
    })),
  };
}

function requireRelease<T>(releases: ReadonlyMap<string, T>, id: string): T {
  const release = releases.get(id);
  if (!release) {
    throw new Error(`Thiếu bản phát hành ${id}`);
  }
  return release;
}

export function releaseIdsOf(structure: AttemptStructure): string[] {
  return structure.sections.flatMap((section) =>
    section.items.map((item) => item.itemSetReleaseId),
  );
}
