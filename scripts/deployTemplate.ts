import 'dotenv/config';
import bizSdk from 'facebook-nodejs-business-sdk';
import template from './convertr_leads_v1.json';
import {
    buildCampaignParams,
    buildAdSetParams
} from './templateTranslator';

const AdAccount = bizSdk.AdAccount;

bizSdk.FacebookAdsApi.init(process.env.META_ACCESS_TOKEN as string);

const adAccount = new AdAccount(process.env.META_AD_ACCOUNT_ID as string);

async function deployTemplate(clientName: string) {
    // 0. Get Page ID (Required for Lead Generation)
    const user = new bizSdk.User('me');
    const accounts = await user.getAccounts();
    const pageId = accounts[0]?.id;

    if (!pageId) {
        console.warn('WARNING: No Facebook Page found! AdSet creation for Leads might fail.');
    } else {
        console.log(`Using Facebook Page ID: ${pageId}`);
    }

    // 1. Campaign
    console.log('Deploying campaign for client:', clientName);
    const campaign = await adAccount.createCampaign(
        [],
        buildCampaignParams(template, `Convertr - ${clientName}`)
    );

    const campaignId = campaign.id;
    console.log('Campaign created:', campaignId);

    // 2. Ad Sets
    for (const adset of template.adsets) {
        console.log('Creating ad set:', adset.key);
        await adAccount.createAdSet(
            [],
            buildAdSetParams(adset, campaignId, pageId, clientName)
        );
    }

    console.log('Campaign deployed successfully:', campaignId);
}

deployTemplate('Client-Test').catch(console.error);
