testRunner.html is needed for the test infrasture to work. There is a hard coded address that the results are posted to that will need to be changed. It also contains the list of tests that will be run as an array at the top of the file.
Each test is loaded in an iframe. The test file (which contains all the checks & extra-asserts.js) then runs whilst the testRunner checks for a varible to change from undefined to containing all the results in an arrary. These results are then posted to the server.

testGenerator cretes checks for test cases. The animation file path (from the location of testGenerator or absolute path) needs to be put in the top box. Hit the load button and the animation should load in the iframe. The iteration box determines how often to create checks (e.g. 1 would be a check ever second). The last box:
- For each new line (each element seperated by comma), the first element is the thing you would place in a querySelectorAll call e.g. .anim or #log and each element after that is the property you want to check in the javascript form e.g. top, left, height etc.
- Hit generate to see the checks produced

Manual only tests contain tests that need to pass to make the extra asserts framework valid. The extra asserts require:
- pausing and moving an animation to a set time
- getting all player elements (documentTimeline.getPlayers() orginally produced this behavior)