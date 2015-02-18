describe('ngDjangoFormsetCtrl', function(){

  var controller,
    formset,
    container,
    totalInputEl,
    attrs = {
      formset: '_formset_template.html',
      formsetPrefix: 'foo',
      formsetCanDelete: true,
      formsetCanOrder: true
    },
    formsetInput = function(name, value) {
      var input = angular.element('<input>');
      input.prop('name', attrs.formsetPrefix + '-' + name);
      input.val(value || '');
      return input;
    },
    TEMPLATE = '<li data-fid="__prefix__">Foo Bar</li>';

  beforeEach(module('ngDjangoFormset'));

  beforeEach(inject(function($controller, $templateCache) {
    $templateCache.put(attrs.formset, TEMPLATE);
    controller = $controller('ngDjangoFormsetCtrl', {$attrs: attrs});
    // Setup the formset element
    totalInputEl = formsetInput('TOTAL_FORMS', '0');
    formset = angular.element('<section></section>');
    formset.append(totalInputEl);
    // Setup the formset container element
    container = angular.element('<ul></ul>');
    controller.__container__ = container;
  }));

  it('should define a controller', function() {
    expect(controller).to.be.defined;
  });

  it('should set variables from the attrs', function() {
    expect(controller.__template__).to.be.equal(TEMPLATE);
    expect(controller.__formsetprefix__).to.be.equal(attrs.formsetPrefix);
    expect(controller.__candelete__).to.be.equal(attrs.formsetCanDelete);
    expect(controller.__canorder__).to.be.equal(attrs.formsetCanOrder);
  });

  describe('#setup(element)', function() {

    it('should set the __formset__ element', function() {
      controller.setup(formset);
      expect(controller.__formset__).to.be.defined;
      expect(controller.__formset__).to.be.equal(formset);
    });

    it('should set the __template__', function() {
      controller.setup(formset);
      expect(controller.__template__).to.be.defined;
      expect(controller.__template__).to.be.equal(TEMPLATE);
    });

    it('should find the highest __fid__ from the formset`s children input',
      function(){
        var child = angular.element('<div></div>'),
          childFid = 8;
        // Add a input to child and add to children list
        child.append(formsetInput(childFid + '-foo'));
        controller.__children__.push(child);
        // Setup
        controller.setup(formset);
        expect(controller.__fid__).to.be.equal(childFid);
      }
    );

    it('should find the __totalforms__ element', function() {
      var totalFormsValue = '10';
      totalInputEl.val(totalFormsValue);

      controller.setup(formset);
      expect(controller.__totalforms__).to.be.defined;
      expect(controller.__totalforms__.val()).to.be.equal(totalFormsValue);
    });

    it('should find the __minforms__ element', function() {
      var minFormsValue = 1;
      formset.append(formsetInput('INITIAL_FORMS', minFormsValue));

      controller.setup(formset);
      expect(controller.__minforms__).to.be.equal(minFormsValue);
    });

    it('should find the __maxforms__ element', function() {
      var maxFormsValue = 50;
      formset.append(formsetInput('MAX_NUM_FORMS', maxFormsValue));

      controller.setup(formset);
      expect(controller.__maxforms__).to.be.equal(maxFormsValue);
    });

    it('should raise an error if __totalforms__ is not defined', function() {
      var badFormset = angular.element('<div><!-- No inputs here --></div>');
      expect(
        function() {
          controller.setup(badFormset);
        }
      ).to.throw(SyntaxError).and.to.throw(/TOTAL_FORMS/);
    });

    it('should raise an error if __container__ is not defined', function() {
      controller.__container__ = null;
      expect(function() {
        controller.setup(formset);
      }).to.throw(SyntaxError).and.to.throw(/formset\-container/);
    });

    it('should raise an error if __template__ is not defined', function() {
      controller.__template__ = null;
      expect(function() {
        controller.setup(formset);
      }).to.throw(SyntaxError).and.to.throw(/Template not found/);
    });
  });

  describe('#setupContainer(el)', function() {
    it('should set the __container__ variable', function() {
      var el = angular.element('<div></div>')
      controller.setupContainer(el);
      expect(controller.__container__).to.be.equal(el);
    });
  });

  describe('#update()', function() {
    beforeEach(function() {
      controller.setup(formset);
    });

    it('should update __totalforms__ value with current children length',
      function() {
        var lastChildrenLength = controller.__children__.length;
        controller.__children__.push(angular.element('<div></div>'));
        controller.update();

        var totalFormsValue = parseInt(controller.__totalforms__.val());
        expect(totalFormsValue).to.be.above(lastChildrenLength);
        expect(totalFormsValue).to.be.equal(lastChildrenLength + 1);
      }
    );
  });

  describe('#addFormset()', function() {
    beforeEach(function() {
      controller.setup(formset);
    });

    it('should increase __fid__', function() {
      var lastFid = angular.copy(controller.__fid__);
      controller.addFormset();
      expect(controller.__fid__).to.be.above(lastFid);
      expect(controller.__fid__).to.be.equal(lastFid + 1);
    });

    it('should replace any __prefix__ in the template with __fid__ value',
      function() {
        var child = controller.addFormset();
        expect(child.html()).to.not.match(/__prefix__/);
      }
    );

    it('should append/compile a new formset children to the container',
      function() {
        var child = controller.addFormset();
        expect(child.parent().html()).to.be.equal(container.html());
      }
    );
    it('should not add if __maxforms__ is reached', function() {
      controller.__maxforms__ = 0;
      controller.addFormset();
      expect(container.children().length).to.be.equal(0);
    });
  });

  describe('#removeFormset(element)', function() {
    var child, removeButton;

    beforeEach(inject(function($compile) {
      child = angular.element('<li data-fid="0">' +
        '<button>Remove</button>' +
        '<input id="id_foo-0-DELETE" name="foo-0-DELETE" type="checkbox">' +
        '</li>');
      removeButton = child.find('button');
      // Append to container
      container.append(child);
      // Setup the controller
      controller.setup(formset);
      controller.registerChild(child);
    }));

    it('should have child in the container', function() {
      expect(container.html()).to.be.ok;
    });

    it('should remove formset child', function() {
      child.attr('formset-child', '');
      controller.removeFormset(removeButton);
      expect(container.html()).to.be.equal('');
    });

    it('should find the children container with prefix data-*', function() {
      child.attr('data-formset-child', '');
      controller.removeFormset(removeButton);
      expect(container.html()).to.be.equal('');
    });

    it('should find the children container with prefix x-*', function() {
      child.attr('x-formset-child', '');
      controller.removeFormset(removeButton);
      expect(container.html()).to.be.equal('');
    });

    it('should not remove body tag', function() {
      var body = angular.element('<body></body>'),
        removeFn = sinon.spy(body, 'remove');
      controller.removeFormset(body);
      expect(removeFn.called).to.not.be.ok;
    });

    it('should not remove if __minforms__ is reached', function() {
      child.attr('formset-child', '');
      controller.__minforms__ = 1;
      controller.removeFormset(removeButton);
      expect(container.html()).to.not.be.equal('');
    });

    it('should hide formeset children and set delete input if __candelete__', function() {
      child.attr('formset-child', '');
      controller.__minforms__ = 1;
      controller.removeFormset(removeButton);
      expect(child.find('input[type=checkbox]').prop('checked')).to.be.true;
      expect(child.hasClass('deleted')).to.be.true;
    });

    it('should not hide formeset children and set delete input if __candelete__ === false', function() {
      child.attr('formset-child', '');
      controller.__minforms__ = 1;
      controller.__candelete__ = false;
      controller.removeFormset(removeButton);
      expect(child.find('input[type=checkbox]').prop('checked')).to.be.false;
      expect(child.hasClass('deleted')).to.be.false;
    });
  });

  describe('#registerChild(element)', function() {
    it('should add a children and update', function() {
      var child = sinon.mock(),
        update = sinon.stub(controller, 'update');

      controller.registerChild(child);
      expect(controller.__children__).to.include.members([child]);
      expect(update.calledOnce).to.be.ok;
    });
  });

  describe('#destroyChild', function() {
    it('should remove a children and update', function() {
      var child = sinon.mock(),
        update = sinon.stub(controller, 'update');

      controller.registerChild(child);
      controller.destroyChild(child);

      expect(controller.__children__).to.not.include.members([child]);
      expect(update.calledTwice).to.be.ok;
    });
  });
});
