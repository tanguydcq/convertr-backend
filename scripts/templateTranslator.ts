export function buildCampaignParams(template: any, campaignName: string) {
    return {
        name: campaignName,
        objective: template.campaign.objective,
        status: template.campaign.status,
        special_ad_categories: template.campaign.special_ad_categories,
        is_adset_budget_sharing_enabled:
            template.campaign.budget_mode === 'CBO'
    };
}

export function buildAdSetParams(
    templateAdSet: any,
    campaignId: string,
    pageId?: string,
    clientName?: string
) {
    const params: any = {
        name: `Convertr-${templateAdSet.key}`,
        campaign_id: campaignId,
        daily_budget: templateAdSet.daily_budget,
        optimization_goal: templateAdSet.optimization_goal,
        billing_event: templateAdSet.billing_event,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: {
            geo_locations: {
                countries: templateAdSet.targeting.geo_locations
            },
            age_min: templateAdSet.targeting.age_min,
            age_max: templateAdSet.targeting.age_max
        },
        status: templateAdSet.status,
        dsa_beneficiary: clientName || 'Convertr',
        dsa_payor: clientName || 'Convertr'
    };

    if (pageId) {
        params.promoted_object = { page_id: pageId };
    }

    return params;
}
