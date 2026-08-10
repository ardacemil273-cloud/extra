import { Module } from "@nestjs/common";
import { VampireVillageService } from "./vampire-village.service";
import { GameEngineService } from "../../game-engine/game-engine.service";
import { UsersModule } from "../../users/users.module";

@Module({
  imports: [UsersModule],
  providers: [VampireVillageService, GameEngineService],
  exports: [VampireVillageService],
})
export class VampireVillageModule {}
