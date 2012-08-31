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

var default_rect = createRect("5%", "10px", "90%", "20px");
visRoot.appendChild(default_rect);

DEFAULT_GROUP._vis = default_rect;

function updateRects(anim, startP, widthP, y, speedMultiplier) {
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
			var childLength = Math.min(end - start, (child.timing.startDelay + child.animationDuration) / speedMultiplier);
			var childWidth = childLength / myLength * widthP;
			var childStart = (anim.timing.startDelay + child.startTime + child.timeDrift) / myLength * widthP / speedMultiplier + startP;
			if (isNaN(childStart) || childStart == Infinity) {
				continue;
			}
			var results = updateRects(child, childStart, childWidth, childY, speedMultiplier * child.timing.speed);
			height += results[0];
			childY = results[1];
		}
	}
	height += 20;
	y += height;

	rect.setAttribute("height", height + "px");
	return [height, y];	
}

function webAnimVisUpdateAnims() {
	updateRects(DEFAULT_GROUP, 5, 90, 10, DEFAULT_GROUP.timing.speed);
}

