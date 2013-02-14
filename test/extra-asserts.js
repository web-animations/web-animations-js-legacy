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
 */

(function() {
// Boolean flag for whether the program is running in automatic mode
var runInAutoMode;
// Stores all the tests for later processing
var testStack = [];
// Each index holds all the tests that occur at the same time
var testPackets = [];
// The parGroup all animations need to be added to to achieve 'global' pause
var parentAnimation;
// To clearly store if a test is a refTest & if it's the last one
var TestTypeEnum = {
  REGULAR : 0,
  IS_REF : 1,
  LAST_REF : 2
};
// To store checks before processing
var checkStack = [];
// Keeps track of which testPacket it's up to
var testIndex = 0;

// How long it takes an individual test to timeout in millisecs.
var testTimeout = 1000;
// How long it takes for the whole test system to timeout in millisecs.
var frameworkTimeout = 2000;

// Wraps the different requestAnimation frame functions
var requestFrame = window.requestAnimationFrame ||
                   window.webkitRequestAnimationFrame ||
                   window.mozRequestAnimationFrame;

function TestRecord(test, object, targets, time, message, cssStyle,
                    offsets, isRefTest){
  this.test = test;
  this.object = object;
  this.targets = targets;
  this.time = time;
  this.message = message;
  this.cssStyle = cssStyle;
  this.offsets = offsets;
  this.isRefTest = isRefTest;
}

function CheckStore(object, targets, time, testName){
  this.object = object;
  this.targets = targets;
  this.time = time;
  this.testName = testName;
}

// Call this function before setting up any checks.
// It generates the testing buttons and log and the testharness setup.
function setupTests(timeouts){
  // Use any user supplied timeouts
  for(var x in timeouts){
   if (x == "frameworkTimeout") frameworkTimeout = timeouts.frameworkTimeout;
   else if (x == "testTimeout") testTimeout = timeouts.testTimeout;
  }

  // Set up padding for option bar
  var padding = document.createElement('div');
  padding.id = "padding";
  document.body.appendChild(padding);

  // Generate options bar
  var optionBar = document.createElement('div');
  var select = document.createElement("select");
  select.setAttribute("id", "runType");
  var button = document.createElement("button");
  button.setAttribute("type", "button");
  button.setAttribute("onclick", "restart()");
  button.innerHTML = "Restart";
  document.body.appendChild(optionBar);
  var timeOfAnimation = document.createElement('div');
  timeOfAnimation.id = "animViewerText";
  optionBar.appendChild(select);
  optionBar.appendChild(button);
  optionBar.appendChild(timeOfAnimation);

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
  setup({explicit_done: true, timeout: frameworkTimeout});
}

// Allows tutorial harness to edit runInAutoMode
function setAutoMode(isAuto){
  runInAutoMode = isAuto;
}

// Adds each test to a list to be processed when runTests is called.
// @object: Html element to test
// @targets: Css style expected e.g. {left:"100px", top:"10px"}
// For ref tests pass an object for the property to be compared against
// e.g. {left:baseObject, top:baseObject}
// @time: The time the test will occur OR the interval between tests if refTest
// @testName: The name of the test
function check(object, targets, time, testName){
  checkStack.push(new CheckStore(object, targets, time, testName));
}

// Creates all the tests and TestRecords required based on the passed in check.
// Processing after runTests is called allows for animations and checks to be
// called in any order.
function checkProcessor(object, targets, time, testName){
  var test = async_test(testName);
  test.timeout_length = testTimeout;

  // Store the inital css style of the animated object so it can be
  // used for manual flashing.
  var css = object.currentStyle || getComputedStyle(object, null);
  var offsets = [];
  offsets.top = getOffset(object).top - parseInt(css.top);
  offsets.left = getOffset(object).left- parseInt(css.left);
  // Error message strings
  var m1 = "Property ";
  var m2 = " is not satisfied";
  if (targets.refTest){
    var maxTime = document.animationTimeline.children[0].animationDuration;
    // Generate a test for each time you want to check the objects.
    for (var x = 0; x < maxTime/time; x++){
      testStack.push(new TestRecord(test, object, targets, time * x,
          m1 + targets + m2, css, offsets, TestTypeEnum.IS_REF));
    }
    testStack.push(new TestRecord(test, object, targets, maxTime, m1
        + targets + m2, css, offsets, TestTypeEnum.LAST_REF));
  } else {
    testStack.push(new TestRecord(test, object, targets, time, m1
        + targets + m2, css, offsets, TestTypeEnum.REGULAR));
  }
}

// Helper function which gets the current absolute position of an object.
// From http://tiny.cc/vpbtrw
function getOffset(el){
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
function runTests(){
  // All animations are put into a single parGroup to allow a global pause
  // When a global pause is implented this can be removed
  parentAnimation = new ParGroup(document.animationTimeline.children);
  for (var x in checkStack){
    var c = checkStack[x];
    checkProcessor(c.object, c.targets, c.time, c.testName);
  }
  animTimeViewer();
  sortTests();
  parentAnimation.pause();
  autoTestRunner();
}

// Displays the current animation time on the screen.
function animTimeViewer(){
  var currTime = parentAnimation.iterationTime === null ?
      0.0 : parentAnimation.iterationTime.toFixed(2);
  var object = document.getElementById("animViewerText");
  object.innerHTML = "Current animation time " + currTime;
  requestFrame(animTimeViewer);
}

function restart(){
  // State only gets updated on init and Restart button push.
  var runType = document.getElementById("runType");
  var url = window.location.href.split("?");
  window.location.href = url[0] + "?" + runType.options[runType.selectedIndex].value;
}

// Check for all tests that happen at the same time
// and add them to the test packet.
function sortTests(){
  var i = 0;
  testPackets = [];
  testStack.sort(testPacketComparator);
  for (var x = 0; x < testStack.length; x++){
    testPackets[i] = [];
    testPackets[i].push(testStack[x]);
    while ((x < (testStack.length - 1)) && (testStack[x].time === testStack[x + 1].time)){
      x++;
      testPackets[i].push(testStack[x]);
    }
    i++;
  }
}

function testPacketComparator(a,b) { return(a.time - b.time) };

function autoTestRunner(){
  if (testIndex != 0 && testIndex <= testPackets.length){
    for (var x in testPackets[testIndex - 1]){
      var currTest = testPackets[testIndex - 1][x];
      assert_properties(currTest);
      if (currTest.isRefTest == TestTypeEnum.REGULAR ||
          currTest.isRefTest == TestTypeEnum.LAST_REF) currTest.test.done();
    }
  }
  if (testIndex < testPackets.length){
    var nextTest = testPackets[testIndex][0];
    parentAnimation.currentTime = nextTest.time;
    testIndex++;
    requestFrame(autoTestRunner);
  } else {
    parentAnimation.pause();
    done();
  }
}

function assert_properties(test){
  //TODO
}

///////////////////////////////////////////////////////////////////////////////
//  Exposing functions to be accessed externally                             //
///////////////////////////////////////////////////////////////////////////////
window.setupTests = setupTests;
window.check = check;
window.runTests = runTests;
window.restart = restart;
window.setAutoMode = setAutoMode;
})();