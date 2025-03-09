chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeText({
        text: "OFF",
    });
});

const amazon = 'https://www.amazon.com';

chrome.action.onClicked.addListener(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url && tab.url.startsWith(amazon)) {
        const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
        const nextState = prevState === 'ON' ? 'OFF' : 'ON';

        await chrome.action.setBadgeText({
            tabId: tab.id,
            text: nextState,
        });

        if (nextState === "ON") {
            await chrome.scripting.insertCSS({
                files: ["ecoscan.css"],
                target: { tabId: tab.id },
            });
            await chrome.tabs.sendMessage(tab.id, { action: "start" });
        } else if (nextState === "OFF") {
            await chrome.scripting.removeCSS({
                files: ["ecoscan.css"],
                target: { tabId: tab.id },
            });
            await chrome.tabs.sendMessage(tab.id, { action: "stop" });
        }
    } else {
        console.warn(`Tab URL ${tab.url} does not match ${amazon}`);
    }
});