var webAnimVisUpdateAnims = undefined;

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

function ImmutableTimingProxy(timing) {
	return new TimingProxy(timing, function(v) { throw "can't modify timing properties of templated Animation Instances"});
}

var TimingProxy = Class.create({
	initialize: function(timing, setter) {
		this.timing = timing;
		["startDelay", "iterationDuration", "iterationCount", "iterationStart", "speed", "direction", "timingFunction", "fill"].forEach(function(s) {
			this.__defineGetter__(s, function() { return timing[s]; });
			this.__defineSetter__(s, function(v) { var old = timing[s]; timing[s] = v; try { setter(v); } catch (e) { timing[s] = old; throw e;}});			
		}.bind(this));
	},
	extractMutableTiming: function() {
		return new Timing(this.timing.startDelay, this.timing.iterationDuration, this.timing.iterationCount, this.timing.iterationStart, this.timing.speed,
						  this.timing.direction, this.timing.timingFunction, this.timing.fill);
	},
	clone: function() {
		return this.timing.clone();
	}
})

var TimedTemplate = Class.create({
	initialize: function(timing) {
		this.timing = new TimingProxy(timing || new Timing(), function() { this.updateTiming()}.bind(this));
		this.linkedAnims = [];
	},
	addLinkedAnim: function(anim) {
		this.linkedAnims.push(anim);
	},
	removeLinkedAnim: function(anim) {
		var i = this.linkedAnims.indexOf(anim);
		if (i >= 0) {
			this.linkedAnims.splice(i, 1);
		}
	},
	updateTiming: function() {
		this.linkedAnims.forEach(function(a) { a.updateIterationDuration(); });
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

var ST_MANUAL = 0;
var ST_AUTO = 1;
var ST_FORCED = 2;

var TimedItem = Class.create({
	initialize: function(timing, startTime, parentGroup) {
		this.timing = new TimingProxy(timing, function() {this.updateIterationDuration()}.bind(this));
		this.startTime = startTime;
		this.updateIterationDuration();
		this.currentIteration = null;
		this.iterationTime = null;
		this.animationTime = null;
		this._reversing = false;

		if (parentGroup === undefined) {
			this.parentGroup = DEFAULT_GROUP;
		} else {
			this.parentGroup = parentGroup;			
		}

		if (startTime == undefined) {
			this.startTimeMode = ST_AUTO;
			if (this.parentGroup) {
				this.startTime = this.parentGroup.iterationTime || 0;
			} else {
				this.startTime = 0;
			}
		} else {
			this.startTimeMode = ST_MANUAL;
			this.startTime = startTime;
		}		
		this.endTime = this.startTime + this.animationDuration + this.timing.startDelay;
		if (this.parentGroup) {
			this.parentGroup._addChild(this);
		}
		this.paused = false;
		this.timeDrift = 0;
		this.__defineGetter__("currentTime", function() {
			return this.itemTime;
		});
		this.__defineSetter__("currentTime", function(seekTime) {
			if (this.parentGroup == null || this.parentGroup.iterationTime == null) {
				throw "InvalidStateError";
			}
			this.timeDrift = this.parentGroup.iterationTime - this.startTime - seekTime;
			this.updateTimeMarkers();
			this.parentGroup._childrenStateModified();
			maybeRestartAnimation();
		});
	},
	reparent: function(parentGroup) {
		this.parentGroup.remove(this);
		this.parentGroup = parentGroup;
		this.timeDrift = 0;
		if (this.startTimeMode == ST_FORCED) {
			this.startTime = this.stashedStartTime;;
			this.startTimeMode = this.stashedStartTimeMode;
		}
		if (this.startTimeMode == ST_AUTO) {
			this.startTime = this.parentGroup.iterationTime || 0;
			this.updateTimeMarkers();
		} 
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
		this.endTime = this.startTime + this.animationDuration + this.timing.startDelay + this.timeDrift;
		if (this.parentGroup) {
			this.itemTime = this.parentGroup.iterationTime - this.startTime - this.timeDrift;
		} else if (time) {
			this.itemTime = time;
		} else {
			this.itemTime = null;
		}
		//console.log(this.name + ": endTime, itemTime", this.endTime, this.itemTime);
		if (this.itemTime != null) {
			if (this.itemTime < this.timing.startDelay) {
				if (((this.timing.fill == "backwards") && (this._reversing == false)) 
					|| this.timing.fill == "both" 
					|| ((this.timing.fill == "forwards") && this._reversing)) {
					this.animationTime = 0;
				} else {
					this.animationTime = null;
				}
			} else if (this.itemTime < this.timing.startDelay + this.animationDuration) {
				this.animationTime = this.itemTime - this.timing.startDelay;
			} else {
				if (((this.timing.fill == "forwards") && (this._reversing == false))
					|| this.timing.fill == "both" 
					|| ((this.timing.fill == "backwards") && this._reversing)) {
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
				var effectiveSpeed = this._reversing ? -this.timing.speed : this.timing.speed;
				if (effectiveSpeed < 0) {
					var adjustedAnimationTime = (this.animationTime - this.animationDuration) * effectiveSpeed + startOffset;
				} else {
					var adjustedAnimationTime = this.animationTime * effectiveSpeed + startOffset;
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
				if (this.timing.timingFunction) {
					this._timeFraction = this.timing.timingFunction.scaleTime(this._timeFraction);
					this.iterationTime = this._timeFraction * this.iterationDuration;
				} 		
			}
		} else {
			this.animationTime = null;
			this.iterationTime = null;
			this.currentIteration = null;
			this._timeFraction = null;
		}
		if (webAnimVisUpdateAnims) {
			webAnimVisUpdateAnims();
		}
		var chillen = (!this.children) || this.children.length == 0 ? "NONE" : this.children.map(function(a) { return a.name; }).reduce(function(a, b) { return a + ", " + b});
		//console.log("name parent children start end item anim iter currentIter tf:", this.name, this.parentGroup ? this.parentGroup.name : "NONE", chillen, this.startTime, this.endTime, this.itemTime, this.animationTime, this.iterationTime, this.currentIteration, this._timeFraction);
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
		if (this.currentTime == null) {
			var seekTime = 0;
		} else if (this.currentTime < this.timing.startDelay) {
			var seekTime = this.timing.startDelay + this.animationDuration;
		} else if (this.currentTime > this.timing.startDelay + this.animationDuration) {
			var seekTime = this.timing.startDelay;
		} else {
			var seekTime = this.timing.startDelay + this.animationDuration - this.currentTime;
		}

		this.currentTime = seekTime;
		this._reversing = !(this._reversing);
	},
	cancel: function() {
		// TODO
	},
	play: function() {
		this.updateTimeMarkers();
		if (this.currentTime > this.animationDuration + this.timing.startDelay && this.timing.speed >= 0) {
			this.currentTime = this.timing.startDelay;
		}
	},
	// TODO: move this to run on modification of startTime (I think)
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

function keyframesForValues(property, values) {
	var animFun = new KeyframesAnimFunction(property);
	for (var i = 0; i < values.length; i++) {
		animFun.frames.add(new AnimFrame(values[i], i / (values.length - 1)));
	}
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
	} else if (properties.to) {
		result.animFunc = keyframesFor(properties.prop, properties.from, properties.to);
	} else if (properties.values) {
		result.animFunc = keyframesForValues(properties.prop, properties.values);
	}
	return result;
}

// -----------
// Anim Object
// -----------

function LinkedAnim(target, template, parentGroup, startTime) {
	var anim = new Anim(target, {timing: new ImmutableTimingProxy(template.timing), animFunc: template.func, name: template.name}, parentGroup, startTime);
	anim.template = template;
	template.addLinkedAnim(anim);
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
		if (!this.func) {
			try { throw "Anim Without Animation Function!" } catch (e) { console.log(e.stack); throw e; }
		}
		// TODO: correctly extract the underlying value from the element
		this.underlyingValue = this.func.getValue(target);
		this.template = null;
		this.targetElement = target;
		this.name = properties.name || (target ? target.id : "<untargeted>") || "<anon>";
	},
	unlink: function() {
		var result = this.template;
		if (result) {
			this.timing = this.timing.extractMutableTiming();
			// TODO: Does func need to have a FuncProxy too?
			this.func = this.func.clone();
			this.template.removeLinkedAnim(this);
		}
		this.template = null;
		return result;
	},
	templatize: function() {
		if (this.template) {
			return this.template;
		}
		// TODO: What resolution strategy, if any, should be employed here?
		var template = new AnimTemplate({animFunc: this.func.clone(), timing: this.timing.clone()});
		this.template = template;
		this.func = template.func;
		this.timing = new ImmutableTimingProxy(template.timing);
		this.template.addLinkedAnim(this);
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
	},
	toString: function() {
		return "Anim " + this.startTime + "-" + this.endTime + " (" + this.timeDrift+ ") " + this.func.toString();
	}
});

var AnimTemplate = Class.create(TimedTemplate, {
	initialize: function($super, properties, resolutionStrategy) {
		var completedProperties = completeProperties(properties);
		$super(completedProperties.timing);
		this.func = completedProperties.animFunc;
		if (!this.func) {
			try { throw "AnimTemplate Without Animation Function!" } catch (e) { console.log(e.stack); throw e; }			
		}
		this.resolutionStrategy = resolutionStrategy;
		this.name = properties.name;
	},
	reparent: function(parentGroup) {
		// TODO: does anything need to happen here?
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
function animate(targets, properties, startTime) {
	var unwrapOnReturn = false;
	if (!targets.length) {
		targets = [targets];
		unwrapOnReturn = true;
	}

	var instances = [];

	[].forEach.call(targets, function(target) {
		instances.push(new Anim(target, properties, DEFAULT_GROUP, startTime));
		DEFAULT_GROUP.add(instances[instances.length - 1]);
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
		this.onListChange();
	},
	_clear: function() {
		this.children = [];
		var oldLength = this.length;
		this.length = 0;
		this._deleteIdxAccessors(0, oldLength);
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
			arguments[i].reparent(this);
			this.children.push(arguments[i]);
		}
		var oldLength = this.length;
		this.length = this.children.length;
		this._createIdxAccessors(oldLength, this.length);
		this.onListChange();
		return arguments;
		// TODO: Remove newItem from other group. Update timing?
	},
	// Specialized add method so that templated groups can still have children added by the library.
	_addChild: function(child) {
		this.children.push(child);
		this._createIdxAccessors(this.length, this.length + 1);
		this.length = this.children.length;
		this.onListChange();
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
		for (var i = 2; i < arguments.length; i++) {
			arguments[i].reparent(this);
		}
		this.children.splice.apply(this.children, arguments);
		var oldLength = this.length;
		this.length = this.children.length;
		this._createIdxAccessors(oldLength, this.length);
		this.onListChange();
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
		if (template) {
			template.addLinkedAnim(this);
		}
		this.name = properties.name || "<anon>";
	},
	_assertNotLive: function() {
		if (this.template) {
			throw "Can't modify tree of AnimGroupInstances with templates"
		}
	},
	templatize: function() {
		if (!this.template) {
			var properties = {timing: this.timing.clone()};
			var template = this.type == "par" ? new ParAnimGroupTemplate(properties) : new SeqAnimGroupTemplate(properties);
			this.timing = new ImmutableTimingProxy(template.timing);
			for (var i = 0; i < this.children.length; i++) {
				template.add(this.children[i].templatize());
			}
			this.template = template;
			this.template.addLinkedAnim(this);
		}
		return this.template;
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
				child.stashedStartTime = child.startTime;
				child.stashedStartTimeMode = child.startTimeMode;
				child.startTime = cumulativeStartTime;
				child.startTimeMode = ST_FORCED;
				child.updateTimeMarkers();
				cumulativeStartTime += Math.max(0, child.timing.startDelay + child.animationDuration);
			}.bind(this));
		}
	},
	unlink: function() {
		var acted = this.template != null;
		if (this.template) {
			this.template.removeLinkedAnim(this);
			this.timing = this.template.timing.clone();
		}
		this.template = null;
		return acted;
	},
	getActiveAnimations: function() {
		var result = [];
		if (this._timeFraction == null) {
			return result;
		}
		for (var i = 0; i < this.children.length; i++) {
			if (this.children[i]._timeFraction != null) {
				if (this.children[i].getActiveAnimations) {
					result = result.concat(this.children[i].getActiveAnimations());
				} else {
					result.push(this.children[i]);
				}
			}
		}
		return result;
	},
	getAnimationsForElement: function(elem) {
		var result = [];
		for (var i = 0; i < this.children.length; i++) {
			if (this.children[i].getAnimationsForElement) {
				result = result.concat(this.children[i].getAnimationsForElement(elem));
			} else if (this.children[i].targetElement == elem) {
				result.push(this.children[i]);
			}
		}
		return result;
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
			return time > this.endTime ? RC_ANIMATION_FINISHED : 0;
		} else {
			var set = 0;
			var end = time > this.endTime ? RC_ANIMATION_FINISHED : 0;
			this.children.forEach(function(child) {
				var r = child._tick((time - this.startTime - this.timing.startDelay - this.timeDrift) * this.timing.speed); 
				if (!(r & RC_ANIMATION_FINISHED)) {
					end = 0;
				}
				if (r & RC_SET_VALUE) {
					set = RC_SET_VALUE;
				}
			}.bind(this));
			return set | end;
		}
	},
	toString: function() {
		return this.type + " " + this.startTime + "-" + this.endTime + " (" + this.timeDrift+ ") " + " [" + this.children.map(function(a) { return a.toString(); }) + "]"
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
		$super(completedProperties.timing);
		this.type = type;
		this.resolutionStrategy = resolutionStrategy;
		this.initListMixin(function() {}, function() {});
		this.name = properties.name;
	},
	reparent: function(parentGroup) {
		// TODO: does anything need to happen here?
	},
	__animate: function($super, isLive, targets, parentGroup, startTime) {
		var instances = [];
		for (var i = 0; i < targets.length; i++) {
			var instance = new AnimGroup(this.type, this, {timing: this.timing, name: this.name}, startTime, parentGroup);
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
		return new JavaScriptAnimFunction(this.getValue, this.zeroPoint, this.sample, this.operation, this.accumulateOperation);
	},
	toString: function() {
		return "CustomJS!";
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
		var animationValue = interpolate(this.property, target, beforeFrame.value, afterFrame.value, localTimeFraction);
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
	},
	toString: function() {
		return this.property;
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
});

var presetTimings = {
	"ease-in" : [0.42, 0, 1.0, 1.0],
	"ease-out" : [0, 0, 0.58, 1.0]
}

var TimingFunction = Class.create({
	initialize: function(spec) {
		if (spec.length == 4) {
			this.params = spec;
		} else {
			this.params = presetTimings[spec];
		}
		this.map = []
		for (var ii = 0; ii <= 100; ii += 1) {
			var i = ii / 100;
			this.map.push([3*i*(1-i)*(1-i)*this.params[0] + 3*i*i*(1-i)*this.params[2] + i*i*i,
							 3*i*(1-i)*(1-i)*this.params[1] + 3*i*i*(1-i)*this.params[3] + i*i*i])
		}
	},
	scaleTime: function(fraction) {
		var fst = 0;
		while (fst != 100 && fraction > this.map[fst][0]) {
			fst += 1;
		}
		if (fraction == this.map[fst][0] || fst == 0) {
			return this.map[fst][1];
		}
		var yDiff = this.map[fst][1] - this.map[fst - 1][1];
		var xDiff = this.map[fst][0] - this.map[fst - 1][0];
		var p = (fraction - this.map[fst - 1][0]) / xDiff;
		return this.map[fst - 1][1] + p * yDiff;
	}
});

function _interp(from, to, f) {
	if (Array.isArray(from) || Array.isArray(to)) {
		return _interpArray(from, to, f);
	}
	return to * f + from * (1 - f);
}

function _interpArray(from, to, f) {
	console.assert(Array.isArray(from), "From is not an array");
	console.assert(Array.isArray(to), "To is not an array");
	console.assert(from.length === to.length, "Arrays differ in length");

	var result = [];
	for (var i = 0; i < from.length; i++) {
		result[i] = _interp(from[i], to[i], f);
	}
	return result;
}

function propertyIsNumber(property) {
	return ["opacity"].indexOf(property) != -1;
}

function propertyIsLength(property) {
	return ["left", "top", "cx"].indexOf(property) != -1;
}

function propertyIsTransform(property) {
	return ["-webkit-transform", "transform"].indexOf(property) != -1;
}

function propertyIsSVGAttrib(property, target) {
	// For browsers that support transform as a style attribute on SVG we can
	// remove transform from the list below
	return target.namespaceURI == "http://www.w3.org/2000/svg" &&
	       ["cx", "transform"].indexOf(property) != -1;
}

function interpolate(property, target, from, to, f) {
	var svgMode = propertyIsSVGAttrib(property, target);
	from = fromCssValue(property, from);
	to = fromCssValue(property, to);
	if (propertyIsNumber(property)) {
		return toCssValue(property, _interp(from, to, f), svgMode);
	} else if (propertyIsLength(property)) {
		return toCssValue(property, [_interp(from[0], to[0], f), "px"], svgMode);
	} else if (propertyIsTransform(property)) {
		return toCssValue(property,
			[{t: from[0].t, d:_interp(from[0].d, to[0].d, f)}], svgMode)
	} else {
		throw "UnsupportedProperty";
	}
}

function toCssValue(property, value, svgMode) {
	if (propertyIsNumber(property)) {
		return value + "";
	} else if (propertyIsLength(property)) {
		return value[0] + value[1];
	} else if (propertyIsTransform(property)) {
		// TODO: fix this :)
		switch (value[0].t) {
			case "rotate":
			case "rotateY":
				var unit = svgMode ? "" : "deg";
				return value[0].t + "(" + value[0].d + unit + ")";
			case "translate":
				var unit = svgMode ? "" : "px";
				if (value[0].d[1] === 0) {
					return value[0].t + "(" + value[0].d[0] + unit + ")";
				} else {
					return value[0].t + "(" + value[0].d[0] + unit + ", " +
					       value[0].d[1] + unit + ")";
				}
		}
	} else {
		throw "UnsupportedProperty";
	}
}

function extractDeg(deg) {
	var num  = Number(deg[1]);
	switch (deg[2]) {
	case "grad":
		return num * 400/360;
	case "rad":
		return num * 2 * Math.PI / 360;
	case "turn":
		return num / 360;
	default:
		return num;
	}
}

function extractTranslationValues(lengths) {
	// XXX Assuming all lengths are px for now
	var length1 = Number(lengths[1]);
	var length2 = lengths[3] ? Number(lengths[3]) : 0;
	return [length1, length2];
}

var transformREs =
	[
		[/rotate\(([+-]?(?:\d+|\d*\.\d+))(deg|grad|rad|turn)\)/, extractDeg, "rotate"],
		[/rotateY\(([+-]?(?:\d+|\d*\.\d+))(deg|grad|rad|turn)\)/, extractDeg, "rotateY"],
		[/translate\(([+-]?(?:\d+|\d*\.\d+))(px)?(?:\s*,\s*(-?(?:\d+|\d*\.\d+))(px)?)?\)/,
		 extractTranslationValues, "translate"]
	];

function fromCssValue(property, value) {
	if (propertyIsNumber(property)) {
		return Number(value);
	} else if (propertyIsLength(property)) {
		return [Number(value.substring(0, value.length - 2)), "px"];
	} else if (propertyIsTransform(property)) {
		// TODO: fix this :)
		for (var i = 0; i < transformREs.length; i++) {
			var reSpec = transformREs[i];
			var r = reSpec[0].exec(value);
			if (r) {
				return [{t: reSpec[2], d: reSpec[1](r)}];
			}
		}
	} else {
		throw "UnsupportedProperty";
	}
}

function setValue(target, property, value) {
	if (propertyIsSVGAttrib(property, target)) {
		target.setAttribute(property, value);
	} else {
		target.style[property] = value;
	}
}

function getValue(target, property) {
	if (propertyIsSVGAttrib(property, target)) {
		return target.getAttribute(property);
	} else {
		return window.getComputedStyle(target)[property];
	}
}

var rAFNo = undefined;

var DEFAULT_GROUP = new AnimGroup("par", undefined, {fill: "forwards", name: "DEFAULT"}, 0, undefined);
DEFAULT_GROUP._tick = function(time) {
		this.updateTimeMarkers(time);
		var allFinished = true;
		this.children.forEach(function(child) {
			var r = child._tick(time); 
			if (!(r & RC_ANIMATION_FINISHED)) {
				allFinished = false;
			}
		}.bind(this));

		return !allFinished;
}
DEFAULT_GROUP.currentState = function() {
	return this.iterationTime + " " + (rAFNo != undefined ? "ticking" : "stopped") + " " + this.toString();
}.bind(DEFAULT_GROUP);

var now = undefined;

// massive hack to allow things to be added to the parent group and start playing. Maybe this is right though?
DEFAULT_GROUP.__defineGetter__("iterationTime", function() {
	if (now == undefined) {
		now = Date.now();
		window.setTimeout(function() { now = undefined; }, 0);
	}
	return (now - _startTime) / 1000})

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
