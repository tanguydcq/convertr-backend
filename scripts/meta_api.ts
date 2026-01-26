/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * All rights reserved.
 * @flow
 */

'use strict';
import bizSdk from 'facebook-nodejs-business-sdk';
const AdAccount = bizSdk.AdAccount;
const Campaign = bizSdk.Campaign;

let access_token = 'EAAqRC1W7Fy0BQsRyhL5mJSyoPInGOWRsp8PZBrdFVnw5162VqAsH1bkyRJyHGJOGdmCLoskLoT7chNZB5L2ZCx6cjtV84V2ZABZBJ9ZBTrnYhtzDMBeqLYaJ6cvfyyQRx4qLUr1i9eFyFCRO76hrNKX0FyAPDsaONe4w4ZC0ejJb5SwH6bPefbw4uvntZAaWiNZADlDSk3KZCS';
let app_id = '2974227636098861';
let ad_account_id = 'act_1768879657833047';
let campaign_name = 'Test Campaign';

const api = bizSdk.FacebookAdsApi.init(access_token);
const showDebugingInfo = false; // Setting this to true shows more debugging info.
if (showDebugingInfo) {
    api.setDebug(true);
}

const logApiCallResult = (apiCallName: string, data: any) => {
    console.log(apiCallName);
    if (showDebugingInfo) {
        console.log('Data:' + JSON.stringify(data));
    }
};

let fields: Array<string>, params: Object;

void async function () {
    try {
        // Create an ad campaign with objective OUTCOME_TRAFFIC
        fields = [
        ];
        params = {
            'name': campaign_name,
            'objective': 'OUTCOME_TRAFFIC',
            'status': 'PAUSED',
            'special_ad_categories': [],
            'is_adset_budget_sharing_enabled': false,
        };
        let campaign = await (new AdAccount(ad_account_id)).createCampaign(
            fields,
            params
        );
        let campaign_id = campaign.id;

        console.log('Your created campaign is with campaign_id:' + campaign_id);

    } catch (error) {
        console.error('API Error:', JSON.stringify(error, null, 2));
        console.error(error);
        process.exit(1);
    }
}();