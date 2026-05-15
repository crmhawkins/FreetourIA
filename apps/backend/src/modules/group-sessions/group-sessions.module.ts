import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { GroupSessionsService } from './group-sessions.service';
import { GroupSessionsGateway } from './group-sessions.gateway';
import { GroupSessionsController } from './group-sessions.controller';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-only-jwt-secret-change-me-in-production-k8s7x2m9'),
        signOptions: { expiresIn: '60m' },
      }),
    }),
  ],
  controllers: [GroupSessionsController],
  providers: [GroupSessionsService, GroupSessionsGateway],
  exports: [GroupSessionsService],
})
export class GroupSessionsModule { }
