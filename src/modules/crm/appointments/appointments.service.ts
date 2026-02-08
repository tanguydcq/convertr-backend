
import { Appointment } from '@prisma/client';
import { withRLS } from '../../../lib/rls.js';

// DTO for API responses
export interface AppointmentDTO {
    id: string;
    leadId: string;
    organisationId: string;
    title: string;
    description?: string;
    location?: string;
    duration: number; // minutes
    scheduledAt: Date;
    status: string;
    createdAt: Date;
}

// Input for creating an appointment
export interface CreateAppointmentInput {
    leadId: string;
    title: string;
    description?: string;
    location?: string;
    duration?: number;
    scheduledAt: string | Date; // Can be string from JSON
    status?: string;
}

// Input for updating an appointment
export interface UpdateAppointmentInput extends Partial<CreateAppointmentInput> { }

class AppointmentsService {
    /**
     * Get appointments for a specific organisation within a date range
     */
    async getAppointments(
        organisationId: string,
        range: { start?: Date; end?: Date }
    ): Promise<AppointmentDTO[]> {
        return withRLS(organisationId, async (tx) => {
            const where: any = { organisationId };

            if (range.start && range.end) {
                // Adjust fetch logic if needed, but simple overlap check is complex for pure range on just scheduledAt.
                // For now sticking to scheduledAt within range.
                where.scheduledAt = {
                    gte: range.start,
                    lte: range.end,
                };
            } else if (range.start) {
                where.scheduledAt = { gte: range.start };
            } else if (range.end) {
                where.scheduledAt = { lte: range.end };
            }

            const appointments = await tx.appointment.findMany({
                where,
                orderBy: { scheduledAt: 'asc' },
            });

            return appointments.map(this.toDTO);
        });
    }

    /**
     * Get a single appointment by ID
     */
    async getAppointmentById(organisationId: string, id: string): Promise<AppointmentDTO | null> {
        return withRLS(organisationId, async (tx) => {
            const appointment = await tx.appointment.findFirst({
                where: { id, organisationId },
            });
            return appointment ? this.toDTO(appointment) : null;
        });
    }

    /**
     * Create a new appointment
     */
    async createAppointment(organisationId: string, input: CreateAppointmentInput): Promise<AppointmentDTO> {
        return withRLS(organisationId, async (tx) => {
            // Verify lead exists and belongs to organisation
            const lead = await tx.lead.findFirst({
                where: { id: input.leadId, organisationId },
            });

            if (!lead) {
                throw new Error('Lead not found');
            }

            const appointment = await tx.appointment.create({
                data: {
                    leadId: input.leadId,
                    organisationId,
                    title: input.title,
                    description: input.description,
                    location: input.location,
                    duration: input.duration || 60,
                    scheduledAt: new Date(input.scheduledAt),
                    status: input.status || 'SCHEDULED',
                },
            });

            return this.toDTO(appointment);
        });
    }

    /**
     * Update an appointment
     */
    async updateAppointment(organisationId: string, id: string, input: UpdateAppointmentInput): Promise<AppointmentDTO> {
        return withRLS(organisationId, async (tx) => {
            const existing = await tx.appointment.findFirst({
                where: { id, organisationId },
            });

            if (!existing) {
                throw new Error('Appointment not found');
            }

            const updated = await tx.appointment.update({
                where: { id },
                data: {
                    title: input.title,
                    description: input.description,
                    location: input.location,
                    duration: input.duration,
                    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
                    status: input.status,
                    leadId: input.leadId,
                },
            });

            return this.toDTO(updated);
        });
    }

    /**
     * Delete an appointment
     */
    async deleteAppointment(organisationId: string, id: string): Promise<void> {
        return withRLS(organisationId, async (tx) => {
            const existing = await tx.appointment.findFirst({
                where: { id, organisationId },
            });

            if (!existing) {
                throw new Error('Appointment not found');
            }

            await tx.appointment.delete({
                where: { id },
            });
        });
    }

    /**
     * Generate ICS content for all appointments of an organisation
     */
    async generateICS(organisationId: string): Promise<string> {
        return withRLS(organisationId, async (tx) => {
            const appointments = await tx.appointment.findMany({
                where: { organisationId },
                include: { lead: true }, // To get attendee info potentially
            });

            let ics = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Convertr//Calendar//FR\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";

            for (const apt of appointments) {
                const start = new Date(apt.scheduledAt);
                const durationMinutes = apt.duration || 60;
                const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
                const now = new Date();

                const formatICSDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

                ics += "BEGIN:VEVENT\n";
                ics += `UID:${apt.id}@convertr.app\n`;
                ics += `DTSTAMP:${formatICSDate(now)}\n`;
                ics += `DTSTART:${formatICSDate(start)}\n`;
                ics += `DTEND:${formatICSDate(end)}\n`;
                ics += `SUMMARY:${apt.title}\n`;
                ics += `DESCRIPTION:Lead: ${apt.leadId} - Status: ${apt.status}\n`;
                ics += `STATUS:CONFIRMED\n`;
                ics += "END:VEVENT\n";
            }

            ics += "END:VCALENDAR";
            return ics;
        });
    }

    /**
   * Import ICS content
   * Note: This is a complex operation. For now, we will just parse and create appointments.
   * Duplicate detection would be needed for a robust sync.
   */
    async importICS(organisationId: string, icsContent: string): Promise<number> {
        // Basic parsing logic - in a real app, use a library like 'ical.js' or 'node-ical'
        // For this MVP, we will rely on a simple regex-based parser or just placeholder for now 
        // as we focused on the structure.
        // But let's try to do a simple implementation.

        // Unfold lines (RFC 5545)
        const rawLines = icsContent.split(/\r\n|\n|\r/);
        const lines: string[] = [];
        for (const line of rawLines) {
            if (line.startsWith(' ') || line.startsWith('\t')) {
                if (lines.length > 0) {
                    lines[lines.length - 1] += line.slice(1);
                }
            } else {
                if (line.trim()) lines.push(line.trim());
            }
        }

        let count = 0;
        let currentEvent: any = {};
        let insideEvent = false;

        const dummyLead = await withRLS(organisationId, async (tx) => {
            let lead = await tx.lead.findFirst({
                where: { organisationId, email: 'imported@external.com' }
            });
            if (!lead) {
                lead = await tx.lead.create({
                    data: {
                        organisationId,
                        firstName: 'External',
                        lastName: 'Import',
                        email: 'imported@external.com',
                        status: 'IMPORTED'
                    }
                });
            }
            return lead;
        });

        // Date parser handles YYYYMMDDTHHMMSS[Z] and YYYYMMDD
        const parseICSDate = (str: string) => {
            if (!str) return new Date();
            // Remove Z if present, we treat as local/UTC loosely for now
            const clean = str.replace('Z', '');
            const pattern = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/;
            const match = clean.match(pattern);
            if (match) {
                const year = +match[1];
                const month = +match[2] - 1;
                const day = +match[3];
                const hour = match[4] ? +match[4] : 0; // Default to midnight if T missing
                const minute = match[5] ? +match[5] : 0;
                const second = match[6] ? +match[6] : 0;
                return new Date(Date.UTC(year, month, day, hour, minute, second));
            }
            return new Date();
        };

        for (const line of lines) {
            if (line.startsWith('BEGIN:VEVENT')) {
                insideEvent = true;
                currentEvent = {};
            } else if (line.startsWith('END:VEVENT')) {
                if (insideEvent && currentEvent.DTSTART && currentEvent.SUMMARY) {
                    try {
                        const start = parseICSDate(currentEvent.DTSTART);
                        let duration = 60; // Default

                        if (currentEvent.DTEND) {
                            const end = parseICSDate(currentEvent.DTEND);
                            const diffMs = end.getTime() - start.getTime();
                            if (diffMs > 0) duration = Math.floor(diffMs / 60000);
                        }

                        await this.createAppointment(organisationId, {
                            leadId: dummyLead.id,
                            title: currentEvent.SUMMARY,
                            scheduledAt: start,
                            duration: duration,
                            status: 'IMPORTED'
                        });
                        count++;
                    } catch (e) {
                        console.error("Failed to import individual event", e);
                    }
                }
                insideEvent = false;
            } else if (insideEvent) {
                // Split by first colon
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    let key = line.substring(0, colonIndex);
                    const value = line.substring(colonIndex + 1);

                    // Handle parameters like DTSTART;TZID=...
                    if (key.includes(';')) {
                        key = key.split(';')[0];
                    }

                    if (key === 'DTSTART') currentEvent.DTSTART = value;
                    if (key === 'DTEND') currentEvent.DTEND = value;
                    if (key === 'SUMMARY') currentEvent.SUMMARY = value;
                }
            }
        }

        return count;
    }

    private toDTO(appointment: Appointment): AppointmentDTO {
        return {
            id: appointment.id,
            leadId: appointment.leadId,
            organisationId: appointment.organisationId,
            title: appointment.title,
            description: appointment.description || undefined,
            location: appointment.location || undefined,
            duration: appointment.duration,
            scheduledAt: appointment.scheduledAt,
            status: appointment.status,
            createdAt: appointment.createdAt,
        };
    }

    /**
     * Delete all imported appointments for an organisation
     */
    async deleteImported(organisationId: string): Promise<number> {
        return withRLS(organisationId, async (tx) => {
            const result = await tx.appointment.deleteMany({
                where: { organisationId, status: 'IMPORTED' },
            });
            return result.count;
        });
    }

    /**
     * Count imported appointments without a source (orphan imports from file uploads)
     */
    async countOrphanImported(organisationId: string): Promise<number> {
        return withRLS(organisationId, async (tx) => {
            const count = await tx.appointment.count({
                where: { organisationId, status: 'IMPORTED', sourceId: null },
            });
            return count;
        });
    }

    /**
     * Delete imported appointments without a source (orphan imports)
     */
    async deleteOrphanImported(organisationId: string): Promise<number> {
        return withRLS(organisationId, async (tx) => {
            const result = await tx.appointment.deleteMany({
                where: { organisationId, status: 'IMPORTED', sourceId: null },
            });
            return result.count;
        });
    }
}

export const appointmentsService = new AppointmentsService();
