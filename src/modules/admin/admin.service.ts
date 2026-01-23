import prisma from '../../lib/prisma.js';
import { Account } from '@prisma/client';

export interface AccountDTO {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

class AdminService {
  /**
   * Create a new account (basic)
   * Note: Usually accounts are creating via signup, but admin might want to provision one.
   * For MVP simplicity, we might reuse auth service or just basic creation here without password?
   * Or we skip this method if not used. 
   * Let's keep it but simplified.
   */
  async createAccount(_name: string, _email: string): Promise<AccountDTO> {
    // This method would require password handling.
    // For now, let's just throw or return mock, expecting admin to use Seed or special flow.
    // Or we leave it unimplemented.
    throw new Error('Not implemented. Accounts should sign up.');
  }

  /**
   * Get all accounts
   */
  async getAllAccounts(): Promise<AccountDTO[]> {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map(this.toDTO);
  }

  /**
   * Get a single account by ID
   */
  async getAccountById(id: string): Promise<AccountDTO | null> {
    const account = await prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      return null;
    }

    return this.toDTO(account);
  }

  /**
   * Delete an account (and all associated data)
   */
  async deleteAccount(id: string): Promise<void> {
    await prisma.account.delete({
      where: { id },
    });
  }

  private toDTO(account: Account): AccountDTO {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      createdAt: account.createdAt,
    };
  }
}

export const adminService = new AdminService();
