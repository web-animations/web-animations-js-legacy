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
     * These functions come from testharness.js but can't be access because
     * testharness uses an anonymous function to hide them.
     **************************************************************************
     */
    function forEach (array, callback, thisObj)
    {
        for (var i=0; i<array.length; i++)
        {
            if (array.hasOwnProperty(i))
            {
                callback.call(thisObj, array[i], i, array);
            }
        }
    }

    /* ********************************************************************* */

    /**
     * Code for dealing with javascript and other parsing errors.
     */
    var pageerror_test = async_test("Page contains no errors");

    function pageerror_onerror_callback(evt) {
        var msg = "Error in " + evt.filename + "\n" +
                  "Line " + evt.lineno + ": " + evt.message + "\n";

        pageerror_test.is_done = true;
        pageerror_test.step(function() { 
            assert_true(false, msg);
        });
        pageerror_test.is_done = false;
    };
    addEventListener('error', pageerror_onerror_callback);

    var pageerror_tests;
    function pageerror_othertests_finished(test, harness) {
        if (harness == null && pageerror_tests == null)
            return;

        if (pageerror_tests == null)
            pageerror_tests = harness;

        if (pageerror_tests.all_loaded && pageerror_tests.num_pending == 1) {
            pageerror_test.done();
        }
    }
    add_result_callback(pageerror_othertests_finished);
    addEventListener('load', pageerror_othertests_finished);

    /* ********************************************************************* */

    /**
     * Helper code for dealing with settings / options parsed in via the URL.
     */

    //addEventListener('hashchange', '');

    // FIXME: Javascript must have this functionality?
    function _setting_convert(value)
    {
        if (value == "true")
            return true;
        if (value == "false")
            return false;

        if (/^[0-9]+$/.test(value))
            return parseInt(value);

        if (/^[0-9.]+$/.test(value))
            return parseFloat(value);

        return value;
    }

    var testharness_uri_settings = null;
    function setting_get(name, default_)
    {
        if (testharness_uri_settings === null) {
            testharness_uri_settings = {};

            // Support both the query string and the hash part
            var setting_string = window.location.search.substring(1) + '&' + window.location.hash.substring(1);

            var vars = setting_string.split('&');
            for (var i = 0; i < vars.length; i++) {
                if (vars[i].length <= 0)
                    continue;

                var key = null;
                var value = null;

                // Support the "blah=true" and "blah=testing" formats
                if (vars[i].indexOf('=') > 0) {
                    var pair = vars[i].split('=');
                    key = decodeURIComponent(pair[0]);
                    value = _setting_convert(decodeURIComponent(pair[1]));

                // Support the "blah" and "noblah" formats
                } else {
                    key = vars[i];
                    value = true;
                    if (key.substring(0, 2) == 'no') {
                        key = key.substring(2);
                        value = false;
                    }
                }
                testharness_uri_settings[key] = value;
            }
        }

        // URI always overrides any other settings
        if (testharness_uri_settings.hasOwnProperty(name)) {
            return testharness_uri_settings[name];
        }

        // Check flags on the script element
        // IE <script src="../bootstrap.js" nochecks>
        // IE <script src="../bootstrap.js" checks="false" delay="5.0">

        // FIXME: This is specific to our setup, make it generic
        var script_tag = document.querySelector("script[src$='bootstrap.js']");

        var possible_value = script_tag.getAttribute(name);
        if (possible_value !== null) {
            if (possible_value.length > 0) {
                return _setting_convert(possible_value);
            } else {
                return true;
            }
        }

        var novalue = script_tag.getAttribute('no'+name);
        if (novalue !== null) {
            if (novalue.length > 0) {
                //FIXME: Do something sensible here?
            }
            return false;
        }

        return default_;
    }
    window.testharness_setting_get = setting_get;

    function setting_set(key, value, go)
    {
        if (typeof go === 'undefined' || go === null)
            go = true;

        // Remove setting if it is already set
        var replace_regex = new RegExp('(^|[&?#])(no'+key+'|'+key+'|'+key+'=[^&]+)(&|$)');
        var newhref =  window.location.href.replace(replace_regex, "$1");

        console.log(window.location.href, replace_regex, newhref);

        // FIXME: Should we use the hash or the query string?
        if (newhref.indexOf('?') < 0) {
            newhref += '?';
        }

        // Append the setting
        if (value === true) {
            newhref += "&"+key;
        } else if (value === false) {
            newhref += "&no"+key;
        } else {
            newhref += "&"+key+"="+value;
        }

        if (go)
            window.location.href = newhref;
        else
            return newhref;
    }
    window.testharness_setting_set = setting_set;

    function setting_register(group, node) {
        var settingnode = document.getElementById('settings');

        var groupname = group.replace(/[^a-zA-Z]*/g, '_');

        var groupnode = settingnode.querySelector('#settings_'+groupname);
        if (groupnode == null) {
            groupnode = document.createElement('div');
            groupnode.id = '#settings_' + group;
            settingnode.appendChild(groupnode);

            var title = document.createElement('h6');
            title.innerText = group + ":";
            groupnode.appendChild(title);
        }
        groupnode.appendChild(node);
    }
    window.testharness_setting_register = setting_register;

    (function() {
        var b = document.createElement('button');
        b.innerText = "Disable";
        b.onclick = function() {
            testharness_setting_set('testharness', 'disabled');
        }
        testharness_setting_register("Test Harness", b);
    })();

    /* ********************************************************************* */
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

    var features = (
        function ()
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
     * Figure out a useful name for an element.
     *
     * @param {Element} element Element to get the name for.
     *
     * @private
     */
    function _element_name(element)
    {
        if (element.id) {
            return element.id;
        } else {
            return "An anonymous " + element.tagName;
        }
    }

    /**
     * Get the style for a given element.
     *
     * @param {Array.<Object.<string, string>>|Object.<string, string>} style
     *     Either;
     *      * A list of dictionaries, each node returned is checked against the
     *        associated dictionary, or
     *      * A single dictionary, each node returned is checked against the
     *        given dictionary.
     *     Each dictionary should be of the form {style_name: style_value}.
     *
     * @private
     */
    function _assert_style_get(style, i)
    {
        if (typeof style[i] === 'undefined') {
            return style;
        } else {
            return style[i];
        }
    }

    /**
     * asserts that actual has the same styles as the dictionary given by
     * expected.
     *
     * @param {Element} object DOM node to check the styles on
     * @param {Object.<string, string>} styles Dictionary of {style_name: style_value} to check
     *     on the object.
     * @param {String} description Human readable description of what you are
     *     trying to check.
     *
     * @private
     */
    function _assert_style_element(object, style, description)
    {
        // Create an element of the same type as testing so the style can be applied
        // from the test. This is so the css property (not the -webkit-does-something
        // tag) can be read.
        var reference_element = (object.namespaceURI == svg_namespace_uri) ?
            document.createElementNS(svg_namespace_uri, object.nodeName) :
            document.createElement(object.nodeName);
        reference_element.style.position = "absolute";
        if (object.parentNode) {
            object.parentNode.appendChild(reference_element);
        }

        try {
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
        } finally {
          if (reference_element.parentNode) {
              reference_element.parentNode.removeChild(reference_element);
          }
        }
    }

    /**
     * asserts that elements in the list have given styles.
     *
     * @param {Array.<Element>} objects List of DOM nodes to check the styles on
     * @param {Array.<Object.<string, string>>|Object.<string, string>} style
     *     See _assert_style_get for information.
     * @param {String} description Human readable description of what you are
     *     trying to check.
     *
     * @private
     */
    function _assert_style_element_list(objects, style, description)
    {
        var error = '';
        forEach(objects, function(object, i)
        {
            try {
                _assert_style_element(
                    object, _assert_style_get(style, i),
                    description + " " + _element_name(object)
                    );
            } catch (e) {
                if (error) {
                    error += '; ';
                }
                error += _element_name(object) + ' at index ' + i + ' failed ' + e.message + '\n';
            }
        });
        if (error) {
            throw error;
        }
    }

    /**
     * asserts that elements returned from a query selector have a list of styles.
     *
     * @param {string} qs A query selector to use to get the DOM nodes.
     * @param {Array.<Object.<string, string>>|Object.<string, string>} style
     *     See _assert_style_get for information.
     * @param {String} description Human readable description of what you are
     *     trying to check.
     *
     * @private
     */
    function _assert_style_queryselector(qs, style, description)
    {
        var objects = document.querySelectorAll(qs);
        assert_true(objects.length > 0, description +
            ' is invalid, no elements match query selector: ' + qs);
        _assert_style_element_list(objects, style, description);
    }

    /**
     * asserts that elements returned from a query selector have a list of styles.
     *
     * Assert the element with id #hello is 100px wide;
     *     assert_styles(document.getElementById('hello'), {'width': '100px'})
     *     assert_styles('#hello'), {'width': '100px'})
     *
     * Assert all divs are 100px wide;
     *     assert_styles(document.getElementsByTagName('div'), {'width': '100px'})
     *     assert_styles('div', {'width': '100px'})
     *
     * Assert all objects with class "red" are 100px wide;
     *     assert_styles(document.getElementsByClassName('red'), {'width': '100px'})
     *     assert_styles('.red', {'width': '100px'})
     *
     * Assert first div is 100px wide, second div is 200px wide;
     *     assert_styles(document.getElementsByTagName('div'),
     *                   [{'width': '100px'}, {'width': '200px'}])
     *     assert_styles('div',
     *                   [{'width': '100px'}, {'width': '200px'}])
     *
     * @param {string|Element|Array.<Element>} objects Either;
     *      * A query selector to use to get DOM nodes,
     *      * A DOM node.
     *      * A list of DOM nodes.
     * @param {Array.<Object.<string, string>>|Object.<string, string>} style
     *     See _assert_style_get for information.
     */
    function assert_styles(objects, style, description)
    {
        switch(typeof objects) {
        case "string":
            _assert_style_queryselector(objects, style, description);
            break;

        case "object":
            if (objects instanceof Array || objects instanceof NodeList) {
                _assert_style_element_list(objects, style, description);
            } else if (objects instanceof Element) {
                _assert_style_element(objects, style, description);
            } else {
                throw new Error("Expected Array, NodeList or Element but got " + objects);
            }
            break;
        }
    }

    window.assert_styles = assert_styles;
})();
// vim: set expandtab shiftwidth=4 tabstop=4:
