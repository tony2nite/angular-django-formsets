/*!
 * AngularJS Django formsets directives v0.0.1 * http://hilios.github.io/angular-django-formset/
 * Copyright (c) 2015 Edson Hilios
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 */
angular.module("ngDjangoFormset", []);

angular.module("ngDjangoFormset").controller("ngDjangoFormsetCtrl", [ "$attrs", "$templateCache", "$compile", function($attrs, $templateCache, $compile) {
    var self = this;
    self.__fid__ = -1;
    self.__children__ = [];
    self.__template__ = $templateCache.get($attrs.formset) || "";
    self.__formsetprefix__ = $attrs.formsetPrefix || "form";
    self.__candelete__ = $attrs.hasOwnProperty("formsetCanDelete") || false;
    self.__canorder__ = $attrs.formsetCanOrder || false;
    self.__formset__ = null;
    self.__container__ = null;
    self.__totalforms__ = null;
    self.__minforms__ = 0;
    self.__maxforms__ = 1e3;
    self.setup = function(element) {
        self.__formset__ = element;
        if (self.__template__) {
            self.__template__ = self.__template__.replace(/^(\s|\n|\t){1,}/gi, "");
        }
        var fidRegexp = new RegExp(self.__formsetprefix__ + "\\-([0-9]{1,})", "i"), managementFormRegexp = new RegExp(self.__formsetprefix__ + "\\-([A-Z_]+)");
        angular.forEach(self.__children__, function(value, index) {
            var fid, inputName = value.find("input").prop("name");
            inputName = inputName.match(fidRegexp);
            if (inputName) {
                fid = parseInt(inputName[1]);
                if (fid > self.__fid__) {
                    self.__fid__ = fid;
                }
            }
        });
        angular.forEach(element.find("input"), function(value, index) {
            var input = angular.element(value), match = input.prop("name").match(managementFormRegexp);
            if (match) {
                switch (match[1]) {
                  case "TOTAL_FORMS":
                    self.__totalforms__ = input;
                    break;

                  case "INITIAL_FORMS":
                    self.__minforms__ = parseInt(input.val()) || self.__minforms__;
                    break;

                  case "MAX_NUM_FORMS":
                    self.__maxforms__ = parseInt(input.val()) || self.__maxforms__;
                    break;
                }
            }
        });
        if (!self.__template__) {
            throw new SyntaxError("Template not found");
        }
        if (!self.__totalforms__) {
            throw new SyntaxError("Could't find formset TOTAL_FORMS input, " + "check if you printed {{formset.management_form}}");
        }
        if (!self.__container__) {
            throw new SyntaxError("Formset container cound't be found, " + "please add formset-container to a child element");
        }
    };
    self.setupContainer = function(element) {
        self.__container__ = element;
    };
    self.update = function() {
        if (self.__totalforms__) {
            self.__totalforms__.val(self.__children__.length);
        }
    };
    self.indexOfChild = function(child) {
        var index = -1;
        for (var i = 0; i < self.__children__.length; i++) {
            var c = self.__children__[i];
            if (c[0] == child[0]) {
                index = i;
                break;
            }
        }
        return index;
    };
    self.addFormset = function() {
        if (self.__children__.length < self.__maxforms__) {
            self.__fid__ += 1;
            var element = angular.element(self.__template__.replace(/__prefix__/gi, self.__fid__));
            self.__container__.append(element);
            $compile(element)(self.__formset__.scope() || {});
            return element;
        }
    };
    self.removeFormset = function(element) {
        var child = element, isChild = function(child) {
            return child.attr("formset-child") !== undefined || child.attr("data-formset-child") !== undefined || child.attr("x-formset-child") !== undefined;
        };
        while (!isChild(child) && child.prop("tagName") !== "BODY") {
            child = child.parent();
        }
        if (child.prop("tagName") !== "BODY") {
            if (self.__children__.length > self.__minforms__) {
                try {
                    child.scope().$destroy();
                } catch (error) {} finally {
                    child.remove();
                }
            } else if (self.__candelete__ === true && self.__children__.length > 0) {
                var name = "#id_" + self.__formsetprefix__ + "-" + self.indexOfChild(child) + "-DELETE";
                var checkbox = child.find(name);
                if (checkbox.length > 0) {
                    checkbox.prop("checked", true);
                } else {
                    console.log("Couldn't find checkbox:" + name);
                }
                child.addClass("deleted");
            }
        } else {
            child = null;
        }
        return child;
    };
    self.registerChild = function(element) {
        self.__children__.push(element);
        self.update();
    };
    self.destroyChild = function(element) {
        var childIndex = self.__children__.indexOf(element);
        self.__children__.splice(childIndex, 1);
        self.update();
    };
} ]);

angular.module("ngDjangoFormset").directive("formset", function() {
    return {
        require: "formset",
        restrict: "A",
        scope: {},
        controller: "ngDjangoFormsetCtrl",
        link: function postLink(scope, element, attrs, controller) {
            controller.setup(element);
        }
    };
}).directive("formsetContainer", function() {
    return {
        require: "^formset",
        restrict: "A",
        link: function postLink(scope, element, attrs, controller) {
            controller.setupContainer(element);
        }
    };
}).directive("formsetChild", function() {
    return {
        require: "^formset",
        restrict: "A",
        scope: true,
        link: function postLink(scope, element, attrs, controller) {
            controller.registerChild(element);
            element.on("$destroy", function() {
                controller.destroyChild(element);
            });
        }
    };
}).directive("formsetAdd", function() {
    return {
        require: "^formset",
        restrict: "A",
        link: function postLink(scope, element, attrs, controller) {
            element.on("click", function(event) {
                event.preventDefault();
                controller.addFormset();
            });
            element.on("$destroy", function() {
                element.off("click");
            });
        }
    };
}).directive("formsetRemove", function() {
    return {
        require: "^formset",
        restrict: "A",
        link: function postLink(scope, element, attrs, controller) {
            element.on("click", function(event) {
                event.preventDefault();
                controller.removeFormset(element);
            });
        }
    };
});