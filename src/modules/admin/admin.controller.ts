import { Request, Response, NextFunction } from 'express';
import { adminService } from './admin.service';
import { createTenantSchema } from './admin.validation';

export async function createTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validation = createTenantSchema.safeParse(req.body);
    
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

    const { name } = validation.data;
    const tenant = await adminService.createTenant(name);

    res.status(201).json({
      message: 'Tenant created successfully',
      tenant,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllTenants(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tenants = await adminService.getAllTenants();

    res.status(200).json({
      count: tenants.length,
      tenants,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTenantById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const tenant = await adminService.getTenantById(id);

    if (!tenant) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Tenant not found',
      });
      return;
    }

    res.status(200).json(tenant);
  } catch (error) {
    next(error);
  }
}

export async function deleteTenant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await adminService.deleteTenant(id);

    res.status(200).json({
      message: 'Tenant deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}
