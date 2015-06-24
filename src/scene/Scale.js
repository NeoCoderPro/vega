var d3 = require('d3'),
    util = require('datalib/src/util'),
    changeset = require('vega-dataflow/src/ChangeSet'),
    Node = require('vega-dataflow/src/Node'), // jshint ignore:line
    Deps = require('vega-dataflow/src/Dependencies'),
    Aggregate = require('../transforms/Aggregate'),
    log = require('../util/log'),
    config = require('../util/config'),
    C = require('../util/constants');

var GROUP_PROPERTY = {width: 1, height: 1};

function Scale(graph, def, parent) {
  this._def     = def;
  this._parent  = parent;
  this._updated = false;
  return Node.prototype.init.call(this, graph).reflows(true);
}

var proto = (Scale.prototype = new Node());

proto.evaluate = function(input) {
  var self = this,
      fn = function(group) { scale.call(self, group); };

  this._updated = false;
  input.add.forEach(fn);
  input.mod.forEach(fn);

  // Scales are at the end of an encoding pipeline, so they should forward a
  // reflow pulse. Thus, if multiple scales update in the parent group, we don't
  // reevaluate child marks multiple times. 
  if (this._updated) input.scales[this._def.name] = 1;
  return changeset.create(input, true);
};

// All of a scale's dependencies are registered during propagation as we parse
// dataRefs. So a scale must be responsible for connecting itself to dependents.
proto.dependency = function(type, deps) {
  if (arguments.length == 2) {
    var method = (type === Deps.DATA ? 'data' : 'signal');
    deps = util.array(deps);
    for (var i=0, len=deps.length; i<len; ++i) {
      this._graph[method](deps[i]).addListener(this._parent);
    }
  }

  return Node.prototype.dependency.call(this, type, deps);
};

function scale(group) {
  var name = this._def.name,
      prev = name + ":prev",
      s = instance.call(this, group.scale(name)),
      m = s.type===C.ORDINAL ? ordinal : quantitative,
      rng = range.call(this, group);

  m.call(this, s, rng, group);

  group.scale(name, s);
  group.scale(prev, group.scale(prev) || s);

  return s;
}

function instance(scale) {
  var type = this._def.type || C.LINEAR;
  if (!scale || type !== scale.type) {
    var ctor = config.scale[type] || d3.scale[type];
    if (!ctor) util.error("Unrecognized scale type: " + type);
    (scale = ctor()).type = scale.type || type;
    scale.scaleName = this._def.name;
    scale._prev = {};
  }
  return scale;
}

function ordinal(scale, rng, group) {
  var def = this._def,
      prev = scale._prev,
      dataDrivenRange = false,
      pad = signal.call(this, def.padding) || 0,
      outer = def.outerPadding == null ? pad : signal.call(this, def.outerPadding),
      points = def.points && signal.call(this, def.points),
      round = signal.call(this, def.round) || def.round == null,
      domain, str;
  
  // range pre-processing for data-driven ranges
  if (util.isObject(def.range) && !util.isArray(def.range)) {
    dataDrivenRange = true;
    rng = dataRef.call(this, C.RANGE, def.range, scale, group);
  }
  
  // domain
  domain = dataRef.call(this, C.DOMAIN, def.domain, scale, group);
  if (domain && !util.equal(prev.domain, domain)) {
    scale.domain(domain);
    prev.domain = domain;
    this._updated = true;
  } 

  // range
  if (util.equal(prev.range, rng)) return;

  // width-defined range
  if (def.bandWidth) {
    var bw = signal.call(this, def.bandWidth),
        len = domain.length,
        start = rng[0] || 0,
        space = points ? (pad*bw) : (pad*bw*(len-1) + 2*outer);
    rng = [start, start + (bw * len + space)];
  }

  str = typeof rng[0] === 'string';
  if (str || rng.length > 2 || rng.length===1 || dataDrivenRange) {
    scale.range(rng); // color or shape values
  } else if (points && round) {
    scale.rangeRoundPoints(rng, pad);
  } else if (points) {
    scale.rangePoints(rng, pad);
  } else if (round) {
    scale.rangeRoundBands(rng, pad, outer);
  } else {
    scale.rangeBands(rng, pad, outer);
  }

  prev.range = rng;
  this._updated = true;
}

function quantitative(scale, rng, group) {
  var def = this._def,
      prev = scale._prev,
      round = signal.call(this, def.round),
      exponent = signal.call(this, def.exponent),
      clamp = signal.call(this, def.clamp),
      nice = signal.call(this, def.nice),
      domain, interval;

  // domain
  domain = (def.type === C.QUANTILE) ?
    dataRef.call(this, C.DOMAIN, def.domain, scale, group) :
    domainMinMax.call(this, scale, group);
  if (domain && !util.equal(prev.domain, domain)) {
    scale.domain(domain);
    prev.domain = domain;
    this._updated = true;
  } 

  // range
  // vertical scales should flip by default, so use XOR here
  if (signal.call(this, def.range) === "height") rng = rng.reverse();
  if (util.equal(prev.range, rng)) return;
  scale[round && scale.rangeRound ? "rangeRound" : "range"](rng);
  prev.range = rng;
  this._updated = true;

  // TODO: Support signals for these properties. Until then, only eval
  // them once.
  if (this._stamp > 0) return;
  if (exponent && def.type===C.POWER) scale.exponent(exponent);
  if (clamp) scale.clamp(true);
  if (nice) {
    if (def.type === C.TIME) {
      interval = d3.time[nice];
      if (!interval) log.error("Unrecognized interval: " + interval);
      scale.nice(interval);
    } else {
      scale.nice();
    }
  }
}

function isUniques(scale) { 
  return scale.type === C.ORDINAL || scale.type === C.QUANTILE; 
}

function getRefs(def) { 
  return def.fields || util.array(def);
}

function getFields(ref, group) {
  return util.array(ref.field).map(function(f) {
    return f.parent ?
      util.accessor(f.parent)(group.datum) :
      f; // String or {"signal"}
  });
}

// Scale datarefs can be computed over multiple schema types. 
// This function determines the type of aggregator created, and
// what data is sent to it: values, tuples, or multi-tuples that must
// be standardized into a consistent schema. 
function aggrType(def, scale) {
  var refs = getRefs(def);

  // If we're operating over only a single domain, send full tuples
  // through for efficiency (fewer accessor creations/calls)
  if (refs.length == 1 && util.array(refs[0].field).length == 1) {
    return Aggregate.TYPES.TUPLE;
  }

  // With quantitative scales, we only care about min/max.
  if (!isUniques(scale)) return Aggregate.TYPES.VALUE;

  // If we don't sort, then we can send values directly to aggrs as well
  if (!def.sort) return Aggregate.TYPES.VALUE;

  return Aggregate.TYPES.MULTI;
}

function getCache(which, def, scale, group) {
  var refs = getRefs(def),
      atype = aggrType(def, scale),
      uniques = isUniques(scale),
      sort = def.sort,
      ck = "_"+which,
      fields = getFields(refs[0], group),
      ref;

  if (scale[ck]) return scale[ck];

  var cache = scale[ck] = new Aggregate(this._graph).type(atype),
      groupby, summarize;

  if (uniques) {
    if (atype === Aggregate.TYPES.VALUE) {
      groupby = [{ name: C.GROUPBY, get: util.identity }];
      summarize = {"*": C.COUNT};
    } else if (atype === Aggregate.TYPES.TUPLE) {
      groupby = [{ name: C.GROUPBY, get: util.$(fields[0]) }];
      summarize = sort ? [{
        name: C.VALUE,
        get:  util.$(ref.sort || sort.field),
        ops: [sort.stat]
      }] : {"*": C.COUNT};
    } else {  // atype === Aggregate.TYPES.MULTI
      groupby   = C.GROUPBY;
      summarize = [{ name: C.VALUE, ops: [sort.stat] }]; 
    }
  } else {
    groupby = [];
    summarize = [{
      name: C.VALUE,
      get: (atype == Aggregate.TYPES.TUPLE) ? util.$(fields[0]) : util.identity,
      ops: [C.MIN, C.MAX],
      as:  [C.MIN, C.MAX]
    }];
  }

  cache.param("groupby", groupby)
    .param("summarize", summarize);

  return cache;
}

function dataRef(which, def, scale, group) {
  if (def == null) { return []; }
  if (util.isArray(def)) return def.map(signal.bind(this));

  var self = this, graph = this._graph,
      refs = getRefs(def),
      atype = aggrType(def, scale),
      cache = getCache.apply(this, arguments),
      sort  = def.sort,
      uniques = isUniques(scale),
      i, rlen, j, flen, ref, fields, field, data, from;

  function addDep(s) {
    self.dependency(Deps.SIGNALS, s);
  }

  for (i=0, rlen=refs.length; i<rlen; ++i) {
    ref = refs[i];
    from = ref.data || group.datum._facetID;
    data = graph.data(from)
      .revises(true)
      .last();

    if (data.stamp <= this._stamp) continue;

    fields = getFields(ref, group);
    for (j=0, flen=fields.length; j<flen; ++j) {
      field = fields[j];

      if (atype === Aggregate.TYPES.VALUE) {
        cache.accessors(null, field);
      } else if (atype === Aggregate.TYPES.MULTI) {
        cache.accessors(field, ref.sort || sort.field);
      } // Else (Tuple-case) is handled by the aggregator accessors by default

      cache.evaluate(data);
    }

    this.dependency(Deps.DATA, from);
    cache.dependency(Deps.SIGNALS).forEach(addDep);
  }

  data = cache.aggr().result();
  if (uniques) {
    if (sort) {
      sort = sort.order.signal ? graph.signalRef(sort.order.signal) : sort.order;
      sort = (sort == C.DESC ? "-" : "+") + C.VALUE;
      sort = util.comparator(sort);
      data = data.sort(sort);
    // } else {  // "First seen" order
    //   sort = util.comparator("tpl._id");
    }

    return data.map(function(d) { return d[C.GROUPBY]; });
  } else {
    data = data[0];
    return !util.isValid(data) ? [] : [data[C.MIN], data[C.MAX]];
  }
}

function signal(v) {
  if (!v || !v.signal) return v;
  var s = v.signal, ref;
  this.dependency(Deps.SIGNALS, (ref = util.field(s))[0]);
  return this._graph.signalRef(ref);
}

function domainMinMax(scale, group) {
  var def = this._def,
      domain = [null, null], z;

  if (def.domain !== undefined) {
    domain = (!util.isObject(def.domain)) ? domain :
      dataRef.call(this, C.DOMAIN, def.domain, scale, group);
  }

  z = domain.length - 1;
  if (def.domainMin !== undefined) {
    if (util.isObject(def.domainMin)) {
      if (def.domainMin.signal) {
        domain[0] = signal.call(this, def.domainMin);
      } else {
        domain[0] = dataRef.call(this, C.DOMAIN+C.MIN, def.domainMin, scale, group)[0];
      }
    } else {
      domain[0] = def.domainMin;
    }
  }
  if (def.domainMax !== undefined) {
    if (util.isObject(def.domainMax)) {
      if (def.domainMax.signal) {
        domain[z] = signal.call(this, def.domainMax);
      } else {
        domain[z] = dataRef.call(this, C.DOMAIN+C.MAX, def.domainMax, scale, group)[1];
      }
    } else {
      domain[z] = def.domainMax;
    }
  }
  if (def.type !== C.LOG && def.type !== C.TIME && (def.zero || def.zero===undefined)) {
    domain[0] = Math.min(0, domain[0]);
    domain[z] = Math.max(0, domain[z]);
  }
  return domain;
}

function range(group) {
  var def = this._def,
      rangeVal = signal.call(this, def.range),
      rng = [null, null];

  if (rangeVal !== undefined) {
    if (typeof rangeVal === 'string') {
      if (GROUP_PROPERTY[rangeVal]) {
        rng = [0, group[rangeVal]];
      } else if (config.range[rangeVal]) {
        rng = config.range[rangeVal];
      } else {
        log.error("Unrecogized range: " + rangeVal);
        return rng;
      }
    } else if (util.isArray(rangeVal)) {
      rng = util.duplicate(rangeVal).map(signal.bind(this));
    } else if (util.isObject(rangeVal)) {
      return null; // early exit
    } else {
      rng = [0, rangeVal];
    }
  }
  if (def.rangeMin !== undefined) {
    rng[0] = def.rangeMin.signal ?
      signal.call(this, def.rangeMin) :
      def.rangeMin;
  }
  if (def.rangeMax !== undefined) {
    rng[rng.length-1] = def.rangeMax.signal ?
      signal.call(this, def.rangeMax) :
      def.rangeMax;
  }
  
  if (def.reverse !== undefined) {
    var rev = signal.call(this, def.reverse);
    if (util.isObject(rev)) {
      rev = util.accessor(rev.field)(group.datum);
    }
    if (rev) rng = rng.reverse();
  }
  
  return rng;
}

var sortDef = {
  "type": "object",
  "field": {"type": "string"},
  "stat": {"enum": require('../transforms/Aggregate').VALID_OPS},
  "order": {"enum": [C.ASC, C.DESC]}
};

var rangeDef = [
  {"enum": ["width", "height", "shapes", "category10", "category20"]},
  {
    "type": "array",
    "items": {"oneOf": [{"type":"string"}, {"type": "number"}, {"$ref": "#/refs/signal"}]}
  },
  {"$ref": "#/refs/signal"}
];

module.exports = Scale;
Scale.schema = {
  "refs": {
    "data": {
      "type": "object",
      "properties": {
        "data": {
          "oneOf": [
            {"type": "string"},
            {
              "type": "object",
              "properties": {
                "fields": {
                  "type": "array",
                  "items": {"$ref": "#/refs/data"}
                }
              },
              "required": ["fields"]
            }
          ]
        },
        "field": {
          "oneOf": [
            {"type": "string"},
            {
              "type": "array",
              "items": {"type": "string"}
            },
            {
              "type": "object",
              "properties": {
                "parent": {"type": "string"}
              }
            },
            {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "parent": {"type": "string"}
                }
              }
            }
          ]
        }
      },
      "additionalProperties": false
    }
  },

  "defs": {
    "scale": {
      "title": "Scale function",
      "type": "object",

      "allOf": [{
        "properties": {
          "name": {"type": "string"},

          "type": {
            "enum": [C.LINEAR, C.ORDINAL, C.TIME, C.TIME_UTC, C.LOG, 
              C.POWER, C.SQRT, C.QUANTILE, C.QUANTIZE, C.THRESHOLD],
            "default": "linear"
          },

          "domain": {
            "oneOf": [
              {
                "type": "array",
                "items": {
                  "oneOf": [
                    {"type":"string"}, 
                    {"type": "number"}, 
                    {"$ref": "#/refs/signal"}
                  ]
                }
              },
              {"$ref": "#/refs/data"}
            ]
          },

          "domainMin": {
            "oneOf": [
              {"type": "number"},
              {"$ref": "#/refs/data"},
              {"$ref": "#/refs/signal"}
            ]
          },

          "domainMax": {
            "oneOf": [
              {"type": "number"},
              {"$ref": "#/refs/data"},
              {"$ref": "#/refs/signal"}
            ]
          },

          "rangeMin": {
            "oneOf": [
              {"type":"string"}, 
              {"type": "number"}, 
              {"$ref": "#/refs/signal"}
            ]
          },

          "rangeMax": {
            "oneOf": [
              {"type":"string"}, 
              {"type": "number"}, 
              {"$ref": "#/refs/signal"}
            ]
          },

          "reverse": {"type": "boolean"},
          "round": {"type": "boolean"}
        },

        "required": ["name"]
      }, {
        "oneOf": [{
          "properties": {
            "type": {"enum": [C.ORDINAL]},

            "range": {
              "oneOf": rangeDef.concat({"$ref": "#/refs/data"})
            },

            "points": {"oneOf": [{"type": "boolean"}, {"$ref": "#/refs/signal"}]},
            "padding": {"oneOf": [{"type": "number"}, {"$ref": "#/refs/signal"}]},
            "outerPadding": {"oneOf": [{"type": "number"}, {"$ref": "#/refs/signal"}]},
            "bandWidth": {"oneOf": [{"type": "number"}, {"$ref": "#/refs/signal"}]},

            "sort": sortDef
          }
        }, {
          "properties": {
            "type": {"enum": [C.TIME, C.TIME_UTC]},
            "range": {"oneOf": rangeDef},
            "clamp": {"oneOf": [{"type": "boolean"}, {"$ref": "#/refs/signal"}]},
            "nice": {"oneOf": [{"enum": ["second", "minute", "hour", 
              "day", "week", "month", "year"]}, {"$ref": "#/refs/signal"}]}
          }
        }, {
          "anyOf": [{
            "properties": {
              "type": {"enum": [C.LINEAR, C.LOG, C.POWER, C.SQRT, 
                C.QUANTILE, C.QUANTIZE, C.THRESHOLD], "default": C.LINEAR},
              "range": {"oneOf": rangeDef},
              "clamp": {"oneOf": [{"type": "boolean"}, {"$ref": "#/refs/signal"}]},
              "nice": {"oneOf": [{"type": "boolean"}, {"$ref": "#/refs/signal"}]},
              "zero": {"oneOf": [{"type": "boolean"}, {"$ref": "#/refs/signal"}]}
            }
          }, {
            "properties": {
              "type": {"enum": [C.POWER]},
              "exponent": {"oneOf": [{"type": "number"}, {"$ref": "#/refs/signal"}]}
            }
          }, {
            "properties": {
              "type": {"enum": [C.QUANTILE]},
              "sort": sortDef
            }
          }]
        }]
      }]
    }
  }
};