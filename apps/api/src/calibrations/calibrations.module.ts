import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CalibrationsController } from './calibrations.controller';
import { CalibrationsService } from './calibrations.service';

@Module({ imports: [AuthModule], controllers: [CalibrationsController], providers: [CalibrationsService] })
export class CalibrationsModule {}
