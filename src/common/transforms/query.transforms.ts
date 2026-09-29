import { TransformFnParams } from 'class-transformer';

/** "true"/"false" từ query string thành boolean, giá trị khác giữ nguyên để validator báo lỗi. */
export const toBoolean = ({ value }: TransformFnParams): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Trim chuỗi, giá trị không phải chuỗi giữ nguyên. */
export const trimString = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;
