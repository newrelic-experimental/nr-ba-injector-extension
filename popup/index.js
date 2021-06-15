const messageTypes = {
    clearLog: 'clearLog',
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

// chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
//     console.log(tabId, "updated")
// });

chrome.runtime.onMessage.addListener(({type, data}, sender, sendResponse) => {
    if (type === messageTypes.request) setLog(data)
}) 

const setLog = (data = []) => {
    chrome.tabs.getSelected(null, function(tab) {
        const {id, url} = tab;
        const logElem = document.querySelector('#log');
        const currTabItems = data.filter(item => item.tabId === id)
        const items = currTabItems.map(item => `<pre class="log-item">${JSON.stringify(item, undefined, 2)}</div>`)
        logElem.innerHTML = !!items.length ? 
        `This Tab Has Stored ${items.length} Log Items Since ${currTabItems[currTabItems.length - 1].timestamp}<hr />${items.join("")}` 
        : '... Waiting for NR Browser Agent Network Requests ...';
    });
}

window.addEventListener('load', async () => {
    setLabel(await canTrack());

    setInputValue("#accountID", await getLocalStorage('accountID'))
    setInputValue("#agentID", await getLocalStorage('agentID'))
    setInputValue("#licenseKey", await getLocalStorage('licenseKey'))
    setInputValue("#applicationID", await getLocalStorage('applicationID'))
    setInputValue("#nrLoaderType", (await getLocalStorage('nrLoaderType')) || 'SPA')

    // TODO -- get other versions of agent, link to select elem

    chrome.runtime.sendMessage({type: messageTypes.request}, data => setLog(data))

    document.querySelector("#logBtn").addEventListener("click", () => {
        document.querySelector("#configTab").classList.add("hidden")
        document.querySelector("#logTab").classList.remove("hidden")
    })

    document.querySelector("#configBtn").addEventListener("click", () => {
        document.querySelector("#logTab").classList.add("hidden")
        document.querySelector("#configTab").classList.remove("hidden")
    })

    document.querySelector("#clearBtn").addEventListener("click", () => {
        chrome.tabs.getSelected(null, function(tab) {
            const {id, url} = tab;
            chrome.runtime.sendMessage({type: messageTypes.clearLog, data: id}, data => setLog(data))
        })
    })


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
        })
    })
})
