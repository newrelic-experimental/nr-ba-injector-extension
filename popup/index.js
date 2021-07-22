const messageTypes = {
    clearLog: 'clearLog',
    console: 'console',
    localStorage: 'localStorage',
    localStorageKey: 'localStorageKey',
    request: 'request',
    setLocalStorage: 'setLocalStorage',
}

const canTrack = async () => !!Number(await getLocalStorage('canTrack'))

const getLocalStorage = (key) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({type: messageTypes.localStorageKey}, storageKey => {
            chrome.runtime.sendMessage({type: messageTypes.localStorage, data: {key: `${storageKey}_${key}`}}, data => {
                resolve(data);
            })
        })
    })
}

const setInputValue = (selector, value) => {
    document.querySelector(selector).value = value || "";
}

const setLabel = canTrack => {
    document.querySelector("#canTrack").innerHTML = canTrack ? 'On' : 'Off';
}

const setLocalStorage = (data) => {
    chrome.runtime.sendMessage({type: messageTypes.localStorageKey}, storageKey => {
        chrome.runtime.sendMessage({type: messageTypes.setLocalStorage, data: {...data, key: `${storageKey}_${data.key}`}})
    })
}

window.addEventListener('load', async () => {
    setLabel(await canTrack());

    setInputValue("#accountID", await getLocalStorage('accountID'))
    setInputValue("#applicationID", await getLocalStorage('applicationID'))
    setInputValue("#agentID", await getLocalStorage('agentID'))
    setInputValue("#licenseKey", await getLocalStorage('licenseKey'))
    setInputValue("#licenseKey", await getLocalStorage('licenseKey'))
    setInputValue("#version", await getLocalStorage('version'))
    setInputValue("#customLoaderUrl", await getLocalStorage('customLoaderUrl') || null)
    setInputValue("#customAgentUrl", await getLocalStorage('customAgentUrl') || null)

    const nrLoaderType = await getLocalStorage('nrLoaderType') || 'SPA'
    setInputValue("#nrLoaderType", nrLoaderType)
    showHide(nrLoaderType.toLowerCase())

    document.querySelector("#btn").addEventListener("click", async () => {
        const ct = !(await canTrack());
        setLabel(ct);
        setLocalStorage({key: `canTrack`, val: Number(ct)})
        if (!!ct){
            showHelper("Reload pages to START tracking")
            chrome.browserAction.setIcon({path: {"16": '/assets/icon_16.png', "32": '/assets/icon_32.png'}});
        } else {
            showHelper("Reload running pages to STOP tracking")
            chrome.browserAction.setIcon({path: {"16": '/assets/icon_disabled_16.png', "32": '/assets/icon_disabled_32.png'}});
        }
    })

    document.querySelector("#reloadAll").addEventListener("click", async () => {
        chrome.tabs.query({currentWindow: true}, (tabs) =>{
            tabs.forEach(tab => chrome.tabs.reload(tab.id))
            document.querySelector("#helper").hidden = true
        })
    })

    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (val) => {
            const {id, value} = val.target
            setLocalStorage({key: id, val: value})
            showHelper("Reload any running pages to see changes")
        })
    })

    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('input', e => {
            const {id, value} = e.target;
            setLocalStorage({key: id, val: value})
            showHelper("Reload any running pages to see changes")
            if (id === 'nrLoaderType') showHide(value.toLowerCase())
        })
    })

    function showHelper(message){
        document.querySelector("#helper").hidden = false
        document.querySelector("#helper-text").innerText = message
        document.querySelector("#reloadAll").hidden = false
    }

    function showHide (loaderType){
        document.querySelector("#version").hidden = loaderType === 'custom'
        document.querySelector("#versionLabel").hidden = loaderType === 'custom'
        document.querySelector("#customLoaderUrl").hidden = loaderType !== 'custom'
        document.querySelector("#customLoaderUrlLabel").hidden = loaderType !== 'custom'
        document.querySelector("#customAgentUrl").hidden = loaderType !== 'custom'
        document.querySelector("#customAgentUrlLabel").hidden = loaderType !== 'custom'
    }
})
