const bg = chrome.extension.getBackgroundPage();
const messageTypes = {
    clearLog: 'clearLog',
    localStorage: 'localStorage',
    localStorageKey: 'localStorageKey',
    request: 'request',
    setLocalStorage: 'setLocalStorage',
}
const storageKey = 'nr-inserter';

let log = []

const canTrack = () => !!Number(bg.window.localStorage.getItem(`${storageKey}_canTrack`));

const getLocalStorage = (key) => {
    return window.localStorage.getItem(key);
}

const setLocalStorage = (key, val) => {
    window.localStorage.setItem(key, val);
}

chrome.runtime.onMessage.addListener(({type, data}, sender, sendResponse) => {
    switch(type){
        case messageTypes.clearLog:
            log = log.filter(x => x.tabId !== data)
            sendResponse(log)
        case messageTypes.localStorage:
            const val = getLocalStorage(data.key);
            sendResponse(val);
            break;
        case messageTypes.localStorageKey:
            sendResponse(storageKey);
            break;
        case messageTypes.request:
            sendResponse(log)
            break;
        case messageTypes.setLocalStorage:
            setLocalStorage(data.key, data.val);
            break;
    }
})

chrome.webRequest.onBeforeRequest.addListener(data => {
    if (data.url.includes("nr-data")) {
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

        const payload = {type, licenseKey, account, sa, agentVersion, transaction, rst, ck, referrer, timestamp: new Date().toLocaleString(), tabId: data.tabId }

        if (log.length < 1000) log.unshift(payload)
        else {
            log.unshift(payload);
            log.pop();
        }
        chrome.runtime.sendMessage({type: 'request', data: log })
    }
}, {urls: ["<all_urls>"]}, [])
