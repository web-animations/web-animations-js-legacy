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

function resolveProperties(elem) {
	var startDelay = attrAsNumber(elem, "startDelay");
	var iterationDuration = attrAsNumber(elem, "iterationDuration");
	var iterationCount = attrAsNumber(elem, "iterationCount");
	var fill = attrAsText(elem, "fill");
	var prop = attrAsText(elem, "prop");
	var from = attrAsText(elem, "from");
	var to = attrAsText(elem, "to");
	var speed = attrAsNumber(elem, "speed");
	var startTime = attrAsNumber(elem, "startTime");
	var direction = attrAsText(elem, "direction");
	var resolutionStrategy = attrAsText(elem, "resolutionStrategy");
	var name = elem.id;
	return {startDelay: startDelay, iterationDuration: iterationDuration, iterationCount: iterationCount, 
					  fill: fill, prop: prop, from: from, to: to, speed: speed, direction: direction, startTime: startTime,
					  resolutionStrategy: resolutionStrategy, name: name};
}

function instantiateElem(elem) {
	var properties = resolveProperties(elem);
	var instantiator = elem.tagName == "ANIMATION" ? AnimTemplate : (elem.tagName == "PAR" ? ParAnimGroupTemplate : SeqAnimGroupTemplate);
	elem.template = new instantiator(properties, properties.resolutionStrategy);
	return properties.startTime;
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

maybeRestartAnimation();