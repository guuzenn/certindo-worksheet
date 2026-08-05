import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { User, UserRole } from '@prisma/client';
import type { CreateUserInput, UpdateUserInput } from '@certindo/validation';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async list(search?: string, role?: UserRole) {
    const term = search?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(term
          ? {
              OR: [
                { name: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { createdRecords: true },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdRecordsCount: u._count.createdRecords,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { createdRecords: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdRecordsCount: user._count.createdRecords,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  async create(input: CreateUserInput) {
    const existing = await this.findByEmail(input.email);
    if (existing) {
      throw new ConflictException(`Email ${input.email} sudah terdaftar di sistem`);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const created = await this.prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: input.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return created;
  }

  async update(id: string, input: UpdateUserInput) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    if (input.email && input.email.toLowerCase() !== user.email) {
      const existing = await this.findByEmail(input.email);
      if (existing && existing.id !== id) {
        throw new ConflictException(`Email ${input.email} sudah digunakan pengguna lain`);
      }
    }

    const dataToUpdate: Record<string, unknown> = {
      name: input.name,
      email: input.email.toLowerCase(),
      role: input.role,
    };

    if (input.password && input.password.trim().length >= 8) {
      dataToUpdate.passwordHash = await bcrypt.hash(input.password.trim(), 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async remove(id: string, currentUserId?: string) {
    if (id === currentUserId) {
      throw new BadRequestException('Anda tidak dapat menghapus akun Anda sendiri');
    }

    const user = await this.findOne(id);
    if (user.createdRecordsCount > 0) {
      throw new BadRequestException(
        `Pengguna ${user.name} telah membuat ${user.createdRecordsCount} lembar kerja kalibrasi dan tidak dapat dihapus.`,
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}
