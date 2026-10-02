/**
 * Kiểu dữ liệu của thư viện chấm điểm Reading và Listening.
 * Thư viện chỉ gồm hàm thuần: không import Nest, không import Prisma, để test bằng bảng fixture.
 */

/** Chọn một key. Dùng cho MCQ, True/False/Not Given, các dạng matching, word bank, chữ cái trên bản đồ. */
export interface OptionAnswer {
  kind: 'OPTION';
  /** Thường chỉ một key. Có nhiều key nghĩa là key nào cũng đúng. */
  keys: string[];
}

/** "Choose TWO/THREE letters": một câu với `marks` = số key, mỗi key đúng được một điểm, không tính thứ tự. */
export interface OptionSetAnswer {
  kind: 'OPTION_SET';
  keys: string[];
}

/** Điền từ. Mỗi phần tử là một cách viết được chấp nhận, phần trong ngoặc là tuỳ chọn, vd "(the) river bank". */
export interface TextAnswer {
  kind: 'TEXT';
  accepted: string[];
  /** true = so khớp nghiêm: chỉ bỏ qua hoa thường, dấu câu, khoảng trắng. Dùng cho bài chính tả, viết số bằng chữ. */
  strict?: boolean;
}

/** Nhiều ô điền từ chấm chung, không tính thứ tự ("IN EITHER ORDER"). Mỗi item là một ô. */
export interface TextSetAnswer {
  kind: 'TEXT_SET';
  items: { accepted: string[] }[];
  strict?: boolean;
}

export type AnswerSpec =
  OptionAnswer | OptionSetAnswer | TextAnswer | TextSetAnswer;

export type AnswerKind = AnswerSpec['kind'];

/**
 * Giới hạn số từ ghi trong đề.
 * - "ONE WORD ONLY" = { maxWords: 1, allowNumber: false }
 * - "NO MORE THAN TWO WORDS AND/OR A NUMBER" = { maxWords: 2, allowNumber: true }
 * - "A NUMBER" = { maxWords: 0, allowNumber: true }
 */
export interface WordLimit {
  maxWords: number;
  /** true = được thêm đúng một số ngoài `maxWords` từ. */
  allowNumber: boolean;
}

/** Câu trả lời của người học: chuỗi cho câu một ô, mảng chuỗi cho câu nhiều ô. null/undefined = bỏ trống. */
export type ResponseValue = string | string[] | null | undefined;

export type SlotReason =
  | 'CORRECT'
  | 'WRONG'
  | 'BLANK'
  | 'OVER_WORD_LIMIT'
  /** Sai kiểu dữ liệu, vd gửi mảng cho câu một ô. Lớp DTO lẽ ra đã chặn trước. */
  | 'INVALID';

/** Kết quả của từng ô trong câu, để FE tô đúng sai. */
export interface SlotResult {
  correct: boolean;
  reason: SlotReason;
}

export interface ScorableQuestion {
  /** Số điểm tối đa của câu, bằng số ô. Câu "Choose TWO" có marks = 2. */
  marks: number;
  answer: AnswerSpec;
  /** Giới hạn số từ của group, chỉ áp dụng cho TEXT và TEXT_SET. */
  wordLimit?: WordLimit | null;
}

export interface QuestionScore {
  score: number;
  maxScore: number;
  isCorrect: boolean;
  slots: SlotResult[];
}
