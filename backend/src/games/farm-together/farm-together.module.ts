import { Module } from '@nestjs/common';
import { FarmTogetherService } from './farm-together.service';
import { GameEngineService } from '../../game-engine/game-engine.service';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [FarmTogetherService, GameEngineService],
  exports: [FarmTogetherService],
})
export class FarmTogetherModule {}
