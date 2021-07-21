const bg = chrome.extension.getBackgroundPage();
const messageTypes = {
    clearLog: 'clearLog',
    console: 'console',
    localStorage: 'localStorage',
    localStorageKey: 'localStorageKey',
    request: 'request',
    setLocalStorage: 'setLocalStorage',
}
const storageKey = 'nr-inserter';

const canTrack = () => !!Number(bg.window.localStorage.getItem(`${storageKey}_canTrack`));

const getLocalStorage = (key) => {
    return window.localStorage.getItem(key);
}

const setLocalStorage = (key, val) => {
    window.localStorage.setItem(key, val);
}

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
    }
})

chrome.webRequest.onBeforeRequest.addListener(data => {
    if (data.url.includes("nr-data")) {
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
