import { credentialsService } from '../credentials/credentials.service.js';

class TikTokAdsService {
    /**
     * List accessible advertisers for the authenticated user.
     * Documentation: https://ads.tiktok.com/marketing_api/docs?id=1738373164380162
     */
    async listAdvertisers(organisationId: string) {
        const creds = await credentialsService.getCredentials(organisationId, 'tiktok_ads');

        if (!creds) {
            throw new Error('No TikTok Ads credentials found for this organisation');
        }

        const { access_token } = creds.secrets;

        // TODO: Need Config/Env for App ID/Secret if we were doing token refresh here.
        // For listing, we just need access_token + App ID usually.

        try {
            const url = new URL('https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/');
            // "app_id" and "secret" might be required or "access_token" in header.
            // Docs say: Access-Token in header: Check.
            // Query params: app_id, secret.

            url.searchParams.append('app_id', process.env.TIKTOK_APP_ID || '');
            url.searchParams.append('secret', process.env.TIKTOK_CLIENT_SECRET || '');

            // Use fetch
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Access-Token': access_token,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json() as any;

            if (data.code !== 0) {
                throw new Error(`TikTok API Error: ${data.message} (code ${data.code})`);
            }

            // data.data.list is array of { advertiser_id, advertiser_name, ... }
            const advertisers = (data.data.list || []).map((adv: any) => ({
                id: adv.advertiser_id,
                name: adv.advertiser_name,
                currency: adv.currency, // Bonus info
            }));

            return advertisers;

        } catch (error) {
            console.error('Error listing TikTok advertisers:', error);
            throw error;
        }
    }
}

export const tiktokAdsService = new TikTokAdsService();
