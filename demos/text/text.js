<!--
/*
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
-->

"use strict;"

var numCharacters = 5; // "COOL!"

// create grid of circles
var createGrid = function(height, width) {
  var grid = document.createElement('table');
  grid.setAttribute('class', 'grid');

  for (var i = 1; i <= height; i++) {
    var tr = document.createElement('tr');
    for (var j = 1; j <= width; j++) {
      var td = document.createElement('td');
      var circle = document.createElement('div');
      if (j != 1 && j != width) {
        circle.setAttribute('class', 'circle');
      } else {
        circle.setAttribute('class', 'divider');
      }
      td.appendChild(circle);
      tr.appendChild(td);
    }
    grid.appendChild(tr);
  }
  
  return grid;
};

// create character animation
var createCharacter = function(color, i, indices) {
  var charGrid = document.getElementById('charGrid'+i);
  var circles = charGrid.querySelectorAll('div');
  var seqGroup = new SeqGroup([], {delay: 0.08});
  var circle;
  
  for (i = 0, circle; circle = circles[indices[i]]; i++) {
    var animation = new Animation(circle, 
      {backgroundColor: color, visibility: 'visible'}, 
      {duration: 0.008});
    seqGroup.append(animation);
  }
  
  return seqGroup;
};

// put all the characters in a div
var text = document.createElement('div');
text.setAttribute('class', 'text');
for (var i = 1; i <= numCharacters; i++) {
  var charGrid = createGrid(12, 10);
  charGrid.setAttribute('id', 'charGrid'+i);
  text.appendChild(charGrid);
}
document.body.appendChild(text);

var colors = {
  'blue': 'rgb(51, 105, 232)',
  'red': 'rgb(213, 15, 37)',
  'yellow': 'rgb(238, 178, 17)',
  'green': 'rgb(0, 153, 57)'
};

// the sequence of dot coordinates to light up for the animation (yuck!)
var indices = {
  'C': [37, 38, 28, 17, 27, 16, 26, 15, 25, 14, 24, 13, 23, 12, 22, 21, 31, 32, 
        41, 42, 51, 52, 61, 62, 71, 72, 81, 82, 91, 92, 102, 93, 103, 94, 104, 
        95, 105, 96, 106, 97, 107, 98, 87, 88],
  'E': [18, 28, 17, 27, 16, 26, 15, 25, 14, 24, 13, 23, 12, 11, 21, 22, 31, 32, 
        41, 42, 51, 52, 53, 54, 55, 56, 57, 67, 66, 65, 64, 63, 62, 61, 71, 72, 
        81, 82, 91, 101, 92, 102, 93, 103, 94, 104, 95, 105, 96, 106, 97, 107, 
        98, 108],
  'G': [47, 48, 37, 38, 28, 17, 27, 16, 26, 15, 25, 14, 24, 13, 23, 12, 22, 21, 
        31, 32, 41, 42, 51, 52, 61, 62, 71, 72, 81, 82, 91, 92, 102, 93, 103, 
        94, 104, 95, 105, 96, 106, 97, 107, 98, 87, 88, 78, 68, 77, 67, 76, 66, 
        75, 65, 74, 64],
  'L': [11, 12, 21, 22, 31, 32, 41, 42, 51, 52, 61, 62, 71, 72, 81, 82, 91, 101, 
        92, 102, 93, 103, 94, 104, 95, 105, 96, 106, 97, 107, 98, 108],
  'O': [14, 24, 13, 23, 12, 22, 21, 32, 31, 42, 41, 52, 51, 62, 61, 72, 71, 82, 
        81, 91, 92, 102, 93, 103, 94, 104, 95, 105, 96, 106, 97, 107, 98, 87, 
        88, 77, 78, 67, 68, 57, 58, 47, 48, 37, 38, 28, 27, 17, 26, 16, 25, 15],
  '!': [11, 12, 21, 22, 31, 32, 41, 42, 51, 52, 61, 62, 91, 92, 101, 102],
};

var charCount = 1; // animation won't work if charCount exceeds numCharacters
var logoAnimation = new SeqGroup([
  createCharacter(colors['blue'], charCount++, indices['C']),
  createCharacter(colors['green'], charCount++, indices['O']),
  createCharacter(colors['yellow'], charCount++, indices['O']),
  createCharacter(colors['red'], charCount++, indices['L']),
  createCharacter(colors['blue'], charCount++, indices['!']),
]);

var player = document.timeline.play(logoAnimation);
var endSliderValue = 1000;

button.addEventListener('click', function() {
  player.currentTime = 0;
  player.paused = false;
  slider.value = endSliderValue;
});

slider.addEventListener('input', function() {
  player.paused = true;
  player.currentTime = slider.value / endSliderValue * player.source.endTime;
});

