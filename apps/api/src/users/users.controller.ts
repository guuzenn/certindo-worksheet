import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from '@certindo/validation';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
  ) {
    return this.usersService.list(search, role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.usersService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateUserSchema)) body: UpdateUserInput,
  ) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: { user?: { id: string } },
  ) {
    return this.usersService.remove(id, req.user?.id);
  }
}
