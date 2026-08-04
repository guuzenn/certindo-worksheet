import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from '@certindo/types';
import { loginSchema, type LoginInput } from '@certindo/validation';
import type { Request } from 'express';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body(new ZodValidationPipe(loginSchema)) input: LoginInput) {
    return this.auth.login(input);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() request: AuthenticatedRequest): AuthUser {
    return request.user;
  }
}
