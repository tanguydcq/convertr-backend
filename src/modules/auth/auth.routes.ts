import { FastifyPluginAsync } from 'fastify';
import { login, refresh, logout } from './auth.controller.js';
import { LoginBody, RefreshBody, LogoutBody } from './auth.schemas.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
    // POST /api/auth/login
    app.post<{ Body: LoginBody }>('/login', {
        schema: {
            body: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 1 },
                },
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        expiresIn: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                email: { type: 'string' },
                                role: { type: 'string' },
                                tenantId: { type: ['string', 'null'] },
                            },
                        },
                    },
                },
            },
        },
    }, login);

    // POST /api/auth/refresh
    app.post<{ Body: RefreshBody }>('/refresh', {
        schema: {
            body: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                    refreshToken: { type: 'string', minLength: 1 },
                },
            },
        },
    }, refresh);

    // POST /api/auth/logout
    app.post<{ Body: LogoutBody }>('/logout', {
        schema: {
            body: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                    refreshToken: { type: 'string', minLength: 1 },
                },
            },
        },
    }, logout);
};

export default authRoutes;
