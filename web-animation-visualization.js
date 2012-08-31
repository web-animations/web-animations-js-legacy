var visRoot = document.querySelector("#webAnimVisualizeHere");

if (!visRoot) {
	visRoot = document.querySelector("body");
}

function createSVGElement(tagName) {
	return document.createElementNS("http://www.w3.org/2000/svg", "svg:" + tagName);
}

if (visRoot.tagName != "SVG") {
	visRoot.appendChild(createSVGElement("svg"));
	visRoot = visRoot.lastChild;
}

function createRect(x, y, width, height) {
	var rect = createSVGElement("rect");
	rect.setAttribute("x", x);
	rect.setAttribute("y", y);
	rect.setAttribute("width", width);
	rect.setAttribute("height", height);
	rect.setAttribute("fill", "none");
	rect.setAttribute("stroke", "gray");
	rect.setAttribute("stroke-width", "1px");
	return rect;
}

function createVLine(x, y1, y2) {
	var line = createSVGElement("line");
	line.setAttribute("x1", x);
	line.setAttribute("x2", x);
	line.setAttribute("y1", y1);
	line.setAttribute("y2", y2);
	line.setAttribute("stroke", "black");
	line.setAttribute("stroke-width", "1px");
	return line;
}

function createText(x, y, data) {
	var text = createSVGElement("text");
	text.setAttribute("x", x);
	text.setAttribute("y", y);
	text.setAttribute("font-family", "Verdana");
	text.setAttribute("font-size", "10");
	text.appendChild(document.createTextNode(data));
	return text;
}

/*
var default_rect = createRect("5%", "10px", "90%", "20px");
visRoot.appendChild(default_rect);

DEFAULT_GROUP._vis = default_rect;
*/

function updateRects(anim, startP, widthP, y) {
	var rect = anim._vis;
	if (!rect) {
		anim._vis = createRect("5%", "10px", "90%", "20px");
		anim._label = createText("5%", "10px", anim.name)
		visRoot.appendChild(anim._vis);
		visRoot.appendChild(anim._label);
	}
	rect = anim._vis;
	var text = anim._label;
	rect.setAttribute("x", startP + "%");
	rect.setAttribute("y", y + "px");
	rect.setAttribute("width", widthP + "%");

	text.setAttribute("x", startP + "%");
	text.setAttribute("y", (y + 9) + "px");
	text.replaceChild(document.createTextNode(anim.name), text.firstChild);

	var height = 0;
	y += 10;

	if (anim.children) {
		var childY = y;
		var start = anim.startTime + anim.timing.startDelay + anim.timeDrift;
		var end = anim.endTime;
		var myLength = end - anim.startTime - anim.timeDrift;		
		for (var i = 0; i < anim.children.length; i++) {
			var child = anim.children[i];
			var childLength = Math.min(end - start, (child.timing.startDelay + child.animationDuration) / anim.timing.speed);
			var childWidth = childLength / myLength * widthP;
			var childStart = (anim.timing.startDelay + child.startTime + child.timeDrift) / myLength * widthP / anim.timing.speed + startP;
			if (isNaN(childStart) || childStart == Infinity || childStart == -Infinity|| isNaN(childWidth) || childWidth == Infinity || childWidth == -Infinity) {
				continue;
			}
			var results = updateRects(child, childStart, childWidth, childY);
			height += results[0];
			childY = results[1];
		}
	}
	height += 20;
	y += height - 10;

	rect.setAttribute("height", height + "px");
	return [height, y, myLength];	
}

var line;
var startText;
var endText;

function round(num) {
	return Math.floor(num * 1000) / 1000;
}

function webAnimVisUpdateAnims() {
	var earliestStart = Infinity;
	for (var i = 0; i < DEFAULT_GROUP.children.length; i++) {
		var child = DEFAULT_GROUP.children[i];
		if (child.timeDrift + child.startTime < earliestStart) {
			earliestStart = child.timeDrift + child.startTime;
		}
	}
	// want to set the zero point such that earliestStart is at 5%, and width s.t. 90% represents the distance between earliestStart and endTime.
	var length = DEFAULT_GROUP.endTime;
	var width = 90 * length / (length - earliestStart);
	var left = 90 - width + 5;

	if (isNaN(width)) {
		return;
	}

	var results = updateRects(DEFAULT_GROUP, left, width, 10);
	var height = results[0];
	var length = results[2];
	var xPos = (DEFAULT_GROUP.iterationTime - earliestStart) / (length - earliestStart) * 90 + 5;
	if (line == undefined && !isNaN(xPos)) {
		line = createVLine(xPos + "%", "0px", (height + 20) + "px");
		visRoot.appendChild(line);
		startText = createText("5%", "9px", round(earliestStart) + "s");
		visRoot.appendChild(startText);
		endText = createText("95%", "9px", round(length) + "s");
		visRoot.appendChild(endText);
	} else if (!isNaN(xPos)) {
		line.setAttribute("x1", xPos + "%");
		line.setAttribute("x2", xPos + "%");
		line.setAttribute("y2", (height + 20) + "px");
		startText.replaceChild(document.createTextNode(round(earliestStart) + "s"), startText.firstChild);
		endText.replaceChild(document.createTextNode(round(length) + "s"), endText.firstChild);
	}
}

