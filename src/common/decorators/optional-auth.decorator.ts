import { SetMetadata } from '@nestjs/common';

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';

/**
 * Route cho cả khách lẫn người đã đăng nhập. Không gửi token thì vào như khách
 * và `@CurrentUser()` là undefined. Đã gửi token thì token phải hợp lệ: sai hoặc
 * hết hạn vẫn trả 401 để client biết mà refresh, không âm thầm coi là khách.
 */
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
