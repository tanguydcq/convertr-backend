import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface JwtPayload {
  accountId: string;
}

export interface DecodedToken extends JwtPayload {
  iat: number;
  exp: number;
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.REFRESH_TOKEN_EXPIRES_IN as string,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): DecodedToken {
  return jwt.verify(token, config.JWT_SECRET) as DecodedToken;
}

export function verifyToken(token: string): DecodedToken {
  return jwt.verify(token, config.JWT_SECRET) as DecodedToken;
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as DecodedToken;
  } catch {
    return null;
  }
}

export function getTokenExpirationDate(expiresIn: string): Date {
  const now = new Date();
  const match = expiresIn.match(/^(\d+)([smhd])$/);

  if (!match) {
    // Fallback if format is not regex matched, though config should be correct
    // Assuming config is trusted, maybe just default to 7 days if failing
    // But for MVP let's keep the existing logic or simple parser
    // If expiresIn is just a number string, handle that?
    // Let's stick to the previous logic which was regex based
    throw new Error(`Invalid expiration format: ${expiresIn}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      now.setSeconds(now.getSeconds() + value);
      break;
    case 'm':
      now.setMinutes(now.getMinutes() + value);
      break;
    case 'h':
      now.setHours(now.getHours() + value);
      break;
    case 'd':
      now.setDate(now.getDate() + value);
      break;
  }

  return now;
}
