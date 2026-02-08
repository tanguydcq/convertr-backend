import { credentialsService } from '../credentials/credentials.service.js';
import { config } from '../../config/index.js';



class GoogleAdsService {
    async listAccessibleCustomers(organisationId: string) {
        const creds = await credentialsService.getCredentials(organisationId, 'google_ads');

        if (!creds) {
            throw new Error('No Google Ads credentials found for this organisation');
        }

        // Google Ads API requires a valid access token. 
        // The library handles refreshing if we provide refresh_token, 
        // BUT google-ads-api (node) configuration is slightly different.
        // Let's use the raw googleapis if google-ads-api is too complex for just this call,
        // OR configure it correctly.

        // Simpler approach for "listAccessibleCustomers" which is a specific endpoint:
        // https://googleads.googleapis.com/v17/customers:listAccessibleCustomers

        const { access_token, refresh_token } = creds.secrets as any;

        // We can use a simple fetch here to avoid full library overhead just for discovery
        // OR use the library. Let's use a simple fetch with the access_token.
        // Note: We might need to refresh the token first if it's expired.

        // BETTER: Use googleapis library which we installed.
        const { google } = await import('googleapis');
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        auth.setCredentials({
            access_token,
            refresh_token
            // expiry_date?
        });

        // Handle token refresh automatically by googleapis
        // If access token is expired, it will use refresh token (if we provided client id/secret)

        try {
            const response = await auth.request({
                url: 'https://googleads.googleapis.com/v19/customers:listAccessibleCustomers',
            });

            const resourceNames = (response.data as any).resourceNames as string[];
            // resourceNames are like "customers/1234567890"

            // For each customer, we might want to get the descriptive name.
            // listAccessibleCustomers ONLY returns resource names (IDs).
            // To get names, we need to query each customer.
            // But we can't query a customer unless we have access to it.
            // The accessible list tells us we have access.

            // Detailed info fetching:
            // We need to create a GoogleAds client for each customer ID to fetch its name.
            // This is expensive if there are many. 
            // For the MVP, let's just return the IDs or try to fetch names for the first few.

            const customers = resourceNames.map(rn => {
                const id = rn.split('/')[1];
                return {
                    id,
                    name: `Account ${id}`, // Placeholder until we fetch real name
                    resourceName: rn
                };
            });

            return customers;

        } catch (error) {
            console.error('Error listing customers:', error);
            throw error;
        }
    }
}

export const googleAdsService = new GoogleAdsService();
