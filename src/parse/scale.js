define(function(require, module, exports) {
  var d3 = require('d3'),
      Stats = require('../transforms/Stats'),
      config = require('../util/config'),
      util = require('../util/index'),
      C = require('../util/constants');

  var GROUP_PROPERTY = {width: 1, height: 1};

  function scale(model, def, group) {
    var s = instance(def, group.scale(def.name)),
        m = s.type===C.ORDINAL ? ordinal : quantitative,
        rng = range(model, def, group);

    m(model, def, s, rng, group);
    return s;
  }

  function instance(def, scale) {
    var type = def.type || C.LINEAR;
    if (!scale || type !== scale.type) {
      var ctor = config.scale[type] || d3.scale[type];
      if (!ctor) util.error("Unrecognized scale type: " + type);
      (scale = ctor()).type = scale.type || type;
      scale.scaleName = def.name;
    }
    return scale;
  }

  function ordinal(model, def, scale, rng, group) {
    var domain, sort, str, refs, dataDrivenRange = false;
    
    // range pre-processing for data-driven ranges
    if (util.isObject(def.range) && !util.isArray(def.range)) {
      dataDrivenRange = true;
      rng = dataRef(model, C.RANGE, def.range, scale, group);
    }
    
    // domain
    domain = dataRef(model, C.DOMAIN, def.domain, scale, group);
    if (domain) scale.domain(domain);

    // range
    str = typeof rng[0] === 'string';
    if (str || rng.length > 2 || rng.length===1 || dataDrivenRange) {
      scale.range(rng); // color or shape values
    } else if (def.points) {
      scale.rangePoints(rng, def.padding||0);
    } else if (def.round || def.round===undefined) {
      scale.rangeRoundBands(rng, def.padding||0);
    } else {
      scale.rangeBands(rng, def.padding||0);
    }
  }

  function quantitative(model, def, scale, rng, group) {
    var domain, interval;

    // domain
    domain = (def.type === C.QUANTILE)
      ? dataRef(model, C.DOMAIN, def.domain, scale, group)
      : domainMinMax(model, def, scale, group);
    scale.domain(domain);

    // range
    // vertical scales should flip by default, so use XOR here
    if (def.range === "height") rng = rng.reverse();
    scale[def.round && scale.rangeRound ? "rangeRound" : "range"](rng);

    if (def.exponent && def.type===C.POWER) scale.exponent(def.exponent);
    if (def.clamp) scale.clamp(true);
    if (def.nice) {
      if (def.type === C.TIME) {
        interval = d3.time[def.nice];
        if (!interval) util.error("Unrecognized interval: " + interval);
        scale.nice(interval);
      } else {
        scale.nice();
      }
    }
  }

  function dataRef(model, which, def, scale, group) {
    if(util.isArray(def)) return def.map(signal.bind(null, model));

    var graph = model.graph,
        refs = def.fields || util.array(def),
        deps = scale._deps || (scale._deps = []),
        uniques = scale.type === C.ORDINAL || scale.type === C.QUANTILE,
        ck = "_"+which,
        cache = scale[ck],
        sort = def.sort,
        i, rlen, j, flen, r, fields, meas, from, data, keys;

    if(!cache) {
      cache = scale[ck] = new Stats(graph), meas = [];
      if(uniques && sort) meas.push(sort.stat);
      else if(!uniques) meas.push(C.MIN, C.MAX);
      cache.measures.set(cache, meas);
    }

    for(i=0, rlen=refs.length; i<rlen; ++i) {
      r = refs[i];
      from = r.data || "vg_"+group.datum._id;
      data = model.data(from)
        .needsPrev(true)
        .last();

      fields = util.array(r.field).map(function(f) {
        if(f.group) return util.accessor(f.group)(group.datum)
        return f; // String or {"signal"}
      });

      if(uniques) {
        cache.on.set(cache, sort ? sort.field : "_id");
        for(j=0, flen=fields.length; j<flen; ++j) {
          cache.group_by.set(cache, fields[j])
            .evaluate(data);
        }
      } else {
        for(j=0, flen=fields.length; j<flen; ++j) {
          cache.on.set(cache, fields[j])  // Treat as flat datasource
            .evaluate(data);
        }
      }

      if(deps.indexOf(from) < 0) deps.push(from);
    }

    data = cache.data();
    if(uniques) {
      keys = util.keys(data).filter(function(k) { return data[k] != null; });
      if(sort) {
        sort = sort.order.signal ? graph.signalRef(sort.order.signal) : sort.order;
        sort = (sort == C.DESC ? "-" : "+") + cache.on.get(graph).field;
        sort = util.comparator(sort);
        return keys.map(function(k) { return data[k] }).sort(sort);
      } else {
        return keys;
      }
    } else {
      data = data[""]; // Unpack flat aggregation
      return data == null ? [] : [data.tpl.min, data.tpl.max];
    }
  }

  function signal(model, v) {
    if(!v.signal) return v;
    return model.graph.signalRef(v.signal);
  }
  
  function domainMinMax(model, def, scale, group) {
    var domain = [null, null], refs, z;

    if (def.domain !== undefined) {
      domain = (!util.isObject(def.domain)) ? domain :
        dataRef(model, C.DOMAIN, def.domain, scale, group);
    }

    z = domain.length - 1;
    if (def.domainMin !== undefined) {
      if (util.isObject(def.domainMin)) {
        if(def.domainMin.signal) {
          domain[0] = signal(model, def.domainMin);
        } else {
          domain[0] = dataRef(model, C.DOMAIN+C.MIN, def.domainMin, scale, group)[0];
        }
      } else {
        domain[0] = def.domainMin;
      }
    }
    if (def.domainMax !== undefined) {
      if (util.isObject(def.domainMax)) {
        if(def.domainMax.signal) {
          domain[z] = signal(model, def.domainMax);
        } else {
          domain[z] = dataRef(model, C.DOMAIN+C.MAX, def.domainMax, scale, group)[1];
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

  function range(model, def, group) {
    var rng = [null, null];

    if (def.range !== undefined) {
      if (typeof def.range === 'string') {
        if (GROUP_PROPERTY[def.range]) {
          rng = [0, group[def.range]];
        } else if (config.range[def.range]) {
          rng = config.range[def.range];
        } else {
          util.error("Unrecogized range: "+def.range);
          return rng;
        }
      } else if (util.isArray(def.range)) {
        rng = def.range.map(signal.bind(null, model));
      } else if (util.isObject(def.range)) {
        return null; // early exit
      } else {
        rng = [0, def.range];
      }
    }
    if (def.rangeMin !== undefined) {
      rng[0] = def.rangeMin.signal ? signal(model, def.rangeMin) : def.rangeMin;
    }
    if (def.rangeMax !== undefined) {
      rng[rng.length-1] = def.rangeMax.signal ? signal(model, def.rangeMax) : def.rangeMax;
    }
    
    if (def.reverse !== undefined) {
      var rev = def.reverse;
      if (util.isObject(rev)) {
        rev = util.accessor(rev.field)(group.datum);
      }
      if (rev) rng = rng.reverse();
    }
    
    return rng;
  }

  return scale;
});
