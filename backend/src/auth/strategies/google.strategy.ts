import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, VerifyCallback } from "passport-google-oauth20";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(private readonly config: ConfigService) {
    super({
      clientID: config.get<string>("auth.googleClientId"),
      clientSecret: config.get<string>("auth.googleClientSecret"),
      callbackURL: config.get<string>("auth.googleCallbackUrl"),
      scope: ["email", "profile"],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id, displayName, emails, photos } = profile;
    const user = {
      providerId: id,
      provider: "GOOGLE" as const,
      email: emails[0].value,
      displayName,
      avatar: photos[0]?.value || "default",
    };
    done(null, user);
  }
}
