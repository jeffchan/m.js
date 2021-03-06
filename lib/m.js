(function (exports, mixin, create, inherit, Broadcast) {
  var _m = exports.m;

  exports.m = {};
  exports.m.utils = {
    mixin:   mixin.noConflict(),
    create:  create.noConflict(),
    inherit: inherit.noConflict()
  };
  exports.m.Events = Broadcast.noConflict();
  exports.m.noConflict = function () {
    var m = exports.m;
    exports.m = _m;
    return m;
  };
})(this, this.mixin, this.create, this.inherit, this.Broadcast);
