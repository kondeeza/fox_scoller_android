var hotkeyScrolling, hotkeyDirection, hotkeySpeed;

// localize text
document.querySelector("#id_title_h1").innerHTML = browser.i18n.getMessage("optionsTitle");
// -select
document.querySelector("#id_action_on_end_text_span").innerHTML = browser.i18n.getMessage("optionsActionOnEnd");
// -select items
document.querySelector("#id_action_on_end_select_nothing").innerHTML = browser.i18n.getMessage("optionsActionOnEndSelectNothing");
document.querySelector("#id_action_on_end_select_stop").innerHTML = browser.i18n.getMessage("optionsActionOnEndSelectStop");
document.querySelector("#id_action_on_end_select_toggle").innerHTML = browser.i18n.getMessage("optionsActionOnEndSelectToggle");
// -options
document.querySelector("#id_delay_text_span").innerHTML = browser.i18n.getMessage("optionsDelay");
document.querySelector("#id_keep_scrolling_text_span").innerHTML = browser.i18n.getMessage("optionsKeepScrolling");
document.querySelector("#id_automatically_start_text_span").innerHTML = browser.i18n.getMessage("optionsAutomaticallyStart");
document.querySelector("#id_background_scrolling_text_span").innerHTML = browser.i18n.getMessage("optionsBackgroundScrolling");
document.querySelector("#id_hotkeys_enabled_text_span").innerHTML = browser.i18n.getMessage("optionsEnableHotkeys");
// -hotkeys
document.querySelector("#id_hotkey_scrolling_text_span").innerHTML = browser.i18n.getMessage("optionsHotkeyScrolling");
document.querySelector("#id_hotkey_direction_text_span").innerHTML = browser.i18n.getMessage("optionsHotkeyDirection");
document.querySelector("#id_hotkey_speed_text_span").innerHTML = browser.i18n.getMessage("optionsHotkeySpeed");
// -set hotkey button
document.querySelector("#id_hotkey_scrolling_capture_btn").innerHTML = browser.i18n.getMessage("optionsSetHotkeyButton");
document.querySelector("#id_hotkey_direction_capture_btn").innerHTML = browser.i18n.getMessage("optionsSetHotkeyButton");
document.querySelector("#id_hotkey_speed_capture_btn").innerHTML = browser.i18n.getMessage("optionsSetHotkeyButton");


function saveOptions() {
    var actionOnEndSelect = document.querySelector("#id_action_on_end");
    var actionOnEndSelectValue = actionOnEndSelect.options[actionOnEndSelect.selectedIndex].value;
    var delayInput = document.querySelector("#id_delay_input");
    var delayValue = delayInput.value;
    var optionsSave = {
        extension_version: browser.runtime.getManifest().version,
        keep_scrolling: document.querySelector("#id_keep_scrolling_checkbox").checked,
        toggle_direction: actionOnEndSelectValue == "on_end_toggle",
        automatically_start: document.querySelector("#id_automatically_start_checkbox").checked,
        background_scrolling: document.querySelector("#id_background_scrolling_checkbox").checked,
        stop_scrolling_at_endpoint: actionOnEndSelectValue == "on_end_stop",
        delay_at_endpoint: delayValue==""?0:delayValue,
        hotkey_enabled: document.querySelector("#id_hotkeys_enabled_checkbox").checked,
        hotkey_scrolling: hotkeyScrolling,
        hotkey_direction: hotkeyDirection,
        hotkey_speed: hotkeySpeed
    };
    var savingOptions = browser.storage.local.set({optionsSave});
    savingOptions.then(function() {
        browser.runtime.sendMessage({
            source: "options",
            reason: "optionsChanged"
        });
    });
}

function populateOptions() {
    // show popup if it should be shown (default: true)
    var loadingOptionsSave = browser.storage.local.get("optionsSave");
    loadingOptionsSave.then(function(res) {
        // select
        var actionOnEndSelect = document.querySelector("#id_action_on_end");
        var delayInput = document.querySelector("#id_delay_input");
        // checkboxes
        var keepScrollingCheckbox = document.querySelector("#id_keep_scrolling_checkbox");
        var automaticallyStartCheckbox = document.querySelector("#id_automatically_start_checkbox");
        var backgroundScrollingCheckbox = document.querySelector("#id_background_scrolling_checkbox");
        var hotkeyEnabledCheckbox = document.querySelector("#id_hotkeys_enabled_checkbox");
        // hotkey spans
        var hotkeyScrollingDisplaySpan = document.querySelector("#id_hotkey_scrolling_display_span");
        var hotkeyDirectionDisplaySpan = document.querySelector("#id_hotkey_direction_display_span");
        var hotkeySpeedDisplaySpan = document.querySelector("#id_hotkey_speed_display_span");

        // select value from save
        actionOnEndSelect.value = res.optionsSave.toggle_direction?"on_end_toggle":res.optionsSave.stop_scrolling_at_endpoint?"on_end_stop":"on_end_nothing";
        delayInput.value = res.optionsSave.delay_at_endpoint;
        // set checkmark depending on save
        keepScrollingCheckbox.checked = res.optionsSave.keep_scrolling;
        automaticallyStartCheckbox.checked = res.optionsSave.automatically_start;
        backgroundScrollingCheckbox.checked = res.optionsSave.background_scrolling;
        hotkeyEnabledCheckbox.checked = res.optionsSave.hotkey_enabled;
        hotkeyScrolling = populateHotkeyOptions(res.optionsSave.hotkey_scrolling, hotkeyScrollingDisplaySpan);
        hotkeyDirection = populateHotkeyOptions(res.optionsSave.hotkey_direction, hotkeyDirectionDisplaySpan);
        hotkeySpeed = populateHotkeyOptions(res.optionsSave.hotkey_speed, hotkeySpeedDisplaySpan);
    });
}


var inputPXperS = document.querySelector("#id_delay_input");
inputPXperS.addEventListener("input", function(event) {
    saveOptions();
});

function populateHotkeyOptions(hotkeyIn, span) {
    var hotkeyOut = buildHotkeyObject(hotkeyIn.altKey, hotkeyIn.ctrlKey, hotkeyIn.shiftKey, hotkeyIn.metaKey, hotkeyIn.key);
    span.innerHTML = buildHotkeyString(hotkeyOut.altKey, hotkeyOut.ctrlKey, hotkeyOut.shiftKey, hotkeyOut.metaKey, hotkeyOut.key);
    return hotkeyOut;
}

function captureHotkeyScrolling(event) {
    var hotkeyScrollingDisplaySpan = document.querySelector("#id_hotkey_scrolling_display_span");
    if(event.key != "Escape") {
        event.preventDefault();
        hotkeyScrollingDisplaySpan.innerHTML = buildHotkeyString(event.altKey, event.ctrlKey, event.shiftKey, event.metaKey, event.key);
        hotkeyScrolling = buildHotkeyObject(event.altKey, event.ctrlKey, event.shiftKey, event.metaKey, event.key);
    } else {
        hotkeyScrollingDisplaySpan.innerHTML = buildHotkeyString(false, false, false, false, "- NONE -");
        hotkeyScrolling = buildHotkeyObject(false, false, false, false, "- NONE -");
    }

    hotkeyScrollingDisplaySpan.style.borderColor = "black";
    document.removeEventListener('keypress', captureHotkeyScrolling, false);
    saveOptions();
}

function captureHotkeyDirection(event) {
    var hotkeyDirectionDisplaySpan = document.querySelector("#id_hotkey_direction_display_span");
    if(event.key != "Escape") {
        event.preventDefault();
        hotkeyDirectionDisplaySpan.innerHTML = buildHotkeyString(event.altKey, event.ctrlKey, event.shiftKey, event.metaKey, event.key);
        hotkeyDirection = buildHotkeyObject(event.altKey, event.ctrlKey, event.shiftKey, event.metaKey, event.key);
    } else {
        hotkeyDirectionDisplaySpan.innerHTML = buildHotkeyString(false, false, false, false, "- NONE -");
        hotkeyDirection = buildHotkeyObject(false, false, false, false, "- NONE -");
    }

    hotkeyDirectionDisplaySpan.style.borderColor = "black";
    document.removeEventListener('keypress', captureHotkeyDirection, false);
    saveOptions();
}

function captureHotkeySpeed(event) {
    var hotkeySpeedDisplaySpan = document.querySelector("#id_hotkey_speed_display_span");
    if(event.key != "Escape") {
        event.preventDefault();
        hotkeySpeedDisplaySpan.innerHTML = buildHotkeyString(event.altKey, event.ctrlKey, event.shiftKey, event.metaKey, event.key);
        hotkeySpeed = buildHotkeyObject(event.altKey, event.ctrlKey, event.shiftKey, event.metaKey, event.key);
    } else {
        hotkeySpeedDisplaySpan.innerHTML = buildHotkeyString(false, false, false, false, "- NONE -");
        hotkeyDirection = buildHotkeyObject(false, false, false, false, "- NONE -");
    }

    hotkeySpeedDisplaySpan.style.borderColor = "black";
    document.removeEventListener('keypress', captureHotkeySpeed, false);
    saveOptions();
}

function buildHotkeyObject(altKey, ctrlKey, shiftKey, metaKey, key) {
    var hotkey = {
        altKey: altKey,
        ctrlKey: ctrlKey,
        shiftKey: shiftKey,
        metaKey: metaKey,
        key: key
    };

    return hotkey;
}

function buildHotkeyString(altKey, ctrlKey, shiftKey, metaKey, key) {
    var hotkeyString = altKey?"Alt + ":"";
    hotkeyString += ctrlKey?"Ctrl + ":"";
    hotkeyString += shiftKey?"Shift + ":"";
    hotkeyString += metaKey?"Meta + ":"";
    hotkeyString += key;

    return hotkeyString;
}

function enableHotkeyCaptureScrolling() {
    document.addEventListener('keypress', captureHotkeyScrolling, false);

    var hotkeyScrollingDisplaySpan = document.querySelector("#id_hotkey_scrolling_display_span");
    hotkeyScrollingDisplaySpan.style.borderColor = "red";
}

function enableHotkeyCaptureDirection() {
    document.addEventListener('keypress', captureHotkeyDirection, false);

    var hotkeyDirectionDisplaySpan = document.querySelector("#id_hotkey_direction_display_span");
    hotkeyDirectionDisplaySpan.style.borderColor = "red";
}

function enableHotkeyCaptureSpeed() {
    document.addEventListener('keypress', captureHotkeySpeed, false);

    var hotkeySpeedDisplaySpan = document.querySelector("#id_hotkey_speed_display_span");
    hotkeySpeedDisplaySpan.style.borderColor = "red";
}

function matchingKeys(hotkey, event) {
    return (event.altKey == hotkey.altKey && event.ctrlKey == hotkey.ctrlKey && event.shiftKey == hotkey.shiftKey && event.metaKey == hotkey.metaKey && event.key == hotkey.key);
}

populateOptions();
document.querySelector("#id_action_on_end").addEventListener("change", saveOptions);
document.querySelector("#id_keep_scrolling_checkbox").addEventListener("change", saveOptions);
document.querySelector("#id_automatically_start_checkbox").addEventListener("change", saveOptions);
document.querySelector("#id_background_scrolling_checkbox").addEventListener("change", saveOptions);
document.querySelector("#id_hotkeys_enabled_checkbox").addEventListener("change", saveOptions);
document.querySelector("#id_hotkey_scrolling_capture_btn").addEventListener("click", enableHotkeyCaptureScrolling);
document.querySelector("#id_hotkey_direction_capture_btn").addEventListener("click", enableHotkeyCaptureDirection);
document.querySelector("#id_hotkey_speed_capture_btn").addEventListener("click", enableHotkeyCaptureSpeed);









// speed input:
var defaultPXperS = 30;

// localize speed
document.querySelector("#id_text_set_speed").innerHTML = browser.i18n.getMessage("setSpeedPopupText");

// send message to background script
function setSpeed(newSpeed) {
    browser.runtime.sendMessage({
        source: "options",
        reason: "newSpeed",
        newSpeed: newSpeed //array newSpeed[0]: pixel, newSpeed[1]: time
    });
}

function convertPXperSToInternalSpeed(PXperS) {
    var deltaPixel, deltaTime;
    if(PXperS < 60) {
        deltaPixel = 1;
        deltaTime = 1000.0/PXperS;
    } else if(PXperS%60==0) {
        deltaPixel = PXperS/60;
        deltaTime = 1000.0/60;
    } else {
        deltaPixel = (PXperS-PXperS%60)/60+1;
        deltaTime = 1000.0/(PXperS/deltaPixel);
    }
    return [deltaPixel, deltaTime];
}

function convertInternalSpeedToPXperSForDisplay(speed) {
    return Math.round(1000.0/speed[1]*speed[0]);
}

// save speed when input changes and is not empty
var inputPXperS = document.querySelector("#id_input_PXperS");
inputPXperS.addEventListener("input", function(event) {
    if(!(document.querySelector("#id_input_PXperS").value == "")) setSpeed(convertPXperSToInternalSpeed(document.querySelector("#id_input_PXperS").value));
    else setSpeed(convertPXperSToInternalSpeed(1));
});

// get stored speed and prefill input
var gettingSpeed = browser.storage.local.get("speedSave");
gettingSpeed.then(function(res) {
    if(!(typeof res.speedSave === "undefined")) {
        inputPXperS.value = convertInternalSpeedToPXperSForDisplay(res.speedSave.savedSpeed);
    }
    else inputPXperS.value = defaultPXperS;
    inputPXperS.select();
});

console.log("successfully initiated foxscrollerff's option script")