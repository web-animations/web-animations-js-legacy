/**
 * Copyright 2013 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /**
 * Features:
 *  - The menu bars and the page structure
 *  - Tests can be created via check()
 *  - Auto run type
 *  - Manual run type
 */

(function() {
// For the results to be accessed when test is in an iframe.
var testResults = undefined;
// Boolean flag for whether the program is running in automatic mode
var runInAutoMode;
// Holds which test packet we are up to.
var testIndex = 0;
// How long the test is in seconds
var testLength;
// Extra-asserts current time
var testCurrentTime = 0;
// Stores all the tests for later processing
var testStack = [];
//Each index holds all the tests that occur at the same time
var testPackets = [];
// To store checks before processing
var checkStack = [];
// To clearly store if a test is a refTest & if it's the last one
var TestTypeEnum = {
  REGULAR : 0,
  IS_REF : 1,
  LAST_REF : 2
};

// How long to show each manual check for.
var pauseTime = 500;
// How long it takes an individual test to timeout.
var testTimeout = 2000000;
// How long it takes for the whole test system to timeout.
var frameworkTimeout = 2000000;

// The time between each frame render in seconds
var framePeriod = 0.016;
// Stops tests being triggered when the user is scrubbing
var isScrubbing = false;
// Allows users to input the desired animation time
var userInput = false;

// Wraps the different requestAnimation frame functions
var requestFrame = window.requestAnimationFrame ||
                   window.webkitRequestAnimationFrame ||
                   window.mozRequestAnimationFrame;

// To get user pausing working correctly
var beingPaused = 0;
var externallyPaused = [];
var userPaused = false;

function TestRecord(test, object, targets, time, cssStyle,
                    offsets, testType){
  this.test = test;
  this.object = object;
  this.targets = targets;
  this.time = time;
  this.cssStyle = cssStyle;
  this.offsets = offsets;
  this.testType = testType;
  // Stops test being re-asserted during replay
  this.complete = false;
}

function CheckStore(object, targets, time, testName, isRefTest){
  this.object = object;
  this.targets = targets;
  this.time = time;
  this.testName = testName;
  this.isRefTest = isRefTest;
}

// Call this function before setting up any checks.
// It generates the testing buttons and log and the testharness setup.
// @timeouts take in an object that could state a user defined value for
// the test-harness frameworkTimeout and testTimeout or the extra-asserts
// testLength e.g. {testLength : 9}
function setupTests(timeouts) {
  // Use any user stated timeouts
  for (var x in timeouts) {
    if (x == "frameworkTimeout") frameworkTimeout = timeouts[x];
    else if (x == "testTimeout") testTimeout = timeouts[x];
    else if (x == "testLength") testLength = timeouts[x];
  }

  // Set up padding for option bar
  var padding = document.createElement('div');
  padding.id = "padding";
  padding.className = "testBox";
  document.body.appendChild(padding);

  // Generate options bar
  var optionBar = document.createElement('div');

  var pausePlayButton = document.createElement("button");
  pausePlayButton.id = "pausePlayButton";
  pausePlayButton.setAttribute("type", "button");
  pausePlayButton.setAttribute("onclick", "animPause()");
  pausePlayButton.textContent = "Pause";

  var skipFrameForward = document.createElement("button");
  skipFrameForward.setAttribute("type", "button");
  skipFrameForward.setAttribute("onclick", "skipFrameForward()");
  skipFrameForward.textContent = ">";

  var skipFrameBack = document.createElement("button");
  skipFrameBack.setAttribute("type", "button");
  skipFrameBack.setAttribute("onclick", "skipFrameBack()");
  skipFrameBack.textContent = "<";

  var timeBar = new TimeBar();

  var select = document.createElement("select");
  select.setAttribute("id", "runType");

  var hideFlash = document.createElement("button");
  hideFlash.setAttribute("type", "button");
  hideFlash.setAttribute("onclick", "toggleFlash()");
  hideFlash.textContent = "Toggle Flash";

  var restartButton = document.createElement("button");
  restartButton.setAttribute("type", "button");
  restartButton.setAttribute("onclick", "restart()");
  restartButton.textContent = "Restart";

  var timeOfAnimation = document.createElement('div');
  timeOfAnimation.textContent = "Current animation time:";

  var setTime = document.createElement("input");
  setTime.id = "setTime";
  setTime.setAttribute("type", "text");
  setTime.value = "0.00";
  setTime.setAttribute("onfocus", "letUserInput()");
  setTime.setAttribute("onblur", "setTime()");

  document.body.appendChild(optionBar);
  optionBar.appendChild(timeBar);
  optionBar.appendChild(pausePlayButton);
  optionBar.appendChild(skipFrameBack);
  optionBar.appendChild(skipFrameForward);
  optionBar.appendChild(select);
  optionBar.appendChild(restartButton);
  optionBar.appendChild(hideFlash);
  optionBar.appendChild(timeOfAnimation);
  optionBar.appendChild(setTime);

  // Generate the log div
  var log = document.createElement('div');
  log.id = "log";
  optionBar.appendChild(log);

  // Set buttons
  select.options[select.options.length] =
    new Option('Manual Run', 'Manual');
  select.options[select.options.length] =
      new Option('Auto Run', 'Auto');
  setAutoMode(window.location.href.split("?")[1] !== "Manual");

  // Set the inital selected drop down list item
  select.selectedIndex = runInAutoMode;

  // Create a mask over test div to show flashes correctly
  var testBoxCopy = document.createElement('div');
  testBoxCopy.id = "flashBox";
  testBoxCopy.className = "testBox";
  testBoxCopy.setAttribute("onclick", "animPause()");
  var svgBox = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svgBox.id = "svgBox";

  document.body.appendChild(testBoxCopy);
  testBoxCopy.appendChild(svgBox);

  // Pass setup information to testharness.js
  setup({ explicit_done: true,
          timeout: frameworkTimeout,
          explicit_timeout: true });
}

// Allows tutorial harness to edit runInAutoMode
function setAutoMode(isAuto) { runInAutoMode = isAuto; }

// Depreciated. Allows tutorial harness to edit state.
function setState(newState) { setAutoMode(newState == "Auto"); }

// When the time input is clicked on it will pause the animation and stops the
// input box being overwritten by animTimeViewer.
function letUserInput() {
  pause();
  userInput = true;
}

// Applies the inputted time to the animation and updates the testIndex so it
// points to the next set of tests to run.
function setTime() {
  setTestCurrentTime(Number(document.getElementById("setTime").value));
  resetTestIndex();
  userInput = false;
  play();
}

function skipFrameForward() {
  setTestCurrentTime(testCurrentTime + framePeriod);
}

function skipFrameBack() {
  setTestCurrentTime(testCurrentTime - framePeriod);
}

function TimeBar() {
  this.timeBar = document.createElement('div');
  this.slider = document.createElement('div');
  this.timeBar.id = "timeBar";
  this.slider.id = "slider";
  this.timeBar.appendChild(this.slider);
  this.timeBar.addEventListener(
      'mousedown',
      (function(me) {
        return function() { me.startSlide() };
      })(this),
      false);
  this.timeBar.addEventListener(
      'mouseup',
      (function(me) {
        return function() { me.stopSlide() };
      })(this),
      false);
  this.timeBar.addEventListener(
      'mousemove',
      (function(me) {
        return function() { me.updateSlider() };
      })(this),
      false);
  return this.timeBar;
}

TimeBar.prototype.updateSlider = function() {
  if (!isScrubbing) return;
  var setPercent =
      ((event.clientX - this.timeBar.offsetLeft) / this.timeBar.offsetWidth).toFixed(2);
  this.slider.style.width = (setPercent * 100) + '%';
  setTestCurrentTime(setPercent * testLength);
}

// Start editing the animation time with the slider. It disables the tests so
// they won't trigger whilst this is happening.
TimeBar.prototype.startSlide = function() {
  if (isScrubbing) return;
  isScrubbing = true;
  pause();
  this.updateSlider();
}

// Cleans up after scrubbing and re-enables the tests.
TimeBar.prototype.stopSlide = function() {
  if (!isScrubbing) return;
  resetTestIndex();
  play();
  isScrubbing = false;
}

// Move testIndex to the right location. This not only re runs flashes that
// already have been played but also stops flashes that have been skipped
// not to show.
function resetTestIndex() {
  for (testIndex = 0;
      testPackets[testIndex][0].time < testCurrentTime &&
      testIndex < testPackets.length; testIndex++);
}

// Pause + play allow the animation to be paused by many different parts of
// extra-asserts but not played again until all parts that paused the animation
// say to play again.
function pause() {
  beingPaused++;
  for (var x in document.timeline.getPlayers()) {
    document.timeline.getPlayers()[x].pause();
  }
}

function play(){
  // If something gets out of sync don't let beingPaused go negative.
  beingPaused = beingPaused === 0 ? 0 : beingPaused - 1;
  for (var x = 0; x < document.timeline.getPlayers().length; x++) {
    if (beingPaused === 0) document.timeline.getPlayers()[x].unpause();
  }
}

// Adds each test to a list to be processed when runTests is called.
// @object: Html element to test
// @targets: Css style expected e.g. {left:"100px", top:"10px"}
// For ref tests pass an object for the property to be compared against
// e.g. {left:baseObject, top:baseObject}
// @time: The time the test will occur OR the interval between tests if refTest
// @testName: The name of the test
function check(object, targets, time, testName, isRefTest) {
  checkStack.push(new CheckStore(object, targets, time, testName, isRefTest));
}

// Creates all the tests and TestRecords required based on the passed in check.
// Processing after runTests is called allows for animations and checks to be
// called in any order.
function checkProcessor(object, targets, time, testName, isRefTest) {
  // Create new async test
  var test = async_test(testName);
  test.timeout_length = testTimeout;

  // Store the inital css style of the animated object so it can be
  // used for manual flash.
  var css = object.currentStyle || getComputedStyle(object, null);
  var offsets = {};
  offsets.top = getOffset(object).top - parseInt(css.top);
  offsets.left = getOffset(object).left- parseInt(css.left);
  if (isRefTest) {
    // Generate a test for each time you want to check the objects.
    for (var x = 0; x < testLength/time; x++) {
      testStack.push(new TestRecord(test, object, targets, time * x, css,
          offsets, TestTypeEnum.IS_REF));
    }
    testStack.push(new TestRecord(test, object, targets, time * x, css,
        offsets, TestTypeEnum.LAST_REF));
  } else {
    testStack.push(new TestRecord(test, object, targets, time, css, offsets,
        TestTypeEnum.REGULAR));
  }
}

// Helper function which gets the current absolute position of an object.
// From http://tiny.cc/vpbtrw
function getOffset(el) {
  var x = 0;
  var y = 0;
  while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)){
    x += el.offsetLeft - el.scrollLeft;
    y += el.offsetTop - el.scrollTop;
    el = el.offsetParent;
  }
  return {top:y, left:x};
}

//Call this after lining up the tests with check
function runTests() {
  // If no explict length is given to setup() assume the longest animation is the
  // total animation length.
  if(testLength === undefined){
    testLength = 0;
    for (var x = 0; x < document.timeline.getPlayers().length; x++){
      var currPlayer = document.timeline.getPlayers()[x];
      testLength = currPlayer._timedItem.animationDuration > testLength ?
                    currPlayer._timedItem.animationDuration : testLength;
    }
  }

  for (var x in checkStack){
    var c = checkStack[x];
    checkProcessor(c.object, c.targets, c.time, c.testName, c.isRefTest);
  }

  requestFrame(function(){ animTimeViewer(document.timeline.currentTime()); });
  sortTests();
  if (runInAutoMode) {
    pause();
    autoTestRunner();
  } else {
    testRunner();
  }
}

function animTimeViewer(oldTime) {
  if (!userInput){
    // When the animation isn't paused increase the time state
    if (beingPaused === 0) {
      testCurrentTime += Number(document.timeline.currentTime() - oldTime);
    }
    // Stops the shown time going beyond the animation length
    if (testCurrentTime > testLength) testCurrentTime = testLength;
    var displayTime = testCurrentTime.toFixed(2);
    var object = document.getElementById("setTime");
    object.value = displayTime;
    var slider = document.getElementById("slider");
    slider.style.width = (testCurrentTime / testLength) * 100 + "%";
  }
  var currentTime = document.timeline.currentTime();
  requestFrame(function(){ animTimeViewer(currentTime); });
}

function sortTests(){
  // Sort tests by time to set up timeouts properly
  testPackets = [];
  testStack.sort(testTimeSort);
  for (var x = 0; x < testStack.length; x++) {
    // Check for all tests that happen at the same time
    // and add them to the test packet.
    testPackets[testIndex] = [];
    testPackets[testIndex].push(testStack[x]);
    while (x < (testStack.length - 1)) {
      if (testStack[x].time == testStack[x + 1].time) {
        x++;
        testPackets[testIndex].push(testStack[x]);
      } else break;
    }
    testIndex++;
  }
  testIndex = 0;
}

function testTimeSort(a,b) { return(a.time - b.time) };

function setTestCurrentTime(time) {
  // Needs to take into account start time offsets
  // For now assumes that everything starts at time zero
  for (var x in document.timeline.getPlayers()) {
    document.timeline.getPlayers()[x].currentTime = time;
  }
  testCurrentTime = time;
}

function testRunner(){
  if (testIndex < testPackets.length) {
    var currTest = testPackets[testIndex][0];
    if (currTest.time > testLength) {
      // A test after the animation isn't valid. If you get this error
      // and the animation hasn't ended yet try setting testLength in the
      // inital setup e.g. setup({ testLength:3 })
      throw new Error("Test after animation end.");
    }
    // Forces the frame closest to the test to be exactly the test time
    if (!isScrubbing) {
      if (currTest.time < testCurrentTime + framePeriod) {
        pause();
        setTestCurrentTime(currTest.time);
        requestFrame(runManualTest);
      }
    }
  }
  requestFrame(testRunner);
}

function runManualTest() {
  for (var i = 0; i < testPackets[testIndex].length; i++) {
    var currTest = testPackets[testIndex][i];
    if(!test.complete) {
      assert_properties(currTest);
      if (currTest.testType == TestTypeEnum.REGULAR ||
          currTest.testType == TestTypeEnum.LAST_REF) currTest.test.done();
    }
    if (currTest.testType == TestTypeEnum.REGULAR) flash(currTest);
  }
  testIndex++;
  play();
  if (testIndex == testPackets.length) {
    done();
    timeout();
  }
}

function autoTestRunner() {
  if (testIndex != 0 && testIndex < testPackets.length + 1) {
    for (var x in testPackets[testIndex - 1]) {
      var currTest = testPackets[testIndex - 1][x];
      assert_properties(currTest);
      if (currTest.testType == TestTypeEnum.REGULAR ||
          currTest.testType == TestTypeEnum.LAST_REF) currTest.test.done();
    }
  }
  if (testIndex < testPackets.length) {
    var nextTest = testPackets[testIndex][0];
    setTestCurrentTime(nextTest.time);
    testIndex++;
    requestFrame(autoTestRunner);
  } else {
    pause();
    done();
  }
}

function restart() {
  // State only gets updated on init and Restart button push.
  var runType = document.getElementById("runType");
  var url = window.location.href.split("?");
  window.location.href = url[0] + "?" +
                         runType.options[runType.selectedIndex].value;
}

// Makes it easier to see whats going on in the test.
function animPause() {
  if (runInAutoMode) return;
  if (userPaused) {
    document.getElementById("pausePlayButton").textContent = "Pause";
    play();
    // Get the flashes ready to play again when the animation replays
    if (testCurrentTime == 0) testIndex = 0;
    userPaused = false;
    document.getElementById("test").style.backgroundColor = "white";
  } else {
    document.getElementById("pausePlayButton").textContent = "Play";
    pause();
    userPaused = true;
    document.getElementById("test").style.backgroundColor = "yellow";
  }
}

// Create elements at appropriate locations and flash the elements for
// manual testing.
function flash(test) {
  pause();
  var type = test.object.nodeName;

  // Create a new object of the same type as the thing being tested.
  if (type == "DIV") {
    var flash = document.createElement('div');
    document.getElementById("flashBox").appendChild(flash);
  } else {
    var flash = document.createElementNS("http://www.w3.org/2000/svg", type);
    document.getElementById("svgBox").appendChild(flash);
  }

  if (type == "DIV") {
    // Copy the object's orginal css style
    flash.style.cssText = test.cssStyle.cssText;
    // Flashes have to be absolute to appear in the right location
    flash.style.position = "absolute";
    flash.innerHTML = test.object.innerHTML;
    flash.className = "flash";
  } else {
    for (var x = 0; x < test.object.attributes.length; x++) {
      flash.setAttribute(test.object.attributes[x].name,
                         test.object.attributes[x].value);
    }
    flash.style.position = test.object.parentNode.style.position;
  }

  var seenTop = false;
  var seenLeft = false;
  for (var propName in test.targets) {
    var tar = test.targets[propName];
    if (propName == "left") seenLeft = true;
    else if (propName == "top") seenTop = true;
    if (type == "DIV"){
      flash.style[propName] = tar;
    } else {
      if (propName.indexOf("transform") != -1) propName = "transform";
      flash.setAttribute(propName, tar);
    }
  }

  if (type == "DIV") {
    if (!seenTop) {
      flash.style.top = getOffset(test.object).top + "px";
    } else {
      flash.style.top = parseInt(flash.style.top) + test.offsets.top + "px";
    }
    if (!seenLeft) {
      flash.style.left = getOffset(test.object).left + "px";
    } else {
      flash.style.left = parseInt(flash.style.left) + test.offsets.left + "px";
    }
  }

  //Set up the border
  if (type == "DIV"){
    flash.style.borderColor = 'black';
    flash.style.borderWidth = '3px';
    flash.style.borderStyle = 'solid';
    flash.style.opacity = 1;
  } else {
    flash.setAttribute("stroke", "black");
    flash.setAttribute("stroke-width", "3px");
    flash.setAttribute("fill-opacity", 1);
  }

  flashCleanUp(flash);
}

function flashCleanUp(victim) {
  setTimeout(function() {
    if (userPaused && !isScrubbing) {
      // Since the user has paused, keep any displayed divs up and set new timeout
      flashCleanUp(victim);
    } else {
      victim.parentNode.removeChild(victim);
      if (testCurrentTime <= testLength) play();
    }
  }, pauseTime);
}

function toggleFlash() {
  var elements = document.getElementById("svgBox").childNodes;
  for (var i = 0; i < elements.length; i++){
    if (elements[i].getAttribute("fill-opacity") == 1){
      elements[i].setAttribute("fill-opacity", 0);
      elements[i].setAttribute("stroke-width", "0px");
    } else {
      elements[i].setAttribute("fill-opacity", 1);
      elements[i].setAttribute("stroke-width", "3px");
    }
  }
  elements = document.getElementsByClassName("flash");
  for (var i = 0; i < elements.length; i++) {
    if (elements[i].style.display == 'block') {
      elements[i].style.display = 'none';
    } else {
      elements[i].style.display = 'block';
    }
  }
}

add_completion_callback(function (allRes, status) {
    testResults = allRes;
    window.testResults = testResults;
});

///////////////////////////////////////////////////////////////////////////////
//  All asserts below here                                                   //
///////////////////////////////////////////////////////////////////////////////
function assert_properties(test) {
  var object = test.object;
  var targetProperties = test.targets;
  var time = testCurrentTime;
  var isSVG = object.nodeName !== "DIV";

  // Create an element of the same type as testing so the style can be applied
  // from the test. This is so the css property (not the -webkit-does-something
  // tag) can be read.
  var referenceElement = isSVG ? document.createElementNS("http://www.w3.org/2000/svg",
      object.nodeName) : document.createElement(object.nodeName);
  referenceElement.style.position = "absolute";
  object.parentNode.appendChild(referenceElement);

  // Apply the style
  for (var propName in targetProperties) {
    // If the passed in value is an element then grab its current style for
    // that property
    if (targetProperties[propName] instanceof HTMLElement ||
        targetProperties[propName] instanceof SVGElement) {
      var propertyValue = getComputedStyle(targetProperties[propName],
                                           null)[propName];
    } else {
      var propertyValue = targetProperties[propName];
    }

    if (isSVG) {
      if (propName.indexOf("transform") == -1) {
        referenceElement.setAttribute(propName, propertyValue);
      }
    } else {
      referenceElement.style[propName] = propertyValue;
    }
  }

  if (isSVG){
    var currentStyle = object.attributes;
    var targetStyle = referenceElement.attributes;
  } else {
    var currentStyle = getComputedStyle(object, null);
    var targetStyle = getComputedStyle(referenceElement, null);
  }
  // For each css property strip it down to just numbers then
  // apply the assert
  for (var propName in targetProperties) {
    if (isSVG && propName.indexOf("transform") != -1) {
      assert_transform(object, targetProperties[propName]);
    } else {
      if (isSVG) {
        var target = targetStyle[propName].value;
        var curr = currentStyle[propName].value;
      } else {
        var target = targetStyle[propName];
        var curr = currentStyle[propName];
      }

      var t = target.replace(/[^0-9.\s]/g, "");
      var c = curr.replace(/[^0-9.\s]/g, "");
      if(t.length == 0) {
        // Assume it's a word property so do an exact assert
        test.test.step(function (){
          assert_equals(curr, target, "At time " + time + ", " + propName +
              " is not correct. Target: " + target + " Current state: " + curr);
        });
      } else {
        t = t.split(" ");
        c = c.split(" ");
        for (var x in t){
          test.test.step(function (){
            assert_equals(Number(c[x]), Number(t[x]), "At time " + time + ", " + propName +
                " is not correct. Target: " + target + " Current state: " + curr);
          });
        }
      }
    }
  }
  referenceElement.parentNode.removeChild(referenceElement);
  test.complete = true;
}

// Deals with the svg transforms special case.
function assert_transform(object, target){
  var currStyle = object.attributes["style"].value;
  currStyle = currStyle.replace(/[;\s]/,"");
  // Get rid of the begining property name bit.
  currStyle = currStyle.split(":")[1];
  currStyle = currStyle.split(/[()]+/);
  target = target.split(/[()]+/);

  for (var x = 0; x < currStyle.length - 1; x++){
    // Compare property name
    assert_equals(currStyle[x], target[x], "At time " + testCurrentTime + ", " +
        "Target: " + target[x] + " Current state: " + currStyle[x]);
    x++;
    // Compare property values
    var c = currStyle[x].split(",");
    var t = target[x].split(",");
    for (var i in c){
      assert_equals(c[i], t[i], "At time " + testCurrentTime + ", " +
        "Target: " + t + " Current state: " + c);
    }
  }
}

///////////////////////////////////////////////////////////////////////////////
//  Exposing functions to be accessed externally                             //
///////////////////////////////////////////////////////////////////////////////
window.setupTests = setupTests;
window.check = check;
window.runTests = runTests;
window.restart = restart;
window.toggleFlash = toggleFlash;
window.animPause = animPause;

window.skipFrameForward = skipFrameForward;
window.skipFrameBack = skipFrameBack;
window.setTime = setTime;
window.letUserInput = letUserInput;
})();