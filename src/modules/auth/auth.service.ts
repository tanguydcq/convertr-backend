import { randomBytes } from 'crypto';
import prisma from '../../lib/prisma.js';
import { verifyPassword } from '../../lib/password.js';
import { generateAccessToken, getTokenExpirationDate, JwtPayload } from '../../lib/jwt.js';
import { config } from '../../config/index.js';
import { Account } from '@prisma/client';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthenticatedAccount {
  id: string;
  email: string;
  name: string;
}

class AuthService {
  /**
   * Authenticate account with email and password
   */
  async login(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<{ tokens: TokenPair; account: AuthenticatedAccount }> {
    // Find account by email
    const account = await prisma.account.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!account) {
      // Use dummy verification to prevent timing attacks? 
      // For MVP simplicity, just throw.
      await this.logAuthAction('LOGIN_FAILED', 'unknown', { email }, ipAddress, userAgent);
      throw new AuthError('Invalid credentials', 401);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, account.passwordHash);
    if (!isValidPassword) {
      await this.logAuthAction('LOGIN_FAILED', account.id, { reason: 'invalid_password' }, ipAddress, userAgent);
      throw new AuthError('Invalid credentials', 401);
    }

    // Generate tokens
    const tokens = await this.generateTokenPair(account);

    await this.logAuthAction('LOGIN_SUCCESS', account.id, {}, ipAddress, userAgent);

    return {
      tokens,
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshTokenValue: string, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    // Find and validate refresh token
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { account: true },
    });

    if (!storedToken) {
      throw new AuthError('Invalid refresh token', 401);
    }

    if (storedToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      await this.logAuthAction('REFRESH_EXPIRED', storedToken.accountId, {}, ipAddress, userAgent);
      throw new AuthError('Refresh token has expired', 401);
    }

    // Delete the old refresh token (rotation)
    await prisma.refreshToken.delete({
      where: { id: storedToken.id },
    });

    // Generate new token pair
    const tokens = await this.generateTokenPair(storedToken.account);

    await this.logAuthAction('REFRESH_SUCCESS', storedToken.account.id, {}, ipAddress, userAgent);

    return tokens;
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
   * Logout all sessions for an account
   */
  async logoutAll(accountId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { accountId },
    });
  }

  /**
   * Generate access and refresh token pair
   */
  private async generateTokenPair(account: Account): Promise<TokenPair> {
    const payload: JwtPayload = {
      accountId: account.id,
    };

    const accessToken = generateAccessToken(payload);

    // Generate a secure random refresh token
    const refreshTokenValue = randomBytes(64).toString('hex');
    const expiresAt = getTokenExpirationDate(config.REFRESH_TOKEN_EXPIRES_IN);

    // Store refresh token in database associated with Account
    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        accountId: account.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: config.JWT_EXPIRES_IN,
    };
  }

  private async logAuthAction(
    action: string,
    accountId: string | 'unknown',
    metadata: any = {},
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      // If account is unknown, we can't link to foreign key easily unless we make it nullable
      // But our schema says accountId is required.
      // So checking schema... `accountId String @map("account_id") @db.Uuid` and NOT nullable.
      // So we can only log if we have a valid account ID.
      // For failed logins with unknown email, we might skip DB logging or log to a separate system?
      // Or we can rely on application logs (console) for unknown users.

      if (accountId !== 'unknown') {
        await prisma.authLog.create({
          data: {
            accountId,
            action,
            metadata,
            ipAddress,
            userAgent
          }
        });
      } else {
        console.warn(`[AuthLog] Action: ${action}, Metadata: ${JSON.stringify(metadata)}, IP: ${ipAddress}`);
      }
    } catch (error) {
      console.error('Failed to write auth log:', error);
    }
  }

  /**
   * Get account profile by ID
   */
  async getAccountProfile(accountId: string): Promise<AuthenticatedAccount> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new AuthError('Account not found', 404);
    }

    return {
      id: account.id,
      email: account.email,
      name: account.name,
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
