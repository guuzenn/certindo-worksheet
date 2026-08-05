import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InstrumentFormsController } from './instrument-forms.controller';
import { InstrumentFormsService } from './instrument-forms.service';

@Module({
  imports: [PrismaModule],
  controllers: [InstrumentFormsController],
  providers: [InstrumentFormsService],
  exports: [InstrumentFormsService],
})
export class InstrumentFormsModule {}
