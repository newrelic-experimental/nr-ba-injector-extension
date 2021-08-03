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
    stopTracking: 'stopTracking',
    trackedTabsChange: 'trackedTabsChange'
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

const getTrackedTabById = tabId => getTrackedTabs().find(x => x.id === tabId)

chrome.runtime.onMessage.addListener( ({type, data}, sender, sendResponse) => {
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
            intercept(data)
            trackedTabs.add(JSON.stringify(data))
            sendResponse(getTrackedTabs())
            break
        case messageTypes.stopTracking:
            stopIntercept(data)
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

chrome.tabs.onRemoved.addListener(tabId => {
    trackedTabs.delete(JSON.stringify(getTrackedTabById(tabId)))
    chrome.runtime.sendMessage({type: messageTypes.trackedTabsChange, data: getTrackedTabs()})
})

chrome.tabs.onUpdated.addListener((tabId, newInfo) => {
    if (!!newInfo.url || !!newInfo.title || !!newInfo.favIconUrl) {
        const tab = getTrackedTabById(tabId)
        if (tab){
            const newTab = {
                ...tab, 
                url: newInfo.url || tab.url, 
                title: newInfo.title || tab.title, 
                favIconUrl: newInfo.favIconUrl || tab.favIconUrl
            }
            trackedTabs.delete(JSON.stringify(tab))
            trackedTabs.add(JSON.stringify(newTab))
            chrome.runtime.sendMessage({type: messageTypes.trackedTabsChange, data: getTrackedTabs()})
        }
    }
})

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

        if (data.tabId >= 0) chrome.tabs.sendMessage(data.tabId, {type: messageTypes.console, data: payload, message: `${data.initiator}\ninitiated '${type}' request to nr-data!`});  

    }
}, {urls: ["<all_urls>"]}, ['requestBody'])

chrome.webRequest.onHeadersReceived.addListener(
    data => {
        if (ioBool(getLocalStorage(`${storageKey}_overrideSecurityPolicy`)) && tabIsTracked(data.tabId)) {
            const newHeader = {name: "content-security-policy", value: `upgrade-insecure-requests; default-src * data: blob: 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval'; connect-src * 'unsafe-inline'; img-src * data: blob: 'unsafe-inline'; frame-src *; style-src * 'unsafe-inline'; media-src * data: blob: 'unsafe-inline'; worker-src * data: blob: 'unsafe-inline';`};
            const responseHeaders = [...data.responseHeaders.filter(x => x.name.toLowerCase() !== 'content-security-policy'), newHeader]
            return { responseHeaders };
        }
    },
    // filters
    {urls: ["<all_urls>"]},
    // extraInfoSpec
    ["blocking", "responseHeaders", "extraHeaders"]
  );

  const stopIntercept = async(tab) => {
    console.debug("stop intercept")
    let target = {tabId: tab.id};
  
    await new Promise((res, err)=> chrome.debugger.detach(target, result=>{
      if (chrome.runtime.lastError) {
        err(chrome.runtime.lastError);
      } else {
        res(result);
      }
    }));

    try{
    chrome.debugger.sendCommand(target, "Fetch.disable", (e) => {
       console.debug('fetch disabled for ', tab.id)
    })}
    catch(err){
        // theres no debugger for this tab
    }
  }

  const intercept = async(tab) => {
    let target = {tabId: tab.id};
  
    await new Promise((res, err)=> chrome.debugger.attach(target, "1.3", result=>{
      if (chrome.runtime.lastError) {
        err(chrome.runtime.lastError);
      } else {
        res(result);
      }
    }));

    chrome.debugger.sendCommand(target, "Fetch.enable",
    {
       patterns: [{
          requestStage: "Response",
          resourceType: "Document"
       }]
    }, (e) => {
       console.debug('fetch enabled for ', tab.id)
    })

    chrome.debugger.onEvent.addListener(async(source, method, params) => {
            if (method === "Fetch.requestPaused") { 
                try{
                    const requestId = String(params.requestId)
                    if (params.responseHeaders){
                        chrome.debugger.sendCommand(target, "Fetch.getResponseBody", { requestId }, async response => {
                            if (response && !!response.body){
                                const strippedHTML = await removeNR(target.tabId, Base64.decode(response.body))
                                chrome.debugger.sendCommand(target, 'Fetch.fulfillRequest', {
                                        requestId,
                                        responseCode: 200,
                                        body: Base64.encode(strippedHTML),
                                        responseHeaders: params.responseHeaders
                                    }, () => {
                                })
                            } else {
                                chrome.debugger.sendCommand(target, "Fetch.continueRequest", { requestId }, async body => {
                                    // console.log("continuedRequest")
                                })
                            }
                        })
                    }
                } catch(err){
                    chrome.debugger.sendCommand(target, "Fetch.continueRequest", { requestId }, async body => {
                        // console.log("continuedRequest")
                    })
                }
            }
     })
  }

  const removeNR = (tabId, data) => {
    return new Promise((resolve, reject) => {
        var parser = new DOMParser();
        var htmlDoc = parser.parseFromString(data, 'text/html'); 
        const nrbaScripts = [htmlDoc.documentElement, htmlDoc.head, htmlDoc.body]
        .reduce((curr, next) => [...curr, ...next.querySelectorAll("script")], [])
        .filter(script => script.id !== 'nrba-injection' && 
            (
                (script.src && (script.src.includes("js-agent.newrelic") || script.src.includes("js-agent.nr-assets")) ) || 
                (script.innerHTML && script.innerHTML.includes("NREUM"))
            )
        );
        nrbaScripts.forEach(script => {
            console.debug(`Tab ${tabId} HTML document has existing NR Script. removing script -->`, script)
            script.remove();
        })
        const newHTML = htmlDoc.documentElement.outerHTML
        resolve(newHTML)
    })
    
}   