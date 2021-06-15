config = {loader_config: {trustKey: "1"}, info: {beacon:"staging-bam-cell.nr-data.net",errorBeacon:"staging-bam-cell.nr-data.net",sa:1}}

// document.addEventListener("DOMContentLoaded", () => {
//     const nrbaScripts = [document, document.head, document.body]
//         .reduce((curr, next) => [...curr, ...next.querySelectorAll("script")], [])
//         .filter(script => (script.src && (script.src.includes("js-agent.newrelic") || script.src.includes("js-agent.nr-assets")) ) || (script.innerHTML && script.innerHTML.includes("NREUM")));

    chrome.runtime.sendMessage({type: 'localStorageKey'}, storageKey => {
        chrome.runtime.sendMessage({type: 'localStorage', data: {key: `${storageKey}_canTrack`}}, response => {
            const canTrack = !!Number(response);
            if (canTrack){
                Promise.all([
                    getLocalConfig('accountID', storageKey),
                    getLocalConfig('agentID', storageKey),
                    getLocalConfig('licenseKey', storageKey, true),
                    getLocalConfig('applicationID', storageKey, true),
                    getLocalConfig('nrLoaderType', storageKey)
                ]).then((data) => {
                    // nrbaScripts.forEach(script => {
                    //     console.debug("removing existing NR Browser Agent script -->", script)
                    //     script.remove();
                    // })
                    console.debug("appending NREUM data", config)
                    const configString = `window.NREUM=window.NREUM||{};NREUM.loader_config=${JSON.stringify(config.loader_config)};NREUM.info=${JSON.stringify(config.info)}`
                    prepend(configString, null)
                    const nrLoaderType = (data[4] || 'SPA').toLowerCase();
                    const types = {'lite': 'rum', 'pro': 'full', 'spa': 'spa'}
                    console.debug(`inserting https://js-agent.newrelic.com/nr-loader-${types[nrLoaderType]}-current.min.js`)
                    prepend(null, `https://js-agent.newrelic.com/nr-loader-${types[nrLoaderType]}-current.min.js`)
                }).catch(err => {
                    console.debug(err);
                })
            } else {
                console.debug("CANT TRACK! DONT INSERT SCRIPT")
            }
        })
    })
    
// })


const getLocalConfig = (key, storageKey, info = false) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({type: 'localStorage', data: {key: `${storageKey}_${key}`}}, data => { 
            if (!data) reject(`Can't inject NR... Empty Param... ${key}`)
            config.loader_config[key] = data;
            if (info) config.info[key] = data;
            resolve(data);
        })
    })
}

const prepend = (content, src, head=true) => {
    const injection = document.createElement('script');
    if (content) injection.innerHTML = content;
    if (src) injection.src = src;
    // if (src) injection.src = chrome.extension.getURL(src);
    // injection.onload = function(){console.log("onload", window.NREUM, src)};
    (head ? (document.head || document.documentElement) : document.documentElement).prepend(injection);
}