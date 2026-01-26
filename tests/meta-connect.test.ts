import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { metaService } from '../src/integrations/meta/meta.service.js';
import { credentialsService } from '../src/modules/credentials/credentials.service.js';
import { config } from '../src/config/index.js';

// Mock dependencies
jest.mock('../src/config/index.js', () => ({
    config: {
        META_APP_ID: 'mock-app-id',
        META_APP_SECRET: 'mock-app-secret',
    }
}));

// Mock global fetch
const globalFetch = jest.fn();
global.fetch = globalFetch;

describe('Meta Connect Flow', () => {
    const mockAccountId = 'user-account-id';
    const mockCode = 'auth-code';
    const mockRedirectUri = 'http://localhost/callback';
    const mockAccessToken = 'mock-access-token';
    const mockLongLivedToken = 'mock-long-lived-token';

    beforeEach(() => {
        jest.resetAllMocks();
        // Spy on credentialsService methods
        jest.spyOn(credentialsService, 'hasCredentials').mockResolvedValue(false);
        jest.spyOn(credentialsService, 'saveCredentials').mockResolvedValue();
        jest.spyOn(credentialsService, 'rotateCredentials').mockResolvedValue();
    });

    it('should exchange code for token and save credentials', async () => {
        // Mock exchange token response
        globalFetch.mockResolvedValueOnce({
            json: async () => ({ access_token: mockAccessToken }),
            ok: true
        } as Response);

        // Mock long-lived token exchange response
        globalFetch.mockResolvedValueOnce({
            json: async () => ({ access_token: mockLongLivedToken }),
            ok: true
        } as Response);

        // Mock credentials check
        jest.mocked(credentialsService.hasCredentials).mockResolvedValue(false);

        await metaService.connectAccount(mockAccountId, mockCode, mockRedirectUri);

        // Verify calls
        expect(globalFetch).toHaveBeenCalledTimes(2); // Short lived + Long lived

        // Verify save
        expect(credentialsService.saveCredentials).toHaveBeenCalledWith(
            mockAccountId,
            'meta_ads',
            { accessToken: mockLongLivedToken }
        );
    });

    it('should rotate credentials if they already exist', async () => {
        // Mock exchange token response (only short lived for this test to simplify logic if I control fetch mocks precisely)
        // Actually, the code will call fetch twice if config is present.

        // 1. Short lived
        globalFetch.mockResolvedValueOnce({
            json: async () => ({ access_token: mockAccessToken }),
            ok: true
        } as Response);

        // 2. Long lived
        globalFetch.mockResolvedValueOnce({
            json: async () => ({ access_token: mockLongLivedToken }),
            ok: true
        } as Response);

        // Mock credentials check
        jest.mocked(credentialsService.hasCredentials).mockResolvedValue(true);

        await metaService.connectAccount(mockAccountId, mockCode, mockRedirectUri);

        // Verify rotate
        expect(credentialsService.rotateCredentials).toHaveBeenCalledWith(
            mockAccountId,
            'meta_ads',
            { accessToken: mockLongLivedToken }
        );
    });
});
