import { Module } from '@nestjs/common';
import { GameEngineService } from './game-engine.service';
import { GameEngineGateway } from './game-engine.gateway';
import { VampireVillageModule } from '../games/vampire-village/vampire-village.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, VampireVillageModule],
  providers: [GameEngineService, GameEngineGateway],
  exports: [GameEngineService, GameEngineGateway],
})
export class GameEngineModule {}
