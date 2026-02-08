import { FastifyPluginAsync } from 'fastify';
import { calendarSourcesController } from './calendar-sources.controller.js';

const calendarSourcesRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', calendarSourcesController.getAll);
    fastify.post('/', calendarSourcesController.create);
    fastify.post('/:id/sync', calendarSourcesController.sync);
    fastify.delete('/:id', calendarSourcesController.delete);
};

export { calendarSourcesRoutes };
