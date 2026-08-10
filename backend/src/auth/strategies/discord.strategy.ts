import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-discord";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy, "discord") {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.get<string>("auth.discordClientId"),
      clientSecret: config.get<string>("auth.discordClientSecret"),
      callbackURL: config.get<string>("auth.discordCallbackUrl"),
      scope: ["identify", "email"],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    const { id, username, email, avatar } = profile;
    return {
      providerId: id,
      provider: "DISCORD" as const,
      email: email || null,
      displayName: username,
      avatar: avatar
        ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png`
        : "default",
    };
  }
}
