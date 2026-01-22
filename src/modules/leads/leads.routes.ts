import { Router } from 'express';
import { getLeads, getLeadById } from './leads.controller';
import { authenticate, tenantGuard } from '../../middleware';

const router = Router();

// GET /leads - Get all leads for the tenant
router.get('/', authenticate, tenantGuard, getLeads);

// GET /leads/:id - Get a specific lead
router.get('/:id', authenticate, tenantGuard, getLeadById);

export default router;
