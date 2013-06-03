#!/bin/sh
(echo 'testCases([' && (cd testcases && ls *.html) | sed "s/.*/  \"\0\",/" | head -c"-2" && echo ']);') > testcases.jsonp
