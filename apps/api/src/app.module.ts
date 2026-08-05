import { Logger, MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envSchema } from '@certindo/validation';
import { AuthModule } from './auth/auth.module';
import { CalibrationsModule } from './calibrations/calibrations.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

import { CompaniesModule } from './companies/companies.module';
import { InstrumentFormsModule } from './instrument-forms/instrument-forms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (value: Record<string, unknown>) => envSchema.parse(value),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    CalibrationsModule,
    DashboardModule,
    HealthModule,
    InstrumentFormsModule,
    CompaniesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, Logger],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
