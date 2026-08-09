import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { SocketStateService } from '../socket-state/socket-state.service';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { v4 as uuidv4 } from 'uuid';
import { AuthProvider } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OAuthProfile {
  providerId: string;
  provider: AuthProvider;
  email: string | null;
  displayName: string;
  avatar: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly socketState: SocketStateService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername) throw new ConflictException('Bu kullanıcı adı zaten kullanılıyor');

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) throw new ConflictException('Bu e-posta adresi zaten kullanılıyor');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        provider: AuthProvider.LOCAL,
        profile: {
          create: {
            displayName: dto.displayName || dto.username,
            avatar: 'default',
          },
        },
        statistics: { create: {} },
      },
    });

    return this.generateTokens(user.id, user.username, false);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.usernameOrEmail },
          { email: dto.usernameOrEmail },
        ],
        provider: AuthProvider.LOCAL,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Kullanıcı adı veya şifre hatalı');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Kullanıcı adı veya şifre hatalı');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeen: new Date() },
    });

    return this.generateTokens(user.id, user.username, false);
  }

  async loginAsGuest(): Promise<AuthTokens> {
    const guestUsername = `Guest_${nanoid(8)}`;

    const user = await this.prisma.user.create({
      data: {
        username: guestUsername,
        provider: AuthProvider.GUEST,
        isGuest: true,
        isOnline: true,
        profile: {
          create: {
            displayName: guestUsername,
            avatar: 'guest',
          },
        },
        statistics: { create: {} },
      },
    });

    return this.generateTokens(user.id, user.username, true);
  }

  async oauthLogin(profile: OAuthProfile): Promise<AuthTokens> {
    let user = await this.prisma.user.findFirst({
      where: { provider: profile.provider, providerId: profile.providerId },
    });

    if (!user) {
      let username = this.sanitizeUsername(profile.displayName);
      username = await this.ensureUniqueUsername(username);

      user = await this.prisma.user.create({
        data: {
          username,
          email: profile.email,
          provider: profile.provider,
          providerId: profile.providerId,
          isOnline: true,
          profile: {
            create: {
              displayName: profile.displayName,
              avatar: profile.avatar,
            },
          },
          statistics: { create: {} },
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeen: new Date() },
      });
    }

    return this.generateTokens(user.id, user.username, false);
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token geçersiz veya süresi dolmuş');
    }

    await this.prisma.refreshToken.delete({ where: { token: refreshToken } });

    return this.generateTokens(
      storedToken.user.id,
      storedToken.user.username,
      storedToken.user.isGuest,
    );
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId, token: refreshToken },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { isOnline: false, lastSeen: new Date() },
    });

    this.socketState.removeUserSocket(userId);
  }

  private async generateTokens(
    userId: string,
    username: string,
    isGuest: boolean,
  ): Promise<AuthTokens> {
    const payload = { sub: userId, username, isGuest };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('auth.jwtSecret'),
      expiresIn: this.config.get<string>('auth.jwtExpires'),
    });

    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { userId, token: refreshTokenValue, expiresAt },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: 15 * 60,
    };
  }

  private sanitizeUsername(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 18);
  }

  private async ensureUniqueUsername(base: string): Promise<string> {
    let username = base;
    let attempt = 0;
    while (await this.prisma.user.findUnique({ where: { username } })) {
      attempt++;
      username = `${base}${attempt}`;
    }
    return username;
  }
}
