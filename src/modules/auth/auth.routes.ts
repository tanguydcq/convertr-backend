import { Router } from 'express';
import { login, refresh, logout } from './auth.controller';
import { authRateLimiter } from '../../middleware';

const router = Router();

// POST /auth/login - Rate limited
router.post('/login', authRateLimiter, login);

// POST /auth/refresh
router.post('/refresh', refresh);

// POST /auth/logout
router.post('/logout', logout);

export default router;
