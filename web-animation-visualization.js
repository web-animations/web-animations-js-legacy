var visRoot = document.querySelector("#webAnimVisualizeHere");

if (!visRoot) {
	throw "No Visualization Root :( Provide an element with an id of webAnimVisualizeHere."
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

var default_rect = createRect("5%", "10px", "90%", "20px");
visRoot.appendChild(default_rect);

DEFAULT_GROUP._vis = default_rect;

function updateRects(anim, startP, widthP, y) {
	var rect = anim._vis;
	if (!rect) {
		anim._vis = createRect("5%", "10%", "90%", "20px");
		visRoot.appendChild(anim._vis);
	}
	rect = anim._vis;
	rect.setAttribute("x", startP + "%");
	rect.setAttribute("y", y + "px");
	rect.setAttribute("width", widthP + "%");
	var height = 0;

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
			if (isNaN(childStart) || childStart == Infinity) {
				continue;
			}
			var results = updateRects(child, childStart, childWidth, childY);
			height += results[0];
			childY = results[1];
		}
	}
	height += 20;
	y += height;

	rect.setAttribute("height", height + "px");
	return [height, y, myLength];	
}

var line;

function webAnimVisUpdateAnims() {
	var results = updateRects(DEFAULT_GROUP, 5, 90, 10);
	var height = results[0];
	var length = results[2];
	var xPos = DEFAULT_GROUP.iterationTime / length * 90 + 5;
	if (line == undefined) {
		line = createVLine(xPos + "%", "0px", (height + 20) + "px");
		visRoot.appendChild(line);
	} else {
		line.setAttribute("x1", xPos + "%");
		line.setAttribute("x2", xPos + "%");
		line.setAttribute("y2", (height + 20) + "px");
	}
}

