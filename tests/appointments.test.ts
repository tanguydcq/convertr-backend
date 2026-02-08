import 'dotenv/config';
import { test } from 'tap';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

test('Appointments API', async (t) => {
    const app = await buildApp();

    // Setup data
    let orgId: string;
    let leadId: string;
    let appointmentId: string;

    t.before(async () => {
        // Create Org
        const org = await prisma.organisation.create({
            data: {
                name: 'Test Org Calendar',
                slug: `test-org-calendar-${Date.now()}`
            }
        });
        orgId = org.id;

        // Create Lead
        const lead = await prisma.lead.create({
            data: {
                organisationId: orgId,
                firstName: 'John',
                lastName: 'Doe',
                email: `john-${Date.now()}@example.com`
            }
        });
        leadId = lead.id;
    });

    t.teardown(async () => {
        await prisma.appointment.deleteMany({ where: { organisationId: orgId } });
        await prisma.lead.deleteMany({ where: { organisationId: orgId } });
        await prisma.organisation.delete({ where: { id: orgId } });
        await app.close();
    });

    t.test('Create Appointment', async (t) => {
        const response = await app.inject({
            method: 'POST',
            url: '/api/appointments',
            headers: { 'x-organisation-id': orgId },
            payload: {
                leadId,
                title: 'Meeting with John',
                description: 'Description de test',
                location: 'Salle A',
                scheduledAt: new Date().toISOString(),
                status: 'SCHEDULED'
            }
        });

        t.equal(response.statusCode, 201);
        const body = JSON.parse(response.payload);
        t.equal(body.title, 'Meeting with John');
        t.equal(body.description, 'Description de test');
        t.equal(body.location, 'Salle A');
        appointmentId = body.id;
    });

    t.test('Get Appointments', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/appointments',
            headers: { 'x-organisation-id': orgId }
        });

        t.equal(response.statusCode, 200);
        const body = JSON.parse(response.payload);
        t.equal(body.length, 1);
        t.equal(body[0].id, appointmentId);
    });

    t.test('Update Appointment', async (t) => {
        const response = await app.inject({
            method: 'PUT',
            url: `/api/appointments/${appointmentId}`,
            headers: { 'x-organisation-id': orgId },
            payload: {
                title: 'Rescheduled Meeting',
                status: 'CONFIRMED'
            }
        });

        t.equal(response.statusCode, 200);
        const body = JSON.parse(response.payload);
        t.equal(body.title, 'Rescheduled Meeting');
        t.equal(body.status, 'CONFIRMED');
    });

    t.test('ICS Export', async (t) => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/appointments/ics',
            headers: { 'x-organisation-id': orgId }
        });

        t.equal(response.statusCode, 200);
        t.match(response.headers['content-type'], 'text/calendar');
        t.match(response.payload, 'BEGIN:VCALENDAR');
        t.match(response.payload, 'SUMMARY:Rescheduled Meeting');
    });

    t.test('Delete Appointment', async (t) => {
        const response = await app.inject({
            method: 'DELETE',
            url: `/api/appointments/${appointmentId}`,
            headers: { 'x-organisation-id': orgId }
        });

        t.equal(response.statusCode, 204);

        // Verify deletion
        const getResponse = await app.inject({
            method: 'GET',
            url: `/api/appointments/${appointmentId}`, // Note: this route isn't implemented in controller yet, check getAppointments list
            headers: { 'x-organisation-id': orgId }
        });
        // Actually we implemented get list, getById is usually implicit or we check list length
        const listResponse = await app.inject({
            method: 'GET',
            url: '/api/appointments',
            headers: { 'x-organisation-id': orgId }
        });
        const body = JSON.parse(listResponse.payload);
        t.equal(body.length, 0);
    });
});
