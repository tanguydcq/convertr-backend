import prisma from '../../lib/prisma.js';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  tenantId: string | null;
  tenant: { id: string; name: string } | null;
  createdAt: Date;
}

class UsersService {
  async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant,
      createdAt: user.createdAt,
    };
  }
}

export const usersService = new UsersService();
