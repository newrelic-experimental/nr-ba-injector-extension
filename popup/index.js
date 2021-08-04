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
    if (value) document.querySelector(selector).value = value
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

chrome.runtime.onMessage.addListener( ({type, data}, sender, sendResponse) => {
    if (type === messageTypes.trackedTabsChange) setTrackedTabsList(data)
})

const setTrackedTabsList = (trackedTabs) => {
    const buildElems = (trackedTabs) => {
        const tabList = document.querySelector("#trackedTabs")
        tabList.innerHTML = ""
        trackedTabs.forEach(tab => {
            const div = document.createElement("div")
            div.classList.add(...["flex-between", "gray", "tab-list-container"])
            div.title = "Click to Focus Tab"

            const listIcon = document.createElement("img")
            listIcon.className = "list-icon"
            listIcon.src = tab.favIconUrl

            const tabTitle = document.createElement("div")
            tabTitle.innerText = tab.title
            tabTitle.className = "flex-grow"

            const section = document.createElement("div")
            section.classList.add(...["section", "flex-between", "flex-grow", "pointer"])
            section.onclick = () => {
                chrome.tabs.update(tab.id, {highlighted: true})
                chrome.tabs.update(currentTab.id, {highlighted: false})
            }
            section.appendChild(listIcon)
            section.appendChild(tabTitle)

            const buttonWrapper = document.createElement("div")
            buttonWrapper.className = "flex-between"
            const stopButton = document.createElement("i")
            stopButton.classList.add(...['fas', 'fa-trash-alt', 'btn'])
            stopButton.onclick = () => stopTracking(tab)

            const refreshButton = document.createElement("i")
            refreshButton.classList.add(...['fas', 'fa-sync', 'btn'])
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
            document.querySelector("#configTab").classList.add("border-right")
        } else {
            document.querySelector("#configTab").classList.remove("border-right")
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
    setInputValue("#beacon", await getLocalStorage('beacon'))
    setInputValue("#errorBeacon", await getLocalStorage('errorBeacon'))
    setInputValue("#version", await getLocalStorage('version'))
    setInputValue("#customLoaderUrl", await getLocalStorage('customLoaderUrl') || null)
    setInputValue("#customAgentUrl", await getLocalStorage('customAgentUrl') || null)
    setInputValue("#copyPaste", await getLocalStorage('copyPaste') || null)

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

    document.querySelectorAll('input[type="text"], textarea').forEach(input => {
        input.addEventListener('input', (val) => {
            const {id, value} = val.target
            setLocalStorage({key: id, val: (value || "").trim().replace(/\r?\n|\r/g, '')})
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

    setTimeout(() => {
        document.querySelector("#loader").classList.add("hidden")
        document.querySelector("#container").classList.remove("hidden")
    }, 250)

    function showHelper(message){
        document.querySelector("#helper").hidden = false
        document.querySelector("#helper-text").innerText = message
        document.querySelector("#reloadAll").hidden = false
    }

    function showHide (loaderType){
        switch(loaderType){
            case 'copy-paste':
                document.querySelectorAll(".standard, .non-custom, .custom").forEach(x => x.hidden = true)
                document.querySelectorAll(".copy-paste").forEach(x => x.hidden = false)
                break
            case 'custom':
                document.querySelectorAll(".non-custom, .copy-paste").forEach(x => x.hidden = true)
                document.querySelectorAll(".custom, .standard").forEach(x => x.hidden = false)
                break
            default:
                document.querySelectorAll(".custom, .copy-paste").forEach(x => x.hidden = true)
                document.querySelectorAll(".standard, .non-custom").forEach(x => x.hidden = false)
        }
    }
})
