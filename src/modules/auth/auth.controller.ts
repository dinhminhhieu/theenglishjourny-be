import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/decorators/api-response.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import type { AppUser } from '../../common/types/app-user.type';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { OtpSentResponseDto } from './dto/otp-sent-response.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @ResponseMessage('Đăng ký thành công, vui lòng kiểm tra email để lấy mã OTP')
  @ApiOperation({
    summary: 'Đăng ký bằng email và mật khẩu',
    description:
      'Tạo tài khoản và gửi OTP tới email. Cần gọi /auth/verify-otp để kích hoạt.',
  })
  @ApiSuccessResponse(OtpSentResponseDto, { status: HttpStatus.CREATED })
  register(@Body() dto: RegisterDto): Promise<OtpSentResponseDto> {
    return this.auth.register(dto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Xác thực email thành công')
  @ApiOperation({
    summary: 'Xác thực email bằng OTP, thành công thì đăng nhập luôn',
  })
  @ApiSuccessResponse(AuthResponseDto)
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.auth.verifyEmail(dto);
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đã gửi lại mã OTP')
  @ApiOperation({ summary: 'Gửi lại OTP xác thực email (cooldown 60 giây)' })
  @ApiSuccessResponse(OtpSentResponseDto)
  resendOtp(@Body() dto: ResendOtpDto): Promise<OtpSentResponseDto> {
    return this.auth.resendVerification(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đăng nhập thành công')
  @ApiOperation({
    summary: 'Đăng nhập bằng email và mật khẩu (email phải đã xác thực)',
  })
  @ApiSuccessResponse(AuthResponseDto)
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi refresh token lấy cặp token mới' })
  @ApiSuccessResponse(AuthResponseDto)
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Đăng xuất thành công')
  @ApiOperation({ summary: 'Thu hồi refresh token' })
  @ApiSuccessResponse()
  async logout(@Body() dto: RefreshTokenDto): Promise<null> {
    await this.auth.logout(dto.refreshToken);
    return null;
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Thông tin user đang đăng nhập' })
  @ApiSuccessResponse(UserResponseDto)
  me(@CurrentUser() user: AppUser): AppUser {
    return user;
  }
}
