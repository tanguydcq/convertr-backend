import { FastifyRequest, FastifyReply } from 'fastify';
import { calendarSourcesService } from './calendar-sources.service.js';

class CalendarSourcesController {

    async getAll(req: FastifyRequest, reply: FastifyReply) {
        try {
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const sources = await calendarSourcesService.getAll(organisationId);
            return sources;
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }

    async create(req: FastifyRequest, reply: FastifyReply) {
        try {
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const { name, type, url }: any = req.body;
            if (!name) return reply.status(400).send({ error: 'Name is required' });

            // URL is required for 'link' type, optional for 'file' type
            const sourceType = type || 'link';
            if (sourceType === 'link' && !url) {
                return reply.status(400).send({ error: 'URL is required for link-type calendars' });
            }

            const source = await calendarSourcesService.create(organisationId, { name, type: sourceType, url });
            return reply.status(201).send(source);
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }

    async sync(req: FastifyRequest, reply: FastifyReply) {
        try {
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const { id } = req.params as { id: string };
            const { icsContent } = req.body as { icsContent: string };

            if (!icsContent) return reply.status(400).send({ error: 'ICS content required' });

            const count = await calendarSourcesService.sync(organisationId, id, icsContent);
            return reply.status(200).send({ message: `Synced ${count} events` });
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }

    async delete(req: FastifyRequest, reply: FastifyReply) {
        try {
            const organisationId = req.headers['x-organisation-id'] as string;
            if (!organisationId) return reply.status(400).send({ error: 'Organisation ID required' });

            const { id } = req.params as { id: string };
            await calendarSourcesService.delete(organisationId, id);
            return reply.status(204).send();
        } catch (error: any) {
            req.log.error(error);
            return reply.status(500).send({ error: error.message });
        }
    }
}

export const calendarSourcesController = new CalendarSourcesController();
