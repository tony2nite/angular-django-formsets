angular.module('ngDjangoFormset')
.controller('ngDjangoFormsetCtrl', [
  '$attrs', '$templateCache', '$compile',
  function($attrs, $templateCache, $compile) {
    var self = this;

    self.__fid__ = -1;
    self.__children__ = [];
    self.__template__ = $templateCache.get($attrs.formset) || '';
    self.__formsetprefix__ = $attrs.formsetPrefix || 'form';
    self.__candelete__ = $attrs.hasOwnProperty('formsetCanDelete') || false;
    self.__canorder__ = $attrs.formsetCanOrder || false;

    self.__formset__ = null;
    self.__container__ = null;
    self.__totalforms__ = null;
    self.__minforms__ = 0;
    self.__maxforms__ = 1000;


    self.getFidForElement = function(element) {
      var fidRegexp = new RegExp(self.__formsetprefix__ +
                "\\-([0-9]{1,})", "i");
      var fid = -1;
      var inputName = element.find('input').prop('name');
      if(inputName) {
        inputName = inputName.match(fidRegexp);
        if (inputName) {
          fid = parseInt(inputName[1]);
        }
      }
      return fid;
    };

    self.setup = function(element) {
      self.__formset__ = element;
      // Removes leading whitespaces from template, hence jqLite can't
      // parse the element with them.
      if(self.__template__) {
        self.__template__ = self.__template__.replace(/^(\s|\n|\t){1,}/gi, '');
      }
      // Grab management form elements
      var managementFormRegexp = new RegExp(self.__formsetprefix__ +
          "\\-([A-Z_]+)");
      // Find the higher __fid__
      angular.forEach(self.__children__, function(value, index) {
        var fid = self.getFidForElement(value);
        if (fid > -1 && fid > self.__fid__) {
          self.__fid__ = fid;
        }
      });
      // Find formset management fields
      angular.forEach(element.find('input'), function(value, index) {
        var input = angular.element(value),
          match = input.prop('name').match(managementFormRegexp);
        if(match) {
          switch(match[1]) {
            case 'TOTAL_FORMS':
              self.__totalforms__ = input;
              break;
            case 'INITIAL_FORMS':
              self.__minforms__ = parseInt(input.val()) || self.__minforms__;
              break;
            case 'MAX_NUM_FORMS':
              self.__maxforms__ = parseInt(input.val()) || self.__maxforms__;
              break;
          }
        }
      });
      // If template wasn't found throw an error
      if(!self.__template__) {
        throw new SyntaxError("Template not found");
      }
      // If __totalforms__ input wasn't found throw an error
      if(!self.__totalforms__) {
        throw new SyntaxError("Could't find formset TOTAL_FORMS input, " +
          "check if you printed {{formset.management_form}}");
      }
      // If __container__ wans't set throw an error
      if(!self.__container__) {
        throw new SyntaxError("Formset container cound't be found, " +
          "please add formset-container to a child element");
      }
    }

    self.setupContainer = function(element) {
      self.__container__ = element;
    }

    self.update = function() {
      if (self.__totalforms__) {
        self.__totalforms__.val(self.__children__.length);
      }
    }

    self.indexOfChild = function(child) {
        var index = -1;
        for (var i = 0; i < self.__children__.length; i++) {
            var c = self.__children__[i];
            if (c[0] == child[0]) {
                index = i;
                break;
            }
        };
        return index;
    }

    self.addFormset = function() {
      if(self.__children__.length < self.__maxforms__) {
        // Setup a new element from template
        self.__fid__ += 1;
        var element = angular.element(
          self.__template__.replace(/__prefix__/gi, self.__fid__)
        );
        element.__fid__ = self.__fid__;

        // Add the template to container and children's list
        self.__container__.append(element);
        // Compile after append to inherits controller
        $compile(element)(self.__formset__.scope() || {});
        return element;
      }
    }

    self.removeFormset = function(element) {
      var child = element,
        isChild = function(child) {
          return child.attr('formset-child') !== undefined ||
            child.attr('data-formset-child') !== undefined ||
            child.attr('x-formset-child') !== undefined;
        };
      // Find the child container
      while(!isChild(child) && child.prop('tagName') !== 'BODY') {
        child = child.parent();
      }
      if(child.prop('tagName') !== 'BODY') {
        var indexToRemove = self.getFidForElement(child);
        if (indexToRemove == -1) {
          indexToRemove = self.__children__.length;
        }
        if(indexToRemove >= self.__minforms__) {
          try {
            child.scope().$destroy();
          } catch(error) {
            // ...
          } finally {
            child.remove();
          }
        } else if (self.__candelete__ === true && self.__children__.length > 0) {
          self.markDeleted(child);
        }
      } else {
        child = null;
      }
      return child;
    }

    self.registerChild = function(element) {
      self.__children__.push(element);
      self.update();

      var checkbox = self.getDeleteCheckboxForChild(element);
      if (checkbox && checkbox.prop("checked") && self.__candelete__ === true) {
        self.markDeleted(element);
      }
    }

    self.destroyChild = function(element) {
      var childIndex = self.__children__.indexOf(element);
      self.__children__.splice(childIndex, 1);
      self.update();
    }

    self.getDeleteCheckboxForChild = function(child) {
      var checkbox;
      var index = self.indexOfChild(child);

      if (index >= 0 && child.find) {
        var name = "#id_" + self.__formsetprefix__ + "-" + index + "-DELETE";
        checkbox = child.find(name);
        if (checkbox.length == 0) {
          checkbox = false;
        }
      }
      return checkbox;
    }

    self.markDeleted = function(child) {
        var checkbox = self.getDeleteCheckboxForChild(child);
        if (checkbox) {
            checkbox.prop("checked", true);
        } else {
            console.log("Couldn't find checkbox:" + name);
        }
        child.addClass("deleted");
    }
  }
]);
