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

let currentTab;
chrome.runtime.sendMessage({type: messageTypes.currentTab}, tab => {
    currentTab = tab
})

const getLocalStorage = (key) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({type: messageTypes.localStorageKey}, storageKey => {
            chrome.runtime.sendMessage({type: messageTypes.localStorage, data: {key: `${storageKey}_${key}`}}, data => {
                resolve(data);
            })
        })
    })
}

const ioBool = io => !!Number(io)

const setInputValue = (selector, value) => {
    document.querySelector(selector).value = value || "";
}

const setInputChecked = (selector, checked) => {
    document.querySelector(selector).checked = checked || false;
}

const setOnOffLabel = (selector, on) => {
    document.querySelector(selector).innerHTML = on ? 'On' : 'Off';
}

const setLocalStorage = (data) => {
    chrome.runtime.sendMessage({type: messageTypes.localStorageKey}, storageKey => {
        chrome.runtime.sendMessage({type: messageTypes.setLocalStorage, data: {...data, key: `${storageKey}_${data.key}`}})
    })
}

const setTrackedTabsList = (trackedTabs) => {
    const buildElems = (trackedTabs) => {
        const tabList = document.querySelector("#trackedTabs")
        tabList.innerHTML = ""
        trackedTabs.forEach(tab => {
            const div = document.createElement("div")
            div.classList.add(...["flex-between", "gray"])
            const section = document.createElement("div")
            section.className = "section"
            section.innerText = tab.title

            const buttonWrapper = document.createElement("div")
            buttonWrapper.className = "flex-between"
            const stopButton = document.createElement("i")
            stopButton.classList.add(...['fas', 'fa-trash-alt'])
            stopButton.onclick = () => stopTracking(tab)

            const refreshButton = document.createElement("i")
            refreshButton.classList.add(...['fas', 'fa-sync'])
            refreshButton.onclick = () => refreshTab(tab.id)
    
            div.appendChild(section)
            buttonWrapper.appendChild(refreshButton)
            buttonWrapper.appendChild(stopButton)
            div.appendChild(buttonWrapper)
            tabList.appendChild(div)
        })
    }
    new Promise((resolve, reject) => {
        if (trackedTabs) resolve(trackedTabs)
        else {
            chrome.runtime.sendMessage({type: messageTypes.getTracked}, response => {
                resolve(response)
            })
        }
    }).then((tabs = []) => {
        if (tabs.length){
            if (!!tabs.find(t => t.id === currentTab.id)) document.querySelector("#btn-inject").hidden = true
            buildElems(tabs)
            document.querySelector("#runningTabs").hidden = false
        } else {
            document.querySelector("#runningTabs").hidden = true
            document.querySelector("#btn-inject").hidden = false
        }
    })
}

const stopTracking = (tab) => {
   chrome.runtime.sendMessage({type: messageTypes.stopTracking, data: tab}, trackedTabs => {
       setTrackedTabsList(trackedTabs)
       refreshTab(tab.id)
   })
}

const startTracking = () => {
    chrome.runtime.sendMessage({type: messageTypes.startTracking, data: currentTab}, trackedTabs => {
        setTrackedTabsList(trackedTabs);
        refreshTab(currentTab.id)
    })
}

const refreshTab = (tabId) => {
    setTimeout(() => chrome.tabs.reload(tabId), 1000)
}

window.addEventListener('load', async () => {
    setOnOffLabel("#overrideSecurityPolicy", ioBool(await getLocalStorage('overrideSecurityPolicy')))

    setTrackedTabsList()

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


    document.querySelector("#btn-inject").addEventListener("click", async () => {
        startTracking()
    })
    
    document.querySelector("#btn-disable-security").addEventListener("click", async () => {
        const overrideSecurityPolicy = !ioBool(await getLocalStorage('overrideSecurityPolicy'))
        setOnOffLabel("#overrideSecurityPolicy", overrideSecurityPolicy);
        setLocalStorage({key: `overrideSecurityPolicy`, val: Number(overrideSecurityPolicy)})
        showHelper("Reload any running pages to see changes")
    })

    document.querySelector("#reloadAll").addEventListener("click", async () => {
        chrome.runtime.sendMessage({type: messageTypes.getTracked}, trackedTabs => {
            trackedTabs.forEach(tab => refreshTab(tab.id))
            document.querySelector("#helper").hidden = true
        })
    })

    document.querySelectorAll('input[type="text"]').forEach(input => {
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
