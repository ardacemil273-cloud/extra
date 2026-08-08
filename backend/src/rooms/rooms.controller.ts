import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';

class JoinRoomDto {
  @IsString()
  codeOrId: string;

  @IsString()
  @IsOptional()
  password?: string;
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async createRoom(@CurrentUser('id') userId: string, @Body() dto: CreateRoomDto) {
    return this.roomsService.createRoom(userId, dto);
  }

  @Post('join')
  async joinRoom(@CurrentUser('id') userId: string, @Body() dto: JoinRoomDto) {
    return this.roomsService.joinRoom(userId, dto.codeOrId, dto.password);
  }

  @Get('public')
  async getPublicRooms() {
    return this.roomsService.getPublicRooms();
  }

  @Get('code/:code')
  async getRoomByCode(@Param('code') code: string) {
    return this.roomsService.getRoomByCode(code);
  }

  @Get(':id')
  async getRoom(@Param('id') id: string) {
    return this.roomsService.getRoomById(id);
  }

@Delete(':id/leave')
  @HttpCode(HttpStatus.OK)
  async leaveRoom(@CurrentUser('id') userId: string, @Param('id') roomId: string) {
    return this.roomsService.leaveRoom(userId, roomId);
  }

  @Post(':id/rematch')
  @HttpCode(HttpStatus.OK)
  async rematch(@Param('id') roomId: string) {
    return this.roomsService.rematch(roomId);
  }
}
