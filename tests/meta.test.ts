
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { metaService } from '../src/integrations/meta/meta.service.js';
import { credentialsService } from '../src/modules/credentials/credentials.service.js';
import { MetaClient } from '../src/integrations/meta/meta.client.js';

// Mock dependencies
vi.mock('../src/modules/credentials/credentials.service.js');
vi.mock('../src/integrations/meta/meta.client.js');

describe('MetaService', () => {
    const mockAccountId = 'user-account-id';
    const mockAdAccountId = 'act_123456';
    const mockAccessToken = 'mock-access-token';

    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('getConfigForAccount', () => {
        it('should return config when credentials exist', async () => {
            vi.mocked(credentialsService.getCredentials).mockResolvedValue({
                id: 'cred-id',
                accountId: mockAccountId,
                provider: 'meta_ads',
                secrets: { accessToken: mockAccessToken, adAccountId: mockAdAccountId },
                createdAt: new Date(),
                rotatedAt: null
            });

            const config = await metaService.getConfigForAccount(mockAccountId);
            expect(config).toEqual({ accessToken: mockAccessToken });
        });

        it('should return null when no credentials exist', async () => {
            vi.mocked(credentialsService.getCredentials).mockResolvedValue(null);
            const config = await metaService.getConfigForAccount(mockAccountId);
            expect(config).toBeNull();
        });
    });

    describe('getCampaigns', () => {
        it('should fetch campaigns using stored credentials', async () => {
            vi.mocked(credentialsService.getCredentials).mockResolvedValue({
                id: 'cred-id',
                accountId: mockAccountId,
                provider: 'meta_ads',
                secrets: { accessToken: mockAccessToken, adAccountId: mockAdAccountId },
                createdAt: new Date(),
                rotatedAt: null
            });

            const mockGetCampaigns = vi.fn().mockResolvedValue({
                data: [{ id: '1', name: 'Test Campaign' }]
            });

            // Mock the client instance method
            vi.mocked(MetaClient).prototype.getCampaigns = mockGetCampaigns;

            const campaigns = await metaService.getCampaigns(mockAccountId);

            expect(campaigns).toHaveLength(1);
            expect(campaigns[0].name).toEqual('Test Campaign');
            expect(mockGetCampaigns).toHaveBeenCalledWith(mockAdAccountId);
        });
    });

    describe('getInsights', () => {
        it('should fetch insights using stored credentials', async () => {
            vi.mocked(credentialsService.getCredentials).mockResolvedValue({
                id: 'cred-id',
                accountId: mockAccountId,
                provider: 'meta_ads',
                secrets: { accessToken: mockAccessToken, adAccountId: mockAdAccountId },
                createdAt: new Date(),
                rotatedAt: null
            });

            const mockGetInsights = vi.fn().mockResolvedValue({
                data: [{ campaign_id: '1', impressions: '1000' }]
            });

            vi.mocked(MetaClient).prototype.getInsights = mockGetInsights;

            const insights = await metaService.getInsights(mockAccountId);

            expect(insights).toHaveLength(1);
            expect(insights[0].impressions).toEqual('1000');
            expect(mockGetInsights).toHaveBeenCalledWith(mockAdAccountId, expect.any(Object));
        });
    });
});
