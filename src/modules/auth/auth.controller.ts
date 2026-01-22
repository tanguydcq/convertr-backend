import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { loginSchema, refreshSchema, logoutSchema } from './auth.validation';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = loginSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: validation.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const { email, password } = validation.data;
    const result = await authService.login(email, password);

    res.status(200).json({
      message: 'Login successful',
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      expiresIn: result.tokens.expiresIn,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = refreshSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: validation.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const { refreshToken } = validation.data;
    const tokens = await authService.refresh(refreshToken);

    res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = logoutSchema.safeParse(req.body);
    
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: validation.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const { refreshToken } = validation.data;
    await authService.logout(refreshToken);

    res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
}
