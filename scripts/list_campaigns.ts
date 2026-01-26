/**
 * Script to list all campaigns for the configured Ad Account
 */
'use strict';
import bizSdk from 'facebook-nodejs-business-sdk';

// Using the same token
let access_token = 'EAAqRC1W7Fy0BQsRyhL5mJSyoPInGOWRsp8PZBrdFVnw5162VqAsH1bkyRJyHGJOGdmCLoskLoT7chNZB5L2ZCx6cjtV84V2ZABZBJ9ZBTrnYhtzDMBeqLYaJ6cvfyyQRx4qLUr1i9eFyFCRO76hrNKX0FyAPDsaONe4w4ZC0ejJb5SwH6bPefbw4uvntZAaWiNZADlDSk3KZCS';
let ad_account_id = 'act_1768879657833047';

const AdAccount = bizSdk.AdAccount;
const api = bizSdk.FacebookAdsApi.init(access_token);

void async function () {
    try {
        console.log(`Fetching campaigns for account ${ad_account_id}...`);
        const account = new AdAccount(ad_account_id);
        const campaigns = await account.getCampaigns(['name', 'status', 'id', 'objective'], { limit: 10 });

        console.log(`Found ${campaigns.length} campaigns:`);
        campaigns.forEach((campaign: any) => {
            console.log(`- [${campaign.status}] ${campaign.name} (ID: ${campaign.id}) - Obj: ${campaign.objective}`);
        });

        console.log('\nDirect Link to Ads Manager (might require specific login if Sandbox):');
        console.log(`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${ad_account_id.replace('act_', '')}`);

    } catch (error) {
        console.error('Error fetching campaigns:', JSON.stringify(error, null, 2));
    }
}();
