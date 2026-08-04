import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = Date.now();
    response.on('finish', () => {
      this.logger.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms`);
    });
    next();
  }
}
