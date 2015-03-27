define(function(require, exports, module) {
  var Node = require('../dataflow/Node'),
      Parameter = require('./Parameter'),
      util = require('../util/index'),
      C = require('../util/constants');

  function Transform(graph) {
    if(graph) Node.prototype.init.call(this, graph);
    return this;
  }

  Transform.addParameters = function(proto, params) {
    var p;
    for (var name in params) {
      p = params[name];
      proto[name] = new Parameter(name, p.type);
      if(p.default) proto[name].set(proto, p.default);
    }
    proto._parameters = params;
  };

  var proto = (Transform.prototype = new Node());

  proto.clone = function() {
    var n = Node.prototype.clone.call(this);
    n.transform = this.transform;
    n._parameters = this._parameters;
    for(var param in this._parameters) { n[param] = this[param]; }
    return n;
  };

  proto.transform = function(input, reset) { return input; };
  proto.evaluate = function(input) {
    // Many transforms store caches that must be invalidated if
    // a signal value has changed. 
    var reset = this._stamp < input.stamp && this.dependency(C.SIGNALS).some(function(s) { 
      return !!input.signals[s] 
    });

    return this.transform(input, reset);
  };

  proto.output = function(map) {
    for (var key in this._output) {
      if (map[key] !== undefined) {
        this._output[key] = map[key];
      }
    }
    return this;
  };

  return Transform;
});