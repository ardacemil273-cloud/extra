import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_OPTIONS',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        url: config.get('database.redisUrl'),
      }),
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
