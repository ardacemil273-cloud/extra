import { Module } from '@nestjs/common';
import { FashionStarService } from './fashion-star.service';
import { GameEngineService } from '../../game-engine/game-engine.service';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [FashionStarService, GameEngineService],
  exports: [FashionStarService],
})
export class FashionStarModule {}
