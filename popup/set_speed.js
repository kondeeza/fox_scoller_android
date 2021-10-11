var defaultPXperS = 30;

// localize popup
document.querySelector("#id_text_set_speed").innerHTML = browser.i18n.getMessage("setSpeedPopupText");
document.querySelector("#id_btn_set").innerHTML = browser.i18n.getMessage("setSpeedPopupButtonText");


// send message to background script
function setSpeed(newSpeed) {
    browser.runtime.sendMessage({
        source: "set_speed",
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

// enable button to confirm and send new Time
document.querySelector("#id_btn_set").addEventListener("click", function() {
    setSpeed(convertPXperSToInternalSpeed(document.querySelector("#id_input_PXperS").value));
    closeWindow();
});

// enable "Enter"-press to confirm ("Enter" simulates button press)
var inputPXperS = document.querySelector("#id_input_PXperS");
inputPXperS.addEventListener("keyup", function(event) {
    event.preventDefault();
    if(event.keyCode == 13) {
        document.querySelector("#id_btn_set").click();
    }
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



// close window
function closeWindow() {
    var gettingWindow = browser.windows.getCurrent();
    gettingWindow.then(function (windowInfo) {
        browser.windows.remove(windowInfo.id);
    });
}
