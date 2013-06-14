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

// Load the dependencies in order
var loadScript = function(src)
    {
        document.write(
            '<script type="text/javascript" src="'+ src + '"></script>');
    };

// Load the required CSS
var loadCSS = function(src)
    {
        document.write(
            '<link rel="stylesheet" type="text/css" href="' + src + '">');
    };

loadCSS('../test.css');

loadScript('../testharness/testharness.js');
loadCSS('../testharness/testharness.css');

loadScript('../testharness_extensions.js');

loadScript('../testharness_timing.js');
loadCSS('../testharness_timing.css');

loadScript(location.pathname.replace('.html', '-checks.js'));

document.write('<div id="log"></div>');
loadScript('../testharness/testharnessreport.js');
