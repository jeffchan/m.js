describe('m.module()', function () {
  var module = m.module;
  var Module = module.Module;
  var ModuleFactory = module.ModuleFactory;
  var ModuleRegistry = module.ModuleRegistry;

  beforeEach(function () {
    this.let('factory', function () {
      return (new module.ModuleFactory('test')).build();
    });
    this.let('element', function () {
      return document.createElement('div');
    });
    this.let('instance', function () {
      return this.factory.create({el: this.element});
    });
    this.let('fixture', function () {
      return document.createElement('div');
    });

    document.body.appendChild(this.fixture);
  });

  afterEach(function () {
    this.fixture.parentNode.removeChild(this.fixture);
  });

  it('forwards the call on to .define()', function () {
    var target = sinon.stub(module, 'define');
    var methods = {};
    module('test', methods);

    assert.called(target);
    assert.calledOn(target, module);
    assert.calledWith(target, 'test', methods);

    target.restore();
  });

  it('has all the properties from a ModuleRegistry instance', function () {
    var registry = new ModuleRegistry();
    for (var prop in registry) {
      assert.property(module, prop);
    }
  });

  describe('ModuleRegistry', function () {
    beforeEach(function () {
      this.let('moduleRegistry', function () {
        return new m.module.ModuleRegistry();
      });
    });

    describe('.define()', function () {
      it('adds a new item to the module.registry', function () {
        this.moduleRegistry.define('test', {});

        var test = this.moduleRegistry.registry.test;
        assert.instanceOf(test, ModuleFactory);
      });

      it('creates a new ModuleFactory instance', function () {
        var instance = new ModuleFactory('name');
        var target = sinon.stub(module, 'ModuleFactory').returns(instance);

        this.moduleRegistry.define('name');
        assert.calledWithNew(target);
        assert.calledWith(target, 'name', this.moduleRegistry.find);

        target.restore();
      });

      it('passes the methods into the ModuleFactory instance', function () {
        var methods = {method1: 'method1'};
        var instance = new ModuleFactory('name');
        var target = sinon.stub(instance, 'methods');

        sinon.stub(module, 'ModuleFactory').returns(instance);

        this.moduleRegistry.define('name', methods);
        assert.called(target);
        assert.calledWith(target, {method1: 'method1'});

        module.ModuleFactory.restore();
      });

      it('throws an exception if the module is already defined', function () {
        this.moduleRegistry.define('name', this.factory);
        assert.throws(function () {
          this.moduleRegistry.define('name', this.factory);
        }.bind(this));
      });

      it('returns the newly created object', function () {
        var instance = new ModuleFactory('name');
        var target = sinon.stub(module, 'ModuleFactory').returns(instance);
        assert.equal(this.moduleRegistry.define('name', this.factory), instance);
        target.restore();
      });
    });

    describe('.find()', function () {
      beforeEach(function () {
        this.let('example', new ModuleFactory('example'));
        this.moduleRegistry.registry.example = this.example;
      });

      it('finds an item in the module registry', function () {
        assert.equal(this.moduleRegistry.find('example'), this.example);
      });

      it('returns null if no module is found', function () {
        assert.isNull(this.moduleRegistry.find('non-existant'));
      });
    });

    describe('.create()', function () {
      it('creates a new instance of the module with the element', function () {
        this.moduleRegistry.define('my-new-module');
        var element = document.createElement('div');
        var options = {batman: 'two-face'};
        var result  = this.moduleRegistry.create('my-new-module', element, options);
        assert.equal(result.el, element);
        assert.equal(result.type(), 'my-new-module');
        assert.equal(result.options.batman, 'two-face');
      });
    });

    describe('.initialize()', function () {
      beforeEach(function () {
        this.let('element1', m.$('<div data-test1>').appendTo(this.fixture));
        this.let('element2', m.$('<div data-test1>').appendTo(this.fixture));
        this.let('element3', m.$('<div data-test2>').appendTo(this.fixture));

        this.let('test1', function () {
          return new ModuleFactory('test1', {});
        });

        // Add test1 to the registry.
        this.moduleRegistry.registry = {
          test1: this.test1
        };

        this.let('target', sinon.stub(this.moduleRegistry, 'instance'));
      });

      afterEach(function () {
        this.target.restore();
      });

      it('finds all elements with the `data-*` attribute', function () {
        this.moduleRegistry.initialize(this.fixture);
        assert.called(this.target);
      });

      it('skips modules that are not functions', function () {
        this.moduleRegistry.initialize(this.fixture);
        assert.calledTwice(this.target);
      });

      it('calls module.instance() with the element and factory', function () {
        this.moduleRegistry.initialize(this.fixture);
        assert.calledWith(this.target, this.test1, this.element1[0]);
        assert.calledWith(this.target, this.test1, this.element2[0]);
      });

      describe('', function () {
        beforeEach(function () {
          this.let('delegate', sinon.stub(this.moduleRegistry, 'delegate'));
        });

        afterEach(function () {
          this.delegate.restore();
        });

        it('delegates initilization to the document if events are provided', function () {
          this.test1.events = [{}];
          this.moduleRegistry.initialize(this.fixture);
          assert.called(this.delegate);
        });

        it('does not initialize the module if it is has been deferred', function () {
          this.test1.events = [{}];
          this.moduleRegistry.initialize(this.fixture);
          assert.notCalled(this.target);
        });
      });

      it('returns the module object', function () {
        assert.equal(this.moduleRegistry.initialize(), this.moduleRegistry);
      });
    });

    describe('.instance()', function () {
      beforeEach(function () {
        this.element = document.createElement('div');
        this.factory = new ModuleFactory('test');
        this.factory.options = this.defaults = {test1: 'a', test2: 'b', test3: 'c'};

        this.sandbox = {
          i18n: {
            translate: sinon.spy()
          }
        };
        sinon.stub(m, 'sandbox').returns(this.sandbox);

        this.module = Module.extend();
        this.instance = new this.module({el: this.element});

        sinon.stub(this.module, 'create', function () {
          return this.instance;
        }.bind(this));
        sinon.stub(this.factory, 'build').returns(this.module);

        this.extractedOptions = {test1: 1, test2: 2};
        sinon.stub(this.factory, 'extract').returns(this.extractedOptions);
      });

      afterEach(function () {
        m.sandbox.restore();
        this.factory.extract.restore();
      });

      it('extract the options from the element', function () {
        this.moduleRegistry.instance(this.factory, this.element);

        assert.called(this.factory.extract);
        assert.calledWith(this.factory.extract, this.element);
      });

      it('not modify the defaults object', function () {
        var clone = _.extend({}, this.defaults);
        this.moduleRegistry.instance(this.factory, this.element);

        assert.deepEqual(this.defaults, clone);
      });

      it('create a sandbox object', function () {
        this.moduleRegistry.instance(this.factory, this.element);
        assert.called(m.sandbox);
      });

      it('initialize the module factory with the sandbox, options and translate function', function () {
        this.moduleRegistry.instance(this.factory, this.element);

        assert.called(this.module.create);
        assert.calledWith(this.module.create, _.extend({}, this.extractedOptions, {
          el: this.element,
          sandbox: this.sandbox
        }));
      });

      it('calls the .run() method', function () {
        var target = sinon.stub(this.instance, 'run');
        this.moduleRegistry.instance(this.factory, this.element);

        assert.called(target);
      });

      it('listens for the remove event and unbinds the listeners', function () {
        var target = sinon.stub(this.moduleRegistry, 'removeInstance');
        this.moduleRegistry.instance(this.factory, this.element);

        this.instance.emit('remove');
        assert.called(target);
        assert.calledWith(target, this.instance);

        target.restore();
      });

      it('it adds the instance to the module cache', function () {
        var target = sinon.stub(this.moduleRegistry, 'addInstance');
        this.moduleRegistry.instance(this.factory, this.element);

        assert.called(target);
        assert.calledWith(target, this.instance);

        target.restore();
      });

      it('simply calls run() if the module already exists', function () {
        this.moduleRegistry.instances.test = [this.instance];

        var target = sinon.stub(this.instance, 'run');
        this.moduleRegistry.instance(this.factory, this.element);

        assert.called(target);
        assert.notCalled(this.factory.build);
      });

      it('returns the newly created instance', function () {
        var instance = this.moduleRegistry.instance(this.factory, this.element);
        assert.instanceOf(instance, Module);
      });
    });

    describe('.delegate()', function () {
      beforeEach(function () {
        this.let('factory', new ModuleFactory('test'));
        this.let('events', [{on: 'click'}, {on: 'keypress'}]);

        this.factory.events = this.events;

        this.let('el', document.createElement('div'));
        this.el.setAttribute('data-test', '');
        document.body.appendChild(this.el);

        this.let('target', sinon.stub(this.moduleRegistry, 'delegateHandler'));
      });

      afterEach(function () {
        document.body.removeChild(this.el);
      });

      it('registers an event handler on the document for each event', function () {
        this.moduleRegistry.delegate(this.factory);
        $(this.el).trigger('click');
        $(this.el).trigger('keypress');
        assert.calledTwice(this.target);
      });

      it('passes in the factory and options as data properties of the event', function () {
        this.moduleRegistry.delegate(this.factory);
        $(this.el).trigger('click');
        assert.calledWith(this.target, this.factory, this.events[0], sinon.match.object);
      });

      it('sets the `hasDelegated` flag on the factory', function () {
        this.moduleRegistry.delegate(this.factory);
        assert.isTrue(this.factory.hasDelegated);
      });

      it('does nothing if the `hasDelegated` flag is set on the factory', function () {
        this.factory.hasDelegated = true;
        this.moduleRegistry.delegate(this.factory);
        $(this.el).trigger('click');
        assert.notCalled(this.target);
      });
    });

    describe('.delegateHandler', function () {
      beforeEach(function () {
        this.let('element', document.createElement('div'));
        this.let('factory', new ModuleFactory('test'));
        this.let('event', function () {
          var event = _.clone(m.$.Event('click'));
          event.currentTarget = this.element;
          event.preventDefault = sinon.spy();
          return event;
        });

        this.let('target', sinon.stub(this.moduleRegistry, 'instance'));
      });

      it('instantiates the module with the factory and current event target', function () {
        this.moduleRegistry.delegateHandler(this.factory, {}, this.event);
        assert.calledWith(this.target, this.factory, this.element);
      });

      it('prevents the default event action', function () {
        this.moduleRegistry.delegateHandler(this.factory, {}, this.event);
        assert.called(this.event.preventDefault);
      });

      it('does not prevent the default event action if options.preventDefault is false', function () {
        this.moduleRegistry.delegateHandler(this.factory, {preventDefault: false}, this.event);
        assert.notCalled(this.event.preventDefault);
      });

      it('does not try to call options.callback if it is not a function', function () {
        var context = this;
        [null, undefined, 'string', 10, false, true].forEach(function (value) {
          assert.doesNotThrow(function () {
            context.moduleRegistry.delegateHandler(context.factory, {callback: value}, context.event);
          });
        });
      });

      it('does nothing if the meta key is held down', function () {
        this.event.metaKey = true;
        this.moduleRegistry.delegateHandler(this.factory, {}, this.event);
        assert.notCalled(this.target);
      });
    });

    describe('.findInstance()', function () {
      it('finds an instance for the factory and element provided', function () {
        this.moduleRegistry.instances.test = [this.instance];
        var target = this.moduleRegistry.findInstance(this.factory, this.element);
        assert.strictEqual(target, this.instance);
      });

      it('returns null if no instance can be found', function () {
        var target = this.moduleRegistry.findInstance(this.factory, this.element);
        assert.isNull(target);
      });
    });

    describe('.addInstance()', function () {
      it('adds the instance to the module.instances cache', function () {
        var target = this.moduleRegistry.addInstance(this.instance);
        assert.deepEqual(this.moduleRegistry.instances.test, [this.instance]);
      });

      it('creates the array if it does not already exist', function () {
        var target = this.moduleRegistry.addInstance(this.instance);
        assert.deepEqual(this.moduleRegistry.instances.test, [this.instance]);
      });
    });

    describe('.removeInstance()', function () {
      beforeEach(function () {
        this.moduleRegistry.instances.test = [this.instance];
      });

      it('removes the instance from the cache', function () {
        this.moduleRegistry.removeInstance(this.instance);
        assert.deepEqual(this.moduleRegistry.instances.test, []);
      });
    });

    describe('.lookup()', function () {
      beforeEach(function () {
        this.moduleRegistry.instances.test = [this.instance];
      });

      it('returns all modules for the element provided', function () {
        var result = this.moduleRegistry.lookup(this.instance.el);
        assert.deepEqual(result, [this.instance]);
      });

      it('returns an empty array if no elements are found', function () {
        var result = this.moduleRegistry.lookup(document.createElement('a'));
        assert.deepEqual(result, []);
      });

      it('returns the exact module if a type is provided', function () {
        var result = this.moduleRegistry.lookup(this.instance.el, 'test');
        assert.equal(result, this.instance);
      });

      it('returns null if the module was not found for the element provided', function () {
        var result = this.moduleRegistry.lookup(this.instance.el, 'non-existant');
        assert.isNull(result);
      });
    });

    describe('.mixin()', function () {
      it('extends the Module prototype', function () {
        var methods = {method1: function () {}, prop1: 'property'};

        this.moduleRegistry.mixin(methods);

        assert.propertyVal(Module.prototype, 'prop1', 'property');
        assert.propertyVal(Module.prototype, 'method1', methods.method1);
      });

      it('throws an error if the property has already been set', function () {
        Module.prototype.method1 = function () {};

        assert.throws(function () {
          this.moduleRegistry.mixin({method1: function () {}});
        }.bind(this));
      });
    });
  });

  describe('ModuleFactory()', function () {
    beforeEach(function () {
      this.let('name', 'example');
      this.let('findModule', sinon.spy());
      this.let('methods', function () {
        return {};
      });
      this.let('subject', function () {
        return new ModuleFactory(this.name, this.findModule);
      });
    });

    it('throws an error if no type is provided', function () {
      assert.throws(function () {
        new ModuleFactory();
      });
    });

    it('has a type property', function () {
      assert.equal(this.subject.type, 'example');
    });

    it('has a data property', function () {
      assert.equal(this.subject.namespace, 'data-example');
    });

    it('has a selector property', function () {
      assert.equal(this.subject.selector, '[data-example]');
    });

    it('sets the findModule() method to the passed function', function () {
      assert.equal(this.subject.findModule, this.findModule);
    });

    it('does not set the findModule() method if no function is provided', function () {
      this.findModule = null;
      assert.isFalse(_.has(this.subject, 'findModule'), 'subject should not have own property findModule');
    });

    describe('.build()', function () {
      it('builds a new Module instance', function () {
        assert.instanceOf(this.subject.build().prototype, Module);
      });

      it('returns the same object if called more than once', function () {
        assert.strictEqual(this.subject.build(), this.subject.build());
      });

      it('returns a new object if the force option is true', function () {
        var first = this.subject.build();
        var second = this.subject.build({force: true});
        assert.notStrictEqual(first, second);
      });

      it('uses the parent if provided', function () {
        var target = this.subject.parent = new ModuleFactory('parent').build();
        assert.instanceOf(this.subject.build().prototype, target);
      });

      it('extends the prototype with properties if provided', function () {
        function method1() {}
        this.subject.properties.method1 = method1;
        assert.strictEqual(this.subject.build().prototype.method1, method1);
      });

      it('creates a named constructor function', function () {
        var constructor = this.subject.build();
        assert.equal(constructor.name, 'ExampleModule');
      });
    });

    describe('.extend()', function () {
      it('sets the parent property to the child Module provided', function () {
        var ParentModule = Module.extend();
        this.subject.extend(ParentModule);
        assert.strictEqual(this.subject.parent, ParentModule);
      });

      it('throws an error if the parent is not a Module constructor', function () {
        _.each([null, 'test', new Module(), new ModuleFactory('fake'), ModuleFactory], function (parent) {
          assert.throws(function () {
            this.subject.extend(parent);
          }.bind(this));
        }, this);
      });

      it('uses the findModule() function to lookup a string', function () {
        var ParentModule = Module.extend();
        this.findModule = sinon.stub().returns(ParentModule);

        this.subject.extend(ParentModule);
        assert.strictEqual(this.subject.parent, ParentModule);
      });

      it('returns itself', function () {
        var ParentModule = Module.extend();
        assert.strictEqual(this.subject.extend(ParentModule), this.subject);
      });
    });

    describe('.methods()', function () {
      it('extends the properties object with the new methods', function () {
        function myMethod() {}

        this.subject.methods({
          prop: 'my-prop',
          method: myMethod
        });

        assert.propertyVal(this.subject.properties, 'prop', 'my-prop');
        assert.propertyVal(this.subject.properties, 'method', myMethod);
      });

      it('throws an error if a property is added twice', function () {
        this.subject.properties.prop = 'exists';
        assert.throws(function () {
          this.subject.methods({
            prop: 'my-prop'
          });
        }.bind(this));
      });

      it('returns itself', function () {
        assert.strictEqual(this.subject.methods(), this.subject);
      });
    });

    describe('.mixin()', function () {
      it('is an alias for .methods()', function () {
        assert.strictEqual(this.subject.mixin, this.subject.methods);
      });
    });

    describe('.options()', function () {
      it('sets the default options for the module', function () {
        this.subject.options({
          limit: 5,
          offset: 2,
          url: 'http://example.com'
        });

        assert.propertyVal(this.subject.defaults, 'limit', 5);
        assert.propertyVal(this.subject.defaults, 'offset', 2);
        assert.propertyVal(this.subject.defaults, 'url', 'http://example.com');
      });

      it('returns itself', function () {
        assert.strictEqual(this.subject.options({limit: '5'}), this.subject);
      });
    });

    describe('.defer()', function () {
      it('pushes the event into the events queue', function () {
        var event = {on: 'click', preventDefault: false};
        this.subject.defer(event);

        assert.include(this.subject.events, event);
      });

      it('throws an error if the "on" property is missing', function () {
        var event = {preventDefault: false};

        assert.throws(function () {
          this.subject.defer(event);
        }.bind(this));
      });

      it('returns itself', function () {
        assert.strictEqual(this.subject.defer({on: 'click'}), this.subject);
      });
    });

    describe('.isDeferred()', function () {
      it('returns true if the factory has registered events', function () {
        this.subject.events.push({});
        assert.isTrue(this.subject.isDeferred());
      });

      it('returns false if the factory has no registered events', function () {
        assert.isFalse(this.subject.isDeferred());
      });
    });

    describe('.extract()', function () {
      it('extracts the data keys from the element', function () {
        var element = $('<div>', {
          'data-not-module': 'skip',
          'data-example': 'skip',
          'data-example-a': 'capture',
          'data-example-b': 'capture',
          'data-example-c': 'capture'
        })[0];

        var target = this.subject.extract(element);
        assert.deepEqual(target, {a: 'capture', b: 'capture', c: 'capture'});
      });

      it('converts JSON contents of keys into JS primitives', function () {
        var element = $('<div>', {
          'data-example-null': 'null',
          'data-example-int': '100',
          'data-example-arr': '[1, 2, 3]',
          'data-example-obj': '{"a": 1, "b":2, "c": 3}',
          'data-example-str': 'hello'
        })[0];

        var target = this.subject.extract(element);

        assert.deepEqual(target, {
          'null': null,
          'int': 100,
          'arr': [1, 2, 3],
          'obj': {"a": 1, "b": 2, "c": 3},
          'str': 'hello'
        });
      });

      it('uses strings for content that it cannot parse as JSON', function () {
        var element = $('<div>', {
          'data-example-url': 'http://example.com/path/to.html',
          'data-example-bad': '{oh: 1, no'
        })[0];

        var target = this.subject.extract(element);

        assert.deepEqual(target, {
          'url': 'http://example.com/path/to.html',
          'bad': '{oh: 1, no'
        });
      });

      it('converts keys with hyphens into camelCase', function () {
        var element = $('<div>', {
          'data-example-long-property': 'long',
          'data-example-really-very-long-property': 'longer'
        })[0];

        var target = this.subject.extract(element);

        assert.deepEqual(target, {
          'longProperty': 'long',
          'reallyVeryLongProperty': 'longer'
        });
      });

      it('handles modules with hyphens in the name', function () {
        this.name = 'long-example';

        var element = $('<div>', {
          'data-long-example-long-property': 'long',
          'data-long-example-really-very-long-property': 'longer'
        })[0];

        var target = this.subject.extract(element);

        assert.deepEqual(target, {
          'longProperty': 'long',
          'reallyVeryLongProperty': 'longer'
        });
      });

      it('sets boolean attributes to true', function () {
        var element = $('<div>', {
          'data-example-long-property': ''
        })[0];

        var target = this.subject.extract(element);

        assert.deepEqual(target, {'longProperty': true});
      });
    });
  });

  describe('Module()', function () {
    beforeEach(function () {
      this.let('el', $('<div />')[0]);
      this.let('sandbox', m.sandbox());
      this.let('options', function () {
        return {el: this.el, sandbox: this.sandbox};
      });

      this.let('subject', function () {
        return new Module(this.options);
      });
    });

    it('is an instance of Events', function () {
      assert.instanceOf(this.subject, m.Events);
    });

    it('assigns .el as the element option', function () {
      assert.ok(this.subject.el === this.el);
    });

    it('wraps .$el in $ if not already wrapped', function () {
      // Zepto appears to extend the normal array. So is more difficult to
      // test for than jQuery so here we have a forked test :(
      // https://github.com/madrobby/zepto/issues/349#issuecomment-4985091
      if (m.$.zepto) {
        assert.ok(m.$.zepto.isZ(this.subject.$el));
      } else {
        assert.ok(this.subject.$el instanceof m.$);
      }
    });

    it('assigns the sandbox property', function () {
      assert.equal(this.subject.sandbox, this.sandbox);
    });

    it('assigns a cid property', function () {
      assert.match(this.subject.cid, /base:\d+/);
    });

    it('assigns the options property', function () {
      this.options['foo'] = 'bar';
      assert.equal(this.subject.options.foo, 'bar');
      assert.notEqual(this.subject.options, Module.prototype.options);
    });

    it('triggers the "module:create" event if sandbox.publish exists', function () {
      var target = sinon.spy();

      this.sandbox = {publish: target};
      var subject = this.subject;
      assert.called(target);
      assert.calledWith(target, 'module:create', this.options, this.subject);
    });

    it('initializes the module', function () {
      var target = sinon.spy();
      var ChildModule = Module.extend({initialize: target});

      new ChildModule();
      assert.called(target);
    });

    it('sets up the event handlers', function () {
      var target = sinon.spy();
      var ChildModule = Module.extend({
        events: {click: '_onClick'},
        _onClick: target
      });

      var childModule = new ChildModule();
      childModule.$el.click();
      assert.called(target);
    });

    // The teardown feature is not currently supported by Zepto and needs
    // to be patched in with another library[1]?
    // [1]: https://github.com/Enideo/zepto-events-special
    if (m.$.zepto) {
      it('auto teardown after dom removal is not supported using Zepto due to a lack of $.event.special support');
    } else {
      it('tears down when module element is removed', function () {
        var target = this.subject.teardown = sinon.spy();
        this.fixture.appendChild(this.subject.el);
        this.subject.$el.remove();
        assert.called(target);
      });
    }

    describe('.$()', function () {
      it('find children within the module element', function () {
        this.subject.$el.append($('<input /><input />'));
        assert.equal(this.subject.$('input').length, 2);
      });
    });

    describe('.type()', function () {
      it('returns the module factory type', function () {
        assert.equal(this.subject.type(), 'base');
      });
    });

    describe('.run()', function () {
      it('simply returns itself', function () {
        assert.strictEqual(this.subject.run(), this.subject);
      });
    });

    describe('.html()', function () {
      it('sets the html of the element', function () {
        var html = '<div data-superman="yes">Superman lives here</div>';
        this.subject.html(html);
        assert.equal(this.subject.$el.html(), html);
      });

      it('triggers the "module:html" event if sandbox.publish exists', function () {
        var target = sinon.spy();

        this.subject.sandbox = {publish: target};
        this.subject.html('<div></div>');
        assert.called(target);
        assert.calledWith(target, 'module:html', '<div></div>', this.subject);
      });

      it('returns itself', function () {
        assert.strictEqual(this.subject.html(), this.subject);
      });
    });

    describe('.initialize()', function () {
      it('exists as a no-op', function () {
        assert.isFunction(this.instance.initialize);
      });
    });

    describe('.teardown()', function () {
      it('exists as a no-op', function () {
        assert.isFunction(this.instance.teardown);
      });
    });

    describe('.remove()', function () {
      it('tears down the module', function () {
        var target = sinon.stub(this.subject, 'teardown');
        this.subject.remove();

        assert.called(target);
      });

      it('triggers the "remove" event on itself', function () {
        var target = sinon.spy();
        this.subject.addListener('remove', target);

        this.subject.remove();
        assert.called(target);
        assert.calledWith(target, this.subject);
      });

      it('triggers the "module:remove" event if sandbox.publish exists', function () {
        var target = sinon.spy();

        this.subject.sandbox = {publish: target};
        this.subject.remove();
        assert.called(target);
        assert.calledWith(target, 'module:remove', this.subject);
      });

      it('removes the element from the page', function () {
        this.fixture.appendChild(this.subject.el);
        this.subject.remove();

        assert.equal(this.fixture.children.length, 0);
      });
    });

    describe('.delegateEvents()', function () {
      it('binds a handler for an event on the module element', function () {
        var target = this.subject._onClick = sinon.spy();

        this.subject.delegateEvents({'click': '_onClick'});
        this.subject.$el.click();

        assert.called(target);
      });

      it('delegates a handler for an event on a child element', function () {
        var target = this.subject._onClick = sinon.spy();
        this.subject.el.appendChild(document.createElement('span'));

        // Append to body for event bubbling to work.
        document.body.appendChild(this.subject.el)

        this.subject.delegateEvents({'click span': '_onClick'});
        this.subject.$('span').trigger('click');

        assert.called(target);

        document.body.removeChild(this.subject.el)
      });

      it('binds the handler to the module scope', function () {
        var target = this.subject._onClick = sinon.spy();

        this.subject.delegateEvents({'click': '_onClick'});
        this.subject.$el.click();

        assert.calledOn(target, this.subject);
      });

      it('accepts a function rather than a method name', function () {
        var target = sinon.spy();

        this.subject.delegateEvents({'click': target});
        this.subject.$el.click();

        assert.called(target);
      });

      it('unbinds all existing delegated events', function () {
        var target = sinon.spy();

        this.subject.delegateEvents({'click': target});
        this.subject.delegateEvents();
        this.subject.$el.click();

        assert.notCalled(target);
      });
    });

    describe('.undelegateEvents()', function () {
      it('unbinds listeners bound using .delegateEvents()', function () {
        var target = sinon.spy();

        this.subject.delegateEvents({'click': target});
        this.subject.undelegateEvents();
        this.subject.$el.click();

        assert.notCalled(target);
      });

      it('does not unbind other listeners', function () {
        var target = sinon.spy();

        this.subject.$el.on('click', target);
        this.subject.undelegateEvents();
        this.subject.$el.click();

        assert.called(target);
      });
    });
  });

  describe('m.events.on(module:remove)', function () {
    it('removes all handlers registered by the sandbox', function () {
      var target = sinon.spy();
      m.events.publish('module:remove', {sandbox: {unsubscribe: target}});

      assert.called(target);
      assert.calledWithExactly(target);
    });
  });

  describe('m.events.on(module:html)', function () {
    it('reinitializes the module', function () {
      var target = sinon.stub(m.module, 'initialize');
      var el = document.createElement('div');
      m.events.publish('module:html', '<div>NewHTML</div>', {el: el});
      assert.calledWith(target, el);
      target.restore();
    });
  });
});
