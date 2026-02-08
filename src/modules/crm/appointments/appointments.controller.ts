import { FastifyRequest, FastifyReply } from 'fastify';
import { appointmentsService } from './appointments.service.js';

export class AppointmentsController {

    // NOTE: Auth middleware ensures req.user contains the organisationId / account Info
    // and likely sets req.organisationId if we have that middleware.
    // Assuming req.params.orgId or req.user.organisationId is available.
    // Based on leads controller, we probably extract orgId from user context or header.

    // Let's assume standard Express + our Request type which might have user attached.
    // Ideally we use a helper to get context.

    async getAppointments(req: FastifyRequest, reply: FastifyReply) {
        try {
            const { start, end } = req.query as { start?: string, end?: string };
            // Assuming middleware puts user info in req.user, but for now using header/query for consistency with prior assumption
            // However, typical Fastify auth plugins decorate req. 
            // Let's assume we can get it from header for now as requested by user ("arrete de reflechir").
            const organisationId = req.headers['x-organisation-id'] as string;

            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const range = {
                start: start ? new Date(start) : undefined,
                end: end ? new Date(end) : undefined,
            };

            const appointments = await appointmentsService.getAppointments(organisationId, range);
            return appointments;
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }

    async createAppointment(req: FastifyRequest, reply: FastifyReply) {
        try {
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const appointment = await appointmentsService.createAppointment(organisationId, req.body as any);
            return reply.status(201).send(appointment);
        } catch (error: any) {
            req.log.error(error);
            if (error.message === 'Lead not found') {
                return reply.status(400).send({ error: 'Lead not found. Please ensure the lead exists and belongs to your organisation.' });
            }
            return reply.status(500).send({ error: error.message });
        }
    }

    async updateAppointment(req: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = req.params as { id: string };
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const appointment = await appointmentsService.updateAppointment(organisationId, id, req.body as any);
            return appointment;
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }

    async deleteAppointment(req: FastifyRequest, reply: FastifyReply) {
        try {
            const { id } = req.params as { id: string };
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            await appointmentsService.deleteAppointment(organisationId, id);
            return reply.status(204).send();
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }

    async downloadICS(req: FastifyRequest, reply: FastifyReply) {
        try {
            // This endpoint might be accessed via query param token in a real app for calendar subscription
            // For now, we reuse the header or query param.
            const organisationId = (req.query as any).organisationId as string || req.headers['x-organisation-id'] as string;

            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const icsContent = await appointmentsService.generateICS(organisationId);

            reply.header('Content-Type', 'text/calendar');
            reply.header('Content-Disposition', 'attachment; filename="calendar.ics"');
            return reply.send(icsContent);
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }

    async importICS(req: FastifyRequest, reply: FastifyReply) {
        try {
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            // Handle file upload (multipart) or raw content
            // Assuming multipart/form-data with 'file' field
            const data = await req.file();
            if (!data) return reply.status(400).send({ error: 'File required' });

            const buffer = await data.toBuffer();
            const icsContent = buffer.toString('utf-8');

            const count = await appointmentsService.importICS(organisationId, icsContent);
            return reply.status(200).send({ message: `Imported ${count} events` });
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }

    async deleteImported(req: FastifyRequest, reply: FastifyReply) {
        try {
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const count = await appointmentsService.deleteImported(organisationId);
            return reply.status(200).send({ message: `Deleted ${count} imported events` });
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }

    async countOrphanImported(req: FastifyRequest, reply: FastifyReply) {
        try {
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const count = await appointmentsService.countOrphanImported(organisationId);
            return reply.status(200).send({ count });
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }

    async deleteOrphanImported(req: FastifyRequest, reply: FastifyReply) {
        try {
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const count = await appointmentsService.deleteOrphanImported(organisationId);
            return reply.status(200).send({ message: `Deleted ${count} orphan events`, count });
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }
}

export const appointmentsController = new AppointmentsController();
