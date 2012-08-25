var Timing = Class.create({
	initialize: function(startDelay, iterationDuration, iterationCount, iterationStart, speed, direction, timingFunction, fill) {
		this.startDelay = startDelay || 0;
		this.iterationDuration = iterationDuration;
		this.iterationCount = iterationCount || 1;
		this.iterationStart = iterationStart || 0;
		this.speed = speed || 1;
		this.direction = direction || "normal";
		this.timingFunction = timingFunction;
		this.fill = fill || "none";
	},
	clone: function() {
		return new Timing(this.startDelay, this.iterationDuration, this.iterationCount, this.iterationStart, this.speed, this.direction, this.timingFunction, this.fill);
	}
})

var TimingProxy = Class.create({
	initialize: function(timing) {
		this.timing = timing;
		["startDelay", "iterationDuration", "iterationCount", "iterationStart", "speed", "direction", "timingFunction", "fill"].forEach(function(s) {
			this.__defineGetter__(s, function() { return timing[s]; });
			this.__defineSetter__(s, function(v) { throw "can't modify timing properties of templated Animation Instances"});			
		}.bind(this));
	},
	extractMutableTiming: function() {
		return new Timing(this.timing.startDelay, this.timing.iterationDuration, this.timing.iterationCount, this.timing.iterationStart, this.timing.speed,
						  this.timing.direction, this.timing.timingFunction, this.timing.fill);
	}
})

var TimedTemplate = Class.create({
	initialize: function(timing) {
		this.timing = timing || new Timing();
	},
	_animate: function(isLive, targets, parentGroup, startTime) {
		if (!targets.length) {
			targets = [targets];
			return this.__animate(isLive, targets, parentGroup, startTime)[0];
		}
		return this.__animate(isLive, targets, parentGroup, startTime);
	},
	__animate: function(isLive, targets, parentGroup, startTime) {
		return undefined; // TimedTemplates don't actually work by themselves.
	},
	animate: function(targets, startTime) {
		return this._animate(false, targets, DEFAULT_GROUP, startTime);
	},
	animateWithParent: function(targets, parent, startTime) {
		return this._animate(false, targets, parent, startTime);
	},
	animateLive: function(targets, startTime) {
		return this._animate(true, targets, DEFAULT_GROUP, startTime);
	},
	animateLiveWithParent: function(targets, parent, startTime) {
		return this._animate(true, targets, parent, startTime);
	}
});

function exists(val) {
	return val != undefined;
}

var TimedItem = Class.create({
	initialize: function(timing, startTime, parentGroup) {
		this.timing = timing;
		this.startTime = startTime;
		this.updateIterationDuration();
		this.currentIteration = null;
		this.iterationTime = null;
		this.animationTime = null;

		if (parentGroup === undefined) {
			this.parentGroup = DEFAULT_GROUP;
		} else {
			this.parentGroup = parentGroup;			
		}
		
		if (startTime == undefined) {
			if (this.parentGroup) {
				this.startTime = this.parentGroup.iterationTime || 0;
			} else {
				this.startTime = 0;
			}
		}

		this.endTime = this.startTime + this.animationDuration + this.timing.startDelay;
		if (this.parentGroup) {
			this.parentGroup.add(this);
		}
		this.paused = false;
		this.timeDrift = 0;
	},
	// TODO: take timing.iterationStart into account. Spec needs to as well.
	updateIterationDuration: function() {
		if (exists(this.timing.iterationDuration) && this.timing.iterationDuration >= 0) {
			this.iterationDuration = this.timing.iterationDuration;
		} else {
			this.iterationDuration = this.intrinsicDuration();
		}
		// section 6.7
		var repeatedDuration = this.iterationDuration * this.timing.iterationCount;
		if (repeatedDuration == Infinity || this.timing.speed == 0) {
			this.animationDuration = Infinity;
		} else {
			this.animationDuration = repeatedDuration / Math.abs(this.timing.speed);
		}
		this.updateTimeMarkers();

	},
	updateTimeMarkers: function(time) {
		this.endTime = this.startTime + this.animationDuration + this.timing.startDelay;
		if (this.parentGroup) {
			this.itemTime = this.parentGroup.iterationTime - this.startTime + this.timeDrift;
		} else if (time) {
			this.itemTime = time;
		} else {
			this.itemTime = null;
		}
		if (this.itemTime) {
			if (this.itemTime < this.timing.startDelay) {
				if (this.timing.fill == "backwards" || this.timing.fill == "both") {
					this.animationTime = 0;
				} else {
					this.animationTime = null;
				}
			} else if (this.itemTime < this.timing.startDelay + this.animationDuration) {
				this.animationTime = this.itemTime - this.timing.startDelay;
			} else {
				if (this.timing.fill == "forwards" || this.timing.fill == "both") {
					this.animationTime = this.animationDuration;
				} else {
					this.animationTime = null;
				}
			}
			if (this.animationTime == null) {
				var adjustedAnimationTime = null;
				this.iterationTime = null;
				this.currentIteration = null;
				this._timeFraction = null;
			} else {
				var iterationStart = Math.max(0, Math.min(this.timing.iterationStart, this.timing.iterationCount));
				var iterationCount = Math.max(0, this.timing.iterationCount);
				var startOffset = iterationStart * this.iterationDuration;
				if (this.timing.speed < 0) {
					var adjustedAnimationTime = (this.animationTime - this.animationDuration) * this.timing.speed + startOffset;
				} else {
					var adjustedAnimationTime = this.animationTime * this.timing.speed + startOffset;
				}
				if (adjustedAnimationTime == 0) {
					this.currentIteration = 0;
				} else if (this.iterationDuration == 0) {
					this.currentIteration = Math.floor(iterationCount);
				} else {
					this.currentIteration = Math.floor(adjustedAnimationTime / this.iterationDuration);
				}
				if (this.iterationDuration == 0) {
					var unscaledIterationTime = 0;
				} else {
					var repeatedDuration = this.iterationDuration * this.timing.iterationCount;
					// TODO: ???
					if (adjustedAnimationTime - startOffset == repeatedDuration && (iterationCount - iterationStart) % 1 == 0) {
						var unscaledIterationTime = this.iterationDuration;
					} else {
						var unscaledIterationTime = adjustedAnimationTime % this.iterationDuration;
					}
				}
				// TODO scale iteration time here
				var scaledIterationTime = unscaledIterationTime;
				if (this.timing.direction == "normal") {
					var currentDirection = 1;
				} else if (this.timing.direction == "reverse") {
					var currentDirection = -1;
				} else {
					var d = this.currentIteration;
					if (this.timing.direction == "alternate-reverse") {
						d += 1;
					}
					// TODO: 6.11.2 step 3. wtf?
					var currentDirection = d % 2 == 0 ? 1 : -1;
				}
				this.iterationTime = currentDirection == 1 ? scaledIterationTime : this.iterationDuration - scaledIterationTime;
				this._timeFraction = this.iterationTime / this.iterationDuration;
			}
		} else {
			this.animationTime = null;
			this.iterationTime = null;
			this.currentIteration = null;
			this._timeFraction = null;
		}
		//console.log("start end item anim iter currentIter tf", this.startTime, this.endTime, this.itemTime, this.animationTime, this.iterationTime, this.currentIteration, this._timeFraction);
	},
	pause: function() {
		this.paused = true;
		// TODO: update timing parameters
	},
	unpause: function() {
		this.paused = false;
	},
	getPauseState: function() {
		return this.paused;
	},
	isPaused: function() {
		return getPauseState() || this.parentGroup.isPaused();
	},
	seek: function(itemTime) {
		// TODO
	},
	changeSpeed: function(speed) {
		timing.speed = speed;
		// TODO: perform compensatory seek
	},
	reverse: function() {
		// TODO
	},
	cancel: function() {
		// TODO
	},
	start: function(timeFromNow) {
		if (!this.parentGroup) {
			// TODO: Check spec correctness. Should this be Data.now() + timeFromNow?
			this.startTime = timeFromNow;
		} else if (this.parentGroup.type == "seq") {
			throw "NoModificationAllowedError";
		} else {
			this.startTime = this.parentGroup.iterationTime + timeFromNow;
		}
		this.updateTimeMarkers();
	},
	stop: function(timeFromNow) {
		// TODO: implement
	}
});

function keyframesFor(property, startVal, endVal) {
	var animFun = new KeyframesAnimFunction(property);
	if (startVal) {
		animFun.frames.add(new AnimFrame(startVal, 0));
	}
	animFun.frames.add(new AnimFrame(endVal, 1));
	return animFun;
}

function completeProperties(properties) {
	var result = {};
	if (properties.timing) {
		result.timing = properties.timing;
	} else {
		result.timing = new Timing(properties.startDelay, properties.iterationDuration, properties.iterationCount, properties.iterationStart, properties.speed, 
								   properties.direction, properties.timingFunction, properties.fill);
	}
	if (properties.animFunc) {
		result.animFunc = properties.animFunc;
	} else {
		// TODO: deal with optional from value.
		result.animFunc = keyframesFor(properties.prop, properties.from, properties.to);
	}
	return result;
}

// -----------
// Anim Object
// -----------

function LinkedAnim(target, template, parentGroup, startTime) {
	var anim = new Anim(target, {timing: new TimingProxy(template.timing), animFunc: template.func}, parentGroup, startTime);
	anim.template = template;
	return anim;
}

function ClonedAnim(target, cloneSource, parentGroup, startTime) {
	var anim = new Anim(target, {timing: cloneSource.timing.clone(), animFunc: cloneSource.func.clone()}, parentGroup, startTime);
}

RC_SET_VALUE = 1;
RC_ANIMATION_FINISHED = 2;

var Anim = Class.create(TimedItem, {
	initialize: function($super, target, properties, parentGroup, startTime) {
		var completedProperties = completeProperties(properties);
		$super(completedProperties.timing, startTime, parentGroup);
		this.func = completedProperties.animFunc;
		// TODO: correctly extract the underlying value from the element
		this.underlyingValue = this.func.getValue(target);
		this.template = null;
		this.targetElement = target;
	},
	unlink: function() {
		var result = this.template;
		if (result) {
			this.timing = this.timing.extractMutableTiming();
			// TODO: Does func need to have a FuncProxy too?
			this.func = this.func.clone();
		}
		this.template = null;
		return result;
	},
	templatize: function() {
		if (this.template) {
			return;
		}
		// TODO: What resolution strategy, if any, should be employed here?
		var template = new AnimTemplate(this.func.clone(), this.timing.clone());
		this.template = template;
		this.func = template.func;
		this.timing = new TimingProxy(template.timing);
		return template;
	},
	intrinsicDuration: function() {
		// section 6.6
		return Infinity;
	},
	_zero: function() {
		this.func.zeroPoint(this.targetElement, this.underlyingValue);
		//this.targetElement.innerHTML = "ZERO"
	},
	_tick: function(time) {
		this.updateTimeMarkers();
		var rc = 0;
		if (this._timeFraction != null) {
			rc |= RC_SET_VALUE;
			this.func.sample(this._timeFraction, this.currentIteration, this.targetElement, this.underlyingValue);
			//this.targetElement.innerHTML = this._timeFraction + ": " + this.currentIteration;
		} else {
			this._zero();
		}
		if (time > this.endTime) {
			rc |= RC_ANIMATION_FINISHED;
		}
		return rc;
	}
});

var AnimTemplate = Class.create(TimedTemplate, {
	initialize: function($super, properties, resolutionStrategy) {
		var completedProperties = completeProperties(properties);
		$super(completedProperties.timing);
		this.func = completedProperties.animFunc;
		this.resolutionStrategy = resolutionStrategy;
	},
	__animate: function($super, isLive, targets, parentGroup, startTime) {
		if (this.resolutionStrategy) {
			strategy = this.resolutionStrategy.split(":").map(function(a) { return a.strip(); });
			var newTargets = [];
			switch (strategy[0]) {
				case "selector":
					[].forEach.call(targets, function(target) {
						if (target.id) {
							var id = target.id;
							var removeId = false;
						} else {
							var id = "___special_id_for_resolution_0xd3adb33f";
							target.id = id;
							var removeId = true;
						}
						selector = "#" + id + " " + strategy[1];
						var selectResult = document.querySelectorAll(selector);
						if (removeId) {
							target.id = undefined;
						}
						[].forEach.call(selectResult, function(newTarget) { newTargets.push(newTarget); });
					});
					break;
				case "target":
					newTargets = strategy[1].split(",").map(function(a) { return document.getElementById(a.strip()); });
					break;
				default:
					throw "Unknown resolutionStrategy " + strategy[0];
			}
			targets = newTargets;
		}

		var instances = [];
		targets.forEach(function(target) {
			var instance = LinkedAnim(target, this, parentGroup, startTime);
			if (!isLive) {
				instance.unlink();
			}
			instances.push(instance);
		}.bind(this));
		return instances;
	}
});

// TODO: lose this now?
function animate(targets, startTime, animFunction, timing) {
	var unwrapOnReturn = false;
	if (!targets.length) {
		targets = [targets];
		unwrapOnReturn = true;
	}

	var instances = [];

	[].forEach.call(targets, function(target) {
		instances.push(new Anim(target, {animFunc: animFunction, timing: timing}, DEFAULT_GROUP, startTime));
		DEFAULT_GROUP.append(instances[instances.length - 1]);
	});

	if (unwrapOnReturn) {
		return instances[0];
	}

	return instances;
}

// To use this, need to have children and length member variables.
var AnimListMixin = {
	initListMixin: function(beforeListChange, onListChange) {
		this._clear();
		this.onListChange = onListChange;
		this.beforeListChange = beforeListChange;
	},
	clear: function() {
		this.beforeListChange();
		this._clear();
	},
	_clear: function() {
		this.children = [];
		var oldLength = this.length;
		this.length = 0;
		this._deleteIdxAccessors(0, oldLength);
		this.onListChange
		// TODO: call cancel on children? Update timing?
	},
	_createIdxAccessors: function(start, end) {
		for (var i = start; i < end; i++) {
			this.__defineSetter__(i, function(x) { this.children[i] = x; });
			this.__defineGetter__(i, function() { return this.children[i]; });
		}
	},
	_deleteIdxAccessors: function(start, end) {
		for (var i = start; i < end; i++) {
			delete this[i];
		}
	},
	add: function() {
		this.beforeListChange();
		for (var i = 0; i < arguments.length; i++) {
			this.children.push(arguments[i]);
		}
		var oldLength = this.length;
		this.length = this.children.length;
		this._createIdxAccessors(oldLength, this.length);
		this.onListChange();
		return arguments;
		// TODO: Remove newItem from other group. Update timing?
	},
	insertBefore: function(newItem, refItem) {
		this.beforeListChange();
		for (var i = 0; i < this.children.length; i++) {
			if (this.children[i] == refItem) {
				this.children.splice(i, 0, newItem);
				// TODO: Remove newItem from other group. Update timing?
				this.length = this.children.length;
				return newItem;
			}
		}
		return add(newItem);
	},
	item: function(index) {
		return this.children[index];
	},
	indexOf: function(item) {
		for (var i = 0; i < this.children.length; i++) {
			if (this.children[i] == item) {
				return i;
			}
		}
		return -1;
	},
	splice: function() {
		this.beforeListChange();
		this.children.splice.apply(arguments);
		var oldLength = this.length;
		this.length = this.children.length;
		this._createIdxAccessors(oldLength, this.length);
		this.onListChange
	},
	remove: function(removedItem) {
		this.beforeListChange();
		for (var i = 0; i < this.children.length; i++) {
			if (this.children[i] == removedItem) {
				this.children.splice(i, 1);
				this.length = this.children.length;
				this._deleteIdxAccessors(this.length, this.length + 1);
				return removedItem;
			}
		}
		this.onListChange();
		return null;
	}
}

var AnimGroup = Class.create(TimedItem, AnimListMixin, {
	initialize: function($super, type, template, properties, startTime, parentGroup) {
		this.type = type || "par"; // used by TimedItem via intrinsicDuration(), so needs to be set before initializing super.
		this.initListMixin(this._assertNotLive, this._childrenStateModified);
		var completedProperties = completeProperties(properties);
		$super(completedProperties.timing, startTime, parentGroup);
		this.template = template;
	},
	_assertNotLive: function() {
		if (this.template) {
			throw "Can't modify tree of AnimGroupInstances with templates"
		}
	},
	_childrenStateModified: function() {
		this.updateIterationDuration();
		this._updateChildStartTimes();
		this.updateTimeMarkers();
		if (this.parentGroup) {
			this.parentGroup._childrenStateModified();
		} else {
			maybeRestartAnimation();
		}
	},
	_updateChildStartTimes: function() {
		if (this.type == "seq") {
			var cumulativeStartTime = 0;
			this.children.forEach(function(child) {
				child.startTime = cumulativeStartTime;
				child.updateTimeMarkers();
				cumulativeStartTime += Math.max(0, child.timing.startDelay + child.animationDuration);
			}.bind(this));
		}
	},
	unlink: function() {
		var acted = this.template != null;
		this.template = null;
		return acted;
	},
	getActiveAnimations: function() {
		// TODO
	},
	getAnimationsForElement: function(elem) {
		// TODO
	},
	intrinsicDuration: function() {
		if (this.type == "par") {
			var dur = Math.max.apply(undefined, this.children.map(function(a) { return a.endTime; }));
			return dur;
		} else if (this.type == "seq") {
			var result = 0;
			this.children.forEach(function(a) { result += a.animationDuration + a.timing.startDelay; });
			return result;
		} else {
			throw "Unsupported type " + this.type;
		}
	},
	_zero: function() {
		this.children.forEach(function(child) { child._zero(); });
	},
	_tick: function(time) {
		this.updateTimeMarkers();
		if (this._timeFraction == null) {
			this._zero();
			return false;
		} else {
			this.children.forEach(function(child) {child._tick(time - this.startTime - this.timing.startDelay); }.bind(this));
			return true;
		}
	}
});

var ParAnimGroup = Class.create(AnimGroup, {
	initialize: function($super, properties, parentGroup, startTime) {
		$super("par", undefined, properties, startTime, parentGroup);
	}
});

var SeqAnimGroup = Class.create(AnimGroup, {
	initialize: function($super, properties, parentGroup, startTime) {
		$super("seq", undefined, properties, startTime, parentGroup);
	}
});

var AnimGroupTemplate = Class.create(TimedTemplate, AnimListMixin, {
	initialize: function($super, type, properties, resolutionStrategy) {
		var completedProperties = completeProperties(properties);
		this.timing = completedProperties.timing;
		this.type = type;
		this.resolutionStrategy = resolutionStrategy;
		this.initListMixin(function() {}, function() {});
	},
	__animate: function($super, isLive, targets, parentGroup, startTime) {
		var instances = [];
		for (var i = 0; i < targets.length; i++) {
			var instance = new AnimGroup(this.type, this, {timing: this.timing}, startTime, parentGroup);
			if (!isLive) {
				instance.unlink();
			}
			for (var j = 0; j < this.length; j++) {
				if (isLive) {
					var childInstance = this.children[j].animateLiveWithParent(targets[i], instance, startTime);
				} else {
					var childInstance = this.children[j].animateWithParent(targets[i], instance, startTime);
				}
			}
			instances.push(instance);
		}
		return instances;
	}
});

var ParAnimGroupTemplate = Class.create(AnimGroupTemplate, {
	initialize: function($super, properties, resolutionStrategy) {
		$super("par", properties, resolutionStrategy);
	}
});

var SeqAnimGroupTemplate = Class.create(AnimGroupTemplate, {
	initialize: function($super, properties, resolutionStrategy) {
		$super("seq", properties, resolutionStrategy);
	}
});

var AnimFunction = Class.create({
	initialize: function(operation, accumulateOperation) {
		this.operation = operation | "replace";
		this.accumulateOperation = accumulateOperation | "replace";
	},
	sample: function(timeFraction, currentIteration, target, underlyingValue) {
		throw "Unimplemented sample function";
	},
	zeroPoint: function(target) {
		return;
	},
	getValue: function(target) {
		return;
	},
	clone: function() {
		throw "Unimplemented clone method"
	}
});

var JavaScriptAnimFunction = Class.create(AnimFunction, {
	initialize: function($super, getValue, zero, sample, operation, accumulateOperation) {
		$super(operation, accumulateOperation);
		this.getValue = getValue;
		this.zeroPoint = zero;
		this.sample = sample;
	},
	clone: function() {
		return new JavaScriptAnimFunction(this.zeroPoint, this.sample, this.operation, this.accumulateOperation);
	}
});

var loggerAnimFunction = new JavaScriptAnimFunction(
		function(elem) {return elem.innerHTML;}, 
		function(elem, underlying) {elem.innerHTML = underlying;},
		function(tf, iter, elem, underlying) {
			if (tf != undefined) {elem.innerHTML = iter + ": " + Math.floor(tf * 100) / 100;} 
			else {elem.innerHTML = underlying;}}
	);

var KeyframesAnimFunction = Class.create(AnimFunction, {
	initialize: function($super, property, operation, accumulateOperation) {
		$super(operation, accumulateOperation);
		this.property = property;
		this.frames = new AnimFrameList();
	},
	sortedFrames: function() {
		this.frames.frames.sort(function(a, b) {
			if (a.offset < b.offset) {
				return -1;
			}
			if (a.offset > b.offset) {
				return 1;
			}
			return 0;
		});
		return this.frames.frames;
	},
	sample: function(timeFraction, currentIteration, target, underlyingValue) {
		var frames = this.sortedFrames();
		if (frames.length == 0) {
			return;
		}
		var afterFrameNum = null;
		var beforeFrameNum = null;
		var i = 0;
		while (i < frames.length) {
			if (frames[i].offset == timeFraction) {
				setValue(target, this.property, frames[i].value);
				return;
			}
			if (frames[i].offset > timeFraction) {
				afterFrameNum = i;
				break;
			}
			i++;
		}
		if (afterFrameNum == 0) {
			beforeFrameNum = -1;
		} else if (afterFrameNum == null) {
			beforeFrameNum = frames.length - 1;
			afterFrameNum = frames.length;
		} else {
			beforeFrameNum = afterFrameNum - 1;
		}
		if (beforeFrameNum == -1) {
			beforeFrame = {value: underlyingValue, offset: 0};
		} else {
			beforeFrame = frames[beforeFrameNum];
		}

		if (afterFrameNum == frames.length) {
			afterFrame = {value: underlyingValue, offset: 1};
		} else {
			afterFrame = frames[afterFrameNum];
		}
		// TODO: apply time function
		var localTimeFraction = (timeFraction - beforeFrame.offset) / (afterFrame.offset - beforeFrame.offset);
		// TODO: property-based interpolation for things that aren't simple
		var animationValue = afterFrame.value * localTimeFraction + beforeFrame.value * (1 - localTimeFraction);
		setValue(target, this.property, animationValue);
	},
	zeroPoint: function(target, underlyingValue) {
		setValue(target, this.property, underlyingValue);
	},
	getValue: function(target) {
		return getValue(target, this.property);
	},
	clone: function() {
		var result = new KeyframesAnimFunction(this.property, this.operation, this.accumulateOperation);
		result.frames = this.frames.clone();
		return result;
	}
});

var AnimFrame = Class.create({
	initialize: function(value, offset, timingFunction) {
		this.value = value;
		this.offset = offset;
		this.timingFunction = timingFunction;
	}
});

var AnimFrameList = Class.create({
	initialize: function() {
		this.frames = [];
		this.__defineGetter__("length", function() {return this.frames.length; });
	},
	item: function(index) {
		if (index >= this.length || index < 0) {
			return null;
		}
		return this.frames[index];
	},
	add: function(frame) {
		this.frames.push(frame);
		return frame;
	},
	remove: function(frame) {
		var index = this.frames.indexOf(frame);
		if (index == -1) {
			return undefined;
		}
		this.frames.splice(index, 1);
		return frame;
	},
	clone: function() {
		var result = new AnimFrameList();
		for (var i = 0; i < this.frames.length; i++) {
			result.add(new AnimFrame(this.frames[i].value, this.frames[i].offset, this.frames[i].timingFunction));
		}
		return result;
	}
})

function setValue(target, property, value) {
	// TODO: correct property-based units generation
	target.style[property] = value + "px";
}

function getValue(target, property) {
	// TODO: correct property-based units extraction
	var s = window.getComputedStyle(target)[property];
	return Number(s.substring(0, s.length - 2));
}


var rAFNo = undefined;

var DEFAULT_GROUP = new AnimGroup("par", undefined, {}, 0, undefined);
DEFAULT_GROUP._tick = function(time) {
		this.updateTimeMarkers(time);
		this.children.forEach(function(child) {child._tick(time); }.bind(this));
		return this._timeFraction != null;
}

// massive hack to allow things to be added to the parent group and start playing. Maybe this is right though?
DEFAULT_GROUP.__defineGetter__("iterationTime", function() {return (Date.now() - _startTime) / 1000})

var _startTime = Date.now();

var requestAnimationFrame = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame

var ticker = function(_time) {
	var time = _time - _startTime;
	if (DEFAULT_GROUP._tick(time / 1000)) {
		rAFNo = requestAnimationFrame(ticker);
	} else {
		rAFNo = undefined;
	}
};

function maybeRestartAnimation() {
	if (rAFNo != undefined) {
		return;
	}
	rAFNo = requestAnimationFrame(ticker);
}