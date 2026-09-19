import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { ApiErrorResponseDto } from '../dto/api-response.dto';

type NormalizedError = Pick<
  ApiErrorResponseDto,
  'statusCode' | 'message' | 'errors'
>;

/**
 * Bắt mọi exception và trả về envelope lỗi thống nhất:
 * `{ success: false, statusCode, message, errors, path, timestamp }`.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const { statusCode, message, errors } = this.normalize(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponseDto = {
      success: false,
      statusCode,
      message,
      errors,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(statusCode).json(body);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return { statusCode, message: res, errors: null };
      }

      const { message, error } = res as {
        message?: string | string[];
        error?: string;
      };

      // ValidationPipe trả message dạng mảng: đưa vào `errors`, message tóm tắt chung.
      if (Array.isArray(message)) {
        return { statusCode, message: 'Dữ liệu không hợp lệ', errors: message };
      }

      return {
        statusCode,
        message: message ?? error ?? exception.message,
        errors: null,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Dữ liệu đã tồn tại',
          errors: null,
        };
      }
      if (exception.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Không tìm thấy dữ liệu',
          errors: null,
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Lỗi hệ thống, vui lòng thử lại sau',
      errors: null,
    };
  }
}
