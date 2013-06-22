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
'use strict';

(function() {

function loadScript(src) {
  document.write('<script type="text/javascript" src="'+ src + '"></script>');
}

function loadCSS(src) {
  document.write('<link rel="stylesheet" type="text/css" href="' + src + '">');
}

loadScript('../testharness/testharness.js');
loadCSS('../testharness/testharness.css');

loadScript('../testharness_extensions.js');

loadScript('../testharness_timing.js');
loadCSS('../testharness_timing.css');

loadScript(location.pathname.replace('.html', '-checks.js'));

document.write('<div id="log"></div>');
loadScript('../testharness/testharnessreport.js');

loadScript('../../web-animations.js');

window.__coverage__ = parent.window.__coverage__;

})();
