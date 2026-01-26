import 'dotenv/config';
import bizSdk from 'facebook-nodejs-business-sdk';

bizSdk.FacebookAdsApi.init(process.env.META_ACCESS_TOKEN);

async function listPages() {
    try {
        const user = new bizSdk.User('me');
        const pages = await user.getAccounts(['name', 'id', 'access_token']);
        console.log(`Found ${pages.length} pages.`);
        pages.forEach((p: any) => console.log(`- ${p.name} (${p.id})`));
    } catch (err) {
        console.error('Error fetching pages:', err);
    }
}

listPages();
