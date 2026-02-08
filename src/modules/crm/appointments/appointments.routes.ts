
import { FastifyPluginAsync } from 'fastify';
import { appointmentsController } from './appointments.controller.js';

const appointmentsRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', appointmentsController.getAppointments);
    fastify.post('/', appointmentsController.createAppointment);
    fastify.put('/:id', appointmentsController.updateAppointment);
    fastify.delete('/:id', appointmentsController.deleteAppointment);
    fastify.get('/ics', appointmentsController.downloadICS);
    fastify.post('/import', appointmentsController.importICS);
    fastify.delete('/imported', appointmentsController.deleteImported);
    fastify.get('/orphan-count', appointmentsController.countOrphanImported);
    fastify.delete('/orphan', appointmentsController.deleteOrphanImported);
};

export { appointmentsRoutes };
