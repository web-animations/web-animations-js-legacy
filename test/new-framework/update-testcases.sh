#!/bin/sh
(echo 'var tests = [' && (cd testcases && ls test-*.html) | sed "s/.*/  '\0',/" && echo '];') > testcases.js
