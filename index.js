// Importing deps
const core = require('@actions/core')
const github = require('@actions/github')
const fetch = require('node-fetch')
const CryptoJS = require("crypto-js")


const appcenterApiVersion = 'v0.1'

const Adapter =  {
    /**
     * 
     * @param {string} appId 
     * @param {string} apiToken 
     * @param {string} appSecret 
     * @param {object} payloadObj 
     * @param {object} additionalHeaders 
     * @returns JSON response of the appcenter /hooks api
     * @throws
     */
    sendWebhookTo: async (appId, appSecret, payloadObj, apiToken, additionalHeaders = {}) => {
        return fetch(`https://api.appcenter.ms/${appcenterApiVersion}/public/apps/${appId}/hooks`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-type': 'application/json',
                'X-API-Token': apiToken,
                'X-Hub-Signature': 'sha1=' + CryptoJS.HmacSHA1(payloadObj, appSecret).toString(CryptoJS.enc.Hex),
                host: "appcenter.ms",
                ...additionalHeaders
            },
            body: JSON.stringify(payloadObj)
        }).then(async res => {
            const json = await res.json()
            if (json.message) {throw json}
            return json
        })
    },
    /**
     * 
     * @param {string} companyName 
     * @returns JSON response of the appcenter /orgs/:companyName/apps api
     */
    getAllApps: async (companyName, apiToken) => {
        return fetch(`https://api.appcenter.ms/v0.1/orgs/${companyName}/apps`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-type': 'application/json',
                'X-API-Token': apiToken
            }
        }).then(async res => {
            const json = await res.json()
            if (json.error) {throw json.error}
            return json
        })
    }
}

const Utility = {
    getAppInfoObject: (serverObj) => {
        return serverObj.map(curr => {
            return {appId: curr.id, appSecret: curr.app_secret, displayName: curr.display_name}
        })
    }
}


const run = async (appcenterToken, companyName) => {

    try {
        const appsObj = await Adapter.getAllApps(companyName, appcenterToken)
        const apps = Utility.getAppInfoObject(appsObj)
        apps.forEach(async element => {
            console.log(`Evaluating app ${element.displayName}`)
            try {
                await Adapter.sendWebhookTo(element.appId, element.appSecret, github.context.payload, appcenterToken)
                console.log(`Success in sending webhook for app ${element.displayName}`)
            } catch (error) {
                console.warn(`Found an error while sending webhook for app ${element.displayName}, skipping`, error)
            }
        })
    } catch (error) {
        console.error('Failure in getting apps, aborting', error)
    }
}

run(core.getInput('appcenter-token'), core.getInput('company-name'))