import { Module } from '@nestjs/common';
import { TiktokService } from './tiktok.service';
import { TiktokController } from './tiktok.controller';

@Module({
  imports: [],
  controllers: [TiktokController],
  providers: [TiktokService],
  exports: [TiktokService],
})
export class TiktokModule {}
