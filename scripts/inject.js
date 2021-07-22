config = {loader_config: {trustKey: "1"}, info: {beacon:"staging-bam-cell.nr-data.net",errorBeacon:"staging-bam-cell.nr-data.net",sa:1}}

chrome.runtime.onMessage.addListener(({type, data, message}, sender, sendResponse) => {
    if (type === 'console') console.debug(message, data)
}) 

document.addEventListener("DOMContentLoaded", () => {
    chrome.runtime.sendMessage({type: 'localStorageKey'}, storageKey => {
        chrome.runtime.sendMessage({type: 'localStorage', data: {key: `${storageKey}_canTrack`}}, async response => {
            const canTrack = !!Number(response);
            if (canTrack){
                await removeNRScripts()
                Promise.all([
                    getLocalConfig('accountID', storageKey),
                    getLocalConfig('agentID', storageKey),
                    getLocalConfig('licenseKey', storageKey, true),
                    getLocalConfig('applicationID', storageKey, true),
                    getLocalConfig('nrLoaderType', storageKey),
                    getLocalConfig('customLoaderUrl', storageKey, false, false),
                    getLocalConfig('customAgentUrl', storageKey, false, false),
                    getLocalConfig('version', storageKey, false, false)
                ]).then(([accountId, agentId, licenseKey, applicationID, nrLoaderType = 'spa', customLoaderUrl, customAgentUrl, version = 'current']) => {
                    let loaderUrl, agentUrl;
                    if (nrLoaderType.toLowerCase() === 'custom' && !!customLoaderUrl) {
                        loaderUrl = customLoaderUrl
                        agentUrl = customAgentUrl
                    } else {
                        const types = {'lite': 'rum', 'pro': 'full', 'spa': 'spa'}
                        loaderUrl = `https://js-agent.newrelic.com/nr-loader-${types[nrLoaderType.toLowerCase()]}-${version}.min.js`
                    }
                    const aggUrl = agentUrl ? new URL(agentUrl) : new URL(loaderUrl)
                    config.info.agent = aggUrl.host + aggUrl.pathname.replace('loader-', '')
                    
                    console.debug("appending NREUM data", config)
                    const configString = `window.NREUM=window.NREUM||{};NREUM.loader_config=${JSON.stringify(config.loader_config)};NREUM.info=${JSON.stringify(config.info)}`
                    prepend(configString, null)

                    console.debug(`injecting ${loaderUrl}`)
                    prepend(null, loaderUrl)
                }).catch(err => {
                    console.debug(err);
                })
            } else {
                console.debug("CANT TRACK! DONT INSERT SCRIPT")
            }
        })
    })
})

const removeNRScripts = (retries = 0) => {
    return new Promise(async (resolve, reject) => {
        if (retries >= 3) reject("Couldn't remove all the scripts.. too many retries")
        const nrbaScripts = [document, document.head, document.body]
        .reduce((curr, next) => [...curr, ...next.querySelectorAll("script")], [])
        .filter(script => script.id !== 'nrba-injection' && 
            (
                (script.src && (script.src.includes("js-agent.newrelic") || script.src.includes("js-agent.nr-assets")) ) || 
                (script.innerHTML && script.innerHTML.includes("NREUM"))
            )
        );
        nrbaScripts.forEach(script => {
            console.debug("removing existing NR Browser Agent script -->", script)
            script.remove();
        })
        resolve(!nrbaScripts.length ? true : await removeNRScripts(++retries))
    })
}


const getLocalConfig = (key, storageKey, info = false, update = true) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({type: 'localStorage', data: {key: `${storageKey}_${key}`}}, data => { 
            const optionalKeys = ['customAgentUrl', 'customLoaderUrl', 'version']
            if (key === 'nrLoaderType' && !data) data = 'SPA'
            if (!data && !optionalKeys.includes(key) ) reject(`No data... Empty Param... ${key}`)
            if (update) config.loader_config[key] = data;
            if (info && update) config.info[key] = data;
            resolve(data);
        })
    })
}

const prepend = (content, src, head=true) => {
    const injection = document.createElement('script');
    injection.id = "nrba-injection"
    if (content) injection.innerHTML = content;
    if (src) injection.src = src;
    (head ? (document.head || document.documentElement) : document.documentElement).prepend(injection);
}
