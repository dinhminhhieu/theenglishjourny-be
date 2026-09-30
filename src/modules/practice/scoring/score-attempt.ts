import type {
  QuestionScore,
  ResponseValue,
  ScorableQuestion,
} from './answer.types';
import { scoreQuestion } from './score-question';

export interface AttemptQuestion extends ScorableQuestion {
  id: string;
}

export interface AttemptQuestionResult extends QuestionScore {
  questionId: string;
}

export interface AttemptScore {
  rawScore: number;
  maxScore: number;
  /** Làm tròn tới số nguyên, 0 nếu bài không có câu nào. */
  percent: number;
  results: AttemptQuestionResult[];
}

/** Chấm cả bài. Câu không có trong `responses` tính là bỏ trống. */
export function scoreAttempt(
  questions: readonly AttemptQuestion[],
  responses: Readonly<Record<string, ResponseValue>>,
): AttemptScore {
  const results = questions.map((question) => ({
    questionId: question.id,
    ...scoreQuestion(question, responses[question.id]),
  }));
  const rawScore = results.reduce((sum, result) => sum + result.score, 0);
  const maxScore = results.reduce((sum, result) => sum + result.maxScore, 0);
  return {
    rawScore,
    maxScore,
    percent: maxScore > 0 ? Math.round((rawScore * 100) / maxScore) : 0,
    results,
  };
}
