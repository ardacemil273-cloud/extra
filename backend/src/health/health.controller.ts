import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let dbStatus = "ok";

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "error";
    }

    const healthy = dbStatus === "ok";

    return {
      status: healthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: { database: dbStatus },
    };
  }
}
