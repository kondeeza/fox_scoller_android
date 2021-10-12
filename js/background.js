var scrollingTabIdArray = [];
var tabDirectionMap = new Map();
var defaultDeltaPixel = 1;
var defaultDeltaTime = 33.33;
var defaultKeepScrolling = false;
var defaultToggleDirection = false;
var defaultAutomaticallyStart = false;
var defaultBackgroundScrolling = false;
var defaultStopScrollingOnEndpoint = true;
var defaultDelayAtEndpoint = 0;
var defaultHotkeyEnabled = false;
var defaultHotkeyScrolling = {
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    key: "e"
};
var defaultHotkeyDirection = {
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    key: "r"
};
var defaultHotkeySpeed = {
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false,
    key: "w"
};
var keepScrolling = defaultKeepScrolling;
var automaticallyStart = defaultAutomaticallyStart;
var scrollingIcon = {
    16: "icons/fs_icon_scrolling_16.png",
    32: "icons/fs_icon_scrolling_32.png",
    64: "icons/fs_icon_scrolling_64.png"
};
let isAndroid = false;

try{
    // create context menu entry to set speed
    browser.contextMenus.create({
        id: "set_speed",
        title: browser.i18n.getMessage("contextMenuSetSpeed"),
        contexts: ["browser_action"]
    });
}
catch(err){
    // This Fx() does not exist on Android 
    console.log("Unable to create context menu. Likely because Client Browser is Android");
    isAndroid = true
}


if (!isAndroid){
    // create context menu entry to  toggle direction
    browser.contextMenus.create({
        id: "toggle_direction",
        title: browser.i18n.getMessage("contextMenuToggleDirection"),
        contexts: ["browser_action"]
    });

    // create context menu for settings
    browser.contextMenus.create({
        id: "open_options",
        title: browser.i18n.getMessage("contextMenuOptions"),
        contexts: ["browser_action"]
    });
}

// handle clock on menu items
function handleMenuClick(info, tab) {
    switch(info.menuItemId) {
        // create popup to enter new speed
        case "set_speed":
            openSetSpeedMenu();
            break;
        case "open_options":
            browser.runtime.openOptionsPage();
            break;
        case "toggle_direction":
            browser.tabs.sendMessage(tab.id, {
                reason: "toggleDirection"
            });
            break;
    }
}

function openSetSpeedMenu() {
    var popupUrl = browser.extension.getURL("popup/set_speed.html");
    browser.windows.create({
        url: popupUrl,
        type: "popup",
        height: 150,
        width: 250
    });
}

function toggleScrolling(tab) {
    tabId = tab.id;
    // check if already scrolling
    if(!alreadyScrolling(tabId)) {
        // start scrolling
        startScrolling(tabId, true);
    } else {
        // stop scrolling
        stopScrolling(tabId);
    }
}

function startScrolling(tabId, manual = false) {
    onStartScrolling(tabId);
    // start scolling
    var message = {
        reason: "startScrolling",
        direction: (tabDirectionMap.has(tabId))?tabDirectionMap.get(tabId):1,
        manual: manual
    };
    browser.tabs.sendMessage(tabId, message);
}

function stopScrolling(tabId) {
    browser.tabs.sendMessage(tabId, {
        reason: "stopScrolling"
    });
    onStopScrolling(tabId);
}

function onStartScrolling(tabId) {
    if (!isAndroid){
        // set scrolling icon
        browser.browserAction.setIcon({
            tabId: tabId, path: scrollingIcon
        });
    }
    // set icon text
    browser.browserAction.setTitle({ title: "FoxScroller:Android (On)" });
    // add tabId to list of scrolling tabs if its not in it
    addScrollingTabId(tabId);
}

function onStopScrolling(tabId) {
    if (!isAndroid){
        // set default icon
        browser.browserAction.setIcon({
            tabId: tabId
        });
    }
    // set icon text
    browser.browserAction.setTitle({ title: "FoxScroller:Android (Off)" });
    // remove tabId from list of scrolling tabs
    removeScrollingTabId(tabId);
}

function handleMessage(message, sender, sendResponse) {
    switch(message.source) {
        case "cs_scrolling":
            switch(message.reason) {
                case "stoppedScrolling":
                    // scrolling in content script stopped on its own (end of page reached)
                    onStopScrolling(sender.tab.id);
                    break;
                case "hotkeyScrollingPressed":
                    toggleScrolling(sender.tab);
                    break;
                case "hotkeySpeedPressed":
                    openSetSpeedMenu();
                    break;
                case "reportingDirection":
                    addTabDirection(sender.tab.id, message.direction);
                default:
                    break;
            }
            break;
        case "set_speed":
            switch(message.reason) {
                case "newSpeed":
                    updateSpeed(message.newSpeed);
                    break;
            }
            break;
        case "options":
            switch(message.reason) {
                case "optionsChanged":
                    loadOptions();
                    var getAllTabs = browser.tabs.query({});
                    getAllTabs.then(function(tabs) {
                       for(var i=0;i<tabs.length;i++) {
                           browser.tabs.sendMessage(tabs[i].id, {
                               reason: "optionsChanged"
                           });
                       }
                    });
                    break;
                case "newSpeed":
                    updateSpeed(message.newSpeed);
                    break;
            }
            break;
    }
}

// send new speed to scrolling tabs and save it
function updateSpeed(newSpeed) {
    // save newSpeed
    var speedSave = {
        savedSpeed: newSpeed
    };
    var savingSpeed = browser.storage.local.set({speedSave});

    // send new speed to scrolling tabs
    var getAllTabs = browser.tabs.query({});
    getAllTabs.then(function(tabs) {
        for(var i=0;i<tabs.length;i++) {
            browser.tabs.sendMessage(tabs[i].id, {
                reason: "setSpeed",
                newSpeed: newSpeed
            });
        }
    });
}

function addScrollingTabId(tabId) {
    if(!alreadyScrolling(tabId)) scrollingTabIdArray.push(tabId);
}

function addTabDirection(tabId, direction) {
    tabDirectionMap.set(tabId, direction);
}

function removeScrollingTabId(tabId) {
    var index = scrollingTabIdArray.indexOf(tabId);
    if(index != -1) {
        scrollingTabIdArray.splice(index, 1);
    }
}

function removeTabDirection(tabId) {
    tabDirectionMap.delete(tabId);
}

function alreadyScrolling(tabId) {
    return (scrollingTabIdArray.indexOf(tabId) != -1);
}

function handleRemovedTabs(tabId, removeInfo) {
    removeScrollingTabId(tabId);
    removeTabDirection(tabId);
}

var gettingSpeedSave = browser.storage.local.get("speedSave");
gettingSpeedSave.then(function(res) {
    if (typeof res.speedSave === "undefined") {
        var speedSave = {
            savedSpeed: [defaultDeltaPixel, defaultDeltaTime]
        };
        browser.storage.local.set({speedSave});
    }
});

// check if optionsSave exists, if not save default, and load them
function loadOptions() {
    var gettingOptionsSave = browser.storage.local.get("optionsSave");
    gettingOptionsSave.then(function(res) {
        if (typeof res.optionsSave === "undefined") {
            var optionsSave = {
                extension_version: browser.runtime.getManifest().version,
                keep_scrolling: defaultKeepScrolling,
                toggle_direction: defaultToggleDirection,
                automatically_start: defaultAutomaticallyStart,
                background_scrolling: defaultBackgroundScrolling,
                stop_scrolling_at_endpoint: defaultStopScrollingOnEndpoint,
                delay_at_endpoint: defaultDelayAtEndpoint,
                hotkey_enabled: defaultHotkeyEnabled,
                hotkey_scrolling: defaultHotkeyScrolling,
                hotkey_direction: defaultHotkeyDirection,
                hotkey_speed: defaultHotkeySpeed
            };
            var settingOptions = browser.storage.local.set({optionsSave});
            settingOptions.then(loadOptions);
        } else if(res.optionsSave.extension_version == "1.0") {
            // console.log("res.optionsSave.extension_version: "+res.optionsSave.extension_version);
            var optionsSave = {
                extension_version: "1.2",
                keep_scrolling: res.optionsSave.keep_scrolling,
                toggle_direction: res.optionsSave.toggle_direction,
                automatically_start: defaultAutomaticallyStart,
                background_scrolling: defaultBackgroundScrolling,
                hotkey_enabled: res.optionsSave.hotkey_enabled,
                hotkey_scrolling: res.optionsSave.hotkey_scrolling,
                hotkey_direction: res.optionsSave.hotkey_direction,
                hotkey_speed: res.optionsSave.hotkey_speed
            };
            var settingOptions = browser.storage.local.set({optionsSave});
            settingOptions.then(loadOptions);
        } else if(res.optionsSave.extension_version == "1.1") {
            // console.log("res.optionsSave.extension_version: "+res.optionsSave.extension_version);
            var optionsSave = {
                extension_version: "1.2",
                keep_scrolling: res.optionsSave.keep_scrolling,
                toggle_direction: res.optionsSave.toggle_direction,
                automatically_start: res.optionsSave.automatically_start,
                background_scrolling: defaultBackgroundScrolling,
                hotkey_enabled: res.optionsSave.hotkey_enabled,
                hotkey_scrolling: res.optionsSave.hotkey_scrolling,
                hotkey_direction: res.optionsSave.hotkey_direction,
                hotkey_speed: res.optionsSave.hotkey_speed
            };
            var settingOptions = browser.storage.local.set({optionsSave});
            settingOptions.then(loadOptions);
        } else if(res.optionsSave.extension_version == "1.2" || res.optionsSave.extension_version == "1.3") {
            // console.log("res.optionsSave.extension_version: "+res.optionsSave.extension_version);
            var optionsSave = {
                extension_version: "1.4",
                keep_scrolling: res.optionsSave.keep_scrolling,
                toggle_direction: defaultToggleDirection,
                automatically_start: res.optionsSave.automatically_start,
                background_scrolling: res.optionsSave.background_scrolling,
                stop_scrolling_at_endpoint: defaultStopScrollingOnEndpoint,
                delay_at_endpoint: defaultDelayAtEndpoint,
                hotkey_enabled: res.optionsSave.hotkey_enabled,
                hotkey_scrolling: res.optionsSave.hotkey_scrolling,
                hotkey_direction: res.optionsSave.hotkey_direction,
                hotkey_speed: res.optionsSave.hotkey_speed
            };
            var settingOptions = browser.storage.local.set({optionsSave});
            settingOptions.then(loadOptions);
        } else if(res.optionsSave.extension_version == "1.4" || res.optionsSave.extension_version == "1.5" || res.optionsSave.extension_version == "1.6") {
            // console.log("res.optionsSave.extension_version: "+res.optionsSave.extension_version);
            var optionsSave = {
                extension_version: "1.7",
                keep_scrolling: res.optionsSave.keep_scrolling,
                toggle_direction: res.optionsSave.toggle_direction,
                automatically_start: res.optionsSave.automatically_start,
                background_scrolling: res.optionsSave.background_scrolling,
                stop_scrolling_at_endpoint: res.optionsSave.stop_scrolling_at_endpoint,
                delay_at_endpoint: res.optionsSave.delay_at_endpoint,
                hotkey_enabled: res.optionsSave.hotkey_enabled,
                hotkey_scrolling: res.optionsSave.hotkey_scrolling,
                hotkey_direction: res.optionsSave.hotkey_direction,
                hotkey_speed: res.optionsSave.hotkey_speed
            };
            var settingOptions = browser.storage.local.set({optionsSave});
            settingOptions.then(loadOptions);
        } else {
            keepScrolling = res.optionsSave.keep_scrolling;
            automaticallyStart = res.optionsSave.automatically_start;
            if(!res.optionsSave.background_scrolling) browser.tabs.onActivated.addListener(handleTabsOnActivated);
            else {
                try{
                    browser.tabs.onActivated.removeListener(handleTabsOnActivated);
                } catch(e) {

                }
            }
        }
    });
}

var transitionTypeMap = new Map();

function onWebNavigationCommited(details) {
    transitionTypeMap.set(details.tabId, details.transitionType);
}

// restart scrolling, if new page should be scrolling / stop scrolling if page should not be scrolling (might be scrolling when using back button)
// scroll down by default on new page
function onWebNavigationCompletedHandler(details) {
    // console.log("onWebNavigationCompletedHandler fired.");
    if(transitionTypeMap.get(details.tabId) != "reload" && transitionTypeMap.get(details.tabId) != "auto_subframe") {
        var gettingDirection = browser.tabs.sendMessage(details.tabId, {
            reason: "gettingDirection"
        });
        gettingDirection.then(function (res) {
            addTabDirection(details.tabId, res.direction);
            resumeScrolling(details.tabId);
        });
    } else {
        resumeScrolling(details.tabId);
    }
}

function resumeScrolling(tabId) {
    if ((alreadyScrolling(tabId) && keepScrolling) || automaticallyStart) startScrolling(tabId);
    else stopScrolling(tabId);
}

loadOptions();

// add listeners
browser.runtime.onMessage.addListener(handleMessage);
browser.browserAction.onClicked.addListener(toggleScrolling);
if (!isAndroid){
    browser.contextMenus.onClicked.addListener(handleMenuClick);
}
browser.tabs.onRemoved.addListener(handleRemovedTabs);
browser.webNavigation.onCompleted.addListener(onWebNavigationCompletedHandler);
browser.webNavigation.onCommitted.addListener(onWebNavigationCommited);


// background scrolling (pause (i.e. stop scrolling) when tab is no longer active, resume (i.e. start scrolling) if active again)
var activeTabInWindowMap = new Map();
var pausedTabs = [];
function handleTabsOnActivated(tabInfo) {
    // console.log(tabInfo);
    if(activeTabInWindowMap.has(tabInfo.windowId)) {
        if(alreadyScrolling(activeTabInWindowMap.get(tabInfo.windowId))) {
            pausedTabs.push(activeTabInWindowMap.get(tabInfo.windowId));
            stopScrolling(activeTabInWindowMap.get(tabInfo.windowId));
        }
    }
    activeTabInWindowMap.set(tabInfo.windowId, tabInfo.tabId);

    var index = pausedTabs.indexOf(tabInfo.tabId);
    if(index != -1) {
        startScrolling(tabInfo.tabId);
        pausedTabs.splice(index, 1);
    }
}
console.log("successfully initiated foxscrollerff's background script")