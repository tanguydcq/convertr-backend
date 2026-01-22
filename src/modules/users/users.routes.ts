import { Router } from 'express';
import { getMe } from './users.controller';
import { authenticate } from '../../middleware';

const router = Router();

// GET /me - Get current user profile
router.get('/me', authenticate, getMe);

export default router;
