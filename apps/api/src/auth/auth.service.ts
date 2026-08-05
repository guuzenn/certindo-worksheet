import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '@certindo/types';
import type { ChangePasswordInput, LoginInput, UpdateProfileInput } from '@certindo/validation';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
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

  async getProfile(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name: input.name },
    });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const isMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Kata sandi saat ini tidak sesuai');
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { success: true };
  }
}
