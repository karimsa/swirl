/**
 * swirl.js - Swirl
 * Licensed under GPL-3.0.
 * Copyright (C) 2015 Karim Alibhai.
 **/

'use strict';

var dot = require('dot'),
    debounce = require('debounce'),
    vendor = (Array.prototype.slice.call(window.getComputedStyle(document.documentElement, '')).join('').match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o']))[1],
    pseudoStates = ['active','checked','disabled','empty','enabled','first-child','first-of-type','focus','hover','in-range','invalid','last-child','last-of-type','link','only-of-type','only-child','optional','out-of-range','read-only','read-write','required','root','target','valid','visited'],
    pseudoElements = ['after', 'before', 'first-letter', 'first-line', 'selection'],
    createMethod = function (property, withVendor) {
        return function (... values) {
            // convert from camel case back to proper property name
            if (property.indexOf('-') === -1) {
                property = property.split('').map(function (letter) {
                    return letter === letter.toUpperCase() ? '-' + letter.toLowerCase() : letter;
                }).join('');
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
    constructor () {
        this.tag = document.createElement('style'); // create a tag to use
        this.tag.setAttribute('type', 'text/css');
        document.head.appendChild(this.tag);
        
        this.map = {}; // create a map of styles
        this.changed = {}; // create a list of updated properties
        this.selectors = []; // manage a list of selectors to compile for
        this.selectorUpdated = false; // manage selector-recompiling
        
        this.compile = debounce(this.compile.bind(this), 16);
        this.rebuild = debounce(this.rebuild.bind(this), 16);
        
        // handle a template of rules
        this.rules = '{ }';
        /*var rules = '{ }';
        Object.defineProperty(this, 'rules', {
            get : () => rules,
            set : (val) => {
                rules = val;
                this.rebuild();
            }
        });*/
    }
    
    // define a property as having been updated, then compile
    update (property, value) {
        this.changed[property] = value;
        this.compile();
        
        return this;
    }
    
    // add properties for a specific state
    on (state) {
        var MyStyle = function () { Style.apply(this, arguments); };
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
                this.tag.innerHTML = '@media (' + state + ') {' + this.tpl(this.map) + '}';
            };
            
            for (var selector of this.selectors) style.apply(selector);
        }
        
        // return the next style
        return style;
    }
    
    // add a new compilation target then compile
    apply (selector) {
        this.selectors.push(selector);
        this.selectorUpdated = true;
        this.compile();
    }
    
    // get styles from value list
    styles (property, values) {
        values = values instanceof Array ? values : [values];
        return values.map(function (value) {
            return property + ':' + value;
        }).join(';');
    }
    
    // converts a css property to camel case
    key (property) {
        var key = property.split('-').filter((a) => a).map((word) => word[0].toUpperCase() + word.substr(1)).join('');
        return key[0].toLowerCase() + key.substr(1);
    }
    
    // rebuilds the template
    rebuild () {
        var tpl = dot.template(this.rules);
        this.tpl = function (map) {
            var data = {}, i;
            for (i in map) {
                if (map.hasOwnProperty(i)) {
                    data[this.key(i)] = this.styles(i, map[i]);
                }
            }
            return tpl(data);
        }.bind(this);
        this.render(this.map);
    }
    
    // render the template and inject it into the stylesheet
    render (data) {
        this.tag.innerHTML = this.tpl(this.map);
    }
    
    // compile and apply the styles
    compile () {
        // we don't want to bother compiling if
        // there are no selectors to be applying this
        // style to
        if (this.selectors.length > 0) {
                var changed = this.changed, rebuild = false;
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
        Style.prototype[property] = createMethod(property, withVendor);
    }
}

// expose
window.Style = Style;