import DataScope from './DataScope';
import {
  aggrField, Ascending, compareRef, Entry,
  fieldRef, keyRef, isSignal, operator, ref
} from './util';
import parseExpression from './parsers/expression';
import {Compare, Field, Key, Projection, Proxy, Scale, Sieve} from './transforms';
import {array, error, extend, isString, peek, stringValue} from 'vega-util';

export default function Scope(config) {
  this.config = config;

  this.bindings = [];
  this.field = {};
  this.signals = {};
  this.lambdas = {};
  this.scales = {};
  this.events = {};
  this.data = {};

  this.streams = [];
  this.updates = [];
  this.operators = [];
  this.background = null;

  this._id = 0;
  this._subid = 0;
  this._nextsub = [0];

  this._parent = [];
  this._encode = [];
  this._markpath = [];
}

function Subscope(scope) {
  this.config = scope.config;

  this.field = Object.create(scope.field);
  this.signals = Object.create(scope.signals);
  this.lambdas = Object.create(scope.lambdas);
  this.scales = Object.create(scope.scales);
  this.events = Object.create(scope.events);
  this.data = Object.create(scope.data);

  this.streams = [];
  this.updates = [];
  this.operators = [];

  this._id = 0;
  this._subid = ++scope._nextsub[0];
  this._nextsub = scope._nextsub;

  this._parent = scope._parent.slice();
  this._encode = scope._encode.slice();
  this._markpath = scope._markpath;
}

var prototype = Scope.prototype = Subscope.prototype;

// ----

prototype.fork = function() {
  return new Subscope(this);
};

prototype.toRuntime = function() {
  return this.finish(), {
    background: this.background,
    operators:  this.operators,
    streams:    this.streams,
    updates:    this.updates,
    bindings:   this.bindings
  };
};

prototype.id = function() {
  return (this._subid ? this._subid + ':' : 0) + this._id++;
};

prototype.add = function(op) {
  this.operators.push(op);
  op.id = this.id();
  // if pre-registration references exist, resolve them now
  if (op.refs) {
    op.refs.forEach(function(ref) { ref.$ref = op.id; });
    op.refs = null;
  }
  return op;
};

prototype.proxy = function(op) {
  var vref = op instanceof Entry ? ref(op) : op;
  return this.add(Proxy({value: vref}));
};

prototype.addStream = function(stream) {
  return this.streams.push(stream), stream.id = this.id(), stream;
};

prototype.addUpdate = function(update) {
  return this.updates.push(update), update;
};

// Apply metadata
prototype.finish = function() {
  var name, ds;

  // annotate root
  if (this.root) this.root.root = true;

  // annotate signals
  for (name in this.signals) {
    this.signals[name].signal = name;
  }

  // annotate scales
  for (name in this.scales) {
    this.scales[name].scale = name;
  }

  // annotate data sets
  function annotate(op, name, type) {
    var data, list;
    if (op) {
      data = op.data || (op.data = {});
      list = data[name] || (data[name] = []);
      list.push(type);
    }
  }
  for (name in this.data) {
    ds = this.data[name];
    annotate(ds.input,  name, 'input');
    annotate(ds.output, name, 'output');
    annotate(ds.values, name, 'values');
    for (var field in ds.index) {
      annotate(ds.index[field], name, 'index:' + field);
    }
  }

  return this;
};

// ----

prototype.pushState = function(encode, parent) {
  this._encode.push(ref(this.add(Sieve({pulse: encode}))));
  this._parent.push(parent);
  this._markpath.push(-1);
};

prototype.popState = function() {
  this._parent.pop();
  this._encode.pop();
  this._markpath.pop();
};

prototype.parent = function() {
  return peek(this._parent);
};

prototype.encode = function() {
  return peek(this._encode);
};

prototype.markpath = function() {
  var p = this._markpath;
  return ++p[p.length-1], p.slice();
};

// ----

prototype.fieldRef = function(field, name) {
  if (isString(field)) return fieldRef(field, name);
  if (!field.signal) {
    error('Unsupported field reference: ' + stringValue(field));
  }

  var s = field.signal,
      f = this.field[s],
      params;

  if (!f) { // TODO: replace with update signalRef?
    params = {name: this.signalRef(s)}
    if (name) params.as = name;
    this.field[s] = f = ref(this.add(Field(params)));
  }
  return f;
};

prototype.compareRef = function(cmp) {
  function check(_) {
    return isSignal(_) ? (signal = true, ref(sig[_.signal])) : _;
  }

  var sig = this.signals,
      signal = false,
      fields = array(cmp.field).map(check),
      orders = array(cmp.order).map(check);

  return signal
    ? ref(this.add(Compare({fields: fields, orders: orders})))
    : compareRef(fields, orders);
};

prototype.keyRef = function(fields) {
  function check(_) {
    return isSignal(_) ? (signal = true, ref(sig[_.signal])) : _;
  }

  var sig = this.signals,
      signal = false;
  fields = array(fields).map(check);

  return signal
    ? ref(this.add(Key({fields: fields})))
    : keyRef(fields);
};

prototype.sortRef = function(sort) {
  if (!sort) return sort;

  // including id ensures stable sorting
  // TODO review? enable multi-field sorts?
  var a = [aggrField(sort.op, sort.field), '_id'],
      o = sort.order || Ascending;

  return o.signal
    ? ref(this.add(Compare({
        fields: a,
        orders: [o = this.signalRef(o.signal), o]
      })))
    : compareRef(a, [o, o]);
};

// ----

prototype.event = function(source, type) {
  var key = source + ':' + type;
  if (!this.events[key]) {
    var id = this.id();
    this.streams.push({
      id: id,
      source: source,
      type: type
    });
    this.events[key] = id;
  }
  return this.events[key];
};

// ----

prototype.addSignal = function(name, value) {
  if (this.signals.hasOwnProperty(name)) {
    error('Duplicate signal name: ' + stringValue(name));
  }
  var op = value instanceof Entry ? value : this.add(operator(value));
  return this.signals[name] = op;
};

prototype.getSignal = function(name) {
  if (!this.signals[name]) {
    error('Unrecognized signal name: ' + stringValue(name));
  }
  return this.signals[name];
};

prototype.signalRef = function(s) {
  if (this.signals[s]) {
    return ref(this.signals[s]);
  } else if (!this.lambdas[s]) {
    this.lambdas[s] = this.add(operator(null));
  }
  return ref(this.lambdas[s]);
};

prototype.parseLambdas = function() {
  var code = Object.keys(this.lambdas);
  for (var i=0, n=code.length; i<n; ++i) {
    var s = code[i],
        e = parseExpression(s, this),
        op = this.lambdas[s];
    op.params = e.$params;
    op.update = e.$expr;
  }
};

prototype.property = function(spec) {
  return spec && spec.signal ? this.signalRef(spec.signal) : spec;
};

prototype.addBinding = function(name, bind) {
  if (!this.bindings) {
    error('Nested signals do not support binding: ' + stringValue(name));
  }
  this.bindings.push(extend({signal: name}, bind));
};

// ----

prototype.addScaleProj = function(name, transform) {
  if (this.scales.hasOwnProperty(name)) {
    error('Duplicate scale or projection name: ' + stringValue(name));
  }
  this.scales[name] = this.add(transform);
}

prototype.addScale = function(name, params) {
  this.addScaleProj(name, Scale(params));
};

prototype.addProjection = function(name, params) {
  this.addScaleProj(name, Projection(params));
};

prototype.getScale = function(name) {
  if (!this.scales[name]) {
    error('Unrecognized scale name: ' + stringValue(name));
  }
  return this.scales[name];
};

prototype.projectionRef =
prototype.scaleRef = function(name) {
  return ref(this.getScale(name));
};

prototype.projectionType =
prototype.scaleType = function(name) {
  return this.getScale(name).params.type;
};

// ----

prototype.addData = function(name, dataScope) {
  if (this.data.hasOwnProperty(name)) {
    error('Duplicate data set name: ' + stringValue(name));
  }
  return (this.data[name] = dataScope);
};

prototype.getData = function(name) {
  if (!this.data[name]) {
    error('Undefined data set name: ' + stringValue(name));
  }
  return this.data[name];
};

prototype.addDataPipeline = function(name, entries) {
  if (this.data.hasOwnProperty(name)) {
    error('Duplicate data set name: ' + stringValue(name));
  }
  return this.addData(name, DataScope.fromEntries(this, entries));
};
