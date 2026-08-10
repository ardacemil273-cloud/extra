import { Module } from "@nestjs/common";
import { CafeRushService } from "./cafe-rush.service";
import { GameEngineService } from "../../game-engine/game-engine.service";
import { UsersModule } from "../../users/users.module";

@Module({
  imports: [UsersModule],
  providers: [CafeRushService, GameEngineService],
  exports: [CafeRushService],
})
export class CafeRushModule {}
