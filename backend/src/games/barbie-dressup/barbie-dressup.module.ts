import { Module } from "@nestjs/common";
import { BarbieDressupService } from "./barbie-dressup.service";
import { GameEngineService } from "../../game-engine/game-engine.service";
import { UsersModule } from "../../users/users.module";

@Module({
  imports: [UsersModule],
  providers: [BarbieDressupService, GameEngineService],
  exports: [BarbieDressupService],
})
export class BarbieDressupModule {}
