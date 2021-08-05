const messageTypes = {
    clearLog: 'clearLog',
    console: 'console',
    currentTab: 'currentTab',
    localStorage: 'localStorage',
    localStorageKey: 'localStorageKey',
    getTracked: 'getTracked',
    request: 'request',
    setLocalStorage: 'setLocalStorage',
    startTracking: 'startTracking',
    stopTracking: 'stopTracking',
    trackedTabsChange: 'trackedTabsChange'
}

const ioBool = io => !!Number(io)

const logger = {
    info: (msg, data = '') => {
        console.debug(`%c${msg}\n`, `background: black; color: orange; font-style: italic;`, data)
    },
    data: (msg, data = '') => {
        console.debug(`%c${msg}\n`, `background: black; color: cyan; font-weight: bold;`, data)
    },
    warn: (msg, data = '') => {
        console.debug(`%c${msg}\n`, `background: black; color: maroon; font-weight: bold;`, data)
    }
}

config = {loader_config: {trustKey: "1"}, info: {beacon:"staging-bam-cell.nr-data.net",errorBeacon:"staging-bam-cell.nr-data.net",sa:1}}


document.addEventListener("DOMContentLoaded", () => {
    chrome.runtime.sendMessage({type: messageTypes.localStorageKey}, storageKey => {
        chrome.runtime.sendMessage({type: messageTypes.getTracked}, trackedTabs => {
            chrome.runtime.sendMessage({type: messageTypes.currentTab}, async currentTab => {
                if (currentTab && currentTab.url === window.location.href){
                    chrome.runtime.onMessage.addListener(({type, data, message, color}, sender, sendResponse) => {
                        if (type === 'console') {
                            logger.data(message, data)
                        }
                    }) 
                }
                if (!!trackedTabs.find(t => t.id === currentTab.id)){ 
                    Promise.all([
                        getLocalConfig('accountID', storageKey),
                        getLocalConfig('agentID', storageKey),
                        getLocalConfig('licenseKey', storageKey, true),
                        getLocalConfig('applicationID', storageKey, true),
                        getLocalConfig('nrLoaderType', storageKey, false, true, 'SPA'),
                        getLocalConfig('customLoaderUrl', storageKey, false, false),
                        getLocalConfig('customAgentUrl', storageKey, false, false),
                        getLocalConfig('beacon', storageKey, true, true, 'staging-bam-cell.nr-data.net'),
                        getLocalConfig('errorBeacon', storageKey, true, true, 'staging-bam-cell.nr-data.net'),
                        getLocalConfig('version', storageKey, false, false, 'current'),
                        getLocalConfig('copyPaste', storageKey, false, false)
                    ]).then(([accountId, agentId, licenseKey, applicationID, nrLoaderType, customLoaderUrl, customAgentUrl, beacon, errorBeacon, version, copyPaste]) => {
                        if (nrLoaderType.toLowerCase() === 'copy-paste' && copyPaste){
                            logger.info(`Injecting copy/paste snippet into \n${window.location.href}`)
                            prepend(copyPaste, null, true)
                        } else {
                            let loaderUrl, agentUrl;
                            if (nrLoaderType.toLowerCase() === 'custom' && !!customLoaderUrl) {
                                loaderUrl = customLoaderUrl
                                agentUrl = customAgentUrl
                            } 
                            else {
                                const types = {'lite': 'rum', 'pro': 'full', 'spa': 'spa'}
                                loaderUrl = `https://js-agent.newrelic.com/nr-loader-${types[nrLoaderType.toLowerCase()]}-${version}.min.js`
                            }
                            const aggUrl = agentUrl ? new URL(agentUrl) : new URL(loaderUrl)
                            config.info.agent = aggUrl.host + aggUrl.pathname.replace('loader-', '')
                            
                            logger.info(`appending NREUM data into\n${window.location.href}`, config)
                            const configString = `window.NREUM=window.NREUM||{};NREUM.loader_config=${JSON.stringify(config.loader_config)};NREUM.info=${JSON.stringify(config.info)}`
                            prepend(configString, null)

                            logger.info(`injecting\n${loaderUrl}\ninto\n${window.location.href}`)
                            prepend(null, loaderUrl)
                        }
                        
                        logger.info(`----------- INJECTION COMPLETE ----------`)
                    }).catch(err => {
                        console.error(err)
                    })
                } else {
                    logger.warn(`CANT TRACK ${window.location.href}! DONT INSERT SCRIPT`)
                }
            })
        })
    })
})

const getLocalConfig = (key, storageKey, info = false, update = true, fallback = null) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({type: 'localStorage', data: {key: `${storageKey}_${key}`}}, data => { 
            const optionalKeys = ['customAgentUrl', 'customLoaderUrl', 'version', 'copyPaste']
            if (!data && !!fallback) data = fallback
            if (!data && !optionalKeys.includes(key) ) reject(`No data... Empty Param... ${key}`)
            if (update) config.loader_config[key] = data;
            if (info && update) config.info[key] = data;
            resolve(data);
        })
    })
}

function prepend(content, src, contentIsScriptString = false) {
    if (contentIsScriptString){
        // content = content.replace(/<script>/g, '').replace(/<\/script>/g, '')
        content = new DOMParser().parseFromString(content, "text/html").querySelector("script").innerHTML
    }
    const injection = document.createElement('script');
    injection.id = "nrba-injection"
    if (content) injection.innerHTML = content;
    if (src) injection.src = src;
    document.documentElement.prepend(injection)
}
