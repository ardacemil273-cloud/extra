import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { DiscordAuthGuard } from "./guards/discord-auth.guard";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import { Throttle } from "@nestjs/throttler";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // =========================
  // REGISTER
  // =========================

  @Public()
  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // =========================
  // LOGIN
  // =========================

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // =========================
  // GUEST LOGIN
  // =========================

  @Public()
  @Post("guest")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async loginAsGuest() {
    return this.authService.loginAsGuest();
  }

  // =========================
  // REFRESH TOKEN
  // =========================

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  // =========================
  // LOGOUT
  // =========================

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser("id") userId: string,
    @Body() dto: RefreshTokenDto,
  ) {
    await this.authService.logout(userId, dto.refreshToken);

    return {
      message: "Çıkış yapıldı",
    };
  }

  // =========================
  // GOOGLE OAUTH
  // =========================

  @Public()
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // GoogleAuthGuard handles the redirect.
  }

  @Public()
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.oauthLogin(req.user as any);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    return res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${encodeURIComponent(
        tokens.accessToken,
      )}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`,
    );
  }

  // =========================
  // DISCORD OAUTH
  // =========================

  @Public()
  @Get("discord")
  @UseGuards(DiscordAuthGuard)
  discordAuth() {
    // DiscordAuthGuard handles the redirect.
  }

  @Public()
  @Get("discord/callback")
  @UseGuards(DiscordAuthGuard)
  async discordCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.oauthLogin(req.user as any);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    return res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${encodeURIComponent(
        tokens.accessToken,
      )}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`,
    );
  }

  // =========================
  // CURRENT USER
  // =========================

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async getMe(@CurrentUser() user: any) {
    return user;
  }
}
