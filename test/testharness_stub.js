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
"use strict";

(function() {

    /**
     * These functions come from testharness.js but can't be access because
     * testharness uses an anonymous function to hide them.
     **************************************************************************
     */
    function expose(object, name)
    {
        var components = name.split('.');
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
    // Expose all the test functionality as empty stubs

    function expose_stub(name) {
        expose(function() {}, name);
    }

    // testharness.js
    function TestStub() {}
    TestStub.prototype.step = function() {};
    TestStub.prototype.step_func = function() {};
    TestStub.prototype.step_func_done = function() {};
    TestStub.prototype.timeout = function() {};
    TestStub.prototype.done = function() {};

    function new_test_stub() {
        return new TestStub();
    }
    expose(new_test_stub, 'test');
    expose(new_test_stub, 'async_test');
    expose_stub('generate_tests');
    expose_stub('timeout');

    expose_stub('setup');
    expose_stub('done');
    expose_stub('on_event');
    expose_stub('format_value');

    // assert functions
    expose_stub('assert_true');
    expose_stub('assert_false');
    expose_stub('assert_equals');
    expose_stub('assert_not_equals');
    expose_stub('assert_in_array');
    expose_stub('assert_object_equals');
    expose_stub('assert_array_equals');
    expose_stub('assert_approx_equals');
    expose_stub('assert_regexp_match');
    expose_stub('assert_class_string');
    expose_stub('assert_exists');
    expose_stub('assert_own_property');
    expose_stub('assert_not_exists');
    expose_stub('assert_inherits');
    expose_stub('assert_idl_attribute');
    expose_stub('assert_readonly');
    expose_stub('assert_throws');
    expose_stub('assert_unreached');
    expose_stub('assert_any');

    // Callback functions
    expose_stub(add_start_callback, 'add_start_callback');
    expose_stub(add_result_callback, 'add_result_callback');
    expose_stub(add_completion_callback, 'add_completion_callback');

    // testharness_extensions.js
    expose(function() {}, 'assert_styles');

    // testharness_timing.js
    expose(function(seconds, f) { setTimeout(f, seconds*1000.0); }, 'at');
    expose(function(f) {
        // We have to run function given to timing_test function. The at
        // functions inside the timing_test might modify state (which is bad
        // style but unpreventable) and hence need to be converted into
        // setTimeout calls.
        f(); 
        return new_test_stub();
    }, 'timing_test');

})();
// vim: set expandtab shiftwidth=4 tabstop=4:
