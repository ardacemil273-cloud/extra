import { Module } from '@nestjs/common';
import { GameEngineService } from './game-engine.service';
import { GameEngineGateway } from './game-engine.gateway';
import { VampireVillageModule } from '../games/vampire-village/vampire-village.module';
import { FarmTogetherModule } from '../games/farm-together/farm-together.module';
import { FashionStarModule } from '../games/fashion-star/fashion-star.module';
import { CafeRushModule } from '../games/cafe-rush/cafe-rush.module';
import { BarbieDressupModule } from '../games/barbie-dressup/barbie-dressup.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, VampireVillageModule, FarmTogetherModule, FashionStarModule, CafeRushModule, BarbieDressupModule],
  providers: [GameEngineService, GameEngineGateway],
  exports: [GameEngineService, GameEngineGateway],
})
export class GameEngineModule {}
