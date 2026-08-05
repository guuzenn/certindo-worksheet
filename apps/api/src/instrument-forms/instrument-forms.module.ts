import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InstrumentFormsController } from './instrument-forms.controller';
import { InstrumentFormsService } from './instrument-forms.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [InstrumentFormsController],
  providers: [InstrumentFormsService],
  exports: [InstrumentFormsService],
})
export class InstrumentFormsModule {}
