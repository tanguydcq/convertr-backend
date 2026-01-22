import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  role: string;
  tenantId: string | null;
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
