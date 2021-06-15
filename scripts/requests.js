

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

        
        chrome.runtime.sendMessage({type: 'request', data: payload })
    }
}, {urls: ["<all_urls>"]}, [])