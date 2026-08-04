import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtSecret: process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production',
  jwtExpires: process.env.JWT_EXPIRES || '15m',
  refreshSecret: process.env.REFRESH_SECRET || 'super-secret-refresh-key-change-in-production',
  refreshExpires: process.env.REFRESH_EXPIRES || '7d',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/google/callback',
  discordClientId: process.env.DISCORD_CLIENT_ID || '',
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET || '',
  discordCallbackUrl: process.env.DISCORD_CALLBACK_URL || 'http://localhost:4000/api/v1/auth/discord/callback',
}));
