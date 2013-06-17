/**
 * @preserve Copyright 2013 Google Inc. All Rights Reserved.
 *
 * vim: set expandtab shiftwidth=4 tabstop=4:
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
"use strict";

(function() {
    /**
     * These functions come from testharness.js but can't be access because
     * testharness uses an anonymous function to hide them.
     **************************************************************************
     */
    function forEach (array, callback, thisObj)
    {
        for (var i=0; i<array.length; i++)
        {
            if (array.hasOwnProperty(i))
            {
                callback.call(thisObj, array[i], i, array);
            }
        }
    }

    function expose(object, name)
    {
        var components = name.split(".");
        var target = window;
        for (var i=0; i<components.length - 1; i++)
        {
            if (!(components[i] in target))
            {
                target[components[i]] = {};
            }
            target = target[components[i]];
        }
        target[components[components.length - 1]] = object;
    }

    /* ********************************************************************* */


    /**
     * Schedule something to be called at a given time.
     *
     * @constructor
     * @param {number} millis Microseconds after start at which the callback should
     *     be called.
     * @param {bool} autostart Auto something...
     */
    function TestTimelineGroup(millis)
    {
        this.millis = millis;

        /**
         * @type {bool}
         */
        this.autorun_ = false;

        /**
         * @type {!Array.<function(): ?Object>}
         */
        this.startCallbacks = null;

        // Callbacks which are added after the timeline has started. We clear them
        // when going backwards.
        /**
         * @type {?Array.<function(): ?Object>}
         */
        this.lateCallbacks = null;

        /**
         * @type {Element}
         */
        this.marker = document.createElement('img');
        /**
         * @type {Element}
         */
        this.info = document.createElement('div');

        this.setup_();

    }

    TestTimelineGroup.prototype.setup_ = function()
    {
        this.endTime_ = 0;
        this.startCallbacks = new Array();
        this.lateCallbacks = null;
        this.marker.innerHTML = '';
        this.info.innerHTML = '';
    }

    /**
     * Add a new callback to the event group
     *
     * @param {function(): ?Object} callback Callback given the currentTime of
     *     callback.
     */
    TestTimelineGroup.prototype.add = function(callback)
    {
        if (this.lateCallbacks === null) {
            this.startCallbacks.unshift(callback);
        } else {
            this.lateCallbacks.unshift(callback);
        }

        // Trim out extra "function() { ... }"
        var callbackString = callback.name;
        // FIXME: This should probably unindent too....
        this.info.innerHTML += "<div>" + callbackString + "</div>";
    };

    /**
     * Reset this event group to the state before start was called.
     */
    TestTimelineGroup.prototype.reset = function()
    {
        this.lateCallbacks = null;

        var callbacks = this.startCallbacks.slice(0);
        this.setup_();
        while (callbacks.length > 0)
        {
            var callback = callbacks.shift();
            this.add(callback);
        }
    };

    /**
     * Tell the event group that the timeline has started and that any callbacks
     * added from now are dynamically generated and hence should be cleared when a
     * reset is called.
     */
    TestTimelineGroup.prototype.start = function()
    {
        this.lateCallbacks = new Array();

    };

    /**
     * Call all the callbacks in the EventGroup.
     */
    TestTimelineGroup.prototype.call = function()
    {
        var callbacks = (this.startCallbacks.slice(0)).concat(this.lateCallbacks);
        var statuses = this.info.children;

        var overallResult = true;
        while (callbacks.length > 0)
        {
            var callback = callbacks.shift();
            var status_ = statuses[statuses.length - callbacks.length-1];

            var result = callback.step(callback.f);
            callback.done();

            if (result === undefined || result == null) {
                overallResult = overallResult && true;

                status_.style.color = 'green';
            } else {
                overallResult = overallResult && false;
                status_.style.color = 'red';
                status_.innerHTML += "<div>" + result.toString() + "</div>";
            }
        }
        if (overallResult) {
            this.marker.src = "../img/success.png";
        } else {
            this.marker.src = "../img/error.png";
        }
    }

    /**
     * Draw the EventGroup's marker at the correct position on the timeline.
     *
     * FIXME(mithro): This mixes display and control :(
     *
     * @param {number} endTime The endtime of the timeline in millis. Used to
     *     display the marker at the right place on the timeline.
     */
    TestTimelineGroup.prototype.draw = function(container, endTime)
    {
        this.marker.title = this.millis + "ms";
        this.marker.className = "marker";
        this.marker.src = "../img/unknown.png";
        this.marker.style.left = "calc(" + (this.millis / endTime)*100.0 +
                                 "%" + " - 10px)";
        container.appendChild(this.marker);

        this.info.className = "info";
        container.appendChild(this.info);

        // Display details about the events at this time period when hovering over
        // the marker.
        this.marker.onmouseover = function()
            {
                this.style.display = "block";
            }.bind(this.info);
        this.marker.onmouseout = function()
            {
                this.style.display = "none";
            }.bind(this.info);

        this.info.style.left = "calc(" + (this.millis / endTime)*100.0 + "%" +
                               " - " + this.info.offsetWidth/2 + "px)";
        this.info.style.display = "none";
    };

    /**
     * Class for storing events that happen during at given times (such as
     * animation checks, or setTimeout).
     *
     * @constructor
     */
    function TestTimeline(everyFrame)
    {
        /**
         * Stores the events which are upcoming.
         *
         * @type Object.<number, TestTimelineGroup>
         * @private
         */
        this.timeline_ = new Array();

        this.everyFrame = everyFrame;
        this.frameMillis = 1000.0 / 60; //60fps 

        this.currentTime_ = -this.frameMillis;

        this.reset();
    }

    /**
     * Create the GUI controller for the timeline.
     * @param {Element} body DOM element to add the GUI too, normally the <body>
     *     element.
     */
    TestTimeline.prototype.createGUI = function(body)
    {
        // HTML needed to create the timeline UI
        this.div = document.createElement('div');
        this.div.id = 'timeline';

        this.timelinebar = document.createElement('div');
        this.timelinebar.className = 'bar';

        this.timelineprogress = document.createElement('div');
        this.timelineprogress.className = 'progress';

        this.timelinebar.appendChild(this.timelineprogress);
        this.div.appendChild(this.timelinebar);

        this.next = document.createElement('button');
        this.next.innerText = '>';
        this.next.id = "next";
        this.next.onclick = this.toNextEvent.bind(this);
        this.div.appendChild(this.next);

        this.prev = document.createElement('button');
        this.prev.innerText = '<';
        this.prev.id = "prev";
        this.prev.onclick = this.toPrevEvent.bind(this);
        this.div.appendChild(this.prev);

        body.appendChild(this.div);
    }

    /**
     * Update GUI elements.
     *
     * @private
     */
    TestTimeline.prototype.updateGUI = function ()
    {
        // Update the timeline
        this.timelineprogress.style.width = (this.currentTime_ / this.endTime_)*100.0 +'%';
        this.timelinebar.title = (this.currentTime_).toFixed(0) + "ms";
    };


    /**
     * Sort the timeline into run order. Should be called after adding something to
     * the timeline.
     *
     * @private
     */
    TestTimeline.prototype.sort_ = function()
    {
        this.timeline_.sort(function(a,b)
            {
                return a.millis - b.millis;
            });
    };

    /**
     * Schedule something to be called at a given time.
     *
     * @param {number} millis Milliseconds after start at which the callback should
     *     be called.
     * @param {function(number)} callback Callback to call after the number of millis
     *     have elapsed.
     */
    TestTimeline.prototype.schedule = function(millis, callback)
    {
        if (millis < this.currentTime_)
        {
            // Can't schedule something in the past?
            return;
        }

        // See if there is something at that time in the timeline already?
        var timeline = this.timeline_.slice(0);
        var group = null;
        while (timeline.length > 0)
        {
            if (timeline[0].millis == millis) {
                group = timeline[0];
                break;
            } else {
                timeline.shift();
            }
        }

        // If not, create a node at that time.
        if (group === null)
        {
            group = new TestTimelineGroup(millis);
            this.timeline_.unshift(group);
            this.sort_();
        }
        group.add(callback);

        var newEndTime = this.timeline_.slice(-1)[0].millis * 1.1;
        if (this.endTime_ != newEndTime)
        {
            this.endTime_ = newEndTime;
        }
    };


    /**
     * Return the current time in milliseconds.
     */
    TestTimeline.prototype.now = function()
    {
        return Math.max(this.currentTime_, 0);
    };

    /**
     * Set the current time to a given value.
     *
     * @param {number} millis Time in milliseconds to set the current time too.
     */
    TestTimeline.prototype.setTime = function(millis)
    {
        // Time is going backwards, we actually have to reset and go forwards as
        // events can cause the creation of more events.
        if (this.currentTime_ > millis)
        {
            this.reset();
            this.start();
        }

        var events = this.timeline_.slice(0);

        // Already processed events
        while (events.length > 0 && events[0].millis < this.currentTime_)
        {
            events.shift();
        }

        while (this.currentTime_ < millis)
        {
            var nextTick = Math.min(this.currentTime_ + this.frameMillis, millis);

            while (events.length > 0 && events[0].millis <= nextTick)
            {
                var event_ = events.shift();

                // Call the callback
                if (this.currentTime_ != event_.millis) {
                    this.currentTime_ = event_.millis;
                    this.animationFrame(this.currentTime_);
                }
                event_.call();
            }

            if (this.currentTime_ != nextTick) {
                this.currentTime_ = nextTick;
                if (this.everyFrame) {
                    this.animationFrame(this.currentTime_);
                }
            }
        }

        this.updateGUI();
    };

    /**
     * Call all callbacks registered for the next (virtual) animation frame.
     *
     * @param {number} millis Time in milliseconds.
     * @private
     */
    TestTimeline.prototype.animationFrame = function(millis)
    {
        var callbacks = this.animationFrameCallbacks;
        callbacks.reverse();
        this.animationFrameCallbacks = [];
        forEach(callbacks, function(callback, x)
            {
                callback(millis) / 1000.0;
            });
    };

    /**
     * Set a callback to run at the next (virtual) animation frame.
     *
     * @param {function(millis)} millis Time in milliseconds to set the current
     *     time too.
     */
    TestTimeline.prototype.requestAnimationFrame = function(callback)
    {
        // FIXME: This should return a reference that allows people to cancel the
        // animationFrame callback.
        this.animationFrameCallbacks.push(callback);
        return -1;
    };

    /**
     * Go to next scheduled event in timeline.
     */
    TestTimeline.prototype.toNextEvent = function()
    {
        var events = this.timeline_.slice(0);
        while (events.length > 0 && events[0].millis <= this.currentTime_)
        {
            events.shift();
        }
        if (events.length > 0) {
            this.setTime(events[0].millis);

            if (this.autorun_) {
                this.toNextEvent();
            }

            return true;
        } else {
            this.setTime(this.endTime_);
            return false;
        }

    };

    /**
     * Go to previous scheduled event in timeline.
     * (This actually goes back to time zero and then forward to this event.)
     */
    TestTimeline.prototype.toPrevEvent = function()
    {
        var events = this.timeline_.slice(0);
        while (events.length > 0 && events[events.length - 1].millis >= this.currentTime_)
        {
            events.pop();
        }
        if (events.length > 0) {
            this.setTime(events[events.length - 1].millis);
            return true;
        } else {
            this.setTime(0);
            return false;
        }
    };

    /**
     * Reset the timeline to time zero.
     */
    TestTimeline.prototype.reset = function ()
    {
        for (var t in this.timeline_)
        {
            this.timeline_[t].reset();
        }

        this.currentTime_ = -this.frameMillis;
        this.animationFrameCallbacks = [];
        this.started_ = false;
    };

    /**
     * Call to initiate starting???
     */
    TestTimeline.prototype.start = function ()
    {
        this.started_ = true;

        var parent = this;

        for (var t in this.timeline_)
        {
            this.timeline_[t].start();
            // FIXME(mithro) this is confusing...
            this.timeline_[t].draw(this.timelinebar, this.endTime_);

            this.timeline_[t].marker.onclick = function(event)
                {
                    parent.setTime(this.millis);
                    event.stopPropagation();
                }.bind(this.timeline_[t]);
        }

        this.timelinebar.onclick = function(evt)
            {
                var setPercent =
                    ((evt.clientX - this.offsetLeft) / this.offsetWidth);
                parent.setTime(setPercent * parent.endTime_);
            }.bind(this.timelinebar);
    };


    TestTimeline.prototype.autorun = function()
    {
        this.autorun_ = true;
        this.toNextEvent();
    };


    function testharness_timeline_setup()
    {
        testharness_timeline.createGUI(document.getElementsByTagName("body")[0]);
        testharness_timeline.start();
        testharness_timeline.updateGUI();
        // FIXME(mithro): Make this an option using the URI.
        setTimeout(testharness_timeline.autorun.bind(testharness_timeline), 10);
    }
    addEventListener('load', testharness_timeline_setup);

    function test_at(time, f, desc)
    {
        var t = async_test(desc);
        t.f = f;
        window.testharness_timeline.schedule(time*1000, t);
    }

    function generate_tests_at(time, func, args, properties)
    {
        forEach(args, function(x, i)
            {
                if (x[0] == null) {
                   x[0] = generate_name(func, x.slice(1));
                }
            });

        forEach(args, function(x, i)
            {
                var name = "At " + time*1e3 + "ms "+ x[0];
                test_at(
                    time, function()
                        { func.apply(this, x.slice(1)); },
                    name,
                    Array.isArray(properties) ? properties[i] : properties
                );
            });
    }

    // Expose the extra API
    expose(test_at, 'test_at');
    expose(generate_tests_at, 'generate_tests_at');

    var tht = new TestTimeline();
    expose(tht, 'testharness_timeline');

    // Override existing timing functions
    window.requestAnimationFrame = tht.requestAnimationFrame.bind(tht);
    window.performance.now = null;
    window.Date.now = tht.now.bind(tht);

})();


