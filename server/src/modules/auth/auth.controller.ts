import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const ok = await this.authService.validate(dto.username, dto.password);
    if (!ok) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    return {
      token: 'mock-token',
      user: { username: dto.username },
      needsPasswordReset: true,
    };
  }

  @Post('change-password')
  async changePassword(@Body() _dto: ChangePasswordDto) {
    return { ok: true };
  }
}
