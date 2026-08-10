import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { CacheModule } from "@nestjs/cache-manager";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { ProfileModule } from "./profile/profile.module";
import { FriendsModule } from "./friends/friends.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { RoomsModule } from "./rooms/rooms.module";
import { GameEngineModule } from "./game-engine/game-engine.module";
import { VoiceModule } from "./voice/voice.module";
import { HealthModule } from "./health/health.module";
import { SocketStateModule } from "./socket-state/socket-state.module";
import { TiktokModule } from "./tiktok/tiktok.module";
import appConfig from "./config/app.config";
import authConfig from "./config/auth.config";
import databaseConfig from "./config/database.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig],
      envFilePath: ".env",
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get("THROTTLE_TTL", 60000),
          limit: config.get("THROTTLE_LIMIT", 100),
        },
      ],
    }),
    EventEmitterModule.forRoot({ wildcard: true }),
    ScheduleModule.forRoot(),
    CacheModule.register({ isGlobal: true, ttl: 60 }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProfileModule,
    FriendsModule,
    NotificationsModule,
    RoomsModule,
    GameEngineModule,
    VoiceModule,
    HealthModule,
    SocketStateModule,
    TiktokModule,
  ],
})
export class AppModule {}
