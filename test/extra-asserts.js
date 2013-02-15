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
                    offsets, isRefTest) {
  this.test = test;
  this.object = object;
  this.targets = targets;
  this.time = time;
  this.message = message;
  this.cssStyle = cssStyle;
  this.offsets = offsets;
  this.isRefTest = isRefTest;
}

function CheckStore(object, targets, time, testName, isRefTest) {
  this.object = object;
  this.targets = targets;
  this.time = time;
  this.testName = testName;
  this.isRefTest = isRefTest;
}

// Call this function before setting up any checks.
// It generates the testing buttons and log and the testharness setup.
function setupTests(timeouts) {
  // Use any user supplied timeouts
  for (var x in timeouts) {
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
function setAutoMode(isAuto) {
  runInAutoMode = isAuto;
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
  if (isRefTest) {
    var maxTime = parentAnimation.animationDuration;
    // Generate a test for each time you want to check the objects.
    for (var x = 0; x < maxTime/time; x++) {
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
function getOffset(el) {
  var x = 0;
  var y = 0;
  while (el && !isNaN(el.offsetLeft) && !isNaN(el.offsetTop)) {
    x += el.offsetLeft - el.scrollLeft;
    y += el.offsetTop - el.scrollTop;
    el = el.offsetParent;
  }
  return {top:y, left:x};
}

//Call this after lining up the tests with check
function runTests() {
  // All animations are put into a single parGroup to allow a global pause
  // When a global pause is implented this can be removed
  // parentAnimation = new ParGroup(document.animationTimeline.children);
  reparent();
  for (var x in checkStack) {
    var c = checkStack[x];
    checkProcessor(c.object, c.targets, c.time, c.testName, c.isRefTest);
  }
  animTimeViewer();
  sortTests();
  parentAnimation.pause();
  autoTestRunner();
}

// Put all the animations into a par group to get around global pause issue.
function reparent(){
  var childList = [];
  for (var i = 0; i < document.animationTimeline.children.length; i++) {
    childList.push(document.animationTimeline.children[i]);
  }
  parentAnimation = new ParGroup(childList);
}

// Displays the current animation time on the screen.
function animTimeViewer() {
  var currTime = parentAnimation.iterationTime === null ?
      0.0 : parentAnimation.iterationTime.toFixed(2);
  var object = document.getElementById("animViewerText");
  object.innerHTML = "Current animation time " + currTime;
  requestFrame(animTimeViewer);
}

function restart() {
  // State only gets updated on init and Restart button push.
  var runType = document.getElementById("runType");
  var url = window.location.href.split("?");
  window.location.href = url[0] + "?" + runType.options[runType.selectedIndex].value;
}

// Check for all tests that happen at the same time
// and add them to the test packet.
function sortTests() {
  var i = 0;
  testPackets = [];
  testStack.sort(testPacketComparator);
  for (var x = 0; x < testStack.length; x++) {
    testPackets[i] = [];
    testPackets[i].push(testStack[x]);
    while ((x < (testStack.length - 1)) && (testStack[x].time === testStack[x + 1].time)) {
      x++;
      testPackets[i].push(testStack[x]);
    }
    i++;
  }
}

function testPacketComparator(a,b) { return(a.time - b.time) };

function autoTestRunner() {
  if (testIndex != 0 && testIndex <= testPackets.length) {
    for (var x in testPackets[testIndex - 1]) {
      var currTest = testPackets[testIndex - 1][x];
      assert_properties(currTest);
      if (currTest.isRefTest == TestTypeEnum.REGULAR ||
          currTest.isRefTest == TestTypeEnum.LAST_REF) {
        currTest.test.done();
      }
    }
  }
  if (testIndex < testPackets.length) {
    var nextTest = testPackets[testIndex][0];
    parentAnimation.currentTime = nextTest.time;
    testIndex++;
    requestFrame(autoTestRunner);
  } else {
    parentAnimation.pause();
    done();
  }
}

// Takes in a testRecord
function assert_properties(test) {
  var object = test.object;
  var targetProperties = test.targets;
  var message = test.message;
  // Displays the actual current time, not just the time the test
  // thinks it is (from test.time)
  var time = Number(parentAnimation.iterationTime);

  // SVGs have to be handled differently to divs
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

  // Reads back the style as list of css properties
  if (isSVG) {
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
      assert_transform(object, targetProperties[propName], message);
    } else {
      if (isSVG) {
        var target = targetStyle[propName].value;
        var curr = currentStyle[propName].value;
      } else {
        var target = targetStyle[propName];
        var curr = currentStyle[propName];
      }
      var t = target.replace(/[^0-9.\s]/g, "").split(" ");
      var c = curr.replace(/[^0-9.\s]/g, "").split(" ");
      for (var x in t) {
        test.test.step(function () {
          assert_equals(Number(c[x]), Number(t[x]), "At time " +
               time + ", " + propName + " is not correct. Target: " + target +
               " Current state: " + curr);
        });
      }
    }
  }
  referenceElement.parentNode.removeChild(referenceElement);
}

// Deals with the svg transforms special case.
function assert_transform(object, target, message) {
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