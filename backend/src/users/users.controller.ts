import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@Controller("users")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("search")
  async search(@Query("q") query: string, @CurrentUser("id") userId: string) {
    if (!query || query.length < 2) return [];
    return this.usersService.searchUsers(query, userId);
  }

  @Get("leaderboard")
  async leaderboard(
    @Query("sort") sort: "wins" | "level" = "wins",
    @Query("limit") limit = 10,
  ) {
    return this.usersService.getLeaderboard(sort, Math.min(Number(limit), 50));
  }

  @Get(":id")
  async getUser(@Param("id") id: string) {
    return this.usersService.findById(id);
  }

  @Get("username/:username")
  async getUserByUsername(@Param("username") username: string) {
    return this.usersService.findByUsername(username);
  }
}
