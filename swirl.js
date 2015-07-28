/**
 * swirl.js - Swirl
 * Licensed under GPL-3.0.
 * Copyright (C) 2015 Karim Alibhai.
 **/
'use strict';

import dot from 'dot';
import debounce from 'debounce';
import { EventEmitter } from 'events';

var vendor = (Array.prototype.slice.call(window.getComputedStyle(document.documentElement, '')).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1],
    pseudoStates = ['active', 'checked', 'disabled', 'empty', 'enabled', 'first-child', 'first-of-type', 'focus', 'hover', 'in-range', 'invalid', 'last-child', 'last-of-type', 'link', 'only-of-type', 'only-child', 'optional', 'out-of-range', 'read-only', 'read-write', 'required', 'root', 'target', 'valid', 'visited'],
    pseudoElements = ['after', 'before', 'first-letter', 'first-line', 'selection'],
    createMethod = function(property, withVendor) {
        return function(...values) {
            // convert from camel case back to proper property name
            if (property.indexOf('-') === -1) {
                property = property.split('').map((letter) => letter === letter.toUpperCase() ? '-' + letter.toLowerCase() : letter).join('');
            }

            if (withVendor) {
                // fallbacks are not supported for properties
                // that have vendor prefixes
                var options = values[1] || {};

                // update the value, prefer vendor-specified value
                values = options[vendor] || values;

                // update the property name
                property = '-' + vendor + '-' + property;
            } else {
                // we want to apply these in reverse order
                // because we want the fallbacks to preceed
                // the actual value
                values = values.reverse();
            }

            // request value update
            return this.update(property, values);
        };
    };

// make dot more handlebars flavoured
var ptn = dot.templateSettings.interpolate;
dot.templateSettings.interpolate = dot.templateSettings.evaluate;
dot.templateSettings.evaluate = ptn;

class Style {
    constructor() {
        this.tag = document.createElement('style'); // create a tag to use
        this.tag.setAttribute('type', 'text/css');
        document.head.appendChild(this.tag);

        this.rules = {}; // a map of attached rules
        this.lastCompiled = {}; // a map of last compiled rules
        this.callbacks = {}; // a map of attached callbacks
        this.template = '';
        this.tpl = dot.template('');

        // a debounced updater
        this.update = debounce(function() {
            this.tag.innerHTML = this.tpl(this.lastCompiled);
        }.bind(this), 16);
    }

    attach(rule) {
        this.rules[rule.id] = rule;
        this.lastCompiled[rule.id] = '';
        this.template += '{{it["' + rule.id + '"]}}';
        this.tpl = dot.template(this.template);
        this.callbacks[rule.id] = function(data) {
            this.lastCompiled[rule.id] = data;
            this.update();
        }.bind(this);
        rule.events.addListener('rendered', this.callbacks[rule.id]);

        this.update();
    }

    dettach(rule) {
        this.template = this.template.replace('{{' + rule.id + '}}', '');
        rule.events.removeListener('rendered', this.callbacks[rule.id]);

        delete this.rules[rule.id];
        delete this.lastCompiled[rule.id];
        delete this.callbacks[rule.id];

        this.update();
    }
}

class Rule {
    constructor() {
        this.id = +new Date();
        this.events = new EventEmitter();

        this.rules = '{ }'; // handle a template of rules
        this.map = {}; // create a map of styles
        this.changed = {}; // create a list of updated properties
        this.selectors = []; // manage a list of selectors to compile for
        this.selectorUpdated = false; // manage selector-recompiling

        this.rebuild = debounce(function() {
            var tpl = dot.template(this.rules);
            this.tpl = function(map) {
                var data = {},
                    i;
                for (i in map) {
                    if (map.hasOwnProperty(i)) {
                        data[this.key(i)] = this.styles(i, map[i]);
                    }
                }
                return tpl(data);
            }.bind(this);
            this.render(this.map);
        }.bind(this), 16);

        this.compile = debounce(function() {
            // we don't want to bother compiling if
            // there are no selectors to be applying this
            // style to
            if (this.selectors.length > 0) {
                var changed = this.changed,
                    rebuild = false;
                this.changed = {};

                // if first compile, create an empty ruleset.
                // otherwise update selectors of existing ruleset.
                if (this.rules !== '{ }') {
                    if (this.selectorUpdated) {
                        this.rules = this.selectors.join(',') + this.rules.substr(this.rules.indexOf('{'));
                        this.selectorUpdated = false;
                        rebuild = true;
                    }
                } else {
                    this.rules = this.selectors.join(',') + '{ }';
                    rebuild = true;
                }

                // update every property in the stylesheet
                for (var property in changed) {
                    if (changed.hasOwnProperty(property)) {
                        if (this.map.hasOwnProperty(property)) {
                            this.map[property] = changed[property];
                        } else {
                            this.map[property] = changed[property];
                            this.rules = this.rules.substr(0, this.rules.length - 1) + '{{it.' + this.key(property) + '}};}';
                            rebuild = true;
                        }
                    }
                }

                if (rebuild) this.rebuild();
                else this.render(this.map);
            }
        }.bind(this), 16);
    }

    // define a property as having been updated, then compile
    update(property, value) {
        this.changed[property] = value;
        this.compile();

        return this;
    }

    // add properties for a specific state
    on(state) {
        class MyStyle extends Style {
            constructor () {
                super();
            }
        }
        
        MyStyle.prototype = this.constructor.prototype;
        var style = new MyStyle();

        // for pseudo-classes, we just add all selectors
        // with the class appended
        if (pseudoStates.indexOf(state) !== -1) {
            for (var selector of this.selectors) {
                style.apply(selector + ':' + state);
            }
        } else if (pseudoElements.indexOf(state) !== -1) {
            for (var selector of this.selectors) {
                style.apply(selector + '::' + state);
            }
        } else {
            style.render = function () {
                this.events.emit('rendered', '@media (' + state + ') {' + this.tpl(this.map) + '}')
            };
            for (var selector of this.selectors) style.apply(selector);
        }

        // return the next style
        return style;
    }

    // add a new compilation target then compile
    apply(selector) {
        this.selectors.push(selector);
        this.selectorUpdated = true;
        this.compile();
    }

    // get styles from value list
    styles(property, values) {
        values = values instanceof Array ? values : [values];
        return values.map((value) => property + ':' + value).join(';');
    }

    // converts a css property to camel case
    key(property) {
        var key = property.split('-').filter((a) => a).map((word) => word[0].toUpperCase() + word.substr(1)).join('');
        return key[0].toLowerCase() + key.substr(1);
    }

    // render the template and inject it into the stylesheet
    render(data) {
        this.events.emit('rendered', this.tpl(this.map));
    }
}

// add methods for all supported CSS properties
var skip = ['x', 'y', 'tag'];
for (var property in document.body.style) {
    if (document.body.style.hasOwnProperty(property) && skip.indexOf(property) === -1) {
        var withVendor = property.length > vendor.length && property.substr(0, vendor.length) === vendor;

        // we want the name without the vendor prefix
        if (withVendor) {
            property = property.substr(vendor.length);
            property = property[0].toLowerCase() + property.substr(1);
        }

        // create the method
        Rule.prototype[property] = createMethod(property, withVendor);
    }
}

// expose
window.Style = Style;
window.Rule = Rule;