/**
 * Copyright 2012 Google Inc. All Rights Reserved.
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
function attrAsNumber(element, attribute, defaultValue) {
	if (element.hasAttribute(attribute)) {
		return Number(element.getAttribute(attribute));
	}
	return defaultValue;
}

function attrAsText(element, attribute, defaultValue) {
	if (element.hasAttribute(attribute)) {
		return element.getAttribute(attribute);
	}
	return defaultValue;
}

function attrAsPixelValue(element, attribute, defaultValue) {
	if (element.hasAttribute(attribute)) {
		var s = element.getAttribute(attribute);
		return Number(s.substring(0, s.length - 2));
	}
	return defaultValue;
}

function resolveAnimProperties(elem) {
	var prop = attrAsText(elem, "prop");
	var from = attrAsText(elem, "from");
	var to = attrAsText(elem, "to");
	var result = {}
	result[prop] = [from, to];
	return result;
}

function resolveTimingProperties(elem) {
	var startDelay = attrAsNumber(elem, "startDelay");
	var duration = attrAsNumber(elem, "duration");
	var iterationCount = attrAsNumber(elem, "iterationCount", 1);
	var iterationStart = attrAsNumber(elem, "iterationStart", 0);
	var fillMode = attrAsText(elem, "fillMode");
	var playbackRate = attrAsNumber(elem, "playbackRate");
	var startTime = attrAsNumber(elem, "startTime");
	var direction = attrAsText(elem, "direction");
	var resolutionStrategy = attrAsText(elem, "resolutionStrategy");
	var name = elem.id;
	return {startDelay: startDelay, duration: duration, iterationCount: iterationCount, iterationStart: iterationStart,
		fillMode: fillMode, playbackRate: playbackRate, direction: direction, startTime: startTime, resolutionStrategy: resolutionStrategy, name: name};
}

function instantiateElem(elem) {
	var animFunc = resolveAnimProperties(elem);
	var timing = resolveTimingProperties(elem);
	if (elem.tagName == "ANIMATION") {
		elem.template = new AnimationTemplate(animFunc, timing, timing.resolutionStrategy);
	} else if (elem.tagName == "PAR") {
		elem.template = new ParGroupTemplate([], timing, timing.resolutionStrategy);
	} else {
		elem.template = new SeqGroupTemplate([], timing, timing.resolutionStrategy);
	}
	return timing.startTime;
}

var animations = document.querySelectorAll("animation");
for (var i = 0; i < animations.length; i++) {
	var animation = animations[i];
	if (animation.parentElement.tagName == "SEQ" || animation.parentElement.tagName == "PAR") {
		continue;
	}
	var startTime = instantiateElem(animation);
	animation.template.animateLive(animation.parentElement, startTime);
}

function instantiateTree(elem) {
	var startTime = instantiateElem(elem);
	for (var i = 0; i < elem.children.length; i++) {
		instantiateTree(elem.children[i]);
		elem.template.add(elem.children[i].template);
	} 
	return startTime;
}

var groups = document.querySelectorAll("seq, par");
for (var i = 0; i < groups.length; i++) {
	var group = groups[i];
	if (group.parentElement.tagName == "SEQ" || group.parentElement.tagName == "PAR") {
		continue;
	}
	var startTime = instantiateTree(group);
	group.template.animateLive(group.parentElement, startTime);
}
