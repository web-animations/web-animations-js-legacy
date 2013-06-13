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

/**
 * Extends the testharness assert functions to support style checking and
 * transform checking.
 *
 *  >> This script must be loaded after testharness. <<
 *
 * Keep this file under same formatting as testharness itself.
 */

(function() {
    /**
     */
    var svg_properties = {
        'cx': 1,
        'width': 1,
        'x': 1,
        'y': 1,
    };

    var is_svg_attrib = function(property, target)
    {
        return target.namespaceURI == 'http://www.w3.org/2000/svg' &&
            property in svg_properties;
    };

    var svg_namespace_uri = 'http://www.w3.org/2000/svg';

    var features = (function ()
        {
            var style = document.createElement('style');
            style.textContent = '' +
                 'dummyRuleForTesting {' +
                 'width: calc(0px);' +
                 'width: -webkit-calc(0px); }';
            document.head.appendChild(style);
            var transformCandidates = [
                    'transform',
                    'webkitTransform',
                    'msTransform'
            ];
            var transformProperty = transformCandidates.filter(function(property) {
                return property in style.sheet.cssRules[0].style;
            })[0];
            var calcFunction = style.sheet.cssRules[0].style.width.split('(')[0];
            document.head.removeChild(style);
            return {
                transformProperty: transformProperty,
                calcFunction: calcFunction
            };
        })();


    /**
     * assert_style(actual, expected, description)
     *    asserts that actual has the same styles as the dictionary given by
     *    expected.
     */
    function assert_style(object, style)
    {
        // Create an element of the same type as testing so the style can be applied
        // from the test. This is so the css property (not the -webkit-does-something
        // tag) can be read.
        var reference_element = (object.namespaceURI == svg_namespace_uri) ?
            document.createElementNS(svg_namespace_uri, object.nodeName) :
            document.createElement(object.nodeName);
        reference_element.style.position = "absolute";
        object.parentNode.appendChild(reference_element);

        // Apply the style
        for (var prop_name in style)
        {
            // If the passed in value is an element then grab its current style for
            // that property
            if (style[prop_name] instanceof HTMLElement ||
                    style[prop_name] instanceof SVGElement) {

                var prop_value = getComputedStyle(style[prop_name], null)[prop_name];
            } else {
                var prop_value = style[prop_name];
            }

            if (prop_name == 'transform') {
                var output_prop_name = features.transformProperty;
            } else {
                var output_prop_name = prop_name;
            }

            var is_svg = is_svg_attrib(prop_name, object);
            if (is_svg) {
                reference_element.setAttribute(prop_name, prop_value);

                var current_style = object.attributes;
                var target_style = reference_element.attributes;
            } else {
                reference_element.style[output_prop_name] = prop_value;

                var current_style = getComputedStyle(object, null);
                var target_style = getComputedStyle(reference_element, null);
            }

            if (prop_name == 'ctm') {
                var ctm = object.getCTM();
                var curr = '{' + ctm.a + ', ' + 
                    ctm.b + ', ' + ctm.c + ', ' + ctm.d + ', ' + 
                    ctm.e + ', ' + ctm.f + '}';

                var target = prop_value;

            } else if (is_svg) {
                var target = target_style[prop_name].value;
                var curr = current_style[prop_name].value;
            } else {
                var target = target_style[output_prop_name];
                var curr = current_style[output_prop_name];
            }

            if (target) {
                var t = target.replace(/[^0-9.\s]/g, "");
            } else {
                var t = "";
            }

            if (curr) {
                var c = curr.replace(/[^0-9.\s]/g, "");
            } else {
                var c = "";
            }

            if (t.length == 0) {
                // Assume it's a word property so do an exact assert
                assert_equals(
                    curr, target, 
                    prop_name + " is not " + target + ", actually " + curr);
            } else {
                t = t.split(" ");
                c = c.split(" ");
                for (var x in t) {
                    assert_equals(
                        Number(c[x]), Number(t[x]), 
                        prop_name + " is not " + target + ", actually " + curr);
                }
            }
        }
        reference_element.parentNode.removeChild(reference_element);
    }
    window.assert_style = assert_style;

    /**
     * assert_transform(actual, expected, description)
     *    asserts that actual has the same styles as the dictionary given by
     *    expected.
     */
    function assert_transform(actual, expected, description)
    {
        var current = actual.attributes["style"].value;
        current = current.replace(/[;\s]/,"");
        // Get rid of the begining property name bit.
        current = current.split(":")[1];

        // FIXME(mithro): Using regex to parse CSS, yick...
        current = current.split(/[()]+/);
        expected = expected.split(/[()]+/);

        for (var x = 0; x < current.length - 1; x++)
        {
            // Compare property name
            assert_equals(
                current[x], expected[x], 
                "Property "+ x + " is not " + expected[x] + ", actually " + current[x]);
            x++;

            // Compare property values
            var c = current[x].split(",");
            var t = expected[x].split(",");
            for (var i in c)
            {
                assert_equals(
                    c[i], t[i],
                    "Property value "+ x-1 + "(" + i + ") is not " + t[i] + ", actually " + c[i]);
            }
        }
    }
    window.assert_transform = assert_transform;

    function assert_dom_style(index, query_selector, style)
    {
        var object = document.querySelectorAll(query_selector)[index];
        return assert_style(object, style);
    }
    window.assert_dom_style = assert_dom_style;


    // Generate a name from an assert function and the arguments.
    function generate_name(func, args)
    {
        var testName = "";

        var object = null;
        if (func == assert_dom_style) {
            object = document.querySelectorAll(args[1])[args[0]];
            testName += "("+args[1]+")["+args[0]+"] ";
        } else if (func == assert_style) {
            object = args[0];
        }

        if (object != null) {
            if (object.id) {
                testName += object.id + " ";
            } else {
                testName += "An anonymous " + object.tagName + " ";
            }
        }

        if (func == assert_dom_style) {
            testName += "has style ";
            testName += JSON.stringify(args[2]);
        } else if (func == assert_style) {
            testName += "has style ";
            testName += JSON.stringify(args[1]);
        } else { 
            testName += func.name;
            testName += "(";
            testName += JSON.stringify(args);
            testName += ")";
        }
        return testName;
    }
    window.generate_name = generate_name;

    // Override generate_at to generate a name if one isn't set.
    var test_harness_generate_tests = generate_tests;
    function generate_tests(func, args, properties)
    {
            // Generate names if they don't exist...
            forEach(args, function(x, i)
                {
                    if (x[0] == null) {
                         x[0] = generate_name(func, x.slice(1));
                    }
                });
            return test_harness_generate_tests(func, args, properties);
    }
    window.generate_tests = generate_tests;

})();
