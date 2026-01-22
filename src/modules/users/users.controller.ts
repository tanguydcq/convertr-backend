import { Request, Response, NextFunction } from 'express';
import { usersService } from './users.service';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const profile = await usersService.getProfile(req.user.userId);

    if (!profile) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
      return;
    }

    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
}
