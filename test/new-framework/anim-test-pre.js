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
(function() {
  window.animTestRunner = {
    players: [],
    waiting: false,
    waitUntilDone: function() {
      waiting = true;
    },
    notifyDone: function() {
      waiting = false;
      if (document.readyState == 'complete') {
        runTests();
      }
    },
  };

  if (!document.timeline) {
    console.error('Cant find timeline');
    return;
  }

  var play = document.timeline.play;
  document.timeline.play = function(item) {
    var player = play.call(document.timeline, item);
    animTestRunner.players.push(player);
    return player;
  };

  if (window.parent !== window &&
      window.parent.location.pathname.match('test-generator.html$')) {
    return;
  }

  var loadCss = function(href) {
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    document.head.appendChild(link);
  };
  loadCss('../testharness/testharness.css');
  loadCss('../animation-test-style.css');

  // scripts have interdependencies and must be loaded in order
  var loadScript = function(src) {
    document.write('<script type="text/javascript" src="' +
        src + '"></script>');
  };
  loadScript('../testharness/testharness.js');
  loadScript('../testharness/testharnessreport.js');
  loadScript('../extra-asserts.js');
  loadScript(location.pathname.replace('.html', '-checks.js'));

  window.addEventListener('load', function() {
    setupTests();
    if (!animTestRunner.waiting) {
      runTests();
    }
  });
})();
