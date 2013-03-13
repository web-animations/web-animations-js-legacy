The test framework developed by the BOLD interns 2012-2013.

It is yet to be put to use as the default test framework for Web Animations.

test-runner.html is needed for the test infrasture to work. There is a hard
coded address that the results are posted to that will need to be changed. It
also contains the list of tests that will be run as an array at the top of the
file. Each test is loaded in an iframe. The test file (which contains all the
checks & extra-asserts.js) then runs whilst the testRunner checks for a varible
to change from undefined to containing all the results in an arrary. These
results are then posted to the server.

test-generator.html creates checks for test cases. The animation file path (from
the location of test-generator.html or absolute path) needs to be put in the top
box. Hit the load button and the animation should load in the iframe. The
iteration box determines how often to create checks (e.g. 1 would be a check
ever second). The last box:
- For each new line (each element seperated by comma), the first element is the
  thing you would place in a querySelectorAll call e.g. .anim or #log and each
  element after that is the property you want to check in the javascript form
  e.g. top, left, height etc.
- Hit generate to see the checks produced

Note that the asserts framework itself requires the following functionality ...
- pausing and moving an animation to a set time
- getting all player elements
