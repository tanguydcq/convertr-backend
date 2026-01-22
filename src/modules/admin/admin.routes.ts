import { Router } from 'express';
import { createTenant, getAllTenants, getTenantById, deleteTenant } from './admin.controller';
import { authenticate, authorize } from '../../middleware';

const router = Router();

// All admin routes require SUPER_ADMIN role
router.use(authenticate, authorize('SUPER_ADMIN'));

// POST /admin/tenants - Create a new tenant
router.post('/tenants', createTenant);

// GET /admin/tenants - Get all tenants
router.get('/tenants', getAllTenants);

// GET /admin/tenants/:id - Get a specific tenant
router.get('/tenants/:id', getTenantById);

// DELETE /admin/tenants/:id - Delete a tenant
router.delete('/tenants/:id', deleteTenant);

export default router;
