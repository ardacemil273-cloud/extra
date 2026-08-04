import { Controller, Post, Delete, Get, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';

class SendFriendRequestDto {
  @IsString()
  addresseeId: string;
}

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  async getFriends(@CurrentUser('id') userId: string) {
    return this.friendsService.getFriends(userId);
  }

  @Get('requests/pending')
  async getPendingRequests(@CurrentUser('id') userId: string) {
    return this.friendsService.getPendingRequests(userId);
  }

  @Get('requests/sent')
  async getSentRequests(@CurrentUser('id') userId: string) {
    return this.friendsService.getSentRequests(userId);
  }

  @Get('status/:userId')
  async getFriendStatus(@CurrentUser('id') myId: string, @Param('userId') userId: string) {
    return this.friendsService.getFriendStatus(myId, userId);
  }

  @Post('request')
  async sendRequest(@CurrentUser('id') userId: string, @Body() dto: SendFriendRequestDto) {
    return this.friendsService.sendFriendRequest(userId, dto.addresseeId);
  }

  @Post('request/:id/accept')
  async acceptRequest(@CurrentUser('id') userId: string, @Param('id') requestId: string) {
    return this.friendsService.acceptFriendRequest(userId, requestId);
  }

  @Delete('request/:id')
  @HttpCode(HttpStatus.OK)
  async declineRequest(@CurrentUser('id') userId: string, @Param('id') requestId: string) {
    return this.friendsService.declineFriendRequest(userId, requestId);
  }

  @Delete(':friendId')
  @HttpCode(HttpStatus.OK)
  async removeFriend(@CurrentUser('id') userId: string, @Param('friendId') friendId: string) {
    return this.friendsService.removeFriend(userId, friendId);
  }
}
