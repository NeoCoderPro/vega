var Transform = require('./Transform'),
    GroupBy = require('./GroupBy'),
    tuple = require('../dataflow/tuple'), 
    changeset = require('../dataflow/changeset'), 
    meas = require('./measures'),
    util = require('../util/index'),
    C = require('../util/constants');

function Aggregate(graph) {
  GroupBy.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    group_by: {type: "array<field>"}
  });

  this._output = {
    "count":    "count",
    "avg":      "avg",
    "min":      "min",
    "max":      "max",
    "sum":      "sum",
    "mean":     "mean",
    "var":      "var",
    "stdev":    "stdev",
    "varp":     "varp",
    "stdevp":   "stdevp",
    "median":   "median"
  };

  // Aggregators parameter handled manually.
  this._Aggregators = [];

  // The group_by might come via the facet. Store that to 
  // short-circuit usual GroupBy methods.
  this.__facet = null;

  return this;
}

var proto = (Aggregate.prototype = new GroupBy());

proto.fields = {
  set: function(transform, fields) {
    var f, measures, i;
    transform._Aggregators = [];
    for (i = 0; i < fields.length; i++) {
      f = fields[i];
      if (f.ops.length === 0) continue;
      measures = f.ops.map(function(a) {
        return meas[a](f.name + '_' + transform._output[a]);
      });
      transform._Aggregators.push({
        accessor: util.accessor(f.name),
        field: f.name,
        measures: meas.create(measures)
      });
    }
    return transform;
  }
};

proto._reset = function(input, output) {
  var k, c, agg;
  // rebuild accessors
  for(var i = 0; i < this._Aggregators.length; i++) {
    agg = this._Aggregators[i];
    agg.accessor = util.accessor(agg.name);
    // TODO: delete old aggregated values
  }
  for(k in this._cells) {
    if(!(c = this._cells[k])) continue;
    if(!input.facet) output.rem.push(c.set());
  }
  this._cells = {};
};

proto._keys = function(x) {
  if(this.__facet) return this.__facet;
  else if(this._refs.length) return GroupBy.prototype._keys.call(this, x);
  return {keys: [], key: ""}; // Aggregate on a flat datasource
};

proto._new_cell = function(x, k) {
  var group_by = this.group_by.get(this._graph),
      fields = group_by.fields, acc = group_by.accessors,
      i, len;

  var t = this.__facet || {};
  if(!this.__facet) {
    for(i=0, len=fields.length; i<len; ++i) {
      t[fields[i]] = acc[i](x);
    }
    t = tuple.ingest(t, null);
  }

  for(i=0; i < this._Aggregators.length; i++) {
    var agg = this._Aggregators[i];
    t[agg.field] = new agg.measures(t);
  }

  t.cnt = 0;
  t.tpl = t;
  t.flg = C.ADD_CELL;

  return t;
};

// Add missing measures, TODO: delete
proto._add_missing = function(c, agg) {
  var measure = new agg.measures(c.tpl);
  c[agg.field] = measure;
  return measure;
};

proto._add = function(x) {
  var c = this._cell(x);
  c.cnt++;
  for(var i = 0; i < this._Aggregators.length; i++) {
    var agg = this._Aggregators[i];
    var measure = c[agg.field];
    if (measure === undefined) measure = this._add_missing(c, agg);
    measure.add(agg.accessor(x));
  }
  c.flg |= C.MOD_CELL;
};

proto._rem = function(x) {
  var c = this._cell(x);
  c.cnt--;
  for(var i = 0; i < this._Aggregators.length; i++) {
    var agg = this._Aggregators[i];
    c[agg.field].rem(agg.accessor(x));
  }
  c.flg |= C.MOD_CELL;
};

proto.transform = function(input, reset) {
  util.debug(input, ["aggregate"]);

  if(input.facet) {
    this.__facet = input.facet;
  } else {
    this._refs = this.group_by.get(this._graph).accessors;
  }

  var output = GroupBy.prototype.transform.call(this, input, reset),
      k, c;

  if(input.facet) {
    this._cells[input.facet.key].set();
    return input;
  } else {
    for(k in this._cells) {
      c = this._cells[k];
      if(!c) continue;
      for(var i = 0; i < this._Aggregators.length; i++) {
        c[this._Aggregators[i].field].set();
      }
    }
    return output;
  }
};

module.exports = Aggregate;