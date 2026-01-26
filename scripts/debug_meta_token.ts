/**
 * Debug script to check which Ad Accounts are accessible with the current token
 */
'use strict';
import bizSdk from 'facebook-nodejs-business-sdk';

// Using the same token from the main script
let access_token = 'EAAqRC1W7Fy0BQsRyhL5mJSyoPInGOWRsp8PZBrdFVnw5162VqAsH1bkyRJyHGJOGdmCLoskLoT7chNZB5L2ZCx6cjtV84V2ZABZBJ9ZBTrnYhtzDMBeqLYaJ6cvfyyQRx4qLUr1i9eFyFCRO76hrNKX0FyAPDsaONe4w4ZC0ejJb5SwH6bPefbw4uvntZAaWiNZADlDSk3KZCS';

const api = bizSdk.FacebookAdsApi.init(access_token);

void async function () {
    try {
        console.log('Fetching ad accounts for the current user/token...');
        const user = new bizSdk.User('me');
        const accounts = await user.getAdAccounts(['name', 'id', 'account_id', 'account_status']);

        console.log('Found ' + accounts.length + ' ad accounts:');
        accounts.forEach((account: any) => {
            console.log(`- Name: ${account.name}, ID: ${account.id} (AccountId: ${account.account_id})`);
        });

    } catch (error) {
        console.error('Error fetching ad accounts:', JSON.stringify(error, null, 2));
    }
}();
