import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InstrumentFormsService } from './instrument-forms.service';

@Controller('instrument-forms')
@UseGuards(JwtAuthGuard)
export class InstrumentFormsController {
  constructor(private readonly instrumentFormsService: InstrumentFormsService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('needsReview') needsReview?: string,
  ) {
    return this.instrumentFormsService.list(
      search,
      needsReview === 'true' || needsReview === '1',
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.instrumentFormsService.findOne(id);
  }
}
