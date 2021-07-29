const bg = chrome.extension.getBackgroundPage();
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
    stopTracking: 'stopTracking'
}
const storageKey = 'nr-inserter';

const trackedTabs = new Set();

const ioBool = io => !!Number(io)

const getLocalStorage = (key) => {
    return window.localStorage.getItem(key) || null;
}

const setLocalStorage = (key, val) => {
    window.localStorage.setItem(key, val);
}

const getTrackedTabs = () => Array.from(trackedTabs).map(t => JSON.parse(t))

chrome.runtime.onMessage.addListener(({type, data}, sender, sendResponse) => {
    switch(type){
        case messageTypes.localStorage:
            const val = getLocalStorage(data.key);
            sendResponse(val);
            break;
        case messageTypes.localStorageKey:
            sendResponse(storageKey);
            break;
        case messageTypes.setLocalStorage:
            setLocalStorage(data.key, data.val);
            break;
        case messageTypes.startTracking:
            trackedTabs.add(JSON.stringify(data))
            sendResponse(getTrackedTabs())
            break
        case messageTypes.stopTracking:
            trackedTabs.delete(JSON.stringify(data))
            sendResponse(getTrackedTabs())
            break;
        case messageTypes.getTracked:
            sendResponse(getTrackedTabs())
            break
        case messageTypes.currentTab:
            chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
                sendResponse(tab)
            })
            return true
    }
})

const tabIsTracked = (tabId) => !!getTrackedTabs().find(t => t.id === tabId)

chrome.webRequest.onBeforeRequest.addListener(data => {
    if (data.url.includes("nr-data") && tabIsTracked(data.tabId)) {
        let encoded = ''
        let decoded = ''
        if (data.requestBody && data.requestBody.raw.length){
            var postBodyStr = decodeURIComponent(String.fromCharCode.apply(null,
                new Uint8Array(data.requestBody.raw[0].bytes)));
            
            if (postBodyStr && postBodyStr.startsWith("bel")) {
                try{
                encoded = postBodyStr
                decoded = qp.decode(postBodyStr)
                } catch(err){
                    // do nothing for now.... something didnt work decoding
                    chrome.tabs.sendMessage(data.tabId, {type: messageTypes.console, data: postBodyStr, message: 'Failed to decode body...'});
                }
            }
        }

        const url = new URL(data.url);
        const paths = url.pathname.split("/").filter(x => x);

        const type = paths[0]
        const licenseKey = paths[paths.length - 1];
        const account = url.searchParams.get("a");
        const sa = url.searchParams.get("sa");
        const agentVersion = url.searchParams.get("v");
        const transaction = url.searchParams.get("t");
        const rst = url.searchParams.get("rst")
        const ck = url.searchParams.get("ck");
        const referrer = url.searchParams.get("ref")

        const payload = {type, licenseKey, account, sa, agentVersion, transaction, rst, ck, referrer, timestamp: new Date().toLocaleString(), tabId: data.tabId, encodedBody: encoded, decodedBody: decoded }

        if (data.tabId >= 0) chrome.tabs.sendMessage(data.tabId, {type: messageTypes.console, data: payload, message: `Caught '${type}' Request to nr-data!`});  

    }
}, {urls: ["<all_urls>"]}, ['requestBody'])

chrome.webRequest.onHeadersReceived.addListener(
    data => {
        if (ioBool(getLocalStorage(`${storageKey}_overrideSecurityPolicy`)) && tabIsTracked(data.tabId)) {
            const newHeader = {name: "content-security-policy", value: `default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline'`};
            const responseHeaders = [...data.responseHeaders.filter(x => x.name.toLowerCase() !== 'content-security-policy'), newHeader]
            return { responseHeaders };
        }
    },
    // filters
    {urls: ["<all_urls>"]},
    // extraInfoSpec
    ["blocking", "responseHeaders", "extraHeaders"]
  );