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
    const nrLoaderType = await getLocalStorage('nrLoaderType') || 'SPA'
    setInputValue("#nrLoaderType", nrLoaderType)
    const customLoaderUrl = await getLocalStorage('customLoaderUrl') || null
    setInputValue("#customLoaderUrl", customLoaderUrl)
    const customAgentUrl = await getLocalStorage('customAgentUrl') || null
    setInputValue("#customAgentUrl", customAgentUrl)

    showHide(nrLoaderType.toLowerCase())

    document.querySelector("#btn").addEventListener("click", async () => {
        const ct = await canTrack();
        const newCanTrack = !ct;
        setLabel(newCanTrack);
        setLocalStorage({key: `canTrack`, val: Number(newCanTrack)})

        if (!!newCanTrack){
            document.querySelector("#helper-text").innerText = "Reload pages to START tracking"
            chrome.browserAction.setIcon({path: {"16": '/assets/icon_16.png', "32": '/assets/icon_32.png'}});
        } else {
            document.querySelector("#helper-text").innerText = "Reload any running pages to STOP tracking"
            chrome.browserAction.setIcon({path: {"16": '/assets/icon_disabled_16.png', "32": '/assets/icon_disabled_32.png'}});
        }
        
    })

    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (val) => {
            const newValue = val.target.value;
            const elemID = val.target.id;
            setLocalStorage({key: elemID, val: newValue})
            
            document.querySelector("#helper-text").innerText = "Reload any running pages to see changes"
        })
    })

    document.querySelectorAll('select').forEach(select => {
        select.addEventListener('input', e => {
            const {id, value} = e.target;
            setLocalStorage({key: id, val: value})
            document.querySelector("#helper-text").innerText = "Reload any running pages to see changes"
            console.log("id, val", id, value)
            if (id === 'nrLoaderType') {
                showHide(value.toLowerCase())
            }
        })
    })

    function showHide (loaderType){
        document.querySelector("#version").hidden = loaderType === 'custom'
        document.querySelector("#versionLabel").hidden = loaderType === 'custom'
        document.querySelector("#customLoaderUrl").hidden = loaderType !== 'custom'
        document.querySelector("#customLoaderUrlLabel").hidden = loaderType !== 'custom'
        document.querySelector("#customAgentUrl").hidden = loaderType !== 'custom'
        document.querySelector("#customAgentUrlLabel").hidden = loaderType !== 'custom'
    }
})
