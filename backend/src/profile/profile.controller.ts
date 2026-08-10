import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ProfileService, UpdateProfileDto } from "./profile.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("profile")
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get("me")
  async getMyProfile(@CurrentUser("id") userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Patch("me")
  async updateMyProfile(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(userId, dto);
  }

  @Get(":userId")
  async getProfile(@Param("userId") userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Get("me/achievements")
  async getMyAchievements(@CurrentUser("id") userId: string) {
    return this.profileService.getAchievements(userId);
  }

  @Get("me/history")
  async getMyHistory(
    @CurrentUser("id") userId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return this.profileService.getGameHistory(
      userId,
      Number(page),
      Math.min(Number(limit), 50),
    );
  }

  @Get("avatars")
  getAvatarOptions() {
    return this.profileService.getAvatarOptions();
  }
}
