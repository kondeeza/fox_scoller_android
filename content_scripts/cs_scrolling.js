var scrolling = false;
var deltaPixel;
var deltaTime;
var reqAnimDeltaPixel;
var previousTimeStamp = null;
var timeOut;
var direction = 1; // scrolling direction: 1=down, -1=up
var endPoint = window.scrollMaxY;
var toggleDirectionBool;
var stopScrollingAtEndpoint;
var hotkeyScrolling;
var hotkeyDirection;
var hotkeySpeed;
var delayAtEndpoint = 0;

function startScrolling(newDirection, manual) {
    if(!scrolling) {
        // Don't start scrolling if already at end. Alert user.
        if(manual && !toggleDirectionBool && ((newDirection == -1 && window.scrollY == 0) || (newDirection == 1 && window.scrollY == window.scrollMaxY))) {
            //alert((direction==1?"Lower":"Upper")+" end reached. Toggle direction to scroll the other way.");
            alert(browser.i18n.getMessage(direction == 1 ? "lowerEndReached" : "upperEndReached"));
            stopScrolling(true);
        } else if(!manual && (newDirection == -1 && window.scrollY == 0)) {
            toggleDirection();
            startScrolling(direction, manual);
        } else {
            scrolling = true;
            // get saved speed
            var gettingSpeed = browser.storage.local.get("speedSave");
            gettingSpeed.then(function (res) {
                deltaPixel = res.speedSave.savedSpeed[0];
                deltaTime = res.speedSave.savedSpeed[1];
                reqAnimDeltaPixel = Math.round(1000.0/deltaTime*deltaPixel);

                // start scrolling when loading is finished
                if (newDirection != direction) {
                    toggleDirection(false);
                }
                excecuteScrolling();
            });
        }
    }
}

// function to handle messages send by the background script
function handleMessage(request, sender, sendResponse) {
    switch(request.reason) {
        case "startScrolling":
            startScrolling(request.direction, request.manual);
            break;
        case "stopScrolling":
            stopScrolling(false);
            break;
        case "setSpeed":
            setSpeed(request.newSpeed);
            break;
        case "optionsChanged":
            loadOptions();
            break;
        case "gettingDirection":
            sendCurrentDirection(sendResponse);
            break;
        case "toggleDirection":
            toggleDirection();
            break;
        default:
            break;
    }
}

function sendCurrentDirection(sendResponse) {
    if (!(typeof sendResponse === "undefined")) sendResponse({direction: direction});
    else {
        browser.runtime.sendMessage({
            source: "cs_scrolling",
            reason: "reportingDirection",
            direction: direction
        });
    }
}

// stop scrolling in current active tab and notify background script if "notify == true"
function stopScrolling(notify) {
    scrolling = false;
    previousTimeStamp = null;
    distanceToScrollOnNextFrame = 0;
    if(!notify) {
        try {
            clearTimeout(timeOut);
        } catch(e) {

        }
    } else {
        browser.runtime.sendMessage({
            source: "cs_scrolling",
            reason: "stoppedScrolling"
        });
    }
}

function setSpeed(newSpeed) {
    deltaPixel = newSpeed[0];
    deltaTime = newSpeed[1];
    reqAnimDeltaPixel = Math.round(1000.0/deltaTime*deltaPixel);
}

function toggleDirection(report = true) {
    direction *= -1;
    // endPoint = direction==1?window.scrollMaxY:0;
    if(report) sendCurrentDirection();
}

// scroll using "requestAnimationFrame" (no scrolling/speed input possible)
var distanceToScrollOnNextFrame = 0;
var timeOfHittingEndPoint = null;

function excecuteScrolling() {
    window.requestAnimationFrame(function scrollABit(timestamp) {
        if(scrolling) {
            // decide which endpoint to use, depending on the direction
            endPoint = direction==1?window.scrollMaxY:0;
            if ((window.scrollY != endPoint)) {
                // initialize previoustimestamp if empty
                if(!previousTimeStamp) previousTimeStamp = timestamp;
                // reset timeOfHittingEndPoint, because page is not at the end
                timeOfHittingEndPoint = null;
                // sum up distance that should be scrolled in the elapsed time
                distanceToScrollOnNextFrame += (timestamp-previousTimeStamp)/1000*reqAnimDeltaPixel;
                // if distance is greater than one pixel scroll it and reset it
                if(distanceToScrollOnNextFrame > 1) {
                    window.scrollBy(0, direction*distanceToScrollOnNextFrame);
                    distanceToScrollOnNextFrame = 0;
                }
                // register function to be called on the next frame
                window.requestAnimationFrame(scrollABit);
                previousTimeStamp = timestamp;
            } else {
                previousTimeStamp = null;
                distanceToScrollOnNextFrame = 0;
                if(!timeOfHittingEndPoint && delayAtEndpoint != 0) {
                    // save time when end is reached first time and delay is not zero
                    timeOfHittingEndPoint = timestamp;
                    // register function to be called on the next frame
                    window.requestAnimationFrame(scrollABit);
                } else if(delayAtEndpoint == 0 || timestamp - timeOfHittingEndPoint >= delayAtEndpoint) {
                    // decide what to do when at the end and delay has elapsed or is zero
                    if (toggleDirectionBool) {
                        timeOfHittingEndPoint = null;
                        toggleDirection();
                        // register function to be called on the next frame
                        window.requestAnimationFrame(scrollABit);
                    } else if (stopScrollingAtEndpoint) {
                        // reset timeOfHittingEndPoint
                        timeOfHittingEndPoint = null;
                        stopScrolling(true);
                    } else {
                        // register function to be called on the next frame
                        window.requestAnimationFrame(scrollABit);
                    }
                } else {
                    // case for when delay has not elapsed yet
                    // register function to be called on the next frame
                    window.requestAnimationFrame(scrollABit);
                }
            }
        }
    })
}

function loadOptions() {
    var gettingOptionsSave = browser.storage.local.get("optionsSave");
    gettingOptionsSave.then(function(res) {
        toggleDirectionBool = res.optionsSave.toggle_direction;
        stopScrollingAtEndpoint = res.optionsSave.stop_scrolling_at_endpoint;
        delayAtEndpoint = res.optionsSave.delay_at_endpoint * 1000;
        hotkeyScrolling = res.optionsSave.hotkey_scrolling;
        hotkeyDirection = res.optionsSave.hotkey_direction;
        hotkeySpeed = res.optionsSave.hotkey_speed;
        // register listener if hotkeys are enabled
        if(res.optionsSave.hotkey_enabled) document.addEventListener('keypress', handleKeypress, false);
        else {
            try{
                document.removeEventListener('keypress', handleKeypress, false);
            } catch(e) {

            }
        }
    });
}

function matchingKeys(hotkey, event) {
    return (event.altKey == hotkey.altKey && event.ctrlKey == hotkey.ctrlKey && event.shiftKey == hotkey.shiftKey && event.metaKey == hotkey.metaKey && event.key == hotkey.key);
}

function handleKeypress(event) {
    // test if the target is not an <input>
    if (event.target.nodeName != "INPUT") {
        // test for hotkey
        if (matchingKeys(hotkeyScrolling, event)) {
            event.preventDefault();
            // send message to background script
            browser.runtime.sendMessage({
                source: "cs_scrolling",
                reason: "hotkeyScrollingPressed"
            });
        } else if (matchingKeys(hotkeyDirection, event)) {
            event.preventDefault();
            toggleDirection();
        } else if (matchingKeys(hotkeySpeed, event)) {
            event.preventDefault();
            // send message to background script
            browser.runtime.sendMessage({
                source: "cs_scrolling",
                reason: "hotkeySpeedPressed"
            });
        }
    }
}


loadOptions();
// Assign handleMessages as listener for messages from the extension.
browser.runtime.onMessage.addListener(handleMessage);
console.log("successfully initiated foxscrollerff's content script")