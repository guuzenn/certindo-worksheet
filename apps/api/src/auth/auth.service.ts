import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '@certindo/types';
import type { LoginInput } from '@certindo/validation';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(input: LoginInput): Promise<{ accessToken: string; user: AuthUser }> {
    const user = await this.users.findByEmail(input.email);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Email atau kata sandi tidak sesuai');
    }
    const safeUser: AuthUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
    return { accessToken, user: safeUser };
  }
}
