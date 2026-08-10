import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TiktokService } from './tiktok.service';

@Controller('api/v1/tiktok')
export class TiktokController {
  constructor(private readonly tiktokService: TiktokService) {}

  @Post('simulate/follow')
  @HttpCode(HttpStatus.OK)
  simulateFollow(@Body('userId') userId: string) {
    this.tiktokService.simulateFollow(userId);
    return { message: `Simulated follow for user: ${userId}` };
  }

  @Post('simulate/like')
  @HttpCode(HttpStatus.OK)
  simulateLike(@Body('userId') userId: string, @Body('count') count: number) {
    this.tiktokService.simulateLike(userId, count);
    return { message: `Simulated ${count} likes for user: ${userId}` };
  }

  @Post('simulate/gift')
  @HttpCode(HttpStatus.OK)
  simulateGift(
    @Body('userId') userId: string,
    @Body('giftId') giftId: string,
    @Body('giftName') giftName: string,
    @Body('value') value: number,
  ) {
    this.tiktokService.simulateGift(userId, giftId, giftName, value);
    return { message: `Simulated gift '${giftName}' for user: ${userId}` };
  }

  @Post('simulate/comment')
  @HttpCode(HttpStatus.OK)
  simulateComment(@Body('userId') userId: string, @Body('comment') comment: string) {
    this.tiktokService.simulateComment(userId, comment);
    return { message: `Simulated comment for user: ${userId} - '${comment}'` };
  }

  @Post('simulate/viewer_join')
  @HttpCode(HttpStatus.OK)
  simulateViewerJoin(@Body('userId') userId: string) {
    this.tiktokService.simulateViewerJoin(userId);
    return { message: `Simulated viewer join for user: ${userId}` };
  }
}
