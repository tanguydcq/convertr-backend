import { withRLS } from '../../../lib/rls.js';
import type { CalendarSource } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface CalendarSourceDTO {
    id: string;
    organisationId: string;
    name: string;
    type: 'file' | 'link';
    url: string | null;
    lastSyncedAt: Date | null;
    createdAt: Date;
    eventCount?: number;
}

export interface CreateCalendarSourceInput {
    name: string;
    type?: 'file' | 'link';
    url?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

class CalendarSourcesService {

    /**
     * Get all calendar sources for an organisation
     */
    async getAll(organisationId: string): Promise<CalendarSourceDTO[]> {
        return withRLS(organisationId, async (tx) => {
            const sources = await tx.calendarSource.findMany({
                where: { organisationId },
                include: { _count: { select: { appointments: true } } },
                orderBy: { createdAt: 'desc' },
            });
            return sources.map(s => ({
                id: s.id,
                organisationId: s.organisationId,
                name: s.name,
                type: s.type as 'file' | 'link',
                url: s.url,
                lastSyncedAt: s.lastSyncedAt,
                createdAt: s.createdAt,
                eventCount: s._count.appointments,
            }));
        });
    }

    /**
     * Create a new calendar source and import its events
     */
    async create(organisationId: string, input: CreateCalendarSourceInput): Promise<CalendarSourceDTO> {
        return withRLS(organisationId, async (tx) => {
            const source = await tx.calendarSource.create({
                data: {
                    organisationId,
                    name: input.name,
                    type: input.type || 'link',
                    url: input.url || null,
                },
            });
            return this.toDTO(source);
        });
    }

    /**
     * Get a single calendar source
     */
    async getById(organisationId: string, id: string): Promise<CalendarSourceDTO | null> {
        return withRLS(organisationId, async (tx) => {
            const source = await tx.calendarSource.findFirst({
                where: { id, organisationId },
            });
            return source ? this.toDTO(source) : null;
        });
    }

    /**
     * Sync a calendar source - fetch ICS and update events
     */
    async sync(organisationId: string, id: string, icsContent: string): Promise<number> {
        return withRLS(organisationId, async (tx) => {
            const source = await tx.calendarSource.findFirst({
                where: { id, organisationId },
            });
            if (!source) throw new Error('Calendar source not found');

            // Delete existing events from this source
            await tx.appointment.deleteMany({
                where: { organisationId, sourceId: id },
            });

            // Find or create dummy lead for imported events
            let dummyLead = await tx.lead.findFirst({
                where: { organisationId, email: 'imported@external.com' }
            });
            if (!dummyLead) {
                dummyLead = await tx.lead.create({
                    data: {
                        organisationId,
                        firstName: 'External',
                        lastName: 'Import',
                        email: 'imported@external.com',
                        status: 'IMPORTED'
                    }
                });
            }

            // Parse ICS and create events
            const count = await this.parseAndCreateEvents(tx, organisationId, id, dummyLead.id, icsContent);

            // Update lastSyncedAt
            await tx.calendarSource.update({
                where: { id },
                data: { lastSyncedAt: new Date() },
            });

            return count;
        });
    }

    /**
     * Delete a calendar source and all its events
     */
    async delete(organisationId: string, id: string): Promise<void> {
        return withRLS(organisationId, async (tx) => {
            const source = await tx.calendarSource.findFirst({
                where: { id, organisationId },
            });
            if (!source) throw new Error('Calendar source not found');

            // Cascade delete will handle appointments due to relation
            await tx.calendarSource.delete({
                where: { id },
            });
        });
    }

    /**
     * Parse ICS content and create appointments
     */
    private async parseAndCreateEvents(
        tx: any,
        organisationId: string,
        sourceId: string,
        leadId: string,
        icsContent: string
    ): Promise<number> {
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

        const parseICSDate = (str: string) => {
            if (!str) return new Date();
            const clean = str.replace('Z', '');
            const pattern = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?/;
            const match = clean.match(pattern);
            if (match) {
                const year = +match[1];
                const month = +match[2] - 1;
                const day = +match[3];
                const hour = match[4] ? +match[4] : 0;
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
                        let duration = 60;

                        if (currentEvent.DTEND) {
                            const end = parseICSDate(currentEvent.DTEND);
                            const diffMs = end.getTime() - start.getTime();
                            if (diffMs > 0) duration = Math.floor(diffMs / 60000);
                        }

                        await tx.appointment.create({
                            data: {
                                organisationId,
                                sourceId,
                                leadId,
                                title: currentEvent.SUMMARY,
                                description: currentEvent.DESCRIPTION || null,
                                location: currentEvent.LOCATION || null,
                                scheduledAt: start,
                                duration,
                                status: 'IMPORTED',
                            }
                        });
                        count++;
                    } catch (e) {
                        console.error("Failed to import individual event", e);
                    }
                }
                insideEvent = false;
            } else if (insideEvent) {
                const colonIndex = line.indexOf(':');
                if (colonIndex !== -1) {
                    let key = line.substring(0, colonIndex);
                    const value = line.substring(colonIndex + 1);
                    if (key.includes(';')) key = key.split(';')[0];

                    if (key === 'DTSTART') currentEvent.DTSTART = value;
                    if (key === 'DTEND') currentEvent.DTEND = value;
                    if (key === 'SUMMARY') currentEvent.SUMMARY = value;
                    if (key === 'DESCRIPTION') currentEvent.DESCRIPTION = value;
                    if (key === 'LOCATION') currentEvent.LOCATION = value;
                }
            }
        }

        return count;
    }

    private toDTO(source: CalendarSource): CalendarSourceDTO {
        return {
            id: source.id,
            organisationId: source.organisationId,
            name: source.name,
            type: source.type as 'file' | 'link',
            url: source.url,
            lastSyncedAt: source.lastSyncedAt,
            createdAt: source.createdAt,
        };
    }
}

export const calendarSourcesService = new CalendarSourcesService();
