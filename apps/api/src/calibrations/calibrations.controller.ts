import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, StreamableFile, UseGuards } from '@nestjs/common';
import type { AuthUser, CalibrationStatus } from '@certindo/types';
import { calibrationStatuses } from '@certindo/types';
import {
  calibrationStatusTransitionSchema,
  type CalibrationStatusTransitionInput,
  createCalibrationSchema,
  type CreateCalibrationInput,
  updateCalibrationSchema,
  type UpdateCalibrationInput,
} from '@certindo/validation';
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

  @Post(':id/generate')
  @Roles('ADMIN', 'TECHNICIAN')
  generate(@Param('id') id: string) {
    return this.calibrations.generateWorkbook(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string) {
    const file = await this.calibrations.getGeneratedWorkbook(id);
    return new StreamableFile(file.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.fileName}"`,
      length: file.buffer.length,
    });
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

  @Patch(':id/status')
  @Roles('ADMIN', 'TECHNICIAN', 'REVIEWER', 'APPROVER')
  transitionStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(calibrationStatusTransitionSchema)) input: CalibrationStatusTransitionInput,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.calibrations.transitionStatus(id, input, request.user);
  }

  @Delete(':id')
  @Roles('ADMIN', 'TECHNICIAN')
  remove(@Param('id') id: string) {
    return this.calibrations.remove(id);
  }
}
