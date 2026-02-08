
import { FastifyPluginAsync } from 'fastify';
import { appointmentsController } from './appointments.controller.js';

const appointmentsRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get('/', appointmentsController.getAppointments);
    fastify.post('/', appointmentsController.createAppointment);
    fastify.put('/:id', appointmentsController.updateAppointment);
    fastify.delete('/:id', appointmentsController.deleteAppointment);
    fastify.get('/ics', appointmentsController.downloadICS);
};

export { appointmentsRoutes };
