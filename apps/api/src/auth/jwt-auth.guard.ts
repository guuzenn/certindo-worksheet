import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser, UserRole } from '@certindo/types';
import type { Request } from 'express';

interface JwtPayload { sub: string; email: string; role: UserRole; name?: string }

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [kind, token] = request.headers.authorization?.split(' ') ?? [];
    if (kind !== 'Bearer' || !token) throw new UnauthorizedException('Token autentikasi diperlukan');
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      request.user = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name ?? payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Token autentikasi tidak valid atau kedaluwarsa');
    }
  }
}
