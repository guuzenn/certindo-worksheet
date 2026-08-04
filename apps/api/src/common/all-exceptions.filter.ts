import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof raw === 'string'
        ? raw
        : raw && typeof raw === 'object' && 'message' in raw
          ? String(raw.message)
          : 'Terjadi kesalahan pada server';

    if (status >= 500) this.logger.error(exception);
    response.status(status).json({
      success: false,
      error: { code: `HTTP_${status}`, message },
      timestamp: new Date().toISOString(),
    });
  }
}
