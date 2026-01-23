import { randomBytes } from 'crypto';
import prisma from '../../lib/prisma.js';
import { verifyPassword } from '../../lib/password.js';
import { generateAccessToken, getTokenExpirationDate, JwtPayload } from '../../lib/jwt.js';
import { config } from '../../config/index.js';
import { User } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
}

class AuthService {
  /**
   * Authenticate user with email and password
   */
  async login(email: string, password: string): Promise<{ tokens: TokenPair; user: AuthenticatedUser }> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AuthError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new AuthError('Invalid credentials', 401);
    }

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshTokenValue: string): Promise<TokenPair> {
    // Find and validate refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AuthError('Invalid refresh token', 401);
    }

    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new AuthError('Refresh token has expired', 401);
    }

    // Delete the old refresh token (rotation)
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new token pair
    return this.generateTokenPair(storedToken.user);
  }

  /**
   * Logout - invalidate refresh token
   */
  async logout(refreshTokenValue: string): Promise<void> {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
    });

    if (storedToken) {
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
    }
  }

  /**
   * Logout all sessions for a user
   */
  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Generate access and refresh token pair
   */
  private async generateTokenPair(user: User): Promise<TokenPair> {
    const payload: JwtPayload = {
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = generateAccessToken(payload);

    // Generate a secure random refresh token
    const refreshTokenValue = randomBytes(64).toString('hex');
    const expiresAt = getTokenExpirationDate(config.REFRESH_TOKEN_EXPIRES_IN);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: config.JWT_EXPIRES_IN,
    };
  }

  /**
   * Clean up expired refresh tokens (can be called by a cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export const authService = new AuthService();
