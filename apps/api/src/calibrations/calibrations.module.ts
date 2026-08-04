import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CalibrationsController } from './calibrations.controller';
import { CalibrationsService } from './calibrations.service';
import { OoxmlWorkbookService } from './ooxml-workbook.service';
import { FileStorageService } from '../storage/file-storage.service';

@Module({ imports: [AuthModule], controllers: [CalibrationsController], providers: [CalibrationsService, OoxmlWorkbookService, FileStorageService] })
export class CalibrationsModule {}
