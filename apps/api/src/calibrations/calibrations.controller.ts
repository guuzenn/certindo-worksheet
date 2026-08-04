import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { AuthUser, CalibrationStatus } from '@certindo/types';
import { calibrationStatuses } from '@certindo/types';
import { createCalibrationSchema, type CreateCalibrationInput, updateCalibrationSchema, type UpdateCalibrationInput } from '@certindo/validation';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { CalibrationsService } from './calibrations.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller('calibrations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CalibrationsController {
  constructor(private readonly calibrations: CalibrationsService) {}

  @Get()
  list(@Query('search') search?: string, @Query('status') rawStatus?: string) {
    const status = calibrationStatuses.includes(rawStatus as CalibrationStatus) ? (rawStatus as CalibrationStatus) : undefined;
    return this.calibrations.list(search, status);
  }

  @Get('options')
  options() {
    return this.calibrations.options();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.calibrations.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'TECHNICIAN')
  create(@Body(new ZodValidationPipe(createCalibrationSchema)) input: CreateCalibrationInput, @Req() request: AuthenticatedRequest) {
    return this.calibrations.create(input, request.user.id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'TECHNICIAN')
  update(@Param('id') id: string, @Body(new ZodValidationPipe(updateCalibrationSchema)) input: UpdateCalibrationInput, @Req() request: AuthenticatedRequest) {
    return this.calibrations.update(id, input, request.user.id);
  }

  @Delete(':id')
  @Roles('ADMIN', 'TECHNICIAN')
  remove(@Param('id') id: string) {
    return this.calibrations.remove(id);
  }
}
