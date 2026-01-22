import { Request, Response, NextFunction } from 'express';
import { leadsService } from './leads.service';

export async function getLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    // SUPER_ADMIN can see all leads
    if (req.user.role === 'SUPER_ADMIN') {
      const leads = await leadsService.getAllLeads();
      res.status(200).json({
        count: leads.length,
        leads,
      });
      return;
    }

    // Other users can only see their tenant's leads
    if (!req.user.tenantId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'User has no associated tenant',
      });
      return;
    }

    const leads = await leadsService.getLeadsByTenant(req.user.tenantId);

    res.status(200).json({
      count: leads.length,
      leads,
    });
  } catch (error) {
    next(error);
  }
}

export async function getLeadById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    const { id } = req.params;
    const tenantId = req.user.role === 'SUPER_ADMIN' ? null : req.user.tenantId;

    const lead = await leadsService.getLeadById(id, tenantId);

    if (!lead) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Lead not found',
      });
      return;
    }

    res.status(200).json(lead);
  } catch (error) {
    next(error);
  }
}
