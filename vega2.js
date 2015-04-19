(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.vg = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = {
  core: {
    View: require('./core/View')
  },
  dataflow: {
    changeset: require('./dataflow/changeset'),
    Datasource: require('./dataflow/Datasource'),
    Graph: require('./dataflow/Graph'),
    Node: require('./dataflow/Node')
  },
  parse: {
    spec: require('./parse/spec')
  },
  scene: {
    Builder: require('./scene/Builder'),
    GroupBuilder: require('./scene/GroupBuilder')
  },
  transforms: require('./transforms/index'),
  config: require('./util/config'),
  util: require('datalib')
};
},{"./core/View":28,"./dataflow/Datasource":30,"./dataflow/Graph":31,"./dataflow/Node":32,"./dataflow/changeset":34,"./parse/spec":53,"./scene/Builder":66,"./scene/GroupBuilder":68,"./transforms/index":88,"./util/config":91,"datalib":16}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],4:[function(require,module,exports){
module.exports = function(opt) {
  opt = opt || {};

  // determine range
  var maxb = opt.maxbins || 1024,
      base = opt.base || 10,
      div = opt.div || [5, 2],
      mins = opt.minstep || 0,
      logb = Math.log(base),
      level = Math.ceil(Math.log(maxb) / logb),
      min = opt.min,
      max = opt.max,
      span = max - min,
      step = Math.max(mins, Math.pow(base, Math.round(Math.log(span) / logb) - level)),
      nbins = Math.ceil(span / step),
      precision, v, i, eps;

  if (opt.step != null) {
    step = opt.step;
  } else if (opt.steps) {
    // if provided, limit choice to acceptable step sizes
    step = opt.steps[Math.min(
        opt.steps.length - 1,
        bisectLeft(opt.steps, span / maxb, 0, opt.steps.length)
    )];
  } else {
    // increase step size if too many bins
    do {
      step *= base;
      nbins = Math.ceil(span / step);
    } while (nbins > maxb);

    // decrease step size if allowed
    for (i = 0; i < div.length; ++i) {
      v = step / div[i];
      if (v >= mins && span / v <= maxb) {
        step = v;
        nbins = Math.ceil(span / step);
      }
    }
  }

  // update precision, min and max
  v = Math.log(step);
  precision = v >= 0 ? 0 : ~~(-v / logb) + 1;
  eps = (min<0 ? -1 : 1) * Math.pow(base, -precision - 1);
  min = Math.min(min, Math.floor(min / step + eps) * step);
  max = Math.ceil(max / step) * step;

  return {
    start: min,
    stop: max,
    step: step,
    unit: precision
  };
};

function bisectLeft(a, x, lo, hi) {
  while (lo < hi) {
    var mid = lo + hi >>> 1;
    if (u.cmp(a[mid], x) < 0) { lo = mid + 1; }
    else { hi = mid; }
  }
  return lo;
}
},{}],5:[function(require,module,exports){
var gen = module.exports = {};

gen.repeat = function(val, n) {
  var a = Array(n), i;
  for (i=0; i<n; ++i) a[i] = val;
  return a;
};

gen.zeroes = function(n) {
  return gen.repeat(0, n);
};

gen.range = function(start, stop, step) {
  if (arguments.length < 3) {
    step = 1;
    if (arguments.length < 2) {
      stop = start;
      start = 0;
    }
  }
  if ((stop - start) / step == Infinity) throw new Error('Infinite range');
  var range = [], i = -1, j;
  if (step < 0) while ((j = start + step * ++i) > stop) range.push(j);
  else while ((j = start + step * ++i) < stop) range.push(j);
  return range;
};

gen.random = {};

gen.random.uniform = function(min, max) {
	min = min || 0;
	max = max || 1;
	var delta = max - min;
	var f = function() {
		return min + delta * Math.random();
	};
	f.samples = function(n) { return gen.zeroes(n).map(f); };
	return f;
};

gen.random.integer = function(a, b) {
	if (b === undefined) {
		b = a;
		a = 0;
	}
	var f = function() {
		return a + Math.max(0, Math.floor(b*(Math.random()-0.001)));
	};
	f.samples = function(n) { return gen.zeroes(n).map(f); };
	return f;
};

gen.random.normal = function(mean, stdev) {
	mean = mean || 0;
	stdev = stdev || 1;
	var next = undefined;
	var f = function() {
		var x = 0, y = 0, rds, c;
		if (next !== undefined) {
			x = next;
			next = undefined;
			return x;
		}
		do {
			x = Math.random()*2-1;
			y = Math.random()*2-1;
			rds = x*x + y*y;
		} while (rds == 0 || rds > 1);
		c = Math.sqrt(-2*Math.log(rds)/rds); // Box-Muller transform
		next = mean + y*c*stdev;
		return mean + x*c*stdev;
	};
	f.samples = function(n) { return gen.zeroes(n).map(f); };
	return f;
};
},{}],6:[function(require,module,exports){
(function (global){
var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null);

module.exports = function(data, format) {
  var d = d3.csv.parse(data ? data.toString() : data);
  return d;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],7:[function(require,module,exports){
module.exports = {
  json: require('./json'),
  csv: require('./csv'),
  tsv: require('./tsv'),
  topojson: require('./topojson'),
  treejson: require('./treejson')
};
},{"./csv":6,"./json":8,"./topojson":9,"./treejson":10,"./tsv":11}],8:[function(require,module,exports){
var util = require('../../util');

module.exports = function(data, format) {
  var d = util.isObject(data) ? data : JSON.parse(data);
  if (format && format.property) {
    d = util.accessor(format.property)(d);
  }
  return d;
};

},{"../../util":23}],9:[function(require,module,exports){
(function (global){
var json = require('./json');
var topojson = (typeof window !== "undefined" ? window.topojson : typeof global !== "undefined" ? global.topojson : null);

module.exports = function(data, format) {
  if (topojson == null) { throw Error("TopoJSON library not loaded."); }

  var t = json(data, format), obj;

  if (format && format.feature) {
    if (obj = t.objects[format.feature]) {
      return topojson.feature(t, obj).features
    } else {
      throw Error("Invalid TopoJSON object: "+format.feature);
    }
  } else if (format && format.mesh) {
    if (obj = t.objects[format.mesh]) {
      return [topojson.mesh(t, t.objects[format.mesh])];
    } else {
      throw Error("Invalid TopoJSON object: " + format.mesh);
    }
  } else {
    throw Error("Missing TopoJSON feature or mesh parameter.");
  }

  return [];
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./json":8}],10:[function(require,module,exports){
var tree = require('../../tree');
var json = require('./json');

module.exports = function(data, format) {
  data = json(data, format);
  return tree.toTable(data, (format && format.children));
};
},{"../../tree":21,"./json":8}],11:[function(require,module,exports){
(function (global){
var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null);

module.exports = function(data, format) {
  var d = d3.tsv.parse(data ? data.toString() : data);
  return d;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],12:[function(require,module,exports){
var util = require('../util');

var tests = {
  bool: function(x) { return x==="true" || x==="false" || util.isBoolean(x); },
  date: function(x) { return !isNaN(Date.parse(x)); },
  num: function(x) { return !isNaN(+x) && !util.isDate(x); }
};

module.exports = function(values, f) {
  var i, j, v;
  
  // types to test for
  var types = [
    {type: "boolean", test: tests.bool},
    {type: "number", test: tests.num},
    {type: "date", test: tests.date}
  ];
  
  for (i=0; i<values.length; ++i) {
    // get next value to test
    v = f ? f(values[i]) : values[i];
    // test value against remaining types
    for (j=0; j<types.length; ++j) {
      if (v != null && !types[j].test(v)) {
        types.splice(j, 1);
        j -= 1;
      }
    }
    // if no types left, return 'string'
    if (types.length === 0) return "string";
  }
  
  return types[0].type;
};
},{"../util":23}],13:[function(require,module,exports){
var util = require('../util');

// Matches absolute URLs with optional protocol
//   https://...    file://...    //...
var protocol_re = /^([A-Za-z]+:)?\/\//;

// Special treatment in node.js for the file: protocol
var fileProtocol = 'file://';

// Validate and cleanup URL to ensure that it is allowed to be accessed
// Returns cleaned up URL, or false if access is not allowed
function sanitizeUrl(opt) {
  var url = opt.url;
  if (!url && opt.file) { return fileProtocol + opt.file; }

  // In case this is a relative url (has no host), prepend opt.baseURL
  if (opt.baseURL && !protocol_re.test(url)) {
    if (!util.startsWith(url, '/') && opt.baseURL[opt.baseURL.length-1] !== '/') {
      url = '/' + url; // Ensure that there is a slash between the baseURL (e.g. hostname) and url
    }
    url = opt.baseURL + url;
  }
  // relative protocol, starts with '//'
  if (util.isNode && util.startsWith(url, '//')) {
    url = (opt.defaultProtocol || 'http') + ':' + url;
  }
  // If opt.domainWhiteList is set, only allows url, whose hostname
  // * Is the same as the origin (window.location.hostname)
  // * Equals one of the values in the whitelist
  // * Is a proper subdomain of one of the values in the whitelist
  if (opt.domainWhiteList) {
    var domain, origin;
    if (util.isNode) {
      // relative protocol is broken: https://github.com/defunctzombie/node-url/issues/5
      var parts = require('url').parse(url);
      domain = parts.hostname;
      origin = null;
    } else {
      var a = document.createElement('a');
      a.href = url;
      // From http://stackoverflow.com/questions/736513/how-do-i-parse-a-url-into-hostname-and-path-in-javascript
      // IE doesn't populate all link properties when setting .href with a relative URL,
      // however .href will return an absolute URL which then can be used on itself
      // to populate these additional fields.
      if (a.host == "") {
        a.href = a.href;
      }
      domain = a.hostname.toLowerCase();
      origin = window.location.hostname;
    }

    if (origin !== domain) {
      var whiteListed = opt.domainWhiteList.some(function (d) {
        var idx = domain.length - d.length;
        return d === domain ||
          (idx > 1 && domain[idx-1] === '.' && domain.lastIndexOf(d) === idx);
      });
      if (!whiteListed) {
        throw 'URL is not whitelisted: ' + url;
      }
    }
  }
  return url;
}

function load(opt, callback) {
  var error = callback || function(e) { throw e; };
  
  try {
    var url = load.sanitizeUrl(opt); // enable override
  } catch (err) {
    error(err);
    return;
  }

  if (!url) {
    error('Invalid URL: ' + url);
  } else if (!util.isNode) {
    // in browser, use xhr
    return xhr(url, callback);
  } else if (util.startsWith(url, fileProtocol)) {
    // in node.js, if url starts with 'file://', strip it and load from file
    return file(url.slice(fileProtocol.length), callback);
  } else {
    // for regular URLs in node.js
    return http(url, callback);
  }
}

function xhrHasResponse(request) {
  var type = request.responseType;
  return type && type !== "text"
      ? request.response // null on error
      : request.responseText; // "" on error
}

function xhr(url, callback) {
  var async = !!callback;
  var request = new XMLHttpRequest;
  // If IE does not support CORS, use XDomainRequest (copied from d3.xhr)
  if (this.XDomainRequest
      && !("withCredentials" in request)
      && /^(http(s)?:)?\/\//.test(url)) request = new XDomainRequest;

  function respond() {
    var status = request.status;
    if (!status && xhrHasResponse(request) || status >= 200 && status < 300 || status === 304) {
      callback(null, request.responseText);
    } else {
      callback(request, null);
    }
  }

  if (async) {
    "onload" in request
      ? request.onload = request.onerror = respond
      : request.onreadystatechange = function() { request.readyState > 3 && respond(); };
  }
  
  request.open("GET", url, async);
  request.send();
  
  if (!async && xhrHasResponse(request)) {
    return request.responseText;
  }
}

function file(file, callback) {
  var fs = require('fs');
  if (!callback) {
    return fs.readFileSync(file, 'utf8');
  }
  require('fs').readFile(file, callback);
}

function http(url, callback) {
  if (!callback) {
    return require('sync-request')('GET', url).getBody();
  }
  require('request')(url, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      callback(null, body);
    } else {
      callback(error, null);
    }
  });
}

load.sanitizeUrl = sanitizeUrl;

module.exports = load;

},{"../util":23,"fs":2,"request":2,"sync-request":2,"url":2}],14:[function(require,module,exports){
var util = require('../util');
var load = require('./load');
var read = require('./read');

module.exports = util
  .keys(read.formats)
  .reduce(function(out, type) {
    out[type] = function(opt, format, callback) {
      // process arguments
      if (util.isString(opt)) opt = {url: opt};
      if (arguments.length === 2 && util.isFunction(format)) {
        callback = format;
        format = undefined;
      }

      // set up read format
      format = util.extend({parse: 'auto'}, format);
      format.type = type;

      // load data
      var data = load(opt, callback ? function(error, data) {
        if (error) callback(error, null);
        try {
          // data loaded, now parse it (async)
          data = read(data, format);
        } catch (e) {
          callback(e, null);
        }
        callback(null, data);
      } : undefined);
      
      // data loaded, now parse it (sync)
      if (data) return read(data, format);
    };
    return out;
  }, {});

},{"../util":23,"./load":13,"./read":15}],15:[function(require,module,exports){
var util = require('../util');
var formats = require('./formats');
var infer = require('./infer-types');

var PARSERS = {
  "number": util.number,
  "boolean": util.boolean,
  "date": util.date
};

function read(data, format) {
  var type = (format && format.type) || "json";
  data = formats[type](data, format);
  if (format && format.parse) parse(data, format.parse);
  return data;
}

function parse(data, types) {
  var cols, parsers, d, i, j, clen, len = data.length;

  if (types === 'auto') {
    // perform type inference
    types = util.keys(data[0]).reduce(function(types, c) {
      var type = infer(data, util.accessor(c));
      if (PARSERS[type]) types[c] = type;
      return types;
    }, {});
  }
  cols = util.keys(types);
  parsers = cols.map(function(c) { return PARSERS[types[c]]; });

  for (i=0, clen=cols.length; i<len; ++i) {
    d = data[i];
    for (j=0; j<clen; ++j) {
      d[cols[j]] = parsers[j](d[cols[j]]);
    }
  }
}

read.formats = formats;
read.parse = parse;
module.exports = read;
},{"../util":23,"./formats":7,"./infer-types":12}],16:[function(require,module,exports){
var dl = module.exports = {};
var util = require('./util');

util.extend(dl, util);
util.extend(dl, require('./generate'));
util.extend(dl, require('./stats'));
dl.bin = require('./bin');
dl.summary = require('./summary');
dl.template = require('./template');
dl.truncate = require('./truncate');

dl.load = require('./import/load');
dl.read = require('./import/read');
util.extend(dl, require('./import/loaders'));

var log = require('./log');
dl.log = function(msg) { log(msg, log.LOG); };
dl.log.silent = log.silent;
dl.error = function(msg) { log(msg, log.ERR); };

},{"./bin":4,"./generate":5,"./import/load":13,"./import/loaders":14,"./import/read":15,"./log":17,"./stats":18,"./summary":19,"./template":20,"./truncate":22,"./util":23}],17:[function(require,module,exports){
var LOG = "LOG";
var ERR = "ERR";
var silent = false;

function prepare(msg, type) {
  return '[' + [
    '"'+(type || LOG)+'"',
    Date.now(),
    '"'+msg+'"'
  ].join(", ") + ']';
}

function log(msg, type) {
  if (!silent) {
    msg = prepare(msg, type);
    console.error(msg);
  }
}

log.silent = function(val) { silent = !!val; };

log.LOG = LOG;
log.ERR = ERR;
module.exports = log;
},{}],18:[function(require,module,exports){
var util = require('./util');
var stats = {};

stats.unique = function(values, f, results) {
  if (!util.isArray(values) || values.length===0) return [];
  results = results || [];
  var u = {}, v, i;
  for (i=0, n=values.length; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v in u) {
      u[v] += 1;
    } else {
      u[v] = 1;
      results.push(v);
    }
  }
  results.counts = u;
  return results;
};

stats.count = function(values, f) {
  if (!util.isArray(values) || values.length===0) return 0;
  var v, i, count = 0;
  for (i=0, n=values.length; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v != null) count += 1;
  }
  return count;
};

stats.count.distinct = function(values, f) {
  if (!util.isArray(values) || values.length===0) return 0;
  var u = {}, v, i, count = 0;
  for (i=0, n=values.length; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v in u) continue;
    u[v] = 1;
    count += 1;
  }
  return count;
};

stats.count.nulls = function(values, f) {
  if (!util.isArray(values) || values.length===0) return 0;
  var v, i, count = 0;
  for (i=0, n=values.length; i<n; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v == null) count += 1;
  }
  return count;
};

stats.median = function(values, f) {
  if (!util.isArray(values) || values.length===0) return 0;
  if (f) values = values.map(f);
  values = values.filter(util.isNotNull).sort(util.cmp);
  var half = Math.floor(values.length/2);
  if (values.length % 2) {
    return values[half];
  } else {
    return (values[half-1] + values[half]) / 2.0;
  }
};

stats.mean = function(values, f) {
  if (!util.isArray(values) || values.length===0) return 0;
  var mean = 0, delta, i, c, v;
  for (i=0, c=0; i<values.length; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v != null) {
      delta = v - mean;
      mean = mean + delta / (++c);
    }
  }
  return mean;
};

stats.variance = function(values, f) {
  if (!util.isArray(values) || values.length===0) return 0;
  var mean = 0, M2 = 0, delta, i, c, v;
  for (i=0, c=0; i<values.length; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v != null) {
      delta = v - mean;
      mean = mean + delta / (++c);
      M2 = M2 + delta * (v - mean);
    }
  }
  M2 = M2 / (c - 1);
  return M2;
};

stats.stdev = function(values, f) {
  return Math.sqrt(stats.variance(values, f));
};

stats.skew = function(values, f) {
  var avg = stats.mean(values, f),
      med = stats.median(values, f),
      std = stats.stdev(values, f);
  return std === 0 ? 0 : (avg - med) / std;
};

stats.minmax = function(values, f) {
  var s = {min: +Infinity, max: -Infinity}, v, i, n;
  for (i=0; i<values.length; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v != null) {
      if (v > s.max) s.max = v;
      if (v < s.min) s.min = v;
    }
  }
  return s;
};

stats.minIndex = function(values, f) {
  if (!util.isArray(values) || values.length==0) return -1;
  var idx = 0, v, i, n, min = +Infinity;
  for (i=0; i<values.length; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v != null && v < min) { min = v; idx = i; }
  }
  return idx;
};

stats.maxIndex = function(values, f) {
  if (!util.isArray(values) || values.length==0) return -1;
  var idx = 0, v, i, n, max = -Infinity;
  for (i=0; i<values.length; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v != null && v > max) { max = v; idx = i; }
  }
  return idx;
};

stats.entropy = function(counts) {
  var i, p, s = 0, H = 0;
  for (i=0; i<counts.length; ++i) {
    s += counts[i];
  }
  if (s === 0) return 0;
  for (i=0; i<counts.length; ++i) {
    p = counts[i] / s;
    if (p > 0) H += p * Math.log(p) / Math.LN2;
  }
  return -H;
};

stats.entropy.normalized = function(counts) {
  var H = stats.entropy(counts);
  var max = -Math.log(1/counts.length) / Math.LN2;
  return H / max;
};

stats.profile = function(values, f) {
  if (!util.isArray(values) || values.length===0) return null;

  // init
  var p = {},
      mean = 0,
      count = 0,
      distinct = 0,
      min = f ? f(values[0]) : values[0],
      max = min,
      M2 = 0,
      median = null,
      vals = [],
      u = {}, delta, sd, i, v, x, half;

  // compute summary stats
  for (i=0, c=0; i<values.length; ++i) {
    v = f ? f(values[i]) : values[i];
    if (v != null) {
      // update unique values
      u[v] = (v in u) ? u[v] + 1 : (distinct += 1, 1);
      // update min/max
      if (v < min) min = v;
      if (v > max) max = v;
      // update stats
      x = (typeof v === 'string') ? v.length : v;
      delta = x - mean;
      mean = mean + delta / (++count);
      M2 = M2 + delta * (x - mean);
      vals.push(x);
    }
  }
  M2 = M2 / (count - 1);
  sd = Math.sqrt(M2);

  // compute median
  vals.sort(util.cmp);
  half = Math.floor(vals.length/2);
  median = (vals.length % 2)
   ? vals[half]
   : (vals[half-1] + vals[half]) / 2.0;

  return {
    unique:   u,
    count:    count,
    nulls:    values.length - count,
    distinct: distinct,
    min:      min,
    max:      max,
    mean:     mean,
    median:   median,
    stdev:    sd,
    skew:     sd === 0 ? 0 : (mean - median) / sd
  };
};

module.exports = stats;
},{"./util":23}],19:[function(require,module,exports){
var util = require('./util');
var stats = require('./stats');

module.exports = function(data, fields) {
  if (data == null || data.length === 0) return null;
  fields = fields || util.keys(data[0]);

  var profiles = fields.map(function(f) {
    var p = stats.profile(data, util.accessor(f));
    return (p.field = f, p);
  });
  
  profiles.toString = printSummary;
  return profiles;
};

function printSummary() {
  var profiles = this;
  var str = [];
  profiles.forEach(function(p) {
    str.push("----- Field: '" + p.field + "' -----");
    if (typeof p.min === 'string' || p.distinct < 10) {
      str.push(printCategoricalProfile(p));
    } else {
      str.push(printQuantitativeProfile(p));
    }
    str.push("");
  });
  return str.join("\n");
}

function printQuantitativeProfile(p) {
  return [
    "distinct: " + p.distinct,
    "nulls:    " + p.nulls,
    "min:      " + p.min,
    "max:      " + p.max,
    "median:   " + p.median,
    "mean:     " + p.mean,
    "stdev:    " + p.stdev,
    "skew:     " + p.skew
  ].join("\n");
}

function printCategoricalProfile(p) {
  var list = [
    "distinct: " + p.distinct,
    "nulls:    " + p.nulls,
    "top values: "
  ];
  var u = p.unique;
  var top = util.keys(u)
    .sort(function(a,b) { return u[b] - u[a]; })
    .slice(0, 6)
    .map(function(v) { return " '" + v + "' (" + u[v] + ")"; });
  return list.concat(top).join("\n");
}
},{"./stats":18,"./util":23}],20:[function(require,module,exports){
(function (global){
var util = require('./util');
var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null);

var context = {
  formats:    [],
  format_map: {},
  truncate:   require('./truncate')
};

function template(text) {
  var src = source(text, "d");
  src = "var __t; return " + src + ";";

  try {
    return (new Function("d", src)).bind(context);
  } catch (e) {
    e.source = src;
    throw e;
  }
}

module.exports = template;

// clear cache of format objects
// can *break* prior template functions, so invoke with care
template.clearFormatCache = function() {
  context.formats = [];
  context.format_map = {};
};

function source(text, variable) {
  variable = variable || "obj";
  var index = 0;
  var src = "'";
  var regex = template_re;

  // Compile the template source, escaping string literals appropriately.
  text.replace(regex, function(match, interpolate, offset) {
    src += text
      .slice(index, offset)
      .replace(template_escaper, template_escapeChar);
    index = offset + match.length;

    if (interpolate) {
      src += "'\n+((__t=("
        + template_var(interpolate, variable)
        + "))==null?'':__t)+\n'";
    }

    // Adobe VMs need the match returned to produce the correct offest.
    return match;
  });
  return src + "'";
}

function template_var(text, variable) {
  var filters = text.split('|');
  var prop = filters.shift().trim();
  var format = [];
  var stringCast = true;
  
  function strcall(fn) {
    fn = fn || "";
    if (stringCast) {
      stringCast = false;
      src = "String(" + src + ")" + fn;
    } else {
      src += fn;
    }
    return src;
  }
  
  var src = util.field(prop).map(util.str).join("][");
  src = variable + "[" + src + "]";
  
  for (var i=0; i<filters.length; ++i) {
    var f = filters[i], args = null, pidx, a, b;

    if ((pidx=f.indexOf(':')) > 0) {
      f = f.slice(0, pidx);
      args = filters[i].slice(pidx+1).split(',')
        .map(function(s) { return s.trim(); });
    }
    f = f.trim();

    switch (f) {
      case 'length':
        strcall('.length');
        break;
      case 'lower':
        strcall('.toLowerCase()');
        break;
      case 'upper':
        strcall('.toUpperCase()');
        break;
      case 'lower-locale':
        strcall('.toLocaleLowerCase()');
        break;
      case 'upper-locale':
        strcall('.toLocaleUpperCase()');
        break;
      case 'trim':
        strcall('.trim()');
        break;
      case 'left':
        a = util.number(args[0]);
        strcall('.slice(0,' + a + ')');
        break;
      case 'right':
        a = util.number(args[0]);
        strcall('.slice(-' + a +')');
        break;
      case 'mid':
        a = util.number(args[0]);
        b = a + util.number(args[1]);
        strcall('.slice(+'+a+','+b+')');
        break;
      case 'slice':
        a = util.number(args[0]);
        strcall('.slice('+ a
          + (args.length > 1 ? ',' + util.number(args[1]) : '')
          + ')');
        break;
      case 'truncate':
        a = util.number(args[0]);
        b = args[1];
        b = (b!=="left" && b!=="middle" && b!=="center") ? "right" : b;
        src = 'this.truncate(' + strcall() + ',' + a + ',"' + b + '")';
        break;
      case 'number':
        a = template_format(args[0], d3.format);
        stringCast = false;
        src = 'this.formats['+a+']('+src+')';
        break;
      case 'time':
        a = template_format(args[0], d3.time.format);
        stringCast = false;
        src = 'this.formats['+a+']('+src+')';
        break;
      default:
        throw Error("Unrecognized template filter: " + f);
    }
  }

  return src;
}

var template_re = /\{\{(.+?)\}\}|$/g;

// Certain characters need to be escaped so that they can be put into a
// string literal.
var template_escapes = {
  "'":      "'",
  '\\':     '\\',
  '\r':     'r',
  '\n':     'n',
  '\u2028': 'u2028',
  '\u2029': 'u2029'
};

var template_escaper = /\\|'|\r|\n|\u2028|\u2029/g;

function template_escapeChar(match) {
  return '\\' + template_escapes[match];
};

function template_format(pattern, fmt) {
  if ((pattern[0] === "'" && pattern[pattern.length-1] === "'") ||
      (pattern[0] !== '"' && pattern[pattern.length-1] === '"')) {
    pattern = pattern.slice(1, -1);
  } else {
    throw Error("Format pattern must be quoted: " + pattern);
  }
  if (!context.format_map[pattern]) {
    var f = fmt(pattern);
    var i = context.formats.length;
    context.formats.push(f);
    context.format_map[pattern] = i;
  }
  return context.format_map[pattern];
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./truncate":22,"./util":23}],21:[function(require,module,exports){
var FIELDS = {
  id: "_tree_id",
  parent: "_tree_parent",
  children: "children"
};

function toTable(tree, childrenField, idField, parentField) {
  childrenField = childrenField || FIELDS.children;
  idField = idField || FIELDS.id;
  parentField = parentField || FIELDS.parent;
  var list = [];
  var id = 0;
  
  function visit(node, parentId) {
    var nid = node[idField] = id++;
    node[parentField] = parentId;
    list.push(node);
    
    var children = node[childrenField];
    if (children) {
      for (var i=0; i<children.length; ++i) {
        visit(children[i], nid);
      }
    }
  }
  
  visit(tree, -1);
  return list;
}

function fromTable(list, childrenField, idField, parentField) {
  childrenField = childrenField || FIELDS.children;
  idField = idField || FIELDS.id;
  parentField = parentField || FIELDS.parent;
  var root = null;
  
  list.forEach(function(node) {
    if (node[childrenField]) {
      node[childrenField] = null;
    };
  })
  
  list.forEach(function(node) {
    var pid = node[parentField];
    if (pid === -1) {
      root = node;
    } else {
      var p = nodes[pid];
      var children = p[childrenField] || (p[childrenField] = []);
      children.push(node);
    }
  });

  return root;
}

module.exports = {
  toTable: toTable,
  fromTable: fromTable,
  fields: FIELDS
};
},{}],22:[function(require,module,exports){
module.exports = function(s, length, pos, word, ellipsis) {
  var len = s.length;
  if (len <= length) return s;
  ellipsis = ellipsis || "...";
  var l = Math.max(0, length - ellipsis.length);

  switch (pos) {
    case "left":
      return ellipsis + (word ? u_truncateOnWord(s,l,1) : s.slice(len-l));
    case "middle":
    case "center":
      var l1 = Math.ceil(l/2), l2 = Math.floor(l/2);
      return (word ? truncateOnWord(s,l1) : s.slice(0,l1)) + ellipsis
        + (word ? truncateOnWord(s,l2,1) : s.slice(len-l2));
    default:
      return (word ? truncateOnWord(s,l) : s.slice(0,l)) + ellipsis;
  }
};

function truncateOnWord(s, len, rev) {
  var cnt = 0, tok = s.split(truncate_word_re);
  if (rev) {
    s = (tok = tok.reverse())
      .filter(function(w) { cnt += w.length; return cnt <= len; })
      .reverse();
  } else {
    s = tok.filter(function(w) { cnt += w.length; return cnt <= len; });
  }
  return s.length ? s.join("").trim() : tok[0].slice(0, len);
}

var truncate_word_re = /([\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u2028\u2029\u3000\uFEFF])/;

},{}],23:[function(require,module,exports){
(function (process){
var u = module.exports = {};

// where are we?

u.isNode = typeof process !== 'undefined'
        && typeof process.stderr !== 'undefined';

// type checking functions

var toString = Object.prototype.toString;

u.isObject = function(obj) {
  return obj === Object(obj);
};

u.isFunction = function(obj) {
  return toString.call(obj) == '[object Function]';
};

u.isString = function(obj) {
  return toString.call(obj) == '[object String]';
};
  
u.isArray = Array.isArray || function(obj) {
  return toString.call(obj) == '[object Array]';
};

u.isNumber = function(obj) {
  return toString.call(obj) == '[object Number]';
};

u.isBoolean = function(obj) {
  return toString.call(obj) == '[object Boolean]';
};

u.isDate = function(obj) {
  return toString.call(obj) == '[object Date]';
};

u.isNotNull = function(obj) {
  return obj != null; // TODO include NaN here?
};

// type coercion functions

u.number = function(s) { return s == null ? null : +s; };

u.boolean = function(s) { return s == null ? null : s==='false' ? false : !!s; };

u.date = function(s) { return s == null ? null : Date.parse(s); }

u.array = function(x) { return x != null ? (u.isArray(x) ? x : [x]) : []; };

u.str = function(x) {
  return u.isArray(x) ? "[" + x.map(u.str) + "]"
    : u.isObject(x) ? JSON.stringify(x)
    : u.isString(x) ? ("'"+util_escape_str(x)+"'") : x;
};

var escape_str_re = /(^|[^\\])'/g;

function util_escape_str(x) {
  return x.replace(escape_str_re, "$1\\'");
}

// utility functions

u.identity = function(x) { return x; };

u.true = function() { return true; };

u.duplicate = function(obj) {
  return JSON.parse(JSON.stringify(obj));
};

u.equal = function(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
};

u.extend = function(obj) {
  for (var x, name, i=1, len=arguments.length; i<len; ++i) {
    x = arguments[i];
    for (name in x) { obj[name] = x[name]; }
  }
  return obj;
};

u.keys = function(x) {
  var keys = [], k;
  for (k in x) keys.push(k);
  return keys;
};

u.vals = function(x) {
  var vals = [], k;
  for (k in x) vals.push(x[k]);
  return vals;
};

u.toMap = function(list) {
  return list.reduce(function(obj, x) {
    return (obj[x] = 1, obj);
  }, {});
};

u.keystr = function(values) {
  // use to ensure consistent key generation across modules
  return values.join("|");
};

// data access functions

u.field = function(f) {
  return f.split("\\.")
    .map(function(d) { return d.split("."); })
    .reduce(function(a, b) {
      if (a.length) { a[a.length-1] += "." + b.shift(); }
      a.push.apply(a, b);
      return a;
    }, []);
};

u.accessor = function(f) {
  var s;
  return (u.isFunction(f) || f==null)
    ? f : u.isString(f) && (s=u.field(f)).length > 1
    ? function(x) { return s.reduce(function(x,f) {
          return x[f];
        }, x);
      }
    : function(x) { return x[f]; };
};

u.mutator = function(f) {
  var s;
  return u.isString(f) && (s=u.field(f)).length > 1
    ? function(x, v) {
        for (var i=0; i<s.length-1; ++i) x = x[s[i]];
        x[s[i]] = v;
      }
    : function(x, v) { x[f] = v; };
};


// comparison / sorting functions

u.comparator = function(sort) {
  var sign = [];
  if (sort === undefined) sort = [];
  sort = u.array(sort).map(function(f) {
    var s = 1;
    if      (f[0] === "-") { s = -1; f = f.slice(1); }
    else if (f[0] === "+") { s = +1; f = f.slice(1); }
    sign.push(s);
    return u.accessor(f);
  });
  return function(a,b) {
    var i, n, f, x, y;
    for (i=0, n=sort.length; i<n; ++i) {
      f = sort[i]; x = f(a); y = f(b);
      if (x < y) return -1 * sign[i];
      if (x > y) return sign[i];
    }
    return 0;
  };
};

u.cmp = function(a, b) {
  if (a < b) {
    return -1;
  } else if (a > b) {
    return 1;
  } else if (a >= b) {
    return 0;
  } else if (a === null && b === null) {
    return 0;
  } else if (a === null) {
    return -1;
  } else if (b === null) {
    return 1;
  }
  return NaN;
}

u.numcmp = function(a, b) { return a - b; };

u.stablesort = function(array, sortBy, keyFn) {
  var indices = array.reduce(function(idx, v, i) {
    return (idx[keyFn(v)] = i, idx);
  }, {});

  array.sort(function(a, b) {
    var sa = sortBy(a),
        sb = sortBy(b);
    return sa < sb ? -1 : sa > sb ? 1
         : (indices[keyFn(a)] - indices[keyFn(b)]);
  });

  return array;
};

// string functions

// ES6 compatibility per https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith#Polyfill
// We could have used the polyfill code, but lets wait until ES6 becomes a standard first
u.startsWith = String.prototype.startsWith
  ? function(string, searchString) {
    return string.startsWith(searchString);
  }
  : function(string, searchString) {
    return string.lastIndexOf(searchString, 0) === 0;
  };
}).call(this,require('_process'))

},{"_process":3}],24:[function(require,module,exports){
module.exports = require('./lib/heap');

},{"./lib/heap":25}],25:[function(require,module,exports){
// Generated by CoffeeScript 1.8.0
(function() {
  var Heap, defaultCmp, floor, heapify, heappop, heappush, heappushpop, heapreplace, insort, min, nlargest, nsmallest, updateItem, _siftdown, _siftup;

  floor = Math.floor, min = Math.min;


  /*
  Default comparison function to be used
   */

  defaultCmp = function(x, y) {
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  };


  /*
  Insert item x in list a, and keep it sorted assuming a is sorted.
  
  If x is already in a, insert it to the right of the rightmost x.
  
  Optional args lo (default 0) and hi (default a.length) bound the slice
  of a to be searched.
   */

  insort = function(a, x, lo, hi, cmp) {
    var mid;
    if (lo == null) {
      lo = 0;
    }
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (lo < 0) {
      throw new Error('lo must be non-negative');
    }
    if (hi == null) {
      hi = a.length;
    }
    while (lo < hi) {
      mid = floor((lo + hi) / 2);
      if (cmp(x, a[mid]) < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }
    return ([].splice.apply(a, [lo, lo - lo].concat(x)), x);
  };


  /*
  Push item onto heap, maintaining the heap invariant.
   */

  heappush = function(array, item, cmp) {
    if (cmp == null) {
      cmp = defaultCmp;
    }
    array.push(item);
    return _siftdown(array, 0, array.length - 1, cmp);
  };


  /*
  Pop the smallest item off the heap, maintaining the heap invariant.
   */

  heappop = function(array, cmp) {
    var lastelt, returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    lastelt = array.pop();
    if (array.length) {
      returnitem = array[0];
      array[0] = lastelt;
      _siftup(array, 0, cmp);
    } else {
      returnitem = lastelt;
    }
    return returnitem;
  };


  /*
  Pop and return the current smallest value, and add the new item.
  
  This is more efficient than heappop() followed by heappush(), and can be
  more appropriate when using a fixed size heap. Note that the value
  returned may be larger than item! That constrains reasonable use of
  this routine unless written as part of a conditional replacement:
      if item > array[0]
        item = heapreplace(array, item)
   */

  heapreplace = function(array, item, cmp) {
    var returnitem;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    returnitem = array[0];
    array[0] = item;
    _siftup(array, 0, cmp);
    return returnitem;
  };


  /*
  Fast version of a heappush followed by a heappop.
   */

  heappushpop = function(array, item, cmp) {
    var _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (array.length && cmp(array[0], item) < 0) {
      _ref = [array[0], item], item = _ref[0], array[0] = _ref[1];
      _siftup(array, 0, cmp);
    }
    return item;
  };


  /*
  Transform list into a heap, in-place, in O(array.length) time.
   */

  heapify = function(array, cmp) {
    var i, _i, _j, _len, _ref, _ref1, _results, _results1;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    _ref1 = (function() {
      _results1 = [];
      for (var _j = 0, _ref = floor(array.length / 2); 0 <= _ref ? _j < _ref : _j > _ref; 0 <= _ref ? _j++ : _j--){ _results1.push(_j); }
      return _results1;
    }).apply(this).reverse();
    _results = [];
    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
      i = _ref1[_i];
      _results.push(_siftup(array, i, cmp));
    }
    return _results;
  };


  /*
  Update the position of the given item in the heap.
  This function should be called every time the item is being modified.
   */

  updateItem = function(array, item, cmp) {
    var pos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    pos = array.indexOf(item);
    if (pos === -1) {
      return;
    }
    _siftdown(array, 0, pos, cmp);
    return _siftup(array, pos, cmp);
  };


  /*
  Find the n largest elements in a dataset.
   */

  nlargest = function(array, n, cmp) {
    var elem, result, _i, _len, _ref;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    result = array.slice(0, n);
    if (!result.length) {
      return result;
    }
    heapify(result, cmp);
    _ref = array.slice(n);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      elem = _ref[_i];
      heappushpop(result, elem, cmp);
    }
    return result.sort(cmp).reverse();
  };


  /*
  Find the n smallest elements in a dataset.
   */

  nsmallest = function(array, n, cmp) {
    var elem, i, los, result, _i, _j, _len, _ref, _ref1, _results;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    if (n * 10 <= array.length) {
      result = array.slice(0, n).sort(cmp);
      if (!result.length) {
        return result;
      }
      los = result[result.length - 1];
      _ref = array.slice(n);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        elem = _ref[_i];
        if (cmp(elem, los) < 0) {
          insort(result, elem, 0, null, cmp);
          result.pop();
          los = result[result.length - 1];
        }
      }
      return result;
    }
    heapify(array, cmp);
    _results = [];
    for (i = _j = 0, _ref1 = min(n, array.length); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; i = 0 <= _ref1 ? ++_j : --_j) {
      _results.push(heappop(array, cmp));
    }
    return _results;
  };

  _siftdown = function(array, startpos, pos, cmp) {
    var newitem, parent, parentpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    newitem = array[pos];
    while (pos > startpos) {
      parentpos = (pos - 1) >> 1;
      parent = array[parentpos];
      if (cmp(newitem, parent) < 0) {
        array[pos] = parent;
        pos = parentpos;
        continue;
      }
      break;
    }
    return array[pos] = newitem;
  };

  _siftup = function(array, pos, cmp) {
    var childpos, endpos, newitem, rightpos, startpos;
    if (cmp == null) {
      cmp = defaultCmp;
    }
    endpos = array.length;
    startpos = pos;
    newitem = array[pos];
    childpos = 2 * pos + 1;
    while (childpos < endpos) {
      rightpos = childpos + 1;
      if (rightpos < endpos && !(cmp(array[childpos], array[rightpos]) < 0)) {
        childpos = rightpos;
      }
      array[pos] = array[childpos];
      pos = childpos;
      childpos = 2 * pos + 1;
    }
    array[pos] = newitem;
    return _siftdown(array, startpos, pos, cmp);
  };

  Heap = (function() {
    Heap.push = heappush;

    Heap.pop = heappop;

    Heap.replace = heapreplace;

    Heap.pushpop = heappushpop;

    Heap.heapify = heapify;

    Heap.updateItem = updateItem;

    Heap.nlargest = nlargest;

    Heap.nsmallest = nsmallest;

    function Heap(cmp) {
      this.cmp = cmp != null ? cmp : defaultCmp;
      this.nodes = [];
    }

    Heap.prototype.push = function(x) {
      return heappush(this.nodes, x, this.cmp);
    };

    Heap.prototype.pop = function() {
      return heappop(this.nodes, this.cmp);
    };

    Heap.prototype.peek = function() {
      return this.nodes[0];
    };

    Heap.prototype.contains = function(x) {
      return this.nodes.indexOf(x) !== -1;
    };

    Heap.prototype.replace = function(x) {
      return heapreplace(this.nodes, x, this.cmp);
    };

    Heap.prototype.pushpop = function(x) {
      return heappushpop(this.nodes, x, this.cmp);
    };

    Heap.prototype.heapify = function() {
      return heapify(this.nodes, this.cmp);
    };

    Heap.prototype.updateItem = function(x) {
      return updateItem(this.nodes, x, this.cmp);
    };

    Heap.prototype.clear = function() {
      return this.nodes = [];
    };

    Heap.prototype.empty = function() {
      return this.nodes.length === 0;
    };

    Heap.prototype.size = function() {
      return this.nodes.length;
    };

    Heap.prototype.clone = function() {
      var heap;
      heap = new Heap();
      heap.nodes = this.nodes.slice(0);
      return heap;
    };

    Heap.prototype.toArray = function() {
      return this.nodes.slice(0);
    };

    Heap.prototype.insert = Heap.prototype.push;

    Heap.prototype.top = Heap.prototype.peek;

    Heap.prototype.front = Heap.prototype.peek;

    Heap.prototype.has = Heap.prototype.contains;

    Heap.prototype.copy = Heap.prototype.clone;

    return Heap;

  })();

  (function(root, factory) {
    if (typeof define === 'function' && define.amd) {
      return define([], factory);
    } else if (typeof exports === 'object') {
      return module.exports = factory();
    } else {
      return root.Heap = factory();
    }
  })(this, function() {
    return Heap;
  });

}).call(this);

},{}],26:[function(require,module,exports){
var bounds = function(b) {
  this.clear();
  if (b) this.union(b);
};

var prototype = bounds.prototype;

prototype.clear = function() {
  this.x1 = +Number.MAX_VALUE;
  this.y1 = +Number.MAX_VALUE;
  this.x2 = -Number.MAX_VALUE;
  this.y2 = -Number.MAX_VALUE;
  return this;
};

prototype.set = function(x1, y1, x2, y2) {
  this.x1 = x1;
  this.y1 = y1;
  this.x2 = x2;
  this.y2 = y2;
  return this;
};

prototype.add = function(x, y) {
  if (x < this.x1) this.x1 = x;
  if (y < this.y1) this.y1 = y;
  if (x > this.x2) this.x2 = x;
  if (y > this.y2) this.y2 = y;
  return this;
};

prototype.expand = function(d) {
  this.x1 -= d;
  this.y1 -= d;
  this.x2 += d;
  this.y2 += d;
  return this;
};

prototype.round = function() {
  this.x1 = Math.floor(this.x1);
  this.y1 = Math.floor(this.y1);
  this.x2 = Math.ceil(this.x2);
  this.y2 = Math.ceil(this.y2);
  return this;
};

prototype.translate = function(dx, dy) {
  this.x1 += dx;
  this.x2 += dx;
  this.y1 += dy;
  this.y2 += dy;
  return this;
};

prototype.rotate = function(angle, x, y) {
  var cos = Math.cos(angle),
      sin = Math.sin(angle),
      cx = x - x*cos + y*sin,
      cy = y - x*sin - y*cos,
      x1 = this.x1, x2 = this.x2,
      y1 = this.y1, y2 = this.y2;

  return this.clear()
    .add(cos*x1 - sin*y1 + cx,  sin*x1 + cos*y1 + cy)
    .add(cos*x1 - sin*y2 + cx,  sin*x1 + cos*y2 + cy)
    .add(cos*x2 - sin*y1 + cx,  sin*x2 + cos*y1 + cy)
    .add(cos*x2 - sin*y2 + cx,  sin*x2 + cos*y2 + cy);
}

prototype.union = function(b) {
  if (b.x1 < this.x1) this.x1 = b.x1;
  if (b.y1 < this.y1) this.y1 = b.y1;
  if (b.x2 > this.x2) this.x2 = b.x2;
  if (b.y2 > this.y2) this.y2 = b.y2;
  return this;
};

prototype.encloses = function(b) {
  return b && (
    this.x1 <= b.x1 &&
    this.x2 >= b.x2 &&
    this.y1 <= b.y1 &&
    this.y2 >= b.y2
  );
};

prototype.intersects = function(b) {
  return b && !(
    this.x2 < b.x1 ||
    this.x1 > b.x2 ||
    this.y2 < b.y1 ||
    this.y1 > b.y2
  );
};

prototype.contains = function(x, y) {
  return !(
    x < this.x1 ||
    x > this.x2 ||
    y < this.y1 ||
    y > this.y2
  );
};

prototype.width = function() {
  return this.x2 - this.x1;
};

prototype.height = function() {
  return this.y2 - this.y1;
};

module.exports = bounds;
},{}],27:[function(require,module,exports){
var Graph = require('../dataflow/Graph'), 
    Node  = require('../dataflow/Node'),
    GroupBuilder = require('../scene/GroupBuilder'),
    changeset = require('../dataflow/changeset'), 
    dl = require('datalib');

function Model() {
  this._defs = {};
  this._predicates = {};
  this._scene = null;

  this.graph = new Graph();

  this._node = new Node(this.graph);
  this._builder = null; // Top-level scenegraph builder
};

var proto = Model.prototype;

proto.defs = function(defs) {
  if (!arguments.length) return this._defs;
  this._defs = defs;
  return this;
};

proto.data = function() {
  var data = this.graph.data.apply(this.graph, arguments);
  if(arguments.length > 1) {  // new Datasource
    this._node.addListener(data.pipeline()[0]);
  }

  return data;
};

function predicates(name) {
  var m = this, predicates = {};
  if(!dl.isArray(name)) return this._predicates[name];
  name.forEach(function(n) { predicates[n] = m._predicates[n] });
  return predicates;
}

proto.predicate = function(name, predicate) {
  if(arguments.length === 1) return predicates.call(this, name);
  return (this._predicates[name] = predicate);
};

proto.predicates = function() { return this._predicates; };

proto.scene = function(renderer) {
  if(!arguments.length) return this._scene;
  if(this._builder) this._node.removeListener(this._builder.disconnect());
  this._builder = new GroupBuilder(this, this._defs.marks, this._scene={});
  this._node.addListener(this._builder.connect());
  var p = this._builder.pipeline();
  p[p.length-1].addListener(renderer);
  return this;
};

proto.addListener = function(l) { this._node.addListener(l); };
proto.removeListener = function(l) { this._node.removeListener(l); };

proto.fire = function(cs) {
  if(!cs) cs = changeset.create();
  this.graph.propagate(cs, this._node);
};

module.exports = Model;
},{"../dataflow/Graph":31,"../dataflow/Node":32,"../dataflow/changeset":34,"../scene/GroupBuilder":68,"datalib":16}],28:[function(require,module,exports){
(function (global){
var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null),
    dl = require('datalib'),
    Node = require('../dataflow/Node'),
    parseStreams = require('../parse/streams'),
    canvas = require('../render/canvas/index'),
    svg = require('../render/svg/index'),
    Transition = require('../scene/Transition'),
    config = require('../util/config'),
    debug = require('../util/debug'),
    changeset = require('../dataflow/changeset');

var View = function(el, width, height, model) {
  this._el    = null;
  this._model = null;
  this._width = this.__width = width || 500;
  this._height = this.__height = height || 300;
  this._autopad = 1;
  this._padding = {top:0, left:0, bottom:0, right:0};
  this._viewport = null;
  this._renderer = null;
  this._handler = null;
  this._io = canvas;
  if (el) this.initialize(el);
};

var prototype = View.prototype;

prototype.model = function(model) {
  if (!arguments.length) return this._model;
  if (this._model !== model) {
    this._model = model;
    if (this._handler) this._handler.model(model);
  }
  return this;
};

prototype.data = function(data) {
  var m = this.model();
  if (!arguments.length) return m.data();
  dl.keys(data).forEach(function(d) { m.data(d).add(dl.duplicate(data[d])); });
  return this;
};

prototype.width = function(width) {
  if (!arguments.length) return this.__width;
  if (this.__width !== width) {
    this._width = this.__width = width;
    if (this._el) this.initialize(this._el.parentNode);
    if (this._strict) this._autopad = 1;
  }
  return this;
};

prototype.height = function(height) {
  if (!arguments.length) return this.__height;
  if (this.__height !== height) {
    this._height = this.__height = height;
    if (this._el) this.initialize(this._el.parentNode);
    if (this._strict) this._autopad = 1;
  }
  return this;
};

prototype.padding = function(pad) {
  if (!arguments.length) return this._padding;
  if (this._padding !== pad) {
    if (dl.isString(pad)) {
      this._autopad = 1;
      this._padding = {top:0, left:0, bottom:0, right:0};
      this._strict = (pad === "strict");
    } else {
      this._autopad = 0;
      this._padding = pad;
      this._strict = false;
    }
    if (this._el) {
      this._renderer.resize(this._width, this._height, pad);
      this._handler.padding(pad);
    }
  }
  return this;
};

prototype.autopad = function(opt) {
  if (this._autopad < 1) return this;
  else this._autopad = 0;

  var pad = this._padding,
      b = this.model().scene().bounds,
      inset = config.autopadInset,
      l = b.x1 < 0 ? Math.ceil(-b.x1) + inset : 0,
      t = b.y1 < 0 ? Math.ceil(-b.y1) + inset : 0,
      r = b.x2 > this._width  ? Math.ceil(+b.x2 - this._width) + inset : 0,
      b = b.y2 > this._height ? Math.ceil(+b.y2 - this._height) + inset : 0;
  pad = {left:l, top:t, right:r, bottom:b};

  if (this._strict) {
    this._autopad = 0;
    this._padding = pad;
    this._width = Math.max(0, this.__width - (l+r));
    this._height = Math.max(0, this.__height - (t+b));
    this._model.width(this._width);
    this._model.height(this._height);
    if (this._el) this.initialize(this._el.parentNode);
    this.update();
  } else {
    this.padding(pad).update(opt);
  }
  return this;
};

prototype.viewport = function(size) {
  if (!arguments.length) return this._viewport;
  if (this._viewport !== size) {
    this._viewport = size;
    if (this._el) this.initialize(this._el.parentNode);
  }
  return this;
};

prototype.renderer = function(type) {
  if (!arguments.length) return this._io;
  if (type === "canvas") type = canvas;
  if (type === "svg") type = svg;
  if (this._io !== type) {
    this._io = type;
    this._renderer = null;
    if (this._el) this.initialize(this._el.parentNode);
    if (this._build) this.render();
  }
  return this;
};

prototype.initialize = function(el) {
  var v = this, prevHandler,
      w = v._width, h = v._height, pad = v._padding;
  
  // clear pre-existing container
  d3.select(el).select("div.vega").remove();
  
  // add div container
  this._el = el = d3.select(el)
    .append("div")
    .attr("class", "vega")
    .style("position", "relative")
    .node();
  if (v._viewport) {
    d3.select(el)
      .style("width",  (v._viewport[0] || w)+"px")
      .style("height", (v._viewport[1] || h)+"px")
      .style("overflow", "auto");
  }
  
  // renderer
  v._renderer = (v._renderer || new this._io.Renderer())
    .initialize(el, w, h, pad);
  
  // input handler
  prevHandler = v._handler;
  v._handler = new this._io.Handler()
    .initialize(el, pad, v)
    .model(v._model);

  if (prevHandler) {
    prevHandler.handlers().forEach(function(h) {
      v._handler.on(h.type, h.handler);
    });
  } else {
    // Register event listeners for signal stream definitions.
    parseStreams(this);
  }
  
  return this;
};

prototype.update = function(opt) {    
  opt = opt || {};
  var v = this,
      trans = opt.duration
        ? new Transition(opt.duration, opt.ease)
        : null;

  // TODO: with streaming data API, adds should dl.duplicate just parseSpec
  // to prevent Vega from polluting the environment.

  var cs = changeset.create();
  if(trans) cs.trans = trans;
  if(opt.reflow !== undefined) cs.reflow = opt.reflow

  if(!v._build) {
    v._renderNode = new Node(v._model.graph)
      .router(true);

    v._renderNode.evaluate = function(input) {
      debug(input, ["rendering"]);

      var s = v._model.scene();
      if(input.trans) {
        input.trans.start(function(items) { v._renderer.render(s, items); });
      } else {
        v._renderer.render(s);
      }

      // For all updated datasources, finalize their changesets.
      var d, ds;
      for(d in input.data) {
        ds = v._model.data(d);
        if(!ds.revises()) continue;
        changeset.finalize(ds.last());
      }

      return input;
    };

    v._model.scene(v._renderNode);
    v._build = true;
  }

  // Pulse the entire model (Datasources + scene).
  v._model.fire(cs);

  return v.autopad(opt);
};

prototype.on = function() {
  this._handler.on.apply(this._handler, arguments);
  return this;
};

prototype.off = function() {
  this._handler.off.apply(this._handler, arguments);
  return this;
};

View.factory = function(model) {
  return function(opt) {
    opt = opt || {};
    var defs = model.defs();
    var v = new View()
      .model(model)
      .width(defs.width)
      .height(defs.height)
      .padding(defs.padding)
      .renderer(opt.renderer || "canvas");

    if (opt.el) v.initialize(opt.el);
    if (opt.data) v.data(opt.data);
  
    return v;
  };    
};

module.exports = View;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../dataflow/Node":32,"../dataflow/changeset":34,"../parse/streams":54,"../render/canvas/index":58,"../render/svg/index":63,"../scene/Transition":71,"../util/config":91,"../util/debug":93,"datalib":16}],29:[function(require,module,exports){
var Node = require('./Node'),
    changeset = require('./changeset'),
    debug = require('../util/debug'),
    C = require('../util/constants');

function Collector(graph) {
  Node.prototype.init.call(this, graph);
  this._data = [];
  return this.router(true)
    .collector(true);
}

var proto = (Collector.prototype = new Node());

proto.data = function() { return this._data; }

proto.evaluate = function(input) {
  debug(input, ["collecting"]);

  if(input.reflow) {
    input = changeset.create(input);
    input.mod = this._data.slice();
    return input;
  }

  if(input.rem.length) {
    var ids = input.rem.reduce(function(m,x) { return (m[x._id]=1, m); }, {});
    this._data = this._data.filter(function(x) { return ids[x._id] !== 1; });
  }

  if(input.add.length) {
    this._data = this._data.length ? this._data.concat(input.add) : input.add;
  }

  if(input.sort) {
    this._data.sort(input.sort);
  }

  return input;
};

module.exports = Collector;
},{"../util/constants":92,"../util/debug":93,"./Node":32,"./changeset":34}],30:[function(require,module,exports){
var dl = require('datalib'),
    changeset = require('./changeset'), 
    tuple = require('./tuple'), 
    Node = require('./Node'),
    Collector = require('./Collector'),
    debug = require('../util/debug'),
    C = require('../util/constants');

function Datasource(graph, name, facet) {
  this._graph = graph;
  this._name = name;
  this._data = [];
  this._source = null;
  this._facet = facet;
  this._input = changeset.create();
  this._output = null;    // Output changeset

  this._pipeline  = null; // Pipeline of transformations.
  this._collector = null; // Collector to materialize output of pipeline
  this._revises = false; // Does any pipeline operator need to track prev?
};

var proto = Datasource.prototype;

proto.name = function(name) {
  if(!arguments.length) return this._name;
  return (this._name = name, this);
};

proto.source = function(src) {
  if(!arguments.length) return this._source;
  return (this._source = this._graph.data(src));
};

proto.add = function(d) {
  var prev = this._revises ? null : undefined;

  this._input.add = this._input.add
    .concat(dl.array(d).map(function(d) { return tuple.ingest(d, prev); }));
  return this;
};

proto.remove = function(where) {
  var d = this._data.filter(where);
  this._input.rem = this._input.rem.concat(d);
  return this;
};

proto.update = function(where, field, func) {
  var mod = this._input.mod,
      ids = tuple.idMap(mod),
      prev = this._revises ? null : undefined; 

  this._input.fields[field] = 1;
  this._data.filter(where).forEach(function(x) {
    var prev = x[field],
        next = func(x);
    if (prev !== next) {
      tuple.set(x, field, next);
      if(ids[x._id] !== 1) {
        mod.push(x);
        ids[x._id] = 1;
      }
    }
  });
  return this;
};

proto.values = function(data) {
  if(!arguments.length)
    return this._collector ? this._collector.data() : this._data;

  // Replace backing data
  this._input.rem = this._data.slice();
  if (data) { this.add(data); }
  return this;
};

function set_prev(d) { if(d._prev === undefined) d._prev = C.SENTINEL; }

proto.revises = function(p) {
  if(!arguments.length) return this._revises;

  // If we've not needed prev in the past, but a new dataflow node needs it now
  // ensure existing tuples have prev set.
  if(!this._revises && p) {
    this._data.forEach(set_prev);
    this._input.add.forEach(set_prev); // New tuples that haven't yet been merged into _data
  }

  this._revises = this._revises || p;
  return this;
};

proto.last = function() { return this._output; };

proto.fire = function(input) {
  if(input) this._input = input;
  this._graph.propagate(this._input, this._pipeline[0]); 
};

proto.pipeline = function(pipeline) {
  var ds = this, n, c;
  if(!arguments.length) return this._pipeline;

  if(pipeline.length) {
    // If we have a pipeline, add a collector to the end to materialize
    // the output.
    ds._collector = new Collector(this._graph);
    pipeline.push(ds._collector);
    ds._revises = pipeline.some(function(p) { return p.revises(); });
  }

  // Input node applies the datasource's delta, and propagates it to 
  // the rest of the pipeline. It receives touches to reflow data.
  var input = new Node(this._graph)
    .router(true)
    .collector(true);

  input.evaluate = function(input) {
    debug(input, ["input", ds._name]);

    var delta = ds._input, 
        out = changeset.create(input),
        rem;

    // Delta might contain fields updated through API
    dl.keys(delta.fields).forEach(function(f) { out.fields[f] = 1 });

    if(input.reflow) {
      out.mod = ds._data.slice();
    } else {
      // update data
      if(delta.rem.length) {
        rem = tuple.idMap(delta.rem);
        ds._data = ds._data
          .filter(function(x) { return rem[x._id] !== 1 });
      }

      if(delta.add.length) ds._data = ds._data.concat(delta.add);

      // reset change list
      ds._input = changeset.create();

      out.add = delta.add; 
      out.mod = delta.mod;
      out.rem = delta.rem;
    }

    return (out.facet = ds._facet, out);
  };

  pipeline.unshift(input);

  // Output node captures the last changeset seen by this datasource
  // (needed for joins and builds) and materializes any nested data.
  // If this datasource is faceted, materializes the values in the facet.
  var output = new Node(this._graph)
    .router(true)
    .collector(true);

  output.evaluate = function(input) {
    debug(input, ["output", ds._name]);
    var output = changeset.create(input, true);

    if(ds._facet) {
      ds._facet.values = ds.values();
      input.facet = null;
    }

    ds._output = input;
    output.data[ds._name] = 1;
    return output;
  };

  pipeline.push(output);

  this._pipeline = pipeline;
  this._graph.connect(ds._pipeline);
  return this;
};

proto.listener = function() { 
  var l = new Node(this._graph).router(true),
      dest = this,
      prev = this._revises ? null : undefined;

  l.evaluate = function(input) {
    dest._srcMap = dest._srcMap || {};  // to propagate tuples correctly
    var map = dest._srcMap,
        output  = changeset.create(input);

    output.add = input.add.map(function(t) {
      return (map[t._id] = tuple.derive(t, t._prev !== undefined ? t._prev : prev));
    });
    output.mod = input.mod.map(function(t) { return map[t._id]; });
    output.rem = input.rem.map(function(t) { 
      var o = map[t._id];
      map[t._id] = null;
      return o;
    });

    return (dest._input = output);
  };

  l.addListener(this._pipeline[0]);
  return l;
};

proto.addListener = function(l) {
  if(l instanceof Datasource) {
    if(this._collector) this._collector.addListener(l.listener());
    else this._pipeline[0].addListener(l.listener());
  } else {
    this._pipeline[this._pipeline.length-1].addListener(l);      
  }

  return this;
};

proto.removeListener = function(l) {
  this._pipeline[this._pipeline.length-1].removeListener(l);
};

module.exports = Datasource;
},{"../util/constants":92,"../util/debug":93,"./Collector":29,"./Node":32,"./changeset":34,"./tuple":35,"datalib":16}],31:[function(require,module,exports){
var dl = require('datalib'),
    Heap = require('heap'),
    Datasource = require('./Datasource'),
    Signal = require('./Signal'),
    changeset = require('./changeset'),
    debug = require('../util/debug'),
    C = require('../util/constants');

function Graph() {
  this._stamp = 0;
  this._rank  = 0;

  this._data = {};
  this._signals = {};

  this.doNotPropagate = {};
}

var proto = Graph.prototype;

proto.data = function(name, pipeline, facet) {
  if(arguments.length === 1) return this._data[name];
  return (this._data[name] = new Datasource(this, name, facet)
    .pipeline(pipeline));
};

function signal(name) {
  var m = this, i, len;
  if(!dl.isArray(name)) return this._signals[name];
  return name.map(function(n) { m._signals[n]; });
}

proto.signal = function(name, init) {
  var m = this;
  if(arguments.length === 1) return signal.call(this, name);
  return (this._signals[name] = new Signal(this, name, init));
};

proto.signalValues = function(name) {
  var graph = this;
  if(!dl.isArray(name)) return this._signals[name].value();
  return name.reduce(function(sg, n) {
    return (sg[n] = graph._signals[n].value(), sg);
  }, {});
};

proto.signalRef = function(ref) {
  if(!dl.isArray(ref)) ref = dl.field(ref);
  var value = this.signal(ref.shift()).value();
  if(ref.length > 0) {
    var fn = Function("s", "return s["+ref.map(dl.str).join("][")+"]");
    value = fn.call(null, value);
  }

  return value;
};

var schedule = function(a, b) {
  // If the nodes are equal, propagate the non-reflow pulse first,
  // so that we can ignore subsequent reflow pulses. 
  if(a.rank == b.rank) return a.pulse.reflow ? 1 : -1;
  else return a.rank - b.rank; 
};

proto.propagate = function(pulse, node) {
  var v, l, n, p, r, i, len, reflowed;

  // new PQ with each propagation cycle so that we can pulse branches
  // of the dataflow graph during a propagation (e.g., when creating
  // a new inline datasource).
  var pq = new Heap(schedule); 

  if(pulse.stamp) throw "Pulse already has a non-zero stamp"

  pulse.stamp = ++this._stamp;
  pq.push({ node: node, pulse: pulse, rank: node.rank() });

  while (pq.size() > 0) {
    v = pq.pop(), n = v.node, p = v.pulse, r = v.rank, l = n._listeners;
    reflowed = p.reflow && n.last() >= p.stamp;

    if(reflowed) continue; // Don't needlessly reflow ops.

    // A node's rank might change during a propagation (e.g. instantiating
    // a group's dataflow branch). Re-queue if it has. T
    // TODO: use pq.replace or pq.poppush?
    if(r != n.rank()) {
      debug(p, ['Rank mismatch', r, n.rank()]);
      pq.push({ node: n, pulse: p, rank: n.rank() });
      continue;
    }

    p = this.evaluate(p, n);

    // Even if we didn't run the node, we still want to propagate 
    // the pulse. 
    if (p !== this.doNotPropagate) {
      for (i = 0, len = l.length; i < len; i++) {
        pq.push({ node: l[i], pulse: p, rank: l[i]._rank });
      }
    }
  }
};

// Connect a branch of dataflow nodes. 
// Dependencies get wired to the nearest collector. 
function forEachNode(branch, fn) {
  var node, collector, i, len;
  for(i=0, len=branch.length; i<len; ++i) {
    node = branch[i];
    if(node.collector()) collector = node;
    fn(node, collector, i);
  }
}

proto.connect = function(branch) {
  debug({}, ['connecting']);
  var graph = this;
  forEachNode(branch, function(n, c, i) {
    var data = n.dependency(C.DATA),
        signals = n.dependency(C.SIGNALS);

    if(data.length > 0) {
      data.forEach(function(d) { 
        graph.data(d)
          .revises(n.revises())
          .addListener(c);
      });
    }

    if(signals.length > 0) {
      signals.forEach(function(s) { graph.signal(s).addListener(c); });
    }

    if(i > 0) {
      branch[i-1].addListener(branch[i]);
    }
  });

  return branch;
};

proto.disconnect = function(branch) {
  debug({}, ['disconnecting']);
  var graph = this;

  forEachNode(branch, function(n, c, i) {
    var data = n.dependency(C.DATA),
        signals = n.dependency(C.SIGNALS);

    if(data.length > 0) {
      data.forEach(function(d) { graph.data(d).removeListener(c); });
    }

    if(signals.length > 0) {
      signals.forEach(function(s) { graph.signal(s).removeListener(c) });
    }

    n.disconnect();  
  });

  return branch;
};

proto.reevaluate = function(pulse, node) {
  var reflowed = !pulse.reflow || (pulse.reflow && node.last() >= pulse.stamp),
      run = !!pulse.add.length || !!pulse.rem.length || node.router();
  run = run || !reflowed;
  return run || node.reevaluate(pulse);
};

proto.evaluate = function(pulse, node) {
  if(!this.reevaluate(pulse, node)) return pulse;
  pulse = node.evaluate(pulse);
  node.last(pulse.stamp);
  return pulse
};

module.exports = Graph;
},{"../util/constants":92,"../util/debug":93,"./Datasource":30,"./Signal":33,"./changeset":34,"datalib":16,"heap":24}],32:[function(require,module,exports){
var dl = require('datalib'),
    C = require('../util/constants'),
    REEVAL = [C.DATA, C.FIELDS, C.SCALES, C.SIGNALS];

var node_id = 1;

function Node(graph) {
  if(graph) this.init(graph);
  return this;
}

var proto = Node.prototype;

proto.init = function(graph) {
  this._id = node_id++;
  this._graph = graph;
  this._rank = ++graph._rank; // For topologial sort
  this._stamp = 0;  // Last stamp seen

  this._listeners = [];
  this._registered = {}; // To prevent duplicate listeners

  this._deps = {
    data:    [],
    fields:  [],
    scales:  [],
    signals: [],
  };

  this._isRouter = false; // Responsible for propagating tuples, cannot ever be skipped
  this._isCollector = false;  // Holds a materialized dataset, pulse to reflow
  this._revises = false; // Does the operator require tuples' previous values? 
  return this;
};

proto.clone = function() {
  var n = new Node(this._graph);
  n.evaluate = this.evaluate;
  n._deps = this._deps;
  n._isRouter = this._isRouter;
  n._isCollector = this._isCollector;
  return n;
};

proto.rank = function() { return this._rank; };

proto.last = function(stamp) { 
  if(!arguments.length) return this._stamp;
  this._stamp = stamp;
  return this;
};

proto.dependency = function(type, deps) {
  var d = this._deps[type];
  if(arguments.length === 1) return d;
  if(deps === null) { // Clear dependencies of a certain type
    while(d.length > 0) d.pop();
  } else {
    if(!dl.isArray(deps) && d.indexOf(deps) < 0) d.push(deps);
    else d.push.apply(d, dl.array(deps));
  }
  return this;
};

proto.router = function(bool) {
  if(!arguments.length) return this._isRouter;
  this._isRouter = !!bool
  return this;
};

proto.collector = function(bool) {
  if(!arguments.length) return this._isCollector;
  this._isCollector = !!bool;
  return this;
};

proto.revises = function(bool) {
  if(!arguments.length) return this._revises;
  this._revises = !!bool;
  return this;
};

proto.listeners = function() {
  return this._listeners;
};

proto.addListener = function(l) {
  if(!(l instanceof Node)) throw "Listener is not a Node";
  if(this._registered[l._id]) return this;

  this._listeners.push(l);
  this._registered[l._id] = 1;
  if(this._rank > l._rank) {
    var q = [l];
    while(q.length) {
      var cur = q.splice(0,1)[0];
      cur._rank = ++this._graph._rank;
      q.push.apply(q, cur._listeners);
    }
  }

  return this;
};

proto.removeListener = function (l) {
  var foundSending = false;
  for (var i = 0, len = this._listeners.length; i < len && !foundSending; i++) {
    if (this._listeners[i] === l) {
      this._listeners.splice(i, 1);
      this._registered[l._id] = null;
      foundSending = true;
    }
  }
  
  return foundSending;
};

proto.disconnect = function() {
  this._listeners = [];
  this._registered = {};
};

proto.evaluate = function(pulse) { return pulse; }

proto.reevaluate = function(pulse) {
  var node = this, reeval = false;
  return REEVAL.some(function(prop) {
    reeval = reeval || node._deps[prop].some(function(k) { return !!pulse[prop][k] });
    return reeval;
  });

  return this;
};

module.exports = Node;
},{"../util/constants":92,"datalib":16}],33:[function(require,module,exports){
var Node = require('./Node'),
    changeset = require('./changeset');

function Signal(graph, name, init) {
  Node.prototype.init.call(this, graph);
  this._name  = name;
  this._value = init;
  return this;
};

var proto = (Signal.prototype = new Node());

proto.name = function() { return this._name; };

proto.value = function(val) {
  if(!arguments.length) return this._value;
  this._value = val;
  return this;
};

proto.fire = function(cs) {
  if(!cs) cs = changeset.create(null, true);
  cs.signals[this._name] = 1;
  this._graph.propagate(cs, this);
};

module.exports = Signal;
},{"./Node":32,"./changeset":34}],34:[function(require,module,exports){
var C = require('../util/constants');
var REEVAL = [C.DATA, C.FIELDS, C.SCALES, C.SIGNALS];

function create(cs, reflow) {
  var out = {};
  copy(cs, out);

  out.add = [];
  out.mod = [];
  out.rem = [];

  out.reflow = reflow;

  return out;
}

function reset_prev(x) {
  x._prev = (x._prev === undefined) ? undefined : C.SENTINEL;
}

function finalize(cs) {
  for(i=0, len=cs.add.length; i<len; ++i) reset_prev(cs.add[i]);
  for(i=0, len=cs.mod.length; i<len; ++i) reset_prev(cs.mod[i]);
}

function copy(a, b) {
  b.stamp = a ? a.stamp : 0;
  b.sort  = a ? a.sort  : null;
  b.facet = a ? a.facet : null;
  b.trans = a ? a.trans : null;
  REEVAL.forEach(function(d) { b[d] = a ? a[d] : {}; });
}

module.exports = {
  create: create,
  copy: copy,
  finalize: finalize,
};
},{"../util/constants":92}],35:[function(require,module,exports){
var dl = require('datalib'),
    C = require('../util/constants'),
    tuple_id = 1;

// Object.create is expensive. So, when ingesting, trust that the
// datum is an object that has been appropriately sandboxed from 
// the outside environment. 
function ingest(datum, prev) {
  datum = dl.isObject(datum) ? datum : {data: datum};
  datum._id = tuple_id++;
  datum._prev = (prev !== undefined) ? (prev || C.SENTINEL) : undefined;
  return datum;
}

function derive(datum, prev) {
  return ingest(Object.create(datum), prev);
}

// WARNING: operators should only call this once per timestamp!
function set(t, k, v) {
  var prev = t[k];
  if(prev === v) return;
  set_prev(t, k);
  t[k] = v;
}

function set_prev(t, k) {
  if(t._prev === undefined) return;
  t._prev = (t._prev === C.SENTINEL) ? {} : t._prev;
  t._prev[k] = t[k];
}

function reset() { tuple_id = 1; }

function idMap(a) {
  return a.reduce(function(m,x) {
    return (m[x._id] = 1, m);
  }, {});
};

module.exports = {
  ingest: ingest,
  derive: derive,
  set:    set,
  prev:   set_prev,
  reset:  reset,
  idMap:  idMap
};
},{"../util/constants":92,"datalib":16}],36:[function(require,module,exports){
var dl = require('datalib');

module.exports = function(opt) {
  opt = opt || {};
  var constants = opt.constants || require('./constants');
  var functions = (opt.functions || require('./functions'))(codegen);
  var idWhiteList = opt.idWhiteList ? dl.toMap(opt.idWhiteList) : null;
  var idBlackList = opt.idBlackList ? dl.toMap(opt.idBlackList) : null;
  var memberDepth = 0;

  // TODO generalize?
  var DATUM = 'd';
  var SIGNAL_PREFIX = 'sg.';
  var signals = {};
  var fields = {};

  function codegen_wrap(ast) {    
    var retval = {
      fn: codegen(ast),
      signals: dl.keys(signals),
      fields: dl.keys(fields)
    };
    signals = {};
    fields = {};
    return retval;
  }

  function codegen(ast) {
    if (ast instanceof String) return ast;
    var generator = CODEGEN_TYPES[ast.type];
    if (generator == null) {
      throw new Error("Unsupported type: " + ast.type);
    }
    return generator(ast);
  }

  var CODEGEN_TYPES = {
    "Literal": function(n) {
        return n.raw;
      },
    "Identifier": function(n) {
        var id = n.name;
        if (memberDepth > 0) {
          return id;
        }
        if (constants.hasOwnProperty(id)) {
          return constants[id];
        }
        if (idWhiteList) {
          if (idWhiteList.hasOwnProperty(id)) {
            return id;
          } else {
            signals[id] = 1;
            return SIGNAL_PREFIX + id; // HACKish...
          }
        }
        if (idBlackList && idBlackList.hasOwnProperty(id)) {
          throw new Error("Illegal identifier: " + id);
        }
        return id;
      },
    "Program": function(n) {
        return n.body.map(codegen).join("\n");
      },
    "MemberExpression": function(n) {
        var d = !n.computed;
        var o = codegen(n.object);
        if (d) memberDepth += 1;
        var p = codegen(n.property);
        if (o === DATUM) { fields[p] = 1; } // HACKish...
        if (d) memberDepth -= 1;
        return o + (d ? "."+p : "["+p+"]");
      },
    "CallExpression": function(n) {
        if (n.callee.type !== "Identifier") {
          throw new Error("Illegal callee type: " + n.callee.type);
        }
        var callee = n.callee.name;
        var args = n.arguments;
        var fn = functions.hasOwnProperty(callee) && functions[callee];
        if (!fn) throw new Error("Unrecognized function: " + callee);
        return fn instanceof Function
          ? fn(args)
          : fn + "(" + args.map(codegen).join(",") + ")";
      },
    "ArrayExpression": function(n) {
        return "[" + n.elements.map(codegen).join(",") + "]";
      },
    "BinaryExpression": function(n) {
        return "(" + codegen(n.left) + n.operator + codegen(n.right) + ")";
      },
    "UnaryExpression": function(n) {
        return "(" + n.operator + codegen(n.argument) + ")";
      },
    "UpdateExpression": function(n) {
        return "(" + (prefix
          ? n.operator + codegen(n.argument)
          : codegen(n.argument) + n.operator
        ) + ")";
      },
    "ConditionalExpression": function(n) {
        return "(" + codegen(n.test)
          + "?" + codegen(n.consequent)
          + ":" + codegen(n.alternate)
          + ")";
      },
    "LogicalExpression": function(n) {
        return "(" + codegen(n.left) + n.operator + codegen(n.right) + ")";
      },
    "ObjectExpression": function(n) {
        return "{" + n.properties.map(codegen).join(",") + "}";
      },
    "Property": function(n) {
        memberDepth += 1;
        var k = codegen(n.key);
        memberDepth -= 1;
        return k + ":" + codegen(n.value);
      },
    "ExpressionStatement": function(n) {
        return codegen(n.expression);
      }
  };
  
  return codegen_wrap;
};
},{"./constants":37,"./functions":38,"datalib":16}],37:[function(require,module,exports){
module.exports = {
  "NaN":     "NaN",
  "E":       "Math.E",
  "LN2":     "Math.LN2",
  "LN10":    "Math.LN10",
  "LOG2E":   "Math.LOG2E",
  "LOG10E":  "Math.LOG10E",
  "PI":      "Math.PI",
  "SQRT1_2": "Math.SQRT1_2",
  "SQRT2":   "Math.SQRT2"
};
},{}],38:[function(require,module,exports){
var datalib = require('datalib');

module.exports = function(codegen) {

  function fncall(name, args, cast, type) {
    var obj = codegen(args[0]);
    if (cast) {
      obj = cast + "(" + obj + ")";
      if (dl.startsWith(cast, "new ")) obj = "(" + obj + ")";
    }
    return obj + "." + name + (type < 0 ? "" : type === 0
      ? "()"
      : "(" + args.slice(1).map(codegen).join(",") + ")");
  }
  
  var DATE = "new Date";
  var STRING = "String";
  var REGEXP = "RegExp";

  return {
    // MATH functions
    "isNaN":    "isNaN",
    "isFinite": "isFinite",
    "abs":      "Math.abs",
    "acos":     "Math.acos",
    "asin":     "Math.asin",
    "atan":     "Math.atan",
    "atan2":    "Math.atan2",
    "ceil":     "Math.ceil",
    "cos":      "Math.cos",
    "exp":      "Math.exp",
    "floor":    "Math.floor",
    "log":      "Math.log",
    "max":      "Math.max",
    "min":      "Math.min",
    "pow":      "Math.pow",
    "random":   "Math.random",
    "round":    "Math.round",
    "sin":      "Math.sin",
    "sqrt":     "Math.sqrt",
    "tan":      "Math.tan",

    // DATE functions
    "now":      "Date.now",
    "datetime": "new Date",
    "date": function(args) {
        return fncall("getDate", args, DATE, 0);
      },
    "day": function(args) {
        return fncall("getDay", args, DATE, 0);
      },
    "year": function(args) {
        return fncall("getFullYear", args, DATE, 0);
      },
    "month": function(args) {
        return fncall("getMonth", args, DATE, 0);
      },
    "hours": function(args) {
        return fncall("getHours", args, DATE, 0);
      },
    "minutes": function(args) {
        return fncall("getMinutes", args, DATE, 0);
      },
    "seconds": function(args) {
        return fncall("getSeconds", args, DATE, 0);
      },
    "milliseconds": function(args) {
        return fncall("getMilliseconds", args, DATE, 0);
      },
    "time": function(args) {
        return fncall("getTime", args, DATE, 0);
      },
    "timezoneoffset": function(args) {
        return fncall("getTimezoneOffset", args, DATE, 0);
      },
    "utcdate": function(args) {
        return fncall("getUTCDate", args, DATE, 0);
      },
    "utcday": function(args) {
        return fncall("getUTCDay", args, DATE, 0);
      },
    "utcyear": function(args) {
        return fncall("getUTCFullYear", args, DATE, 0);
      },
    "utcmonth": function(args) {
        return fncall("getUTCMonth", args, DATE, 0);
      },
    "utchours": function(args) {
        return fncall("getUTCHours", args, DATE, 0);
      },
    "utcminutes": function(args) {
        return fncall("getUTCMinutes", args, DATE, 0);
      },
    "utcseconds": function(args) {
        return fncall("getUTCSeconds", args, DATE, 0);
      },
    "utcmilliseconds": function(args) {
        return fncall("getUTCMilliseconds", args, DATE, 0);
      },

    // shared sequence functions
    "length": function(args) {
        return fncall("length", args, null, -1);
      },
    "indexof": function(args) {
        return fncall("indexOf", args, null);
      },
    "lastindexof": function(args) {
        return fncall("lastIndexOf", args, null);
      },

    // STRING functions
    "parseFloat": "parseFloat",
    "parseInt": "parseInt",
    "upper": function(args) {
        return fncall("toUpperCase", args, STRING, 0);
      },
    "lower": function(args) {
        return fncall("toLowerCase", args, STRING, 0);
      },
    "slice": function(args) {
        return fncall("slice", args, STRING);
      },
    "substring": function(args) {
        return fncall("substring", args, STRING);
      },

    // REGEXP functions
    "test": function(args) {
        return fncall("test", args, REGEXP);
      },
    
    // Control Flow functions
    "if": function(args) {
        if (args.length < 3)
          throw new Error("Missing arguments to if function.");
        if (args.length > 3)
        throw new Error("Too many arguments to if function.");
        var a = args.map(codegen);
        return a[0]+"?"+a[1]+":"+a[2];
      }
  };
};
},{"datalib":16}],39:[function(require,module,exports){
var parser = require('./parser'),
    codegen = require('./codegen');
    
module.exports = {
  parse: function(input, opt) { return parser.parse("("+input+")", opt); },
  code: function(opt) { return codegen(opt); }
};

},{"./codegen":36,"./parser":40}],40:[function(require,module,exports){
/*
  The following expression parser is based on Esprima (http://esprima.org/).
  Original header comment and license for Esprima is included here:

  Copyright (C) 2013 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2013 Thaddee Tyl <thaddee.tyl@gmail.com>
  Copyright (C) 2013 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2012 Mathias Bynens <mathias@qiwi.be>
  Copyright (C) 2012 Joost-Wim Boekesteijn <joost-wim@boekesteijn.nl>
  Copyright (C) 2012 Kris Kowal <kris.kowal@cixar.com>
  Copyright (C) 2012 Yusuke Suzuki <utatane.tea@gmail.com>
  Copyright (C) 2012 Arpad Borsos <arpad.borsos@googlemail.com>
  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
module.exports = (function() {
  'use strict';

  var Token,
      TokenName,
      Syntax,
      PropertyKind,
      Messages,
      Regex,
      source,
      strict,
      index,
      lineNumber,
      lineStart,
      length,
      lookahead,
      state,
      extra;

  Token = {
      BooleanLiteral: 1,
      EOF: 2,
      Identifier: 3,
      Keyword: 4,
      NullLiteral: 5,
      NumericLiteral: 6,
      Punctuator: 7,
      StringLiteral: 8,
      RegularExpression: 9
  };

  TokenName = {};
  TokenName[Token.BooleanLiteral] = 'Boolean';
  TokenName[Token.EOF] = '<end>';
  TokenName[Token.Identifier] = 'Identifier';
  TokenName[Token.Keyword] = 'Keyword';
  TokenName[Token.NullLiteral] = 'Null';
  TokenName[Token.NumericLiteral] = 'Numeric';
  TokenName[Token.Punctuator] = 'Punctuator';
  TokenName[Token.StringLiteral] = 'String';
  TokenName[Token.RegularExpression] = 'RegularExpression';

  Syntax = {
      AssignmentExpression: 'AssignmentExpression',
      ArrayExpression: 'ArrayExpression',
      BinaryExpression: 'BinaryExpression',
      CallExpression: 'CallExpression',
      ConditionalExpression: 'ConditionalExpression',
      ExpressionStatement: 'ExpressionStatement',
      Identifier: 'Identifier',
      Literal: 'Literal',
      LogicalExpression: 'LogicalExpression',
      MemberExpression: 'MemberExpression',
      ObjectExpression: 'ObjectExpression',
      Program: 'Program',
      Property: 'Property',
      UnaryExpression: 'UnaryExpression',
      UpdateExpression: 'UpdateExpression'
  };

  PropertyKind = {
      Data: 1,
      Get: 2,
      Set: 4
  };

  // Error messages should be identical to V8.
  Messages = {
      UnexpectedToken:  'Unexpected token %0',
      UnexpectedNumber:  'Unexpected number',
      UnexpectedString:  'Unexpected string',
      UnexpectedIdentifier:  'Unexpected identifier',
      UnexpectedReserved:  'Unexpected reserved word',
      UnexpectedEOS:  'Unexpected end of input',
      NewlineAfterThrow:  'Illegal newline after throw',
      InvalidRegExp: 'Invalid regular expression',
      UnterminatedRegExp:  'Invalid regular expression: missing /',
      InvalidLHSInAssignment:  'Invalid left-hand side in assignment',
      InvalidLHSInForIn:  'Invalid left-hand side in for-in',
      MultipleDefaultsInSwitch: 'More than one default clause in switch statement',
      NoCatchOrFinally:  'Missing catch or finally after try',
      UnknownLabel: 'Undefined label \'%0\'',
      Redeclaration: '%0 \'%1\' has already been declared',
      IllegalContinue: 'Illegal continue statement',
      IllegalBreak: 'Illegal break statement',
      IllegalReturn: 'Illegal return statement',
      StrictModeWith:  'Strict mode code may not include a with statement',
      StrictCatchVariable:  'Catch variable may not be eval or arguments in strict mode',
      StrictVarName:  'Variable name may not be eval or arguments in strict mode',
      StrictParamName:  'Parameter name eval or arguments is not allowed in strict mode',
      StrictParamDupe: 'Strict mode function may not have duplicate parameter names',
      StrictFunctionName:  'Function name may not be eval or arguments in strict mode',
      StrictOctalLiteral:  'Octal literals are not allowed in strict mode.',
      StrictDelete:  'Delete of an unqualified identifier in strict mode.',
      StrictDuplicateProperty:  'Duplicate data property in object literal not allowed in strict mode',
      AccessorDataProperty:  'Object literal may not have data and accessor property with the same name',
      AccessorGetSet:  'Object literal may not have multiple get/set accessors with the same name',
      StrictLHSAssignment:  'Assignment to eval or arguments is not allowed in strict mode',
      StrictLHSPostfix:  'Postfix increment/decrement may not have eval or arguments operand in strict mode',
      StrictLHSPrefix:  'Prefix increment/decrement may not have eval or arguments operand in strict mode',
      StrictReservedWord:  'Use of future reserved word in strict mode'
  };

  // See also tools/generate-unicode-regex.py.
  Regex = {
      NonAsciiIdentifierStart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]'),
      NonAsciiIdentifierPart: new RegExp('[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]')
  };

  // Ensure the condition is true, otherwise throw an error.
  // This is only to have a better contract semantic, i.e. another safety net
  // to catch a logic error. The condition shall be fulfilled in normal case.
  // Do NOT use this to enforce a certain condition on any user input.

  function assert(condition, message) {
      if (!condition) {
          throw new Error('ASSERT: ' + message);
      }
  }

  function isDecimalDigit(ch) {
      return (ch >= 0x30 && ch <= 0x39);   // 0..9
  }

  function isHexDigit(ch) {
      return '0123456789abcdefABCDEF'.indexOf(ch) >= 0;
  }

  function isOctalDigit(ch) {
      return '01234567'.indexOf(ch) >= 0;
  }

  // 7.2 White Space

  function isWhiteSpace(ch) {
      return (ch === 0x20) || (ch === 0x09) || (ch === 0x0B) || (ch === 0x0C) || (ch === 0xA0) ||
          (ch >= 0x1680 && [0x1680, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x202F, 0x205F, 0x3000, 0xFEFF].indexOf(ch) >= 0);
  }

  // 7.3 Line Terminators

  function isLineTerminator(ch) {
      return (ch === 0x0A) || (ch === 0x0D) || (ch === 0x2028) || (ch === 0x2029);
  }

  // 7.6 Identifier Names and Identifiers

  function isIdentifierStart(ch) {
      return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
          (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
          (ch >= 0x61 && ch <= 0x7A) ||         // a..z
          (ch === 0x5C) ||                      // \ (backslash)
          ((ch >= 0x80) && Regex.NonAsciiIdentifierStart.test(String.fromCharCode(ch)));
  }

  function isIdentifierPart(ch) {
      return (ch === 0x24) || (ch === 0x5F) ||  // $ (dollar) and _ (underscore)
          (ch >= 0x41 && ch <= 0x5A) ||         // A..Z
          (ch >= 0x61 && ch <= 0x7A) ||         // a..z
          (ch >= 0x30 && ch <= 0x39) ||         // 0..9
          (ch === 0x5C) ||                      // \ (backslash)
          ((ch >= 0x80) && Regex.NonAsciiIdentifierPart.test(String.fromCharCode(ch)));
  }

  // 7.6.1.2 Future Reserved Words

  function isFutureReservedWord(id) {
      switch (id) {
      case 'class':
      case 'enum':
      case 'export':
      case 'extends':
      case 'import':
      case 'super':
          return true;
      default:
          return false;
      }
  }

  function isStrictModeReservedWord(id) {
      switch (id) {
      case 'implements':
      case 'interface':
      case 'package':
      case 'private':
      case 'protected':
      case 'public':
      case 'static':
      case 'yield':
      case 'let':
          return true;
      default:
          return false;
      }
  }

  // 7.6.1.1 Keywords

  function isKeyword(id) {
      if (strict && isStrictModeReservedWord(id)) {
          return true;
      }

      // 'const' is specialized as Keyword in V8.
      // 'yield' and 'let' are for compatiblity with SpiderMonkey and ES.next.
      // Some others are from future reserved words.

      switch (id.length) {
      case 2:
          return (id === 'if') || (id === 'in') || (id === 'do');
      case 3:
          return (id === 'var') || (id === 'for') || (id === 'new') ||
              (id === 'try') || (id === 'let');
      case 4:
          return (id === 'this') || (id === 'else') || (id === 'case') ||
              (id === 'void') || (id === 'with') || (id === 'enum');
      case 5:
          return (id === 'while') || (id === 'break') || (id === 'catch') ||
              (id === 'throw') || (id === 'const') || (id === 'yield') ||
              (id === 'class') || (id === 'super');
      case 6:
          return (id === 'return') || (id === 'typeof') || (id === 'delete') ||
              (id === 'switch') || (id === 'export') || (id === 'import');
      case 7:
          return (id === 'default') || (id === 'finally') || (id === 'extends');
      case 8:
          return (id === 'function') || (id === 'continue') || (id === 'debugger');
      case 10:
          return (id === 'instanceof');
      default:
          return false;
      }
  }

  function skipComment() {
      var ch, start;

      start = (index === 0);
      while (index < length) {
          ch = source.charCodeAt(index);

          if (isWhiteSpace(ch)) {
              ++index;
          } else if (isLineTerminator(ch)) {
              ++index;
              if (ch === 0x0D && source.charCodeAt(index) === 0x0A) {
                  ++index;
              }
              ++lineNumber;
              lineStart = index;
              start = true;
          } else {
              break;
          }
      }
  }

  function scanHexEscape(prefix) {
      var i, len, ch, code = 0;

      len = (prefix === 'u') ? 4 : 2;
      for (i = 0; i < len; ++i) {
          if (index < length && isHexDigit(source[index])) {
              ch = source[index++];
              code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
          } else {
              return '';
          }
      }
      return String.fromCharCode(code);
  }

  function scanUnicodeCodePointEscape() {
      var ch, code, cu1, cu2;

      ch = source[index];
      code = 0;

      // At least, one hex digit is required.
      if (ch === '}') {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
      }

      while (index < length) {
          ch = source[index++];
          if (!isHexDigit(ch)) {
              break;
          }
          code = code * 16 + '0123456789abcdef'.indexOf(ch.toLowerCase());
      }

      if (code > 0x10FFFF || ch !== '}') {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
      }

      // UTF-16 Encoding
      if (code <= 0xFFFF) {
          return String.fromCharCode(code);
      }
      cu1 = ((code - 0x10000) >> 10) + 0xD800;
      cu2 = ((code - 0x10000) & 1023) + 0xDC00;
      return String.fromCharCode(cu1, cu2);
  }

  function getEscapedIdentifier() {
      var ch, id;

      ch = source.charCodeAt(index++);
      id = String.fromCharCode(ch);

      // '\u' (U+005C, U+0075) denotes an escaped character.
      if (ch === 0x5C) {
          if (source.charCodeAt(index) !== 0x75) {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }
          ++index;
          ch = scanHexEscape('u');
          if (!ch || ch === '\\' || !isIdentifierStart(ch.charCodeAt(0))) {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }
          id = ch;
      }

      while (index < length) {
          ch = source.charCodeAt(index);
          if (!isIdentifierPart(ch)) {
              break;
          }
          ++index;
          id += String.fromCharCode(ch);

          // '\u' (U+005C, U+0075) denotes an escaped character.
          if (ch === 0x5C) {
              id = id.substr(0, id.length - 1);
              if (source.charCodeAt(index) !== 0x75) {
                  throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
              ++index;
              ch = scanHexEscape('u');
              if (!ch || ch === '\\' || !isIdentifierPart(ch.charCodeAt(0))) {
                  throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
              id += ch;
          }
      }

      return id;
  }

  function getIdentifier() {
      var start, ch;

      start = index++;
      while (index < length) {
          ch = source.charCodeAt(index);
          if (ch === 0x5C) {
              // Blackslash (U+005C) marks Unicode escape sequence.
              index = start;
              return getEscapedIdentifier();
          }
          if (isIdentifierPart(ch)) {
              ++index;
          } else {
              break;
          }
      }

      return source.slice(start, index);
  }

  function scanIdentifier() {
      var start, id, type;

      start = index;

      // Backslash (U+005C) starts an escaped character.
      id = (source.charCodeAt(index) === 0x5C) ? getEscapedIdentifier() : getIdentifier();

      // There is no keyword or literal with only one character.
      // Thus, it must be an identifier.
      if (id.length === 1) {
          type = Token.Identifier;
      } else if (isKeyword(id)) {
          type = Token.Keyword;
      } else if (id === 'null') {
          type = Token.NullLiteral;
      } else if (id === 'true' || id === 'false') {
          type = Token.BooleanLiteral;
      } else {
          type = Token.Identifier;
      }

      return {
          type: type,
          value: id,
          lineNumber: lineNumber,
          lineStart: lineStart,
          start: start,
          end: index
      };
  }

  // 7.7 Punctuators

  function scanPunctuator() {
      var start = index,
          code = source.charCodeAt(index),
          code2,
          ch1 = source[index],
          ch2,
          ch3,
          ch4;

      switch (code) {

      // Check for most common single-character punctuators.
      case 0x2E:  // . dot
      case 0x28:  // ( open bracket
      case 0x29:  // ) close bracket
      case 0x3B:  // ; semicolon
      case 0x2C:  // , comma
      case 0x7B:  // { open curly brace
      case 0x7D:  // } close curly brace
      case 0x5B:  // [
      case 0x5D:  // ]
      case 0x3A:  // :
      case 0x3F:  // ?
      case 0x7E:  // ~
          ++index;
          if (extra.tokenize) {
              if (code === 0x28) {
                  extra.openParenToken = extra.tokens.length;
              } else if (code === 0x7B) {
                  extra.openCurlyToken = extra.tokens.length;
              }
          }
          return {
              type: Token.Punctuator,
              value: String.fromCharCode(code),
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };

      default:
          code2 = source.charCodeAt(index + 1);

          // '=' (U+003D) marks an assignment or comparison operator.
          if (code2 === 0x3D) {
              switch (code) {
              case 0x2B:  // +
              case 0x2D:  // -
              case 0x2F:  // /
              case 0x3C:  // <
              case 0x3E:  // >
              case 0x5E:  // ^
              case 0x7C:  // |
              case 0x25:  // %
              case 0x26:  // &
              case 0x2A:  // *
                  index += 2;
                  return {
                      type: Token.Punctuator,
                      value: String.fromCharCode(code) + String.fromCharCode(code2),
                      lineNumber: lineNumber,
                      lineStart: lineStart,
                      start: start,
                      end: index
                  };

              case 0x21: // !
              case 0x3D: // =
                  index += 2;

                  // !== and ===
                  if (source.charCodeAt(index) === 0x3D) {
                      ++index;
                  }
                  return {
                      type: Token.Punctuator,
                      value: source.slice(start, index),
                      lineNumber: lineNumber,
                      lineStart: lineStart,
                      start: start,
                      end: index
                  };
              }
          }
      }

      // 4-character punctuator: >>>=

      ch4 = source.substr(index, 4);

      if (ch4 === '>>>=') {
          index += 4;
          return {
              type: Token.Punctuator,
              value: ch4,
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };
      }

      // 3-character punctuators: === !== >>> <<= >>=

      ch3 = ch4.substr(0, 3);

      if (ch3 === '>>>' || ch3 === '<<=' || ch3 === '>>=') {
          index += 3;
          return {
              type: Token.Punctuator,
              value: ch3,
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };
      }

      // Other 2-character punctuators: ++ -- << >> && ||
      ch2 = ch3.substr(0, 2);

      if ((ch1 === ch2[1] && ('+-<>&|'.indexOf(ch1) >= 0)) || ch2 === '=>') {
          index += 2;
          return {
              type: Token.Punctuator,
              value: ch2,
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };
      }

      // 1-character punctuators: < > = ! + - * % & | ^ /

      if ('<>=!+-*%&|^/'.indexOf(ch1) >= 0) {
          ++index;
          return {
              type: Token.Punctuator,
              value: ch1,
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };
      }

      throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
  }

  // 7.8.3 Numeric Literals

  function scanHexLiteral(start) {
      var number = '';

      while (index < length) {
          if (!isHexDigit(source[index])) {
              break;
          }
          number += source[index++];
      }

      if (number.length === 0) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
      }

      if (isIdentifierStart(source.charCodeAt(index))) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
      }

      return {
          type: Token.NumericLiteral,
          value: parseInt('0x' + number, 16),
          lineNumber: lineNumber,
          lineStart: lineStart,
          start: start,
          end: index
      };
  }

  function scanOctalLiteral(start) {
      var number = '0' + source[index++];
      while (index < length) {
          if (!isOctalDigit(source[index])) {
              break;
          }
          number += source[index++];
      }

      if (isIdentifierStart(source.charCodeAt(index)) || isDecimalDigit(source.charCodeAt(index))) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
      }

      return {
          type: Token.NumericLiteral,
          value: parseInt(number, 8),
          octal: true,
          lineNumber: lineNumber,
          lineStart: lineStart,
          start: start,
          end: index
      };
  }

  function scanNumericLiteral() {
      var number, start, ch;

      ch = source[index];
      assert(isDecimalDigit(ch.charCodeAt(0)) || (ch === '.'),
          'Numeric literal must start with a decimal digit or a decimal point');

      start = index;
      number = '';
      if (ch !== '.') {
          number = source[index++];
          ch = source[index];

          // Hex number starts with '0x'.
          // Octal number starts with '0'.
          if (number === '0') {
              if (ch === 'x' || ch === 'X') {
                  ++index;
                  return scanHexLiteral(start);
              }
              if (isOctalDigit(ch)) {
                  return scanOctalLiteral(start);
              }

              // decimal number starts with '0' such as '09' is illegal.
              if (ch && isDecimalDigit(ch.charCodeAt(0))) {
                  throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
          }

          while (isDecimalDigit(source.charCodeAt(index))) {
              number += source[index++];
          }
          ch = source[index];
      }

      if (ch === '.') {
          number += source[index++];
          while (isDecimalDigit(source.charCodeAt(index))) {
              number += source[index++];
          }
          ch = source[index];
      }

      if (ch === 'e' || ch === 'E') {
          number += source[index++];

          ch = source[index];
          if (ch === '+' || ch === '-') {
              number += source[index++];
          }
          if (isDecimalDigit(source.charCodeAt(index))) {
              while (isDecimalDigit(source.charCodeAt(index))) {
                  number += source[index++];
              }
          } else {
              throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
          }
      }

      if (isIdentifierStart(source.charCodeAt(index))) {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
      }

      return {
          type: Token.NumericLiteral,
          value: parseFloat(number),
          lineNumber: lineNumber,
          lineStart: lineStart,
          start: start,
          end: index
      };
  }

  // 7.8.4 String Literals

  function scanStringLiteral() {
      var str = '', quote, start, ch, code, unescaped, restore, octal = false, startLineNumber, startLineStart;
      startLineNumber = lineNumber;
      startLineStart = lineStart;

      quote = source[index];
      assert((quote === '\'' || quote === '"'),
          'String literal must starts with a quote');

      start = index;
      ++index;

      while (index < length) {
          ch = source[index++];

          if (ch === quote) {
              quote = '';
              break;
          } else if (ch === '\\') {
              ch = source[index++];
              if (!ch || !isLineTerminator(ch.charCodeAt(0))) {
                  switch (ch) {
                  case 'u':
                  case 'x':
                      if (source[index] === '{') {
                          ++index;
                          str += scanUnicodeCodePointEscape();
                      } else {
                          restore = index;
                          unescaped = scanHexEscape(ch);
                          if (unescaped) {
                              str += unescaped;
                          } else {
                              index = restore;
                              str += ch;
                          }
                      }
                      break;
                  case 'n':
                      str += '\n';
                      break;
                  case 'r':
                      str += '\r';
                      break;
                  case 't':
                      str += '\t';
                      break;
                  case 'b':
                      str += '\b';
                      break;
                  case 'f':
                      str += '\f';
                      break;
                  case 'v':
                      str += '\x0B';
                      break;

                  default:
                      if (isOctalDigit(ch)) {
                          code = '01234567'.indexOf(ch);

                          // \0 is not octal escape sequence
                          if (code !== 0) {
                              octal = true;
                          }

                          if (index < length && isOctalDigit(source[index])) {
                              octal = true;
                              code = code * 8 + '01234567'.indexOf(source[index++]);

                              // 3 digits are only allowed when string starts
                              // with 0, 1, 2, 3
                              if ('0123'.indexOf(ch) >= 0 &&
                                      index < length &&
                                      isOctalDigit(source[index])) {
                                  code = code * 8 + '01234567'.indexOf(source[index++]);
                              }
                          }
                          str += String.fromCharCode(code);
                      } else {
                          str += ch;
                      }
                      break;
                  }
              } else {
                  ++lineNumber;
                  if (ch ===  '\r' && source[index] === '\n') {
                      ++index;
                  }
                  lineStart = index;
              }
          } else if (isLineTerminator(ch.charCodeAt(0))) {
              break;
          } else {
              str += ch;
          }
      }

      if (quote !== '') {
          throwError({}, Messages.UnexpectedToken, 'ILLEGAL');
      }

      return {
          type: Token.StringLiteral,
          value: str,
          octal: octal,
          startLineNumber: startLineNumber,
          startLineStart: startLineStart,
          lineNumber: lineNumber,
          lineStart: lineStart,
          start: start,
          end: index
      };
  }

  function testRegExp(pattern, flags) {
      var tmp = pattern,
          value;

      if (flags.indexOf('u') >= 0) {
          // Replace each astral symbol and every Unicode code point
          // escape sequence with a single ASCII symbol to avoid throwing on
          // regular expressions that are only valid in combination with the
          // `/u` flag.
          // Note: replacing with the ASCII symbol `x` might cause false
          // negatives in unlikely scenarios. For example, `[\u{61}-b]` is a
          // perfectly valid pattern that is equivalent to `[a-b]`, but it
          // would be replaced by `[x-b]` which throws an error.
          tmp = tmp
              .replace(/\\u\{([0-9a-fA-F]+)\}/g, function ($0, $1) {
                  if (parseInt($1, 16) <= 0x10FFFF) {
                      return 'x';
                  }
                  throwError({}, Messages.InvalidRegExp);
              })
              .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, 'x');
      }

      // First, detect invalid regular expressions.
      try {
          value = new RegExp(tmp);
      } catch (e) {
          throwError({}, Messages.InvalidRegExp);
      }

      // Return a regular expression object for this pattern-flag pair, or
      // `null` in case the current environment doesn't support the flags it
      // uses.
      try {
          return new RegExp(pattern, flags);
      } catch (exception) {
          return null;
      }
  }

  function scanRegExpBody() {
      var ch, str, classMarker, terminated, body;

      ch = source[index];
      assert(ch === '/', 'Regular expression literal must start with a slash');
      str = source[index++];

      classMarker = false;
      terminated = false;
      while (index < length) {
          ch = source[index++];
          str += ch;
          if (ch === '\\') {
              ch = source[index++];
              // ECMA-262 7.8.5
              if (isLineTerminator(ch.charCodeAt(0))) {
                  throwError({}, Messages.UnterminatedRegExp);
              }
              str += ch;
          } else if (isLineTerminator(ch.charCodeAt(0))) {
              throwError({}, Messages.UnterminatedRegExp);
          } else if (classMarker) {
              if (ch === ']') {
                  classMarker = false;
              }
          } else {
              if (ch === '/') {
                  terminated = true;
                  break;
              } else if (ch === '[') {
                  classMarker = true;
              }
          }
      }

      if (!terminated) {
          throwError({}, Messages.UnterminatedRegExp);
      }

      // Exclude leading and trailing slash.
      body = str.substr(1, str.length - 2);
      return {
          value: body,
          literal: str
      };
  }

  function scanRegExpFlags() {
      var ch, str, flags, restore;

      str = '';
      flags = '';
      while (index < length) {
          ch = source[index];
          if (!isIdentifierPart(ch.charCodeAt(0))) {
              break;
          }

          ++index;
          if (ch === '\\' && index < length) {
              ch = source[index];
              if (ch === 'u') {
                  ++index;
                  restore = index;
                  ch = scanHexEscape('u');
                  if (ch) {
                      flags += ch;
                      for (str += '\\u'; restore < index; ++restore) {
                          str += source[restore];
                      }
                  } else {
                      index = restore;
                      flags += 'u';
                      str += '\\u';
                  }
                  throwErrorTolerant({}, Messages.UnexpectedToken, 'ILLEGAL');
              } else {
                  str += '\\';
                  throwErrorTolerant({}, Messages.UnexpectedToken, 'ILLEGAL');
              }
          } else {
              flags += ch;
              str += ch;
          }
      }

      return {
          value: flags,
          literal: str
      };
  }

  function scanRegExp() {
      var start, body, flags, value;

      lookahead = null;
      skipComment();
      start = index;

      body = scanRegExpBody();
      flags = scanRegExpFlags();
      value = testRegExp(body.value, flags.value);

      if (extra.tokenize) {
          return {
              type: Token.RegularExpression,
              value: value,
              regex: {
                  pattern: body.value,
                  flags: flags.value
              },
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: start,
              end: index
          };
      }

      return {
          literal: body.literal + flags.literal,
          value: value,
          regex: {
              pattern: body.value,
              flags: flags.value
          },
          start: start,
          end: index
      };
  }

  function collectRegex() {
      var pos, loc, regex, token;

      skipComment();

      pos = index;
      loc = {
          start: {
              line: lineNumber,
              column: index - lineStart
          }
      };

      regex = scanRegExp();

      loc.end = {
          line: lineNumber,
          column: index - lineStart
      };

      if (!extra.tokenize) {
          // Pop the previous token, which is likely '/' or '/='
          if (extra.tokens.length > 0) {
              token = extra.tokens[extra.tokens.length - 1];
              if (token.range[0] === pos && token.type === 'Punctuator') {
                  if (token.value === '/' || token.value === '/=') {
                      extra.tokens.pop();
                  }
              }
          }

          extra.tokens.push({
              type: 'RegularExpression',
              value: regex.literal,
              regex: regex.regex,
              range: [pos, index],
              loc: loc
          });
      }

      return regex;
  }

  function isIdentifierName(token) {
      return token.type === Token.Identifier ||
          token.type === Token.Keyword ||
          token.type === Token.BooleanLiteral ||
          token.type === Token.NullLiteral;
  }

  function advanceSlash() {
      var prevToken,
          checkToken;
      // Using the following algorithm:
      // https://github.com/mozilla/sweet.js/wiki/design
      prevToken = extra.tokens[extra.tokens.length - 1];
      if (!prevToken) {
          // Nothing before that: it cannot be a division.
          return collectRegex();
      }
      if (prevToken.type === 'Punctuator') {
          if (prevToken.value === ']') {
              return scanPunctuator();
          }
          if (prevToken.value === ')') {
              checkToken = extra.tokens[extra.openParenToken - 1];
              if (checkToken &&
                      checkToken.type === 'Keyword' &&
                      (checkToken.value === 'if' ||
                       checkToken.value === 'while' ||
                       checkToken.value === 'for' ||
                       checkToken.value === 'with')) {
                  return collectRegex();
              }
              return scanPunctuator();
          }
          if (prevToken.value === '}') {
              // Dividing a function by anything makes little sense,
              // but we have to check for that.
              if (extra.tokens[extra.openCurlyToken - 3] &&
                      extra.tokens[extra.openCurlyToken - 3].type === 'Keyword') {
                  // Anonymous function.
                  checkToken = extra.tokens[extra.openCurlyToken - 4];
                  if (!checkToken) {
                      return scanPunctuator();
                  }
              } else if (extra.tokens[extra.openCurlyToken - 4] &&
                      extra.tokens[extra.openCurlyToken - 4].type === 'Keyword') {
                  // Named function.
                  checkToken = extra.tokens[extra.openCurlyToken - 5];
                  if (!checkToken) {
                      return collectRegex();
                  }
              } else {
                  return scanPunctuator();
              }
              return scanPunctuator();
          }
          return collectRegex();
      }
      if (prevToken.type === 'Keyword' && prevToken.value !== 'this') {
          return collectRegex();
      }
      return scanPunctuator();
  }

  function advance() {
      var ch;

      skipComment();

      if (index >= length) {
          return {
              type: Token.EOF,
              lineNumber: lineNumber,
              lineStart: lineStart,
              start: index,
              end: index
          };
      }

      ch = source.charCodeAt(index);

      if (isIdentifierStart(ch)) {
          return scanIdentifier();
      }

      // Very common: ( and ) and ;
      if (ch === 0x28 || ch === 0x29 || ch === 0x3B) {
          return scanPunctuator();
      }

      // String literal starts with single quote (U+0027) or double quote (U+0022).
      if (ch === 0x27 || ch === 0x22) {
          return scanStringLiteral();
      }


      // Dot (.) U+002E can also start a floating-point number, hence the need
      // to check the next character.
      if (ch === 0x2E) {
          if (isDecimalDigit(source.charCodeAt(index + 1))) {
              return scanNumericLiteral();
          }
          return scanPunctuator();
      }

      if (isDecimalDigit(ch)) {
          return scanNumericLiteral();
      }

      // Slash (/) U+002F can also start a regex.
      if (extra.tokenize && ch === 0x2F) {
          return advanceSlash();
      }

      return scanPunctuator();
  }

  function collectToken() {
      var loc, token, value, entry;

      skipComment();
      loc = {
          start: {
              line: lineNumber,
              column: index - lineStart
          }
      };

      token = advance();
      loc.end = {
          line: lineNumber,
          column: index - lineStart
      };

      if (token.type !== Token.EOF) {
          value = source.slice(token.start, token.end);
          entry = {
              type: TokenName[token.type],
              value: value,
              range: [token.start, token.end],
              loc: loc
          };
          if (token.regex) {
              entry.regex = {
                  pattern: token.regex.pattern,
                  flags: token.regex.flags
              };
          }
          extra.tokens.push(entry);
      }

      return token;
  }

  function lex() {
      var token;

      token = lookahead;
      index = token.end;
      lineNumber = token.lineNumber;
      lineStart = token.lineStart;

      lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();

      index = token.end;
      lineNumber = token.lineNumber;
      lineStart = token.lineStart;

      return token;
  }

  function peek() {
      var pos, line, start;

      pos = index;
      line = lineNumber;
      start = lineStart;
      lookahead = (typeof extra.tokens !== 'undefined') ? collectToken() : advance();
      index = pos;
      lineNumber = line;
      lineStart = start;
  }

  function Position() {
      this.line = lineNumber;
      this.column = index - lineStart;
  }

  function SourceLocation() {
      this.start = new Position();
      this.end = null;
  }

  function WrappingSourceLocation(startToken) {
      if (startToken.type === Token.StringLiteral) {
          this.start = {
              line: startToken.startLineNumber,
              column: startToken.start - startToken.startLineStart
          };
      } else {
          this.start = {
              line: startToken.lineNumber,
              column: startToken.start - startToken.lineStart
          };
      }
      this.end = null;
  }

  function Node() {
      // Skip comment.
      index = lookahead.start;
      if (lookahead.type === Token.StringLiteral) {
          lineNumber = lookahead.startLineNumber;
          lineStart = lookahead.startLineStart;
      } else {
          lineNumber = lookahead.lineNumber;
          lineStart = lookahead.lineStart;
      }
      if (extra.range) {
          this.range = [index, 0];
      }
      if (extra.loc) {
          this.loc = new SourceLocation();
      }
  }

  function WrappingNode(startToken) {
      if (extra.range) {
          this.range = [startToken.start, 0];
      }
      if (extra.loc) {
          this.loc = new WrappingSourceLocation(startToken);
      }
  }

  WrappingNode.prototype = Node.prototype = {

      finish: function () {
          if (extra.range) {
              this.range[1] = index;
          }
          if (extra.loc) {
              this.loc.end = new Position();
              if (extra.source) {
                  this.loc.source = extra.source;
              }
          }
      },

      finishArrayExpression: function (elements) {
          this.type = Syntax.ArrayExpression;
          this.elements = elements;
          this.finish();
          return this;
      },

      finishAssignmentExpression: function (operator, left, right) {
          this.type = Syntax.AssignmentExpression;
          this.operator = operator;
          this.left = left;
          this.right = right;
          this.finish();
          return this;
      },

      finishBinaryExpression: function (operator, left, right) {
          this.type = (operator === '||' || operator === '&&') ? Syntax.LogicalExpression : Syntax.BinaryExpression;
          this.operator = operator;
          this.left = left;
          this.right = right;
          this.finish();
          return this;
      },

      finishCallExpression: function (callee, args) {
          this.type = Syntax.CallExpression;
          this.callee = callee;
          this.arguments = args;
          this.finish();
          return this;
      },

      finishConditionalExpression: function (test, consequent, alternate) {
          this.type = Syntax.ConditionalExpression;
          this.test = test;
          this.consequent = consequent;
          this.alternate = alternate;
          this.finish();
          return this;
      },

      finishExpressionStatement: function (expression) {
          this.type = Syntax.ExpressionStatement;
          this.expression = expression;
          this.finish();
          return this;
      },

      finishIdentifier: function (name) {
          this.type = Syntax.Identifier;
          this.name = name;
          this.finish();
          return this;
      },

      finishLiteral: function (token) {
          this.type = Syntax.Literal;
          this.value = token.value;
          this.raw = source.slice(token.start, token.end);
          if (token.regex) {
              if (this.raw == '//') {
                this.raw = '/(?:)/';
              }
              this.regex = token.regex;
          }
          this.finish();
          return this;
      },

      finishMemberExpression: function (accessor, object, property) {
          this.type = Syntax.MemberExpression;
          this.computed = accessor === '[';
          this.object = object;
          this.property = property;
          this.finish();
          return this;
      },

      finishObjectExpression: function (properties) {
          this.type = Syntax.ObjectExpression;
          this.properties = properties;
          this.finish();
          return this;
      },

      finishProgram: function (body) {
          this.type = Syntax.Program;
          this.body = body;
          this.finish();
          return this;
      },

      finishProperty: function (kind, key, value) {
          this.type = Syntax.Property;
          this.key = key;
          this.value = value;
          this.kind = kind;
          this.finish();
          return this;
      },

      finishUnaryExpression: function (operator, argument) {
          this.type = (operator === '++' || operator === '--') ? Syntax.UpdateExpression : Syntax.UnaryExpression;
          this.operator = operator;
          this.argument = argument;
          this.prefix = true;
          this.finish();
          return this;
      }
  };

  // Return true if there is a line terminator before the next token.

  function peekLineTerminator() {
      var pos, line, start, found;

      pos = index;
      line = lineNumber;
      start = lineStart;
      skipComment();
      found = lineNumber !== line;
      index = pos;
      lineNumber = line;
      lineStart = start;

      return found;
  }

  // Throw an exception

  function throwError(token, messageFormat) {
      var error,
          args = Array.prototype.slice.call(arguments, 2),
          msg = messageFormat.replace(
              /%(\d)/g,
              function (whole, index) {
                  assert(index < args.length, 'Message reference must be in range');
                  return args[index];
              }
          );

      if (typeof token.lineNumber === 'number') {
          error = new Error('Line ' + token.lineNumber + ': ' + msg);
          error.index = token.start;
          error.lineNumber = token.lineNumber;
          error.column = token.start - lineStart + 1;
      } else {
          error = new Error('Line ' + lineNumber + ': ' + msg);
          error.index = index;
          error.lineNumber = lineNumber;
          error.column = index - lineStart + 1;
      }

      error.description = msg;
      throw error;
  }

  function throwErrorTolerant() {
      try {
          throwError.apply(null, arguments);
      } catch (e) {
          if (extra.errors) {
              extra.errors.push(e);
          } else {
              throw e;
          }
      }
  }


  // Throw an exception because of the token.

  function throwUnexpected(token) {
      if (token.type === Token.EOF) {
          throwError(token, Messages.UnexpectedEOS);
      }

      if (token.type === Token.NumericLiteral) {
          throwError(token, Messages.UnexpectedNumber);
      }

      if (token.type === Token.StringLiteral) {
          throwError(token, Messages.UnexpectedString);
      }

      if (token.type === Token.Identifier) {
          throwError(token, Messages.UnexpectedIdentifier);
      }

      if (token.type === Token.Keyword) {
          if (isFutureReservedWord(token.value)) {
              throwError(token, Messages.UnexpectedReserved);
          } else if (strict && isStrictModeReservedWord(token.value)) {
              throwErrorTolerant(token, Messages.StrictReservedWord);
              return;
          }
          throwError(token, Messages.UnexpectedToken, token.value);
      }

      // BooleanLiteral, NullLiteral, or Punctuator.
      throwError(token, Messages.UnexpectedToken, token.value);
  }

  // Expect the next token to match the specified punctuator.
  // If not, an exception will be thrown.

  function expect(value) {
      var token = lex();
      if (token.type !== Token.Punctuator || token.value !== value) {
          throwUnexpected(token);
      }
  }

  /**
   * @name expectTolerant
   * @description Quietly expect the given token value when in tolerant mode, otherwise delegates
   * to <code>expect(value)</code>
   * @param {String} value The value we are expecting the lookahead token to have
   * @since 2.0
   */
  function expectTolerant(value) {
      if (extra.errors) {
          var token = lookahead;
          if (token.type !== Token.Punctuator && token.value !== value) {
              throwErrorTolerant(token, Messages.UnexpectedToken, token.value);
          } else {
              lex();
          }
      } else {
          expect(value);
      }
  }

  // Expect the next token to match the specified keyword.
  // If not, an exception will be thrown.

  function expectKeyword(keyword) {
      var token = lex();
      if (token.type !== Token.Keyword || token.value !== keyword) {
          throwUnexpected(token);
      }
  }

  // Return true if the next token matches the specified punctuator.

  function match(value) {
      return lookahead.type === Token.Punctuator && lookahead.value === value;
  }

  // Return true if the next token matches the specified keyword

  function matchKeyword(keyword) {
      return lookahead.type === Token.Keyword && lookahead.value === keyword;
  }

  function consumeSemicolon() {
      var line;

      // Catch the very common case first: immediately a semicolon (U+003B).
      if (source.charCodeAt(index) === 0x3B || match(';')) {
          lex();
          return;
      }

      line = lineNumber;
      skipComment();
      if (lineNumber !== line) {
          return;
      }

      if (lookahead.type !== Token.EOF && !match('}')) {
          throwUnexpected(lookahead);
      }
  }

  // Return true if provided expression is LeftHandSideExpression

  function isLeftHandSide(expr) {
      return expr.type === Syntax.Identifier || expr.type === Syntax.MemberExpression;
  }

  // 11.1.4 Array Initialiser

  function parseArrayInitialiser() {
      var elements = [], node = new Node();

      expect('[');

      while (!match(']')) {
          if (match(',')) {
              lex();
              elements.push(null);
          } else {
              elements.push(parseAssignmentExpression());

              if (!match(']')) {
                  expect(',');
              }
          }
      }

      lex();

      return node.finishArrayExpression(elements);
  }

  // 11.1.5 Object Initialiser

  function parseObjectPropertyKey() {
      var token, node = new Node();

      token = lex();

      // Note: This function is called only from parseObjectProperty(), where
      // EOF and Punctuator tokens are already filtered out.

      if (token.type === Token.StringLiteral || token.type === Token.NumericLiteral) {
          if (strict && token.octal) {
              throwErrorTolerant(token, Messages.StrictOctalLiteral);
          }
          return node.finishLiteral(token);
      }

      return node.finishIdentifier(token.value);
  }

  function parseObjectProperty() {
      var token, key, id, value, param, node = new Node();

      token = lookahead;

      if (token.type === Token.Identifier) {
          id = parseObjectPropertyKey();
          expect(':');
          value = parseAssignmentExpression();
          return node.finishProperty('init', id, value);
      }
      if (token.type === Token.EOF || token.type === Token.Punctuator) {
          throwUnexpected(token);
      } else {
          key = parseObjectPropertyKey();
          expect(':');
          value = parseAssignmentExpression();
          return node.finishProperty('init', key, value);
      }
  }

  function parseObjectInitialiser() {
      var properties = [], token, property, name, key, kind, map = {}, toString = String, node = new Node();

      expect('{');

      while (!match('}')) {
          property = parseObjectProperty();

          if (property.key.type === Syntax.Identifier) {
              name = property.key.name;
          } else {
              name = toString(property.key.value);
          }
          kind = (property.kind === 'init') ? PropertyKind.Data : (property.kind === 'get') ? PropertyKind.Get : PropertyKind.Set;

          key = '$' + name;
          if (Object.prototype.hasOwnProperty.call(map, key)) {
              if (map[key] === PropertyKind.Data) {
                  if (strict && kind === PropertyKind.Data) {
                      throwErrorTolerant({}, Messages.StrictDuplicateProperty);
                  } else if (kind !== PropertyKind.Data) {
                      throwErrorTolerant({}, Messages.AccessorDataProperty);
                  }
              } else {
                  if (kind === PropertyKind.Data) {
                      throwErrorTolerant({}, Messages.AccessorDataProperty);
                  } else if (map[key] & kind) {
                      throwErrorTolerant({}, Messages.AccessorGetSet);
                  }
              }
              map[key] |= kind;
          } else {
              map[key] = kind;
          }

          properties.push(property);

          if (!match('}')) {
              expectTolerant(',');
          }
      }

      expect('}');

      return node.finishObjectExpression(properties);
  }

  // 11.1.6 The Grouping Operator

  function parseGroupExpression() {
      var expr;

      expect('(');

      ++state.parenthesisCount;

      expr = parseExpression();

      expect(')');

      return expr;
  }


  // 11.1 Primary Expressions

  var legalKeywords = {"if":1, "this":1};

  function parsePrimaryExpression() {
      var type, token, expr, node;

      if (match('(')) {
          return parseGroupExpression();
      }

      if (match('[')) {
          return parseArrayInitialiser();
      }

      if (match('{')) {
          return parseObjectInitialiser();
      }

      type = lookahead.type;
      node = new Node();

      if (type === Token.Identifier || legalKeywords[lookahead.value]) {
          expr = node.finishIdentifier(lex().value);
      } else if (type === Token.StringLiteral || type === Token.NumericLiteral) {
          if (strict && lookahead.octal) {
              throwErrorTolerant(lookahead, Messages.StrictOctalLiteral);
          }
          expr = node.finishLiteral(lex());
      } else if (type === Token.Keyword) {
          throw new Error("Disabled.");
      } else if (type === Token.BooleanLiteral) {
          token = lex();
          token.value = (token.value === 'true');
          expr = node.finishLiteral(token);
      } else if (type === Token.NullLiteral) {
          token = lex();
          token.value = null;
          expr = node.finishLiteral(token);
      } else if (match('/') || match('/=')) {
          if (typeof extra.tokens !== 'undefined') {
              expr = node.finishLiteral(collectRegex());
          } else {
              expr = node.finishLiteral(scanRegExp());
          }
          peek();
      } else {
          throwUnexpected(lex());
      }

      return expr;
  }

  // 11.2 Left-Hand-Side Expressions

  function parseArguments() {
      var args = [];

      expect('(');

      if (!match(')')) {
          while (index < length) {
              args.push(parseAssignmentExpression());
              if (match(')')) {
                  break;
              }
              expectTolerant(',');
          }
      }

      expect(')');

      return args;
  }

  function parseNonComputedProperty() {
      var token, node = new Node();

      token = lex();

      if (!isIdentifierName(token)) {
          throwUnexpected(token);
      }

      return node.finishIdentifier(token.value);
  }

  function parseNonComputedMember() {
      expect('.');

      return parseNonComputedProperty();
  }

  function parseComputedMember() {
      var expr;

      expect('[');

      expr = parseExpression();

      expect(']');

      return expr;
  }

  function parseLeftHandSideExpressionAllowCall() {
      var expr, args, property, startToken, previousAllowIn = state.allowIn;

      startToken = lookahead;
      state.allowIn = true;
      expr = parsePrimaryExpression();

      for (;;) {
          if (match('.')) {
              property = parseNonComputedMember();
              expr = new WrappingNode(startToken).finishMemberExpression('.', expr, property);
          } else if (match('(')) {
              args = parseArguments();
              expr = new WrappingNode(startToken).finishCallExpression(expr, args);
          } else if (match('[')) {
              property = parseComputedMember();
              expr = new WrappingNode(startToken).finishMemberExpression('[', expr, property);
          } else {
              break;
          }
      }
      state.allowIn = previousAllowIn;

      return expr;
  }

  function parseLeftHandSideExpression() {
      var expr, property, startToken;
      assert(state.allowIn, 'callee of new expression always allow in keyword.');

      startToken = lookahead;
      expr = parsePrimaryExpression();

      for (;;) {
          if (match('[')) {
              property = parseComputedMember();
              expr = new WrappingNode(startToken).finishMemberExpression('[', expr, property);
          } else if (match('.')) {
              property = parseNonComputedMember();
              expr = new WrappingNode(startToken).finishMemberExpression('.', expr, property);
          } else {
              break;
          }
      }
      return expr;
  }

  // 11.3 Postfix Expressions

  function parsePostfixExpression() {
      var expr, token, startToken = lookahead;

      expr = parseLeftHandSideExpressionAllowCall();

      if (lookahead.type === Token.Punctuator) {
          if ((match('++') || match('--')) && !peekLineTerminator()) {
              throw new Error("Disabled.");
          }
      }

      return expr;
  }

  // 11.4 Unary Operators

  function parseUnaryExpression() {
      var token, expr, startToken;

      if (lookahead.type !== Token.Punctuator && lookahead.type !== Token.Keyword) {
          expr = parsePostfixExpression();
      } else if (match('++') || match('--')) {
          throw new Error("Disabled.");
      } else if (match('+') || match('-') || match('~') || match('!')) {
          startToken = lookahead;
          token = lex();
          expr = parseUnaryExpression();
          expr = new WrappingNode(startToken).finishUnaryExpression(token.value, expr);
      } else if (matchKeyword('delete') || matchKeyword('void') || matchKeyword('typeof')) {
          throw new Error("Disabled.");
      } else {
          expr = parsePostfixExpression();
      }

      return expr;
  }

  function binaryPrecedence(token, allowIn) {
      var prec = 0;

      if (token.type !== Token.Punctuator && token.type !== Token.Keyword) {
          return 0;
      }

      switch (token.value) {
      case '||':
          prec = 1;
          break;

      case '&&':
          prec = 2;
          break;

      case '|':
          prec = 3;
          break;

      case '^':
          prec = 4;
          break;

      case '&':
          prec = 5;
          break;

      case '==':
      case '!=':
      case '===':
      case '!==':
          prec = 6;
          break;

      case '<':
      case '>':
      case '<=':
      case '>=':
      case 'instanceof':
          prec = 7;
          break;

      case 'in':
          prec = allowIn ? 7 : 0;
          break;

      case '<<':
      case '>>':
      case '>>>':
          prec = 8;
          break;

      case '+':
      case '-':
          prec = 9;
          break;

      case '*':
      case '/':
      case '%':
          prec = 11;
          break;

      default:
          break;
      }

      return prec;
  }

  // 11.5 Multiplicative Operators
  // 11.6 Additive Operators
  // 11.7 Bitwise Shift Operators
  // 11.8 Relational Operators
  // 11.9 Equality Operators
  // 11.10 Binary Bitwise Operators
  // 11.11 Binary Logical Operators

  function parseBinaryExpression() {
      var marker, markers, expr, token, prec, stack, right, operator, left, i;

      marker = lookahead;
      left = parseUnaryExpression();

      token = lookahead;
      prec = binaryPrecedence(token, state.allowIn);
      if (prec === 0) {
          return left;
      }
      token.prec = prec;
      lex();

      markers = [marker, lookahead];
      right = parseUnaryExpression();

      stack = [left, token, right];

      while ((prec = binaryPrecedence(lookahead, state.allowIn)) > 0) {

          // Reduce: make a binary expression from the three topmost entries.
          while ((stack.length > 2) && (prec <= stack[stack.length - 2].prec)) {
              right = stack.pop();
              operator = stack.pop().value;
              left = stack.pop();
              markers.pop();
              expr = new WrappingNode(markers[markers.length - 1]).finishBinaryExpression(operator, left, right);
              stack.push(expr);
          }

          // Shift.
          token = lex();
          token.prec = prec;
          stack.push(token);
          markers.push(lookahead);
          expr = parseUnaryExpression();
          stack.push(expr);
      }

      // Final reduce to clean-up the stack.
      i = stack.length - 1;
      expr = stack[i];
      markers.pop();
      while (i > 1) {
          expr = new WrappingNode(markers.pop()).finishBinaryExpression(stack[i - 1].value, stack[i - 2], expr);
          i -= 2;
      }

      return expr;
  }

  // 11.12 Conditional Operator

  function parseConditionalExpression() {
      var expr, previousAllowIn, consequent, alternate, startToken;

      startToken = lookahead;

      expr = parseBinaryExpression();

      if (match('?')) {
          lex();
          previousAllowIn = state.allowIn;
          state.allowIn = true;
          consequent = parseAssignmentExpression();
          state.allowIn = previousAllowIn;
          expect(':');
          alternate = parseAssignmentExpression();

          expr = new WrappingNode(startToken).finishConditionalExpression(expr, consequent, alternate);
      }

      return expr;
  }

  // 11.13 Assignment Operators

  function parseAssignmentExpression() {
      var oldParenthesisCount, token, expr, right, list, startToken;

      oldParenthesisCount = state.parenthesisCount;

      startToken = lookahead;
      token = lookahead;

      expr = parseConditionalExpression();

      return expr;
  }

  // 11.14 Comma Operator

  function parseExpression() {
      var expr, startToken = lookahead, expressions;

      expr = parseAssignmentExpression();

      if (match(',')) {
          throw new Error("Disabled."); // no sequence expressions
      }

      return expr;
  }

  // 12.4 Expression Statement

  function parseExpressionStatement(node) {
      var expr = parseExpression();
      consumeSemicolon();
      return node.finishExpressionStatement(expr);
  }

  // 12 Statements

  function parseStatement() {
      var type = lookahead.type,
          expr,
          labeledBody,
          key,
          node;

      if (type === Token.EOF) {
          throwUnexpected(lookahead);
      }

      if (type === Token.Punctuator && lookahead.value === '{') {
          throw new Error("Disabled."); // block statement
      }

      node = new Node();

      if (type === Token.Punctuator) {
          switch (lookahead.value) {
          case ';':
              throw new Error("Disabled."); // empty statement
          case '(':
              return parseExpressionStatement(node);
          default:
              break;
          }
      } else if (type === Token.Keyword) {
          throw new Error("Disabled."); // keyword
      }

      expr = parseExpression();
      consumeSemicolon();
      return node.finishExpressionStatement(expr);
  }

  // 14 Program

  function parseSourceElement() {
      if (lookahead.type === Token.Keyword) {
          switch (lookahead.value) {
          case 'const':
          case 'let':
              throw new Error("Disabled.");
          case 'function':
              throw new Error("Disabled.");
          default:
              return parseStatement();
          }
      }

      if (lookahead.type !== Token.EOF) {
          return parseStatement();
      }
  }

  function parseSourceElements() {
      var sourceElement, sourceElements = [], token, directive, firstRestricted;

      while (index < length) {
          token = lookahead;
          if (token.type !== Token.StringLiteral) {
              break;
          }

          sourceElement = parseSourceElement();
          sourceElements.push(sourceElement);
          if (sourceElement.expression.type !== Syntax.Literal) {
              // this is not directive
              break;
          }
          directive = source.slice(token.start + 1, token.end - 1);
          if (directive === 'use strict') {
              strict = true;
              if (firstRestricted) {
                  throwErrorTolerant(firstRestricted, Messages.StrictOctalLiteral);
              }
          } else {
              if (!firstRestricted && token.octal) {
                  firstRestricted = token;
              }
          }
      }

      while (index < length) {
          sourceElement = parseSourceElement();
          if (typeof sourceElement === 'undefined') {
              break;
          }
          sourceElements.push(sourceElement);
      }
      return sourceElements;
  }

  function parseProgram() {
      var body, node;

      skipComment();
      peek();
      node = new Node();
      strict = true; // assume strict

      body = parseSourceElements();
      return node.finishProgram(body);
  }

  function filterTokenLocation() {
      var i, entry, token, tokens = [];

      for (i = 0; i < extra.tokens.length; ++i) {
          entry = extra.tokens[i];
          token = {
              type: entry.type,
              value: entry.value
          };
          if (entry.regex) {
              token.regex = {
                  pattern: entry.regex.pattern,
                  flags: entry.regex.flags
              };
          }
          if (extra.range) {
              token.range = entry.range;
          }
          if (extra.loc) {
              token.loc = entry.loc;
          }
          tokens.push(token);
      }

      extra.tokens = tokens;
  }

  function tokenize(code, options) {
      var toString,
          tokens;

      toString = String;
      if (typeof code !== 'string' && !(code instanceof String)) {
          code = toString(code);
      }

      source = code;
      index = 0;
      lineNumber = (source.length > 0) ? 1 : 0;
      lineStart = 0;
      length = source.length;
      lookahead = null;
      state = {
          allowIn: true,
          labelSet: {},
          inFunctionBody: false,
          inIteration: false,
          inSwitch: false,
          lastCommentStart: -1
      };

      extra = {};

      // Options matching.
      options = options || {};

      // Of course we collect tokens here.
      options.tokens = true;
      extra.tokens = [];
      extra.tokenize = true;
      // The following two fields are necessary to compute the Regex tokens.
      extra.openParenToken = -1;
      extra.openCurlyToken = -1;

      extra.range = (typeof options.range === 'boolean') && options.range;
      extra.loc = (typeof options.loc === 'boolean') && options.loc;

      if (typeof options.tolerant === 'boolean' && options.tolerant) {
          extra.errors = [];
      }

      try {
          peek();
          if (lookahead.type === Token.EOF) {
              return extra.tokens;
          }

          lex();
          while (lookahead.type !== Token.EOF) {
              try {
                  lex();
              } catch (lexError) {
                  if (extra.errors) {
                      extra.errors.push(lexError);
                      // We have to break on the first error
                      // to avoid infinite loops.
                      break;
                  } else {
                      throw lexError;
                  }
              }
          }

          filterTokenLocation();
          tokens = extra.tokens;
          if (typeof extra.errors !== 'undefined') {
              tokens.errors = extra.errors;
          }
      } catch (e) {
          throw e;
      } finally {
          extra = {};
      }
      return tokens;
  }

  function parse(code, options) {
      var program, toString;

      toString = String;
      if (typeof code !== 'string' && !(code instanceof String)) {
          code = toString(code);
      }

      source = code;
      index = 0;
      lineNumber = (source.length > 0) ? 1 : 0;
      lineStart = 0;
      length = source.length;
      lookahead = null;
      state = {
          allowIn: true,
          labelSet: {},
          parenthesisCount: 0,
          inFunctionBody: false,
          inIteration: false,
          inSwitch: false,
          lastCommentStart: -1
      };

      extra = {};
      if (typeof options !== 'undefined') {
          extra.range = (typeof options.range === 'boolean') && options.range;
          extra.loc = (typeof options.loc === 'boolean') && options.loc;

          if (extra.loc && options.source !== null && options.source !== undefined) {
              extra.source = toString(options.source);
          }

          if (typeof options.tokens === 'boolean' && options.tokens) {
              extra.tokens = [];
          }
          if (typeof options.tolerant === 'boolean' && options.tolerant) {
              extra.errors = [];
          }
      }

      try {
          program = parseProgram();
          if (typeof extra.tokens !== 'undefined') {
              filterTokenLocation();
              program.tokens = extra.tokens;
          }
          if (typeof extra.errors !== 'undefined') {
              program.errors = extra.errors;
          }
      } catch (e) {
          throw e;
      } finally {
          extra = {};
      }

      return program;
  }

  return {
    tokenize: tokenize,
    parse: parse
  };

})();
},{}],41:[function(require,module,exports){
var dl = require('datalib'),
    axs = require('../scene/axis'),
    config = require('../util/config');

var ORIENT = {
  "x":      "bottom",
  "y":      "left",
  "top":    "top",
  "bottom": "bottom",
  "left":   "left",
  "right":  "right"
};

function axes(model, spec, axes, group) {
  (spec || []).forEach(function(def, index) {
    axes[index] = axes[index] || axs(model);
    axis(def, index, axes[index], group);
  });
};

function axis(def, index, axis, group) {
  // axis scale
  if (def.scale !== undefined) {
    axis.scale(group.scale(def.scale));
  }

  // axis orientation
  axis.orient(def.orient || ORIENT[def.type]);
  // axis offset
  axis.offset(def.offset || 0);
  // axis layer
  axis.layer(def.layer || "front");
  // axis grid lines
  axis.grid(def.grid || false);
  // axis title
  axis.title(def.title || null);
  // axis title offset
  axis.titleOffset(def.titleOffset != null
    ? def.titleOffset : config.axis.titleOffset);
  // axis values
  axis.tickValues(def.values || null);
  // axis label formatting
  axis.tickFormat(def.format || null);
  // axis tick subdivision
  axis.tickSubdivide(def.subdivide || 0);
  // axis tick padding
  axis.tickPadding(def.tickPadding || config.axis.padding);

  // axis tick size(s)
  var size = [];
  if (def.tickSize !== undefined) {
    for (var i=0; i<3; ++i) size.push(def.tickSize);
  } else {
    var ts = config.axis.tickSize;
    size = [ts, ts, ts];
  }
  if (def.tickSizeMajor != null) size[0] = def.tickSizeMajor;
  if (def.tickSizeMinor != null) size[1] = def.tickSizeMinor;
  if (def.tickSizeEnd   != null) size[2] = def.tickSizeEnd;
  if (size.length) {
    axis.tickSize.apply(axis, size);
  }

  // tick arguments
  if (def.ticks != null) {
    var ticks = dl.isArray(def.ticks) ? def.ticks : [def.ticks];
    axis.ticks.apply(axis, ticks);
  } else {
    axis.ticks(config.axis.ticks);
  }

  // style properties
  var p = def.properties;
  if (p && p.ticks) {
    axis.majorTickProperties(p.majorTicks
      ? dl.extend({}, p.ticks, p.majorTicks) : p.ticks);
    axis.minorTickProperties(p.minorTicks
      ? dl.extend({}, p.ticks, p.minorTicks) : p.ticks);
  } else {
    axis.majorTickProperties(p && p.majorTicks || {});
    axis.minorTickProperties(p && p.minorTicks || {});
  }
  axis.tickLabelProperties(p && p.labels || {});
  axis.titleProperties(p && p.title || {});
  axis.gridLineProperties(p && p.grid || {});
  axis.domainProperties(p && p.axis || {});
}

module.exports = axes;
},{"../scene/axis":72,"../util/config":91,"datalib":16}],42:[function(require,module,exports){
var dl = require('datalib'),
    config = require('../util/config'),
    parseTransforms = require('./transforms'),
    parseModify = require('./modify');

var parseData = function(model, spec, callback) {
  var count = 0;

  function loaded(d) {
    return function(error, data) {
      if (error) {
        dl.error("LOADING FAILED: " + d.url);
      } else {
        model.data(d.name).values(dl.read(data, d.format));
      }
      if (--count === 0) callback();
    }
  }

  // process each data set definition
  (spec || []).forEach(function(d) {
    if (d.url) {
      count += 1;
      dl.load(dl.extend({url: d.url}, config.load), loaded(d));
    }
    parseData.datasource(model, d);
  });

  if (count === 0) setTimeout(callback, 1);
  return spec;
};

parseData.datasource = function(model, d) {
  var transform = (d.transform||[]).map(function(t) { return parseTransforms(model, t) }),
      mod = (d.modify||[]).map(function(m) { return parseModify(model, m, d) }),
      ds = model.data(d.name, mod.concat(transform));

  if (d.values) {
    ds.values(dl.read(d.values, d.format));
  } else if (d.source) {
    ds.source(d.source)
      .revises(ds.revises()) // If new ds revises, then it's origin must revise too.
      .addListener(ds);  // Derived ds will be pulsed by its src rather than the model.
    model.removeListener(ds.pipeline()[0]); 
  }

  return ds;    
};

module.exports = parseData;
},{"../util/config":91,"./modify":48,"./transforms":55,"datalib":16}],43:[function(require,module,exports){
/*
 * Generated by PEG.js 0.8.0.
 *
 * http://pegjs.majda.cz/
 */

function peg$subclass(child, parent) {
  function ctor() { this.constructor = child; }
  ctor.prototype = parent.prototype;
  child.prototype = new ctor();
}

function SyntaxError(message, expected, found, offset, line, column) {
  this.message  = message;
  this.expected = expected;
  this.found    = found;
  this.offset   = offset;
  this.line     = line;
  this.column   = column;

  this.name     = "SyntaxError";
}

peg$subclass(SyntaxError, Error);

function parse(input) {
  var options = arguments.length > 1 ? arguments[1] : {},

      peg$FAILED = {},

      peg$startRuleFunctions = { start: peg$parsestart },
      peg$startRuleFunction  = peg$parsestart,

      peg$c0 = peg$FAILED,
      peg$c1 = ",",
      peg$c2 = { type: "literal", value: ",", description: "\",\"" },
      peg$c3 = function(o, m) { return [o].concat(m) },
      peg$c4 = function(o) { return [o] },
      peg$c5 = "[",
      peg$c6 = { type: "literal", value: "[", description: "\"[\"" },
      peg$c7 = "]",
      peg$c8 = { type: "literal", value: "]", description: "\"]\"" },
      peg$c9 = ">",
      peg$c10 = { type: "literal", value: ">", description: "\">\"" },
      peg$c11 = function(f1, f2, o) { return {start: f1, end: f2, middle: o}},
      peg$c12 = [],
      peg$c13 = function(s, f) { return (s.filters = f), s },
      peg$c14 = function(s) { return s },
      peg$c15 = null,
      peg$c16 = function(t, e) { return { event: e, target: t } },
      peg$c17 = /^[:a-zA-z0-9_\-]/,
      peg$c18 = { type: "class", value: "[:a-zA-z0-9_\\-]", description: "[:a-zA-z0-9_\\-]" },
      peg$c19 = function(s) { return { signal: s.join("") }},
      peg$c20 = "(",
      peg$c21 = { type: "literal", value: "(", description: "\"(\"" },
      peg$c22 = ")",
      peg$c23 = { type: "literal", value: ")", description: "\")\"" },
      peg$c24 = function(m) { return { stream: m }},
      peg$c25 = ".",
      peg$c26 = { type: "literal", value: ".", description: "\".\"" },
      peg$c27 = ":",
      peg$c28 = { type: "literal", value: ":", description: "\":\"" },
      peg$c29 = function(c) { return { type:'class', value: c } },
      peg$c30 = "#",
      peg$c31 = { type: "literal", value: "#", description: "\"#\"" },
      peg$c32 = function(id) { return { type:'id', value: id } },
      peg$c33 = "mousedown",
      peg$c34 = { type: "literal", value: "mousedown", description: "\"mousedown\"" },
      peg$c35 = "mouseup",
      peg$c36 = { type: "literal", value: "mouseup", description: "\"mouseup\"" },
      peg$c37 = "click",
      peg$c38 = { type: "literal", value: "click", description: "\"click\"" },
      peg$c39 = "dblclick",
      peg$c40 = { type: "literal", value: "dblclick", description: "\"dblclick\"" },
      peg$c41 = "wheel",
      peg$c42 = { type: "literal", value: "wheel", description: "\"wheel\"" },
      peg$c43 = "keydown",
      peg$c44 = { type: "literal", value: "keydown", description: "\"keydown\"" },
      peg$c45 = "keypress",
      peg$c46 = { type: "literal", value: "keypress", description: "\"keypress\"" },
      peg$c47 = "keyup",
      peg$c48 = { type: "literal", value: "keyup", description: "\"keyup\"" },
      peg$c49 = "mousewheel",
      peg$c50 = { type: "literal", value: "mousewheel", description: "\"mousewheel\"" },
      peg$c51 = "mousemove",
      peg$c52 = { type: "literal", value: "mousemove", description: "\"mousemove\"" },
      peg$c53 = "mouseout",
      peg$c54 = { type: "literal", value: "mouseout", description: "\"mouseout\"" },
      peg$c55 = "mouseover",
      peg$c56 = { type: "literal", value: "mouseover", description: "\"mouseover\"" },
      peg$c57 = "mouseenter",
      peg$c58 = { type: "literal", value: "mouseenter", description: "\"mouseenter\"" },
      peg$c59 = "touchstart",
      peg$c60 = { type: "literal", value: "touchstart", description: "\"touchstart\"" },
      peg$c61 = "touchmove",
      peg$c62 = { type: "literal", value: "touchmove", description: "\"touchmove\"" },
      peg$c63 = "touchend",
      peg$c64 = { type: "literal", value: "touchend", description: "\"touchend\"" },
      peg$c65 = function(field) { return field  },
      peg$c66 = /^['"a-zA-Z0-9_.><=! \t\-]/,
      peg$c67 = { type: "class", value: "['\"a-zA-Z0-9_.><=! \\t\\-]", description: "['\"a-zA-Z0-9_.><=! \\t\\-]" },
      peg$c68 = function(v) { return v.join("") },
      peg$c69 = /^[ \t\r\n]/,
      peg$c70 = { type: "class", value: "[ \\t\\r\\n]", description: "[ \\t\\r\\n]" },

      peg$currPos          = 0,
      peg$reportedPos      = 0,
      peg$cachedPos        = 0,
      peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
      peg$maxFailPos       = 0,
      peg$maxFailExpected  = [],
      peg$silentFails      = 0,

      peg$result;

  if ("startRule" in options) {
    if (!(options.startRule in peg$startRuleFunctions)) {
      throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
    }

    peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
  }

  function text() {
    return input.substring(peg$reportedPos, peg$currPos);
  }

  function offset() {
    return peg$reportedPos;
  }

  function line() {
    return peg$computePosDetails(peg$reportedPos).line;
  }

  function column() {
    return peg$computePosDetails(peg$reportedPos).column;
  }

  function expected(description) {
    throw peg$buildException(
      null,
      [{ type: "other", description: description }],
      peg$reportedPos
    );
  }

  function error(message) {
    throw peg$buildException(message, null, peg$reportedPos);
  }

  function peg$computePosDetails(pos) {
    function advance(details, startPos, endPos) {
      var p, ch;

      for (p = startPos; p < endPos; p++) {
        ch = input.charAt(p);
        if (ch === "\n") {
          if (!details.seenCR) { details.line++; }
          details.column = 1;
          details.seenCR = false;
        } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
          details.line++;
          details.column = 1;
          details.seenCR = true;
        } else {
          details.column++;
          details.seenCR = false;
        }
      }
    }

    if (peg$cachedPos !== pos) {
      if (peg$cachedPos > pos) {
        peg$cachedPos = 0;
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
      }
      advance(peg$cachedPosDetails, peg$cachedPos, pos);
      peg$cachedPos = pos;
    }

    return peg$cachedPosDetails;
  }

  function peg$fail(expected) {
    if (peg$currPos < peg$maxFailPos) { return; }

    if (peg$currPos > peg$maxFailPos) {
      peg$maxFailPos = peg$currPos;
      peg$maxFailExpected = [];
    }

    peg$maxFailExpected.push(expected);
  }

  function peg$buildException(message, expected, pos) {
    function cleanupExpected(expected) {
      var i = 1;

      expected.sort(function(a, b) {
        if (a.description < b.description) {
          return -1;
        } else if (a.description > b.description) {
          return 1;
        } else {
          return 0;
        }
      });

      while (i < expected.length) {
        if (expected[i - 1] === expected[i]) {
          expected.splice(i, 1);
        } else {
          i++;
        }
      }
    }

    function buildMessage(expected, found) {
      function stringEscape(s) {
        function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

        return s
          .replace(/\\/g,   '\\\\')
          .replace(/"/g,    '\\"')
          .replace(/\x08/g, '\\b')
          .replace(/\t/g,   '\\t')
          .replace(/\n/g,   '\\n')
          .replace(/\f/g,   '\\f')
          .replace(/\r/g,   '\\r')
          .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
          .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
          .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
          .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
      }

      var expectedDescs = new Array(expected.length),
          expectedDesc, foundDesc, i;

      for (i = 0; i < expected.length; i++) {
        expectedDescs[i] = expected[i].description;
      }

      expectedDesc = expected.length > 1
        ? expectedDescs.slice(0, -1).join(", ")
            + " or "
            + expectedDescs[expected.length - 1]
        : expectedDescs[0];

      foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

      return "Expected " + expectedDesc + " but " + foundDesc + " found.";
    }

    var posDetails = peg$computePosDetails(pos),
        found      = pos < input.length ? input.charAt(pos) : null;

    if (expected !== null) {
      cleanupExpected(expected);
    }

    return new SyntaxError(
      message !== null ? message : buildMessage(expected, found),
      expected,
      found,
      pos,
      posDetails.line,
      posDetails.column
    );
  }

  function peg$parsestart() {
    var s0;

    s0 = peg$parsemerged();

    return s0;
  }

  function peg$parsemerged() {
    var s0, s1, s2, s3, s4, s5;

    s0 = peg$currPos;
    s1 = peg$parseordered();
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesep();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 44) {
          s3 = peg$c1;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c2); }
        }
        if (s3 !== peg$FAILED) {
          s4 = peg$parsesep();
          if (s4 !== peg$FAILED) {
            s5 = peg$parsemerged();
            if (s5 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c3(s1, s5);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$c0;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parseordered();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c4(s1);
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parseordered() {
    var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 91) {
      s1 = peg$c5;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c6); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsesep();
      if (s2 !== peg$FAILED) {
        s3 = peg$parsefiltered();
        if (s3 !== peg$FAILED) {
          s4 = peg$parsesep();
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s5 = peg$c1;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c2); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parsesep();
              if (s6 !== peg$FAILED) {
                s7 = peg$parsefiltered();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parsesep();
                  if (s8 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 93) {
                      s9 = peg$c7;
                      peg$currPos++;
                    } else {
                      s9 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c8); }
                    }
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parsesep();
                      if (s10 !== peg$FAILED) {
                        if (input.charCodeAt(peg$currPos) === 62) {
                          s11 = peg$c9;
                          peg$currPos++;
                        } else {
                          s11 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c10); }
                        }
                        if (s11 !== peg$FAILED) {
                          s12 = peg$parsesep();
                          if (s12 !== peg$FAILED) {
                            s13 = peg$parseordered();
                            if (s13 !== peg$FAILED) {
                              peg$reportedPos = s0;
                              s1 = peg$c11(s3, s7, s13);
                              s0 = s1;
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c0;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c0;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c0;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c0;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c0;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c0;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c0;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c0;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$c0;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$parsefiltered();
    }

    return s0;
  }

  function peg$parsefiltered() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parsestream();
    if (s1 !== peg$FAILED) {
      s2 = [];
      s3 = peg$parsefilter();
      if (s3 !== peg$FAILED) {
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parsefilter();
        }
      } else {
        s2 = peg$c0;
      }
      if (s2 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c13(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$c0;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = peg$parsestream();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c14(s1);
      }
      s0 = s1;
    }

    return s0;
  }

  function peg$parsestream() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    s1 = peg$parseclass();
    if (s1 === peg$FAILED) {
      s1 = peg$parseid();
    }
    if (s1 === peg$FAILED) {
      s1 = peg$c15;
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parseeventType();
      if (s2 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c16(s1, s2);
        s0 = s1;
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$c0;
    }
    if (s0 === peg$FAILED) {
      s0 = peg$currPos;
      s1 = [];
      if (peg$c17.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c18); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c17.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c18); }
          }
        }
      } else {
        s1 = peg$c0;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c19(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 40) {
          s1 = peg$c20;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c21); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parsemerged();
          if (s2 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 41) {
              s3 = peg$c22;
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c23); }
            }
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c24(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c0;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c0;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      }
    }

    return s0;
  }

  function peg$parseclass() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 46) {
      s1 = peg$c25;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c26); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsevalue();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 58) {
          s3 = peg$c27;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c28); }
        }
        if (s3 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c29(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$c0;
    }

    return s0;
  }

  function peg$parseid() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 35) {
      s1 = peg$c30;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c31); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsevalue();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 58) {
          s3 = peg$c27;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c28); }
        }
        if (s3 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c32(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$c0;
    }

    return s0;
  }

  function peg$parseeventType() {
    var s0;

    if (input.substr(peg$currPos, 9) === peg$c33) {
      s0 = peg$c33;
      peg$currPos += 9;
    } else {
      s0 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c34); }
    }
    if (s0 === peg$FAILED) {
      if (input.substr(peg$currPos, 7) === peg$c35) {
        s0 = peg$c35;
        peg$currPos += 7;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c36); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 5) === peg$c37) {
          s0 = peg$c37;
          peg$currPos += 5;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c38); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 8) === peg$c39) {
            s0 = peg$c39;
            peg$currPos += 8;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c40); }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 5) === peg$c41) {
              s0 = peg$c41;
              peg$currPos += 5;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c42); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 7) === peg$c43) {
                s0 = peg$c43;
                peg$currPos += 7;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c44); }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 8) === peg$c45) {
                  s0 = peg$c45;
                  peg$currPos += 8;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c46); }
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 5) === peg$c47) {
                    s0 = peg$c47;
                    peg$currPos += 5;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c48); }
                  }
                  if (s0 === peg$FAILED) {
                    if (input.substr(peg$currPos, 10) === peg$c49) {
                      s0 = peg$c49;
                      peg$currPos += 10;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c50); }
                    }
                    if (s0 === peg$FAILED) {
                      if (input.substr(peg$currPos, 9) === peg$c51) {
                        s0 = peg$c51;
                        peg$currPos += 9;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c52); }
                      }
                      if (s0 === peg$FAILED) {
                        if (input.substr(peg$currPos, 8) === peg$c53) {
                          s0 = peg$c53;
                          peg$currPos += 8;
                        } else {
                          s0 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c54); }
                        }
                        if (s0 === peg$FAILED) {
                          if (input.substr(peg$currPos, 9) === peg$c55) {
                            s0 = peg$c55;
                            peg$currPos += 9;
                          } else {
                            s0 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c56); }
                          }
                          if (s0 === peg$FAILED) {
                            if (input.substr(peg$currPos, 10) === peg$c57) {
                              s0 = peg$c57;
                              peg$currPos += 10;
                            } else {
                              s0 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c58); }
                            }
                            if (s0 === peg$FAILED) {
                              if (input.substr(peg$currPos, 10) === peg$c59) {
                                s0 = peg$c59;
                                peg$currPos += 10;
                              } else {
                                s0 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c60); }
                              }
                              if (s0 === peg$FAILED) {
                                if (input.substr(peg$currPos, 9) === peg$c61) {
                                  s0 = peg$c61;
                                  peg$currPos += 9;
                                } else {
                                  s0 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c62); }
                                }
                                if (s0 === peg$FAILED) {
                                  if (input.substr(peg$currPos, 8) === peg$c63) {
                                    s0 = peg$c63;
                                    peg$currPos += 8;
                                  } else {
                                    s0 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c64); }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return s0;
  }

  function peg$parsefilter() {
    var s0, s1, s2, s3;

    s0 = peg$currPos;
    if (input.charCodeAt(peg$currPos) === 91) {
      s1 = peg$c5;
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c6); }
    }
    if (s1 !== peg$FAILED) {
      s2 = peg$parsevalue();
      if (s2 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 93) {
          s3 = peg$c7;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c8); }
        }
        if (s3 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c65(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c0;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c0;
      }
    } else {
      peg$currPos = s0;
      s0 = peg$c0;
    }

    return s0;
  }

  function peg$parsevalue() {
    var s0, s1, s2;

    s0 = peg$currPos;
    s1 = [];
    if (peg$c66.test(input.charAt(peg$currPos))) {
      s2 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s2 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c67); }
    }
    if (s2 !== peg$FAILED) {
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c66.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c67); }
        }
      }
    } else {
      s1 = peg$c0;
    }
    if (s1 !== peg$FAILED) {
      peg$reportedPos = s0;
      s1 = peg$c68(s1);
    }
    s0 = s1;

    return s0;
  }

  function peg$parsesep() {
    var s0, s1;

    s0 = [];
    if (peg$c69.test(input.charAt(peg$currPos))) {
      s1 = input.charAt(peg$currPos);
      peg$currPos++;
    } else {
      s1 = peg$FAILED;
      if (peg$silentFails === 0) { peg$fail(peg$c70); }
    }
    while (s1 !== peg$FAILED) {
      s0.push(s1);
      if (peg$c69.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c70); }
      }
    }

    return s0;
  }

  peg$result = peg$startRuleFunction();

  if (peg$result !== peg$FAILED && peg$currPos === input.length) {
    return peg$result;
  } else {
    if (peg$result !== peg$FAILED && peg$currPos < input.length) {
      peg$fail({ type: "end", description: "end of input" });
    }

    throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
  }
}

module.exports = {
  SyntaxError: SyntaxError,
  parse:       parse
};
},{}],44:[function(require,module,exports){
var dl = require('datalib'),
    expression = require('../expression');

var expr = (function() {
  var parse = expression.parse;
  var codegen = expression.code({
    idWhiteList: ['d', 'e', 'i', 'p', 'sg']
  });

  return function(expr) {    
    var value = codegen(parse(expr));
    value.fn = Function('d', 'e', 'i', 'p', 'sg',
      '"use strict"; return (' + value.fn + ');');
    return value;
  };
})();

expr.eval = function(graph, fn, d, e, i, p, sg) {
  sg = graph.signalValues(dl.array(sg));
  return fn.call(null, d, e, i, p, sg);
};

module.exports = expr;
},{"../expression":39,"datalib":16}],45:[function(require,module,exports){
var dl = require('datalib'),
    config = require('../util/config'),
    C = require('../util/constants');

module.exports = function parseInteractors(model, spec, defFactory) {
  var count = 0,
      sg = {}, pd = {}, mk = {},
      signals = [], predicates = [];

  function loaded(i) {
    return function(error, data) {
      if (error) {
        dl.error("LOADING FAILED: " + i.url);
      } else {
        var def = dl.isObject(data) ? data : JSON.parse(data);
        interactor(i.name, def);
      }
      if (--count == 0) inject();
    }
  }

  function interactor(name, def) {
    sg = {}, pd = {};
    if (def.signals)    signals.push.apply(signals, nsSignals(name, def.signals));
    if (def.predicates) predicates.push.apply(predicates, nsPredicates(name, def.predicates));
    nsMarks(name, def.marks);
  }

  function inject() {
    if (dl.keys(mk).length > 0) injectMarks(spec.marks);
    spec.signals = dl.array(spec.signals);
    spec.predicates = dl.array(spec.predicates);
    spec.signals.unshift.apply(spec.signals, signals);
    spec.predicates.unshift.apply(spec.predicates, predicates);
    defFactory();
  }

  function injectMarks(marks) {
    var m, r, i, len;
    marks = dl.array(marks);

    for(i = 0, len = marks.length; i < len; i++) {
      m = marks[i];
      if (r = mk[m.type]) {
        marks[i] = dl.duplicate(r);
        if (m.from) marks[i].from = m.from;
        if (m.properties) {
          [C.ENTER, C.UPDATE, C.EXIT].forEach(function(p) {
            marks[i].properties[p] = dl.extend(r.properties[p], m.properties[p]);
          });
        }
      } else if (m.marks) {  // TODO how to override properties of nested marks?
        injectMarks(m.marks);
      }
    }    
  }

  function ns(n, s) { 
    if (dl.isString(s)) {
      return s + "_" + n;
    } else {
      dl.keys(s).forEach(function(x) { 
        var regex = new RegExp('\\b'+x+'\\b', "g");
        n = n.replace(regex, s[x]) 
      });
      return n;
    }
  }

  function nsSignals(name, signals) {
    signals = dl.array(signals);
    // Two passes to ns all signals, and then overwrite their definitions
    // in case signal order is important.
    signals.forEach(function(s) { s.name = sg[s.name] = ns(s.name, name); });
    signals.forEach(function(s) {
      (s.streams || []).forEach(function(t) {
        t.type = ns(t.type, sg);
        t.expr = ns(t.expr, sg);
      });
    });
    return signals;
  }

  function nsPredicates(name, predicates) {
    predicates = dl.array(predicates);
    predicates.forEach(function(p) {
      p.name = pd[p.name] = ns(p.name, name);

      [p.operands, p.range].forEach(function(x) {
        (x || []).forEach(function(o) {
          if (o.signal) o.signal = ns(o.signal, sg);
          else if (o.predicate) nsOperand(o);
        })
      });

    });  
    return predicates; 
  }

  function nsOperand(o) {
    o.predicate = pd[o.predicate];
    dl.keys(o.input).forEach(function(k) {
      var i = o.input[k];
      if (i.signal) i.signal = ns(i.signal, sg);
    });
  }

  function nsMarks(name, marks) {
    (marks || []).forEach(function(m) { 
      nsProperties(m.properties.enter);
      nsProperties(m.properties.update);
      nsProperties(m.properties.exit);
      mk[ns(m.name, name)] = m; 
    });
  }

  function nsProperties(propset) {
    dl.keys(propset).forEach(function(k) {
      var p = propset[k];
      if (p.signal) p.signal = ns(p.signal, sg);
      else if (p.rule) {
        p.rule.forEach(function(r) { 
          if (r.signal) r.signal = ns(r.signal, sg);
          if (r.predicate) nsOperand(r); 
        });
      }
    });
  }

  (spec.interactors || []).forEach(function(i) {
    if (i.url) {
      count += 1;
      dl.load(dl.extend({url: i.url}, config.load), loaded(i));
    }
  });

  if (count === 0) setTimeout(inject, 1);
  return spec;
}
},{"../util/config":91,"../util/constants":92,"datalib":16}],46:[function(require,module,exports){
var dl = require('datalib'),
    parseProperties = require('./properties');

module.exports = function parseMark(model, mark) {
  var props = mark.properties,
      group = mark.marks;

  // parse mark property definitions
  dl.keys(props).forEach(function(k) {
    props[k] = parseProperties(model, mark.type, props[k]);
  });

  // parse delay function
  if (mark.delay) {
    mark.delay = parseProperties(model, mark.type, {delay: mark.delay});
  }

  // recurse if group type
  if (group) {
    mark.marks = group.map(function(g) { return parseMark(model, g); });
  }
    
  return mark;
};
},{"./properties":51,"datalib":16}],47:[function(require,module,exports){
var parseMark = require('./mark');

module.exports = function(model, spec, width, height) {
  return {
    type: "group",
    width: width,
    height: height,
    scales: spec.scales || [],
    axes: spec.axes || [],
    // legends: spec.legends || [],
    marks: (spec.marks || []).map(function(m) { return parseMark(model, m); })
  };
};
},{"./mark":46}],48:[function(require,module,exports){
var dl = require('datalib'),
    Node = require('../dataflow/Node'),
    tuple = require('../dataflow/tuple'),
    debug = require('../util/debug'),
    C = require('../util/constants');

var filter = function(field, value, src, dest) {
  for(var i = src.length-1; i >= 0; --i) {
    if(src[i][field] == value)
      dest.push.apply(dest, src.splice(i, 1));
  }
};

module.exports = function parseModify(model, def, ds) {
  var graph = model.graph,
      signal = def.signal ? dl.field(def.signal) : null, 
      signalName = signal ? signal[0] : null,
      predicate = def.predicate ? model.predicate(def.predicate) : null,
      reeval = (predicate === null),
      node = new Node(graph);

  node.evaluate = function(input) {
    if(predicate !== null) {
      var db = {};
      (predicate.data||[]).forEach(function(d) { db[d] = model.data(d).values(); });

      // TODO: input
      reeval = predicate({}, db, graph.signalValues(predicate.signals||[]), model._predicates);
    }

    debug(input, [def.type+"ing", reeval]);
    if(!reeval) return input;

    var datum = {}, 
        value = signal ? graph.signalRef(def.signal) : null,
        d = model.data(ds.name),
        prev = d.revises() ? null : undefined,
        t = null;

    datum[def.field] = value;

    // We have to modify ds._data so that subsequent pulses contain
    // our dynamic data. W/o modifying ds._data, only the output
    // collector will contain dynamic tuples. 
    if(def.type == C.ADD) {
      t = tuple.ingest(datum, prev);
      input.add.push(t);
      d._data.push(t);
    } else if(def.type == C.REMOVE) {
      filter(def.field, value, input.add, input.rem);
      filter(def.field, value, input.mod, input.rem);
      d._data = d._data.filter(function(x) { return x[def.field] !== value });
    } else if(def.type == C.TOGGLE) {
      var add = [], rem = [];
      filter(def.field, value, input.rem, add);
      filter(def.field, value, input.add, rem);
      filter(def.field, value, input.mod, rem);
      if(add.length == 0 && rem.length == 0) add.push(tuple.ingest(datum));

      input.add.push.apply(input.add, add);
      d._data.push.apply(d._data, add);
      input.rem.push.apply(input.rem, rem);
      d._data = d._data.filter(function(x) { return rem.indexOf(x) === -1 });
    } else if(def.type == C.CLEAR) {
      input.rem.push.apply(input.rem, input.add);
      input.rem.push.apply(input.rem, input.mod);
      input.add = [];
      input.mod = [];
      d._data  = [];
    } 

    input.fields[def.field] = 1;
    return input;
  };

  if(signalName) node.dependency(C.SIGNALS, signalName);
  if(predicate)  node.dependency(C.SIGNALS, predicate.signals);
  
  return node;
}
},{"../dataflow/Node":32,"../dataflow/tuple":35,"../util/constants":92,"../util/debug":93,"datalib":16}],49:[function(require,module,exports){
var dl = require('datalib');

module.exports = function parsePadding(pad) {
  if (pad == null) return "auto";
  else if (dl.isString(pad)) return pad==="strict" ? "strict" : "auto";
  else if (dl.isObject(pad)) return pad;
  var p = dl.isNumber(pad) ? pad : 20;
  return {top:p, left:p, right:p, bottom:p};
}
},{"datalib":16}],50:[function(require,module,exports){
var dl = require('datalib');

module.exports = function parsePredicate(model, spec) {
  var types = {
    '=':  parseComparator,
    '==': parseComparator,
    '!=': parseComparator,
    '>':  parseComparator,
    '>=': parseComparator,
    '<':  parseComparator,
    '<=': parseComparator,
    'and': parseLogical,
    '&&':  parseLogical,
    'or':  parseLogical,
    '||':  parseLogical,
    'in': parseIn
  };

  function parseSignal(signal, signals) {
    var s = dl.field(signal),
        code = "signals["+s.map(dl.str).join("][")+"]";
    signals[s.shift()] = 1;
    return code;
  };

  function parseOperands(operands) {
    var decl = [], defs = [],
        signals = {}, db = {};

    dl.array(operands).forEach(function(o, i) {
      var signal, name = "o"+i, def = "";
      
      if(o.value !== undefined) def = dl.str(o.value);
      else if(o.arg)    def = "args["+dl.str(o.arg)+"]";
      else if(o.signal) def = parseSignal(o.signal, signals);
      else if(o.predicate) {
        var pred = model.predicate(o.predicate);
        pred.signals.forEach(function(s) { signals[s] = 1; });
        pred.data.forEach(function(d) { db[d] = 1 });

        dl.keys(o.input).forEach(function(k) {
          var i = o.input[k], signal;
          def += "args["+dl.str(k)+"] = ";
          if(i.signal)   def += parseSignal(i.signal, signals);
          else if(i.arg) def += "args["+dl.str(i.arg)+"]";
          def+=", ";
        });

        def+= "predicates["+dl.str(o.predicate)+"](args, db, signals, predicates)";
      }

      decl.push(name);
      defs.push(name+"=("+def+")");
    });

    return {
      code: "var " + decl.join(", ") + ";\n" + defs.join(";\n") + ";\n",
      signals: dl.keys(signals),
      data: dl.keys(db)
    }
  };

  function parseComparator(spec) {
    var ops = parseOperands(spec.operands);
    if(spec.type == '=') spec.type = '==';

    return {
      code: ops.code + "return " + ["o0", "o1"].join(spec.type) + ";",
      signals: ops.signals,
      data: ops.data
    };
  };

  function parseLogical(spec) {
    var ops = parseOperands(spec.operands),
        o = [], i = 0, len = spec.operands.length;

    while(o.push("o"+i++)<len);
    if(spec.type == 'and') spec.type = '&&';
    else if(spec.type == 'or') spec.type = '||';

    return {
      code: ops.code + "return " + o.join(spec.type) + ";",
      signals: ops.signals,
      data: ops.data
    };
  };

  function parseIn(spec) {
    var o = [spec.item];
    if(spec.range) o.push.apply(o, spec.range);
    if(spec.scale) o.push(spec.scale);

    var ops = parseOperands(o),
        code = ops.code;

    if(spec.data) {
      var field = dl.field(spec.field).map(dl.str);
      code += "var where = function(d) { return d["+field.join("][")+"] == o0 };\n";
      code += "return db["+dl.str(spec.data)+"].filter(where).length > 0;";
    } else if(spec.range) {
      // TODO: inclusive/exclusive range?
      // TODO: inverting ordinal scales
      if(spec.scale) code += "o1 = o3(o1);\no2 = o3(o2);\n";
      code += "return o1 < o2 ? o1 <= o0 && o0 <= o2 : o2 <= o0 && o0 <= o1";
    }

    return {
      code: code, 
      signals: ops.signals, 
      data: ops.data.concat(spec.data ? [spec.data] : [])
    };
  };

  (spec || []).forEach(function(s) {
    var parse = types[s.type](s);
    var pred = Function("args", "db", "signals", "predicates", parse.code);
    pred.signals = parse.signals;
    pred.data = parse.data;
    model.predicate(s.name, pred);
  });

  return spec;
}
},{"datalib":16}],51:[function(require,module,exports){
(function (global){
var dl = require('datalib'),
    d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null),
    tuple = require('../dataflow/tuple'),
    config = require('../util/config');

function compile(model, mark, spec) {
  var code = "",
      names = dl.keys(spec),
      i, len, name, ref, vars = {}, 
      deps = {
        signals: {},
        scales: {},
        data: {}
      };
      
  code += "var o = trans ? {} : item;\n"
  
  for (i=0, len=names.length; i<len; ++i) {
    ref = spec[name = names[i]];
    code += (i > 0) ? "\n  " : "  ";
    if(ref.rule) {
      ref = rule(model, name, ref.rule);
      code += "\n  " + ref.code
    } else {
      ref = valueRef(name, ref);
      code += "this.tpl.set(o, "+dl.str(name)+", "+ref.val+");";
    }

    vars[name] = true;
    ['signals', 'scales', 'data'].forEach(function(p) {
      if(ref[p] != null) dl.array(ref[p]).forEach(function(k) { deps[p][k] = 1 });
    });
  }

  if (vars.x2) {
    if (vars.x) {
      code += "\n  if (o.x > o.x2) { "
            + "var t = o.x;"
            + "this.tpl.set(o, 'x', o.x2);"
            + "this.tpl.set(o, 'x2', t); "
            + "};";
      code += "\n  this.tpl.set(o, 'width', (o.x2 - o.x));";
    } else if (vars.width) {
      code += "\n  this.tpl.set(o, 'x', (o.x2 - o.width));";
    } else {
      code += "\n  this.tpl.set(o, 'x', o.x2);"
    }
  }

  if (vars.y2) {
    if (vars.y) {
      code += "\n  if (o.y > o.y2) { "
            + "var t = o.y;"
            + "this.tpl.set(o, 'y', o.y2);"
            + "this.tpl.set(o, 'y2', t);"
            + "};";
      code += "\n  this.tpl.set(o, 'height', (o.y2 - o.y));";
    } else if (vars.height) {
      code += "\n  this.tpl.set(o, 'y', (o.y2 - o.height));";
    } else {
      code += "\n  this.tpl.set(o, 'y', o.y2);"
    }
  }
  
  if (hasPath(mark, vars)) code += "\n  item.touch();";
  code += "\n  if (trans) trans.interpolate(item, o);";

  try {
    var encoder = Function("item", "group", "trans", "db", 
      "signals", "predicates", code);
    encoder.tpl  = tuple;
    encoder.util = dl;
    encoder.d3   = d3; // For color spaces
    return {
      encode: encoder,
      signals: dl.keys(deps.signals),
      scales: dl.keys(deps.scales),
      data: dl.keys(deps.data)
    }
  } catch (e) {
    dl.error(e);
    dl.log(code);
  }
}

function hasPath(mark, vars) {
  return vars.path ||
    ((mark==="area" || mark==="line") &&
      (vars.x || vars.x2 || vars.width ||
       vars.y || vars.y2 || vars.height ||
       vars.tension || vars.interpolate));
}

var GROUP_VARS = {
  "width": 1,
  "height": 1,
  "mark.group.width": 1,
  "mark.group.height": 1
};

function rule(model, name, rules) {
  var signals = [], scales = [], db = [],
      inputs = [], code = "";

  (rules||[]).forEach(function(r, i) {
    var predName = r.predicate,
        pred = model.predicate(predName),
        input = [], args = name+"_arg"+i,
        ref;

    dl.keys(r.input).forEach(function(k) {
      var ref = valueRef(i, r.input[k]);
      input.push(dl.str(k)+": "+ref.val);
      if(ref.signals) signals.push.apply(signals, dl.array(ref.signals));
      if(ref.scales)  scales.push.apply(scales, dl.array(ref.scales));
    });

    ref = valueRef(name, r);
    if(ref.signals) signals.push.apply(signals, dl.array(ref.signals));
    if(ref.scales)  scales.push.apply(scales, dl.array(ref.scales));

    if(predName) {
      signals.push.apply(signals, pred.signals);
      db.push.apply(db, pred.data);
      inputs.push(args+" = {"+input.join(', ')+"}");
      code += "if(predicates["+dl.str(predName)+"]("+args+", db, signals, predicates)) {\n" +
        "    this.tpl.set(o, "+dl.str(name)+", "+ref.val+");\n";
      code += rules[i+1] ? "  } else " : "  }";
    } else {
      code += "{\n" + 
        "    this.tpl.set(o, "+dl.str(name)+", "+ref.val+");\n"+
        "  }";
    }
  });

  code = "var " + inputs.join(",\n      ") + ";\n  " + code;
  return {code: code, signals: signals, scales: scales, data: db};
}

function valueRef(name, ref) {
  if (ref == null) return null;
  var isColor = name==="fill" || name==="stroke";
  var signals = [];

  if (isColor) {
    if (ref.c) {
      return colorRef("hcl", ref.h, ref.c, ref.l);
    } else if (ref.h || ref.s) {
      return colorRef("hsl", ref.h, ref.s, ref.l);
    } else if (ref.l || ref.a) {
      return colorRef("lab", ref.l, ref.a, ref.b);
    } else if (ref.r || ref.g || ref.b) {
      return colorRef("rgb", ref.r, ref.g, ref.b);
    }
  }

  // initialize value
  var val = null, signalRef = null;
  if (ref.value !== undefined) {
    val = dl.str(ref.value);
  }

  if (ref.signal !== undefined) {
    signalRef = dl.field(ref.signal);
    val = "signals["+signalRef.map(dl.str).join("][")+"]"; 
    signals.push(signalRef.shift());
  }

  // get field reference for enclosing group
  if (ref.group != null) {
    var grp = "group.datum";
    if (dl.isString(ref.group)) {
      grp = GROUP_VARS[ref.group]
        ? "group." + ref.group
        : "group.datum["+dl.field(ref.group).map(dl.str).join("][")+"]";
    }
  }

  // get data field value
  if (ref.field != null) {
    if (dl.isString(ref.field)) {
      val = "item.datum["+dl.field(ref.field).map(dl.str).join("][")+"]";
      if (ref.group != null) { val = "this.util.accessor("+val+")("+grp+")"; }
    } else if(ref.field.signal) {
      signalRef = dl.field(ref.field.signal);
      val = "item.datum[signals["+signalRef.map(dl.str).join("][")+"]]";
      if (ref.group != null) { val = "this.util.accessor("+val+")("+grp+")"; }
      signals.push(signalRef.shift());
    } else {
      val = "this.util.accessor(group.datum["
          + dl.field(ref.field.group).map(dl.str).join("][")
          + "])(item.datum)";
    }
  } else if (ref.group != null) {
    val = grp;
  }

  if (ref.scale != null) {
    var scale = null;
    if(dl.isString(ref.scale)) {
      scale = dl.str(ref.scale);
    } else if(ref.scale.signal) {
      signalRef = dl.field(ref.scale.signal);
      scale = "signals["+signalRef.map(dl.str).join("][")+"]";
      signals.push(signalRef.shift());
    } else {
      scale = (ref.scale.group ? "group" : "item")
        + ".datum[" + dl.str(ref.scale.group || ref.scale.field) + "]";
    }

    scale = "group.scale(" + scale + ")";
    if(ref.invert) scale += ".invert";  // TODO: ordinal scales

    // run through scale function if val specified.
    // if no val, scale function is predicate arg.
    if(val !== null || ref.band || ref.mult || ref.offset) {
      val = scale + (ref.band ? ".rangeBand()" : 
        "("+(val !== null ? val : "item.datum.data")+")");
    } else {
      val = scale;
    }
  }
  
  // multiply, offset, return value
  val = "(" + (ref.mult?(dl.number(ref.mult)+" * "):"") + val + ")"
    + (ref.offset ? " + " + dl.number(ref.offset) : "");
  return {val: val, signals: signals, scales: ref.scale};
}

function colorRef(type, x, y, z) {
  var xx = x ? valueRef("", x) : config.color[type][0],
      yy = y ? valueRef("", y) : config.color[type][1],
      zz = z ? valueRef("", z) : config.color[type][2]
      signals = [], scales = [];

  [xx, yy, zz].forEach(function(v) {
    if(v.signals) signals.push.apply(signals, v.signals);
    if(v.scales)  scales.push(v.scales);
  });

  return {
    val: "(this.d3." + type + "(" + [xx.val, yy.val, zz.val].join(",") + ') + "")',
    signals: signals,
    scales: scales
  };
}

module.exports = compile;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../dataflow/tuple":35,"../util/config":91,"datalib":16}],52:[function(require,module,exports){
var expr = require('./expr'),
    C = require('../util/constants');

module.exports = function parseSignals(model, spec) {
  var graph = model.graph;

  // process each signal definition
  (spec || []).forEach(function(s) {
    var signal = graph.signal(s.name, s.init),
        exp;

    if(s.expr) {
      exp = expr(s.expr);
      signal.evaluate = function(input) {
        var value = expr.eval(graph, exp.fn, null, null, null, null, exp.signals);
        if(spec.scale) value = model.scale(spec, value);
        signal.value(value);
        input.signals[s.name] = 1;
        return input;
      };
      signal.dependency(C.SIGNALS, exp.signals);
      exp.signals.forEach(function(dep) { graph.signal(dep).addListener(signal); });
    }
  });

  return spec;
};
},{"../util/constants":92,"./expr":44}],53:[function(require,module,exports){
var dl = require('datalib'),
    Model = require('../core/Model'), 
    View = require('../core/View'), 
    parsePadding = require('../parse/padding'),
    parseMarks = require('../parse/marks'),
    parseSignals = require('../parse/signals'),
    parsePredicates = require('../parse/predicates'),
    parseData = require('../parse/data'),
    parseInteractors = require('../parse/interactors');

module.exports = function parseSpec(spec, callback, viewFactory) {
  // protect against subsequent spec modification
  spec = dl.duplicate(spec);

  viewFactory = viewFactory || View.factory;

  var width = spec.width || 500,
      height = spec.height || 500,
      viewport = spec.viewport || null,
      model = new Model();

  parseInteractors(model, spec, function() {
    model.defs({
      width: width,
      height: height,
      viewport: viewport,
      padding: parsePadding(spec.padding),
      signals: parseSignals(model, spec.signals),
      predicates: parsePredicates(model, spec.predicates),
      marks: parseMarks(model, spec, width, height),
      data: parseData(model, spec.data, function() { callback(viewFactory(model)); })
    });
  });
}
},{"../core/Model":27,"../core/View":28,"../parse/data":42,"../parse/interactors":45,"../parse/marks":47,"../parse/padding":49,"../parse/predicates":50,"../parse/signals":52,"datalib":16}],54:[function(require,module,exports){
(function (global){
var dl = require('datalib'),
    d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null),
    Node = require('../dataflow/Node'),
    changset = require('../dataflow/changeset'),
    selector = require('./events'),
    expr = require('./expr'),
    C = require('../util/constants');

var START = "start", MIDDLE = "middle", END = "end";

module.exports = function(view) {
  var model = view.model(),
      graph = model.graph,
      spec  = model.defs().signals,
      register = {}, nodes = {};

  function scale(def, value, item) {
    if(!item || !item.scale) {
      item = (item && item.mark) ? item.mark.group : model.scene().items[0];
    }

    var scale = item.scale(def.scale.signal || def.scale);
    if(!scale) return value;
    return def.invert ? scale.invert(value) : scale(value);
  }

  function signal(sig, selector, exp, spec) {
    var n = new Node(graph),
        item = spec.item ? graph.signal(spec.item.signal) : null;
    n.evaluate = function(input) {
      if(!input.signals[selector.signal]) return graph.doNotPropagate;
      var val = expr.eval(graph, exp.fn, null, null, null, null, exp.signals);
      if(spec.scale) val = scale(spec, val, item ? item.value() : null);
      sig.value(val);
      input.signals[sig.name()] = 1;
      input.reflow = true;
      return input;  
    };
    n.dependency(C.SIGNALS, selector.signal);
    n.addListener(sig);
    graph.signal(selector.signal).addListener(n);
  };

  function event(sig, selector, exp, spec) {
    var filters = selector.filters || [],
        target = selector.target;

    if(target) filters.push("i."+target.type+"=="+dl.str(target.value));

    register[selector.event] = register[selector.event] || [];
    register[selector.event].push({
      signal: sig,
      exp: exp,
      filters: filters.map(function(f) { return expr(f); }),
      spec: spec
    });

    nodes[selector.event] = nodes[selector.event] || new Node(graph);
    nodes[selector.event].addListener(sig);
  };

  function orderedStream(sig, selector, exp, spec) {
    var name = sig.name(), 
        trueFn = expr("true"),
        s = {};

    s[START]  = graph.signal(name + START,  false);
    s[MIDDLE] = graph.signal(name + MIDDLE, false);
    s[END]    = graph.signal(name + END,    false);

    var router = new Node(graph);
    router.evaluate = function(input) {
      if(s[START].value() === true && s[END].value() === false) {
        // TODO: Expand selector syntax to allow start/end signals into stream.
        // Until then, prevent old middles entering stream on new start.
        if(input.signals[name+START]) return graph.doNotPropagate;

        sig.value(s[MIDDLE].value());
        input.signals[name] = 1;
        return input;
      }

      if(s[END].value() === true) {
        s[START].value(false);
        s[END].value(false);
      }

      return graph.doNotPropagate;
    };
    router.addListener(sig);

    [START, MIDDLE, END].forEach(function(x) {
      var val = (x == MIDDLE) ? exp : trueFn,
          sp = (x == MIDDLE) ? spec : {};

      if(selector[x].event) event(s[x], selector[x], val, sp);
      else if(selector[x].signal) signal(s[x], selector[x], val, sp);
      else if(selector[x].stream) mergedStream(s[x], selector[x].stream, val, sp);
      s[x].addListener(router);
    });
  };

  function mergedStream(sig, selector, exp, spec) {
    selector.forEach(function(s) {
      if(s.event)       event(sig, s, exp, spec);
      else if(s.signal) signal(sig, s, exp, spec);
      else if(s.start)  orderedStream(sig, s, exp, spec);
      else if(s.stream) mergedStream(sig, s.stream, exp, spec);
    });
  };

  (spec || []).forEach(function(sig) {
    var signal = graph.signal(sig.name);
    if(sig.expr) return;  // Cannot have an expr and stream definition.

    (sig.streams || []).forEach(function(stream) {
      var sel = selector.parse(stream.type),
          exp = expr(stream.expr);
      mergedStream(signal, sel, exp, stream);
    });
  });

  // We register the event listeners all together so that if multiple
  // signals are registered on the same event, they will receive the
  // new value on the same pulse. 

  // TODO: Filters, time intervals, target selectors
  dl.keys(register).forEach(function(r) {
    var handlers = register[r], 
        node = nodes[r];

    view.on(r, function(evt, item) {
      var cs = changset.create(null, true),
          pad = view.padding(),
          filtered = false,
          val, h, i, m, d;

      evt.preventDefault(); // Stop text selection
      m = d3.mouse((d3.event=evt, view._el)); // Relative position within container
      item = item||{};
      d = item.datum||{};
      var p = {x: m[0] - pad.left, y: m[1] - pad.top};

      for(i = 0; i < handlers.length; i++) {
        h = handlers[i];
        filtered = h.filters.some(function(f) {
          return !expr.eval(graph, f.fn, d, evt, item, p, f.signals);
        });
        if(filtered) continue;
        
        val = expr.eval(graph, h.exp.fn, d, evt, item, p, h.exp.signals); 
        if(h.spec.scale) val = scale(h.spec, val, item);
        h.signal.value(val);
        cs.signals[h.signal.name()] = 1;
      }

      graph.propagate(cs, node);
    });
  })
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../dataflow/Node":32,"../dataflow/changeset":34,"../util/constants":92,"./events":43,"./expr":44,"datalib":16}],55:[function(require,module,exports){
var dl = require('datalib'),
    transforms = require('../transforms/index');

module.exports = function parseTransforms(model, def) {
  var tx = new transforms[def.type](model.graph);
  if(def.type == 'facet') {
    var pipeline = (def.transform||[])
      .map(function(t) { return parseTransforms(model, t); });
    tx.pipeline(pipeline);
  }

  // We want to rename output fields before setting any other properties,
  // as subsequent properties may require output to be set (e.g. group by).
  if(def.output) tx.output(def.output);

  dl.keys(def).forEach(function(k) {
    if(k === 'type' || k === 'output') return;
    if(k === 'transform' && def.type === 'facet') return;
    (tx[k]).set(tx, def[k]);
  });

  return tx;
};
},{"../transforms/index":88,"datalib":16}],56:[function(require,module,exports){
(function (global){
var dl = require('datalib'),
    d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null),
    marks = require('./marks');

var handler = function(el, model) {
  this._active = null;
  this._handlers = {};
  if (el) this.initialize(el);
  if (model) this.model(model);
};

var prototype = handler.prototype;

prototype.initialize = function(el, pad, obj) {
  this._el = d3.select(el).node();
  this._canvas = d3.select(el).select("canvas.marks").node();
  this._padding = pad;
  this._obj = obj || null;
  
  // add event listeners
  var canvas = this._canvas, that = this;
  events.forEach(function(type) {
    canvas.addEventListener(type, function(evt) {
      prototype[type].call(that, evt);
    });
  });
  
  return this;
};

prototype.padding = function(pad) {
  this._padding = pad;
  return this;
};

prototype.model = function(model) {
  if (!arguments.length) return this._model;
  this._model = model;
  return this;
};

prototype.handlers = function() {
  var h = this._handlers;
  return dl.keys(h).reduce(function(a, k) {
    return h[k].reduce(function(a, x) { return (a.push(x), a); }, a);
  }, []);
};

// setup events
var events = [
  "mousedown",
  "mouseup",
  "click",
  "dblclick",
  "wheel",
  "keydown",
  "keypress",
  "keyup",
  "mousewheel",
  "touchstart"
];
events.forEach(function(type) {
  prototype[type] = function(evt) {
    this.fire(type, evt);
  };
});
events.push("mousemove");
events.push("mouseout");
events.push("touchmove");
events.push("touchend");

function eventName(name) {
  var i = name.indexOf(".");
  return i < 0 ? name : name.slice(0,i);
}

prototype.touchmove = prototype.mousemove = function(evt) {
  var pad = this._padding,
      b = evt.target.getBoundingClientRect(),
      x = evt.clientX - b.left,
      y = evt.clientY - b.top,
      a = this._active,
      p = this.pick(this._model.scene(), x, y, x-pad.left, y-pad.top);

  if (p === a) {
    this.fire("mousemove", evt);
    if(evt.type == "touchmove") this.fire("touchmove", evt);
    return;
  } else if (a) {
    this.fire("mouseout", evt);
    if(evt.type == "touchend") this.fire("touchend", evt);
  }
  this._active = p;
  if (p) {
    this.fire("mouseover", evt);
    if(evt.type == "touchstart") this.fire("touchstart", evt);
  }
};

prototype.touchend = prototype.mouseout = function(evt) {
  if (this._active) {
    this.fire("mouseout", evt);
    this.fire("touchend", evt);
  }
  this._active = null;
};

// to keep firefox happy
prototype.DOMMouseScroll = function(evt) {
  this.fire("mousewheel", evt);
};

// fire an event
prototype.fire = function(type, evt) {
  var a = this._active,
      h = this._handlers[type];
  if (h) {
    for (var i=0, len=h.length; i<len; ++i) {
      h[i].handler.call(this._obj, evt, a);
    }
  }
};

// add an event handler
prototype.on = function(type, handler) {
  var name = eventName(type),
      h = this._handlers;
  h = h[name] || (h[name] = []);
  h.push({
    type: type,
    handler: handler
  });
  return this;
};

// remove an event handler
prototype.off = function(type, handler) {
  var name = eventName(type),
      h = this._handlers[name];
  if (!h) return;
  for (var i=h.length; --i>=0;) {
    if (h[i].type !== type) continue;
    if (!handler || h[i].handler === handler) h.splice(i, 1);
  }
  return this;
};

// retrieve the current canvas context
prototype.context = function() {
  return this._canvas.getContext("2d");
};

// find the scenegraph item at the current mouse position
// x, y -- the absolute x, y mouse coordinates on the canvas element
// gx, gy -- the relative coordinates within the current group
prototype.pick = function(scene, x, y, gx, gy) {
  var g = this.context(),
      marktype = scene.marktype,
      picker = marks.pick[marktype];
  return picker.call(this, g, scene, x, y, gx, gy);
};

module.exports = handler;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./marks":59,"datalib":16}],57:[function(require,module,exports){
(function (global){
var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null),
    dl = require('datalib'),
    Bounds = require('../../core/Bounds'),
    config = require('../../util/config'),
    marks = require('./marks');

var renderer = function() {
  this._ctx = null;
  this._el = null;
  this._imgload = 0;
};

var prototype = renderer.prototype;

prototype.initialize = function(el, width, height, pad) {
  this._el = el;
  
  if (!el) return this; // early exit if no DOM element

  // select canvas element
  var canvas = d3.select(el)
    .selectAll("canvas.marks")
    .data([1]);
  
  // create new canvas element if needed
  canvas.enter()
    .append("canvas")
    .attr("class", "marks");
  
  // remove extraneous canvas if needed
  canvas.exit().remove();
  
  return this.resize(width, height, pad);
};

prototype.resize = function(width, height, pad) {
  this._width = width;
  this._height = height;
  this._padding = pad;
  
  if (this._el) {
    var canvas = d3.select(this._el).select("canvas.marks");

    // initialize canvas attributes
    canvas
      .attr("width", width + pad.left + pad.right)
      .attr("height", height + pad.top + pad.bottom);

    // get the canvas graphics context
    var s;
    this._ctx = canvas.node().getContext("2d");
    this._ctx._ratio = (s = scaleCanvas(canvas.node(), this._ctx) || 1);
    this._ctx.setTransform(s, 0, 0, s, s*pad.left, s*pad.top);
  }
  
  initializeLineDash(this._ctx);
  return this;
};

function scaleCanvas(canvas, ctx) {
  // get canvas pixel data
  var devicePixelRatio = window.devicePixelRatio || 1,
      backingStoreRatio = (
        ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio) || 1,
      ratio = devicePixelRatio / backingStoreRatio;

  if (devicePixelRatio !== backingStoreRatio) {
    var w = canvas.width, h = canvas.height;
    // set actual and visible canvas size
    canvas.setAttribute("width", w * ratio);
    canvas.setAttribute("height", h * ratio);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
  return ratio;
}

function initializeLineDash(ctx) {
  if (ctx.vgLineDash) return; // already set

  var NODASH = [];
  if (ctx.setLineDash) {
    ctx.vgLineDash = function(dash) { this.setLineDash(dash || NODASH); };
    ctx.vgLineDashOffset = function(off) { this.lineDashOffset = off; };
  } else if (ctx.webkitLineDash !== undefined) {
  	ctx.vgLineDash = function(dash) { this.webkitLineDash = dash || NODASH; };
    ctx.vgLineDashOffset = function(off) { this.webkitLineDashOffset = off; };
  } else if (ctx.mozDash !== undefined) {
    ctx.vgLineDash = function(dash) { this.mozDash = dash; };
    ctx.vgLineDashOffset = function(off) { /* unsupported */ };
  } else {
    ctx.vgLineDash = function(dash) { /* unsupported */ };
    ctx.vgLineDashOffset = function(off) { /* unsupported */ };
  }
}

prototype.context = function(ctx) {
  if (ctx) { this._ctx = ctx; return this; }
  else return this._ctx;
};

prototype.element = function() {
  return this._el;
};

prototype.pendingImages = function() {
  return this._imgload;
};

function translatedBounds(item, bounds) {
  var b = new Bounds(bounds);
  while ((item = item.mark.group) != null) {
    b.translate(item.x || 0, item.y || 0);
  }
  return b;
}
  
function getBounds(items) {
  return !items ? null :
    dl.array(items).reduce(function(b, item) {
      return b.union(translatedBounds(item, item.bounds))
              .union(translatedBounds(item, item['bounds:prev']));
    }, new Bounds());  
}

function setBounds(g, bounds) {
  var bbox = null;
  if (bounds) {
    bbox = (new Bounds(bounds)).round();
    g.beginPath();
    g.rect(bbox.x1, bbox.y1, bbox.width(), bbox.height());
    g.clip();
  }
  return bbox;
}

prototype.render = function(scene, items) {
  var g = this._ctx,
      pad = this._padding,
      w = this._width + pad.left + pad.right,
      h = this._height + pad.top + pad.bottom,
      bb = null, bb2;

  // setup
  this._scene = scene;
  g.save();
  bb = setBounds(g, getBounds(items));
  g.clearRect(-pad.left, -pad.top, w, h);

  // render
  this.draw(g, scene, bb);

  // render again to handle possible bounds change
  if (items) {
    g.restore();
    g.save();
    bb2 = setBounds(g, getBounds(items));
    if (!bb.encloses(bb2)) {
      g.clearRect(-pad.left, -pad.top, w, h);
      this.draw(g, scene, bb2);
    }
  }
  
  // takedown
  g.restore();
  this._scene = null;
};

prototype.draw = function(ctx, scene, bounds) {
  var marktype = scene.marktype,
      renderer = marks.draw[marktype];
  renderer.call(this, ctx, scene, bounds);
};

prototype.renderAsync = function(scene) {
  // TODO make safe for multiple scene rendering?
  var renderer = this;
  if (renderer._async_id) {
    clearTimeout(renderer._async_id);
  }
  renderer._async_id = setTimeout(function() {
    renderer.render(scene);
    delete renderer._async_id;
  }, 50);
};

prototype.loadImage = function(uri) {
  var renderer = this,
      scene = renderer._scene,
      image = null, url;

  renderer._imgload += 1;
  if (dl.isNode) {
    image = new ((typeof window !== "undefined" ? window.canvas : typeof global !== "undefined" ? global.canvas : null).Image)();
    dl.load(dl.extend({url: uri}, config.load), function(err, data) {
      if (err) { dl.error(err); return; }
      image.src = data;
      image.loaded = true;
      renderer._imgload -= 1;
    });
  } else {
    image = new Image();
    url = config.baseURL + uri;
    image.onload = function() {
      image.loaded = true;
      renderer._imgload -= 1;
      renderer.renderAsync(scene);
    };
    image.src = url;
  }

  return image;
};

module.exports = renderer;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../core/Bounds":26,"../../util/config":91,"./marks":59,"datalib":16}],58:[function(require,module,exports){
module.exports = {
  Handler:  require('./Handler'),
  Renderer: require('./Renderer')
};
},{"./Handler":56,"./Renderer":57}],59:[function(require,module,exports){
var Bounds = require('../../core/Bounds'),
    boundsCalc = require('../../util/bounds'),
    config = require('../../util/config'),
    path = require('./path');

var parsePath = path.parse,
    renderPath = path.render,
    halfpi = Math.PI / 2,
    sqrt3 = Math.sqrt(3),
    tan30 = Math.tan(30 * Math.PI / 180),
    tmpBounds = new Bounds();

function fontString(o) {
  return (o.fontStyle ? o.fontStyle + " " : "")
    + (o.fontVariant ? o.fontVariant + " " : "")
    + (o.fontWeight ? o.fontWeight + " " : "")
    + (o.fontSize != null ? o.fontSize : config.render.fontSize) + "px "
    + (o.font || config.render.font);
}

// path generators

function arcPath(g, o) {
  var x = o.x || 0,
      y = o.y || 0,
      ir = o.innerRadius || 0,
      or = o.outerRadius || 0,
      sa = (o.startAngle || 0) - Math.PI/2,
      ea = (o.endAngle || 0) - Math.PI/2;
  g.beginPath();
  if (ir === 0) g.moveTo(x, y);
  else g.arc(x, y, ir, sa, ea, 0);
  g.arc(x, y, or, ea, sa, 1);
  g.closePath();
}

function areaPath(g, items) {
  var o = items[0],
      m = o.mark,
      p = m.pathCache || (m.pathCache = parsePath(path.area(items)));
  renderPath(g, p);
}

function linePath(g, items) {
  var o = items[0],
      m = o.mark,
      p = m.pathCache || (m.pathCache = parsePath(path.line(items)));
  renderPath(g, p);
}

function pathPath(g, o) {
  if (o.path == null) return;
  var p = o.pathCache || (o.pathCache = parsePath(o.path));
  return renderPath(g, p, o.x, o.y);
}

function symbolPath(g, o) {
  g.beginPath();
  var size = o.size != null ? o.size : 100,
      x = o.x, y = o.y, r, t, rx, ry;

  if (o.shape == null || o.shape === "circle") {
    r = Math.sqrt(size/Math.PI);
    g.arc(x, y, r, 0, 2*Math.PI, 0);
    g.closePath();
    return;
  }

  switch (o.shape) {
    case "cross":
      r = Math.sqrt(size / 5) / 2;
      t = 3*r;
      g.moveTo(x-t, y-r);
      g.lineTo(x-r, y-r);
      g.lineTo(x-r, y-t);
      g.lineTo(x+r, y-t);
      g.lineTo(x+r, y-r);
      g.lineTo(x+t, y-r);
      g.lineTo(x+t, y+r);
      g.lineTo(x+r, y+r);
      g.lineTo(x+r, y+t);
      g.lineTo(x-r, y+t);
      g.lineTo(x-r, y+r);
      g.lineTo(x-t, y+r);
      break;

    case "diamond":
      ry = Math.sqrt(size / (2 * tan30));
      rx = ry * tan30;
      g.moveTo(x, y-ry);
      g.lineTo(x+rx, y);
      g.lineTo(x, y+ry);
      g.lineTo(x-rx, y);
      break;

    case "square":
      t = Math.sqrt(size);
      r = t / 2;
      g.rect(x-r, y-r, t, t);
      break;

    case "triangle-down":
      rx = Math.sqrt(size / sqrt3);
      ry = rx * sqrt3 / 2;
      g.moveTo(x, y+ry);
      g.lineTo(x+rx, y-ry);
      g.lineTo(x-rx, y-ry);
      break;

    case "triangle-up":
      rx = Math.sqrt(size / sqrt3);
      ry = rx * sqrt3 / 2;
      g.moveTo(x, y-ry);
      g.lineTo(x+rx, y+ry);
      g.lineTo(x-rx, y+ry);
  }
  g.closePath();
}

function lineStroke(g, items) {
  var o = items[0],
      lw = o.strokeWidth,
      lc = o.strokeCap;
  g.lineWidth = lw != null ? lw : config.render.lineWidth;
  g.lineCap   = lc != null ? lc : config.render.lineCap;
  linePath(g, items);
}

function ruleStroke(g, o) {
  var x1 = o.x || 0,
      y1 = o.y || 0,
      x2 = o.x2 != null ? o.x2 : x1,
      y2 = o.y2 != null ? o.y2 : y1,
      lw = o.strokeWidth,
      lc = o.strokeCap;

  g.lineWidth = lw != null ? lw : config.render.lineWidth;
  g.lineCap   = lc != null ? lc : config.render.lineCap;
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
}

// drawing functions

function drawPathOne(path, g, o, items) {
  var fill = o.fill, stroke = o.stroke, opac, lc, lw;

  path(g, items);

  opac = o.opacity == null ? 1 : o.opacity;
  if (opac == 0 || !fill && !stroke) return;

  if (fill) {
    g.globalAlpha = opac * (o.fillOpacity==null ? 1 : o.fillOpacity);
    g.fillStyle = color(g, o, fill);
    g.fill();
  }

  if (stroke) {
    lw = (lw = o.strokeWidth) != null ? lw : config.render.lineWidth;
    if (lw > 0) {
      g.globalAlpha = opac * (o.strokeOpacity==null ? 1 : o.strokeOpacity);
      g.strokeStyle = color(g, o, stroke);
      g.lineWidth = lw;
      g.lineCap = (lc = o.strokeCap) != null ? lc : config.render.lineCap;
      g.vgLineDash(o.strokeDash || null);
      g.vgLineDashOffset(o.strokeDashOffset || 0);
      g.stroke();
    }
  }
}

function drawPathAll(path, g, scene, bounds) {
  var i, len, item;
  for (i=0, len=scene.items.length; i<len; ++i) {
    item = scene.items[i];
    if (bounds && !bounds.intersects(item.bounds))
      continue; // bounds check
    drawPathOne(path, g, item, item);
  }
}

function drawRect(g, scene, bounds) {
  if (!scene.items.length) return;
  var items = scene.items,
      o, fill, stroke, opac, lc, lw, x, y, w, h;

  for (var i=0, len=items.length; i<len; ++i) {
    o = items[i];
    if (bounds && !bounds.intersects(o.bounds))
      continue; // bounds check

    x = o.x || 0;
    y = o.y || 0;
    w = o.width || 0;
    h = o.height || 0;

    opac = o.opacity == null ? 1 : o.opacity;
    if (opac == 0) continue;

    if (fill = o.fill) {
      g.globalAlpha = opac * (o.fillOpacity==null ? 1 : o.fillOpacity);
      g.fillStyle = color(g, o, fill);
      g.fillRect(x, y, w, h);
    }

    if (stroke = o.stroke) {
      lw = (lw = o.strokeWidth) != null ? lw : config.render.lineWidth;
      if (lw > 0) {
        g.globalAlpha = opac * (o.strokeOpacity==null ? 1 : o.strokeOpacity);
        g.strokeStyle = color(g, o, stroke);
        g.lineWidth = lw;
        g.lineCap = (lc = o.strokeCap) != null ? lc : config.render.lineCap;
        g.vgLineDash(o.strokeDash || null);
        g.vgLineDashOffset(o.strokeDashOffset || 0);
        g.strokeRect(x, y, w, h);
      }
    }
  }
}

function drawRule(g, scene, bounds) {
  if (!scene.items.length) return;
  var items = scene.items,
      o, stroke, opac, lc, lw, x1, y1, x2, y2;

  for (var i=0, len=items.length; i<len; ++i) {
    o = items[i];
    if (bounds && !bounds.intersects(o.bounds))
      continue; // bounds check

    x1 = o.x || 0;
    y1 = o.y || 0;
    x2 = o.x2 != null ? o.x2 : x1;
    y2 = o.y2 != null ? o.y2 : y1;

    opac = o.opacity == null ? 1 : o.opacity;
    if (opac == 0) continue;
    
    if (stroke = o.stroke) {
      lw = (lw = o.strokeWidth) != null ? lw : config.render.lineWidth;
      if (lw > 0) {
        g.globalAlpha = opac * (o.strokeOpacity==null ? 1 : o.strokeOpacity);
        g.strokeStyle = color(g, o, stroke);
        g.lineWidth = lw;
        g.lineCap = (lc = o.strokeCap) != null ? lc : config.render.lineCap;
        g.vgLineDash(o.strokeDash || null);
        g.vgLineDashOffset(o.strokeDashOffset || 0);
        g.beginPath();
        g.moveTo(x1, y1);
        g.lineTo(x2, y2);
        g.stroke();
      }
    }
  }
}

function drawImage(g, scene, bounds) {
  if (!scene.items.length) return;
  var renderer = this,
      items = scene.items, o;

  for (var i=0, len=items.length; i<len; ++i) {
    o = items[i];
    if (bounds && !bounds.intersects(o.bounds))
      continue; // bounds check

    if (!(o.image && o.image.url === o.url)) {
      o.image = renderer.loadImage(o.url);
      o.image.url = o.url;
    }

    var x, y, w, h, opac;
    w = o.width || (o.image && o.image.width) || 0;
    h = o.height || (o.image && o.image.height) || 0;
    x = (o.x||0) - (o.align === "center"
      ? w/2 : (o.align === "right" ? w : 0));
    y = (o.y||0) - (o.baseline === "middle"
      ? h/2 : (o.baseline === "bottom" ? h : 0));

    if (o.image.loaded) {
      g.globalAlpha = (opac = o.opacity) != null ? opac : 1;
      g.drawImage(o.image, x, y, w, h);
    }
  }
}

function drawText(g, scene, bounds) {
  if (!scene.items.length) return;
  var items = scene.items,
      o, fill, stroke, opac, lw, x, y, r, t;

  for (var i=0, len=items.length; i<len; ++i) {
    o = items[i];
    if (bounds && !bounds.intersects(o.bounds))
      continue; // bounds check

    g.font = fontString(o);
    g.textAlign = o.align || "left";
    g.textBaseline = o.baseline || "alphabetic";

    opac = o.opacity == null ? 1 : o.opacity;
    if (opac == 0) continue;

    x = o.x || 0;
    y = o.y || 0;
    if (r = o.radius) {
      t = (o.theta || 0) - Math.PI/2;
      x += r * Math.cos(t);
      y += r * Math.sin(t);
    }

    if (o.angle) {
      g.save();
      g.translate(x, y);
      g.rotate(o.angle * Math.PI/180);
      x = o.dx || 0;
      y = o.dy || 0;
    } else {
      x += (o.dx || 0);
      y += (o.dy || 0);
    }

    if (fill = o.fill) {
      g.globalAlpha = opac * (o.fillOpacity==null ? 1 : o.fillOpacity);
      g.fillStyle = color(g, o, fill);
      g.fillText(o.text, x, y);
    }

    if (stroke = o.stroke) {
      lw = (lw = o.strokeWidth) != null ? lw : 1;
      if (lw > 0) {
        g.globalAlpha = opac * (o.strokeOpacity==null ? 1 : o.strokeOpacity);
        g.strokeStyle = color(o, stroke);
        g.lineWidth = lw;
        g.strokeText(o.text, x, y);
      }
    }

    if (o.angle) g.restore();
  }
}

function drawAll(pathFunc) {
  return function(g, scene, bounds) {
    drawPathAll(pathFunc, g, scene, bounds);
  }
}

function drawOne(pathFunc) {
  return function(g, scene, bounds) {
    if (!scene.items.length) return;
    if (bounds && !bounds.intersects(scene.items[0].bounds))
      return; // bounds check
    drawPathOne(pathFunc, g, scene.items[0], scene.items);
  }
}

function drawGroup(g, scene, bounds) {
  if (!scene.items.length) return;
  var items = scene.items, group, axes, legends,
      renderer = this, gx, gy, gb, i, n, j, m;

  drawRect(g, scene, bounds);

  for (i=0, n=items.length; i<n; ++i) {
    group = items[i];
    axes = group.axisItems || [];
    legends = group.legendItems || [];
    gx = group.x || 0;
    gy = group.y || 0;

    // render group contents
    g.save();
    g.translate(gx, gy);
    if (group.clip) {
      g.beginPath();
      g.rect(0, 0, group.width || 0, group.height || 0);
      g.clip();
    }
    
    if (bounds) bounds.translate(-gx, -gy);
    
    for (j=0, m=axes.length; j<m; ++j) {
      if (axes[j].def.layer === "back") {
        renderer.draw(g, axes[j], bounds);
      }
    }
    for (j=0, m=group.items.length; j<m; ++j) {
      renderer.draw(g, group.items[j], bounds);
    }
    for (j=0, m=axes.length; j<m; ++j) {
      if (axes[j].def.layer !== "back") {
        renderer.draw(g, axes[j], bounds);
      }
    }
    for (j=0, m=legends.length; j<m; ++j) {
      renderer.draw(g, legends[j], bounds);
    }
    
    if (bounds) bounds.translate(gx, gy);
    g.restore();
  }    
}

function color(g, o, value) {
  return (value.id)
    ? gradient(g, value, o.bounds)
    : value;
}

function gradient(g, p, b) {
  var w = b.width(),
      h = b.height(),
      x1 = b.x1 + p.x1 * w,
      y1 = b.y1 + p.y1 * h,
      x2 = b.x1 + p.x2 * w,
      y2 = b.y1 + p.y2 * h,
      grad = g.createLinearGradient(x1, y1, x2, y2),
      stop = p.stops,
      i, n;

  for (i=0, n=stop.length; i<n; ++i) {
    grad.addColorStop(stop[i].offset, stop[i].color);
  }
  return grad;
}

// hit testing

function pickGroup(g, scene, x, y, gx, gy) {
  if (scene.items.length === 0 ||
      scene.bounds && !scene.bounds.contains(gx, gy)) {
    return false;
  }
  var items = scene.items, subscene, group, hit, dx, dy,
      handler = this, i, j;

  for (i=items.length; --i>=0;) {
    group = items[i];
    dx = group.x || 0;
    dy = group.y || 0;

    g.save();
    g.translate(dx, dy);
    for (j=group.items.length; --j >= 0;) {
      subscene = group.items[j];
      if (subscene.interactive === false) continue;
      hit = handler.pick(subscene, x, y, gx-dx, gy-dy);
      if (hit) {
        g.restore();
        return hit;
      }
    }
    g.restore();
  }

  return scene.interactive
    ? pickAll(hitTests.group, g, scene, x, y, gx, gy)
    : false;
}

function pickAll(test, g, scene, x, y, gx, gy) {
  if (!scene.items.length) return false;
  var o, b, i;

  if (g._ratio !== 1) {
    x *= g._ratio;
    y *= g._ratio;
  }

  for (i=scene.items.length; --i >= 0;) {
    o = scene.items[i]; b = o.bounds;
    // first hit test against bounding box
    if ((b && !b.contains(gx, gy)) || !b) continue;
    // if in bounding box, perform more careful test
    if (test(g, o, x, y, gx, gy)) return o;
  }
  return false;
}

function pickArea(g, scene, x, y, gx, gy) {
  if (!scene.items.length) return false;
  var items = scene.items,
      o, b, i, di, dd, od, dx, dy;

  b = items[0].bounds;
  if (b && !b.contains(gx, gy)) return false;
  if (g._ratio !== 1) {
    x *= g._ratio;
    y *= g._ratio;
  }
  if (!hitTests.area(g, items, x, y)) return false;
  return items[0];
}

function pickLine(g, scene, x, y, gx, gy) {
  if (!scene.items.length) return false;
  var items = scene.items,
      o, b, i, di, dd, od, dx, dy;

  b = items[0].bounds;
  if (b && !b.contains(gx, gy)) return false;
  if (g._ratio !== 1) {
    x *= g._ratio;
    y *= g._ratio;
  }
  if (!hitTests.line(g, items, x, y)) return false;
  return items[0];
}

function pick(test) {
  return function (g, scene, x, y, gx, gy) {
    return pickAll(test, g, scene, x, y, gx, gy);
  };
}

function textHit(g, o, x, y, gx, gy) {
  if (!o.fontSize) return false;
  if (!o.angle) return true; // bounds sufficient if no rotation

  var b = boundsCalc.text(o, tmpBounds, true),
      a = -o.angle * Math.PI / 180,
      cos = Math.cos(a),
      sin = Math.sin(a),
      x = o.x,
      y = o.y,
      px = cos*gx - sin*gy + (x - x*cos + y*sin),
      py = sin*gx + cos*gy + (y - x*sin - y*cos);

  return b.contains(px, py);
}

var hitTests = {
  text:   textHit,
  rect:   function(g,o,x,y) { return true; }, // bounds test is sufficient
  image:  function(g,o,x,y) { return true; }, // bounds test is sufficient
  group:  function(g,o,x,y) { return o.fill || o.stroke; },
  rule:   function(g,o,x,y) {
            if (!g.isPointInStroke) return false;
            ruleStroke(g,o); return g.isPointInStroke(x,y);
          },
  line:   function(g,s,x,y) {
            if (!g.isPointInStroke) return false;
            lineStroke(g,s); return g.isPointInStroke(x,y);
          },
  arc:    function(g,o,x,y) { arcPath(g,o);  return g.isPointInPath(x,y); },
  area:   function(g,s,x,y) { areaPath(g,s); return g.isPointInPath(x,y); },
  path:   function(g,o,x,y) { pathPath(g,o); return g.isPointInPath(x,y); },
  symbol: function(g,o,x,y) { symbolPath(g,o); return g.isPointInPath(x,y); }
};

module.exports = {
  draw: {
    group:   drawGroup,
    area:    drawOne(areaPath),
    line:    drawOne(linePath),
    arc:     drawAll(arcPath),
    path:    drawAll(pathPath),
    symbol:  drawAll(symbolPath),
    rect:    drawRect,
    rule:    drawRule,
    text:    drawText,
    image:   drawImage,
    drawOne: drawOne, // expose for extensibility
    drawAll: drawAll  // expose for extensibility
  },
  pick: {
    group:   pickGroup,
    area:    pickArea,
    line:    pickLine,
    arc:     pick(hitTests.arc),
    path:    pick(hitTests.path),
    symbol:  pick(hitTests.symbol),
    rect:    pick(hitTests.rect),
    rule:    pick(hitTests.rule),
    text:    pick(hitTests.text),
    image:   pick(hitTests.image),
    pickAll: pickAll  // expose for extensibility
  }
};
},{"../../core/Bounds":26,"../../util/bounds":90,"../../util/config":91,"./path":60}],60:[function(require,module,exports){
(function (global){
var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null),
    Bounds = require('../../core/Bounds');

// Path parsing and rendering code taken from fabric.js -- Thanks!
var cmdLength = { m:2, l:2, h:1, v:1, c:6, s:4, q:4, t:2, a:7 },
    re = [/([MLHVCSQTAZmlhvcsqtaz])/g, /###/, /(\d)-/g, /\s|,|###/];

function parse(path) {
  var result = [],
      currentPath,
      chunks,
      parsed;

  // First, break path into command sequence
  path = path.slice().replace(re[0], '###$1').split(re[1]).slice(1);

  // Next, parse each command in turn
  for (var i=0, j, chunksParsed, len=path.length; i<len; i++) {
    currentPath = path[i];
    chunks = currentPath.slice(1).trim().replace(re[2],'$1###-').split(re[3]);
    chunksParsed = [currentPath.charAt(0)];

    for (var j = 0, jlen = chunks.length; j < jlen; j++) {
      parsed = parseFloat(chunks[j]);
      if (!isNaN(parsed)) {
        chunksParsed.push(parsed);
      }
    }

    var command = chunksParsed[0].toLowerCase(),
        commandLength = cmdLength[command];

    if (chunksParsed.length - 1 > commandLength) {
      for (var k = 1, klen = chunksParsed.length; k < klen; k += commandLength) {
        result.push([ chunksParsed[0] ].concat(chunksParsed.slice(k, k + commandLength)));
      }
    }
    else {
      result.push(chunksParsed);
    }
  }

  return result;
}

function drawArc(g, x, y, coords, bounds, l, t) {
  var rx = coords[0];
  var ry = coords[1];
  var rot = coords[2];
  var large = coords[3];
  var sweep = coords[4];
  var ex = coords[5];
  var ey = coords[6];
  var segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
  for (var i=0; i<segs.length; i++) {
    var bez = segmentToBezier.apply(null, segs[i]);
    g.bezierCurveTo.apply(g, bez);
    bounds.add(bez[0]-l, bez[1]-t);
    bounds.add(bez[2]-l, bez[3]-t);
    bounds.add(bez[4]-l, bez[5]-t);
  }
}

function boundArc(x, y, coords, bounds) {
  var rx = coords[0];
  var ry = coords[1];
  var rot = coords[2];
  var large = coords[3];
  var sweep = coords[4];
  var ex = coords[5];
  var ey = coords[6];
  var segs = arcToSegments(ex, ey, rx, ry, large, sweep, rot, x, y);
  for (var i=0; i<segs.length; i++) {
    var bez = segmentToBezier.apply(null, segs[i]);
    bounds.add(bez[0], bez[1]);
    bounds.add(bez[2], bez[3]);
    bounds.add(bez[4], bez[5]);
  }
}

var arcToSegmentsCache = { },
    segmentToBezierCache = { },
    join = Array.prototype.join,
    argsStr;

// Copied from Inkscape svgtopdf, thanks!
function arcToSegments(x, y, rx, ry, large, sweep, rotateX, ox, oy) {
  argsStr = join.call(arguments);
  if (arcToSegmentsCache[argsStr]) {
    return arcToSegmentsCache[argsStr];
  }

  var th = rotateX * (Math.PI/180);
  var sin_th = Math.sin(th);
  var cos_th = Math.cos(th);
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  var px = cos_th * (ox - x) * 0.5 + sin_th * (oy - y) * 0.5;
  var py = cos_th * (oy - y) * 0.5 - sin_th * (ox - x) * 0.5;
  var pl = (px*px) / (rx*rx) + (py*py) / (ry*ry);
  if (pl > 1) {
    pl = Math.sqrt(pl);
    rx *= pl;
    ry *= pl;
  }

  var a00 = cos_th / rx;
  var a01 = sin_th / rx;
  var a10 = (-sin_th) / ry;
  var a11 = (cos_th) / ry;
  var x0 = a00 * ox + a01 * oy;
  var y0 = a10 * ox + a11 * oy;
  var x1 = a00 * x + a01 * y;
  var y1 = a10 * x + a11 * y;

  var d = (x1-x0) * (x1-x0) + (y1-y0) * (y1-y0);
  var sfactor_sq = 1 / d - 0.25;
  if (sfactor_sq < 0) sfactor_sq = 0;
  var sfactor = Math.sqrt(sfactor_sq);
  if (sweep == large) sfactor = -sfactor;
  var xc = 0.5 * (x0 + x1) - sfactor * (y1-y0);
  var yc = 0.5 * (y0 + y1) + sfactor * (x1-x0);

  var th0 = Math.atan2(y0-yc, x0-xc);
  var th1 = Math.atan2(y1-yc, x1-xc);

  var th_arc = th1-th0;
  if (th_arc < 0 && sweep == 1){
    th_arc += 2*Math.PI;
  } else if (th_arc > 0 && sweep == 0) {
    th_arc -= 2 * Math.PI;
  }

  var segments = Math.ceil(Math.abs(th_arc / (Math.PI * 0.5 + 0.001)));
  var result = [];
  for (var i=0; i<segments; i++) {
    var th2 = th0 + i * th_arc / segments;
    var th3 = th0 + (i+1) * th_arc / segments;
    result[i] = [xc, yc, th2, th3, rx, ry, sin_th, cos_th];
  }

  return (arcToSegmentsCache[argsStr] = result);
}

function segmentToBezier(cx, cy, th0, th1, rx, ry, sin_th, cos_th) {
  argsStr = join.call(arguments);
  if (segmentToBezierCache[argsStr]) {
    return segmentToBezierCache[argsStr];
  }

  var a00 = cos_th * rx;
  var a01 = -sin_th * ry;
  var a10 = sin_th * rx;
  var a11 = cos_th * ry;

  var cos_th0 = Math.cos(th0);
  var sin_th0 = Math.sin(th0);
  var cos_th1 = Math.cos(th1);
  var sin_th1 = Math.sin(th1);

  var th_half = 0.5 * (th1 - th0);
  var sin_th_h2 = Math.sin(th_half * 0.5);
  var t = (8/3) * sin_th_h2 * sin_th_h2 / Math.sin(th_half);
  var x1 = cx + cos_th0 - t * sin_th0;
  var y1 = cy + sin_th0 + t * cos_th0;
  var x3 = cx + cos_th1;
  var y3 = cy + sin_th1;
  var x2 = x3 + t * sin_th1;
  var y2 = y3 - t * cos_th1;

  return (segmentToBezierCache[argsStr] = [
    a00 * x1 + a01 * y1,  a10 * x1 + a11 * y1,
    a00 * x2 + a01 * y2,  a10 * x2 + a11 * y2,
    a00 * x3 + a01 * y3,  a10 * x3 + a11 * y3
  ]);
}

function render(g, path, l, t) {
  var current, // current instruction
      previous = null,
      x = 0, // current x
      y = 0, // current y
      controlX = 0, // current control point x
      controlY = 0, // current control point y
      tempX,
      tempY,
      tempControlX,
      tempControlY,
      bounds = new Bounds();
  if (l == undefined) l = 0;
  if (t == undefined) t = 0;

  g.beginPath();

  for (var i=0, len=path.length; i<len; ++i) {
    current = path[i];

    switch (current[0]) { // first letter

      case 'l': // lineto, relative
        x += current[1];
        y += current[2];
        g.lineTo(x + l, y + t);
        bounds.add(x, y);
        break;

      case 'L': // lineto, absolute
        x = current[1];
        y = current[2];
        g.lineTo(x + l, y + t);
        bounds.add(x, y);
        break;

      case 'h': // horizontal lineto, relative
        x += current[1];
        g.lineTo(x + l, y + t);
        bounds.add(x, y);
        break;

      case 'H': // horizontal lineto, absolute
        x = current[1];
        g.lineTo(x + l, y + t);
        bounds.add(x, y);
        break;

      case 'v': // vertical lineto, relative
        y += current[1];
        g.lineTo(x + l, y + t);
        bounds.add(x, y);
        break;

      case 'V': // verical lineto, absolute
        y = current[1];
        g.lineTo(x + l, y + t);
        bounds.add(x, y);
        break;

      case 'm': // moveTo, relative
        x += current[1];
        y += current[2];
        g.moveTo(x + l, y + t);
        bounds.add(x, y);
        break;

      case 'M': // moveTo, absolute
        x = current[1];
        y = current[2];
        g.moveTo(x + l, y + t);
        bounds.add(x, y);
        break;

      case 'c': // bezierCurveTo, relative
        tempX = x + current[5];
        tempY = y + current[6];
        controlX = x + current[3];
        controlY = y + current[4];
        g.bezierCurveTo(
          x + current[1] + l, // x1
          y + current[2] + t, // y1
          controlX + l, // x2
          controlY + t, // y2
          tempX + l,
          tempY + t
        );
        bounds.add(x + current[1], y + current[2]);
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        x = tempX;
        y = tempY;
        break;

      case 'C': // bezierCurveTo, absolute
        x = current[5];
        y = current[6];
        controlX = current[3];
        controlY = current[4];
        g.bezierCurveTo(
          current[1] + l,
          current[2] + t,
          controlX + l,
          controlY + t,
          x + l,
          y + t
        );
        bounds.add(current[1], current[2]);
        bounds.add(controlX, controlY);
        bounds.add(x, y);
        break;

      case 's': // shorthand cubic bezierCurveTo, relative
        // transform to absolute x,y
        tempX = x + current[3];
        tempY = y + current[4];
        // calculate reflection of previous control points
        controlX = 2 * x - controlX;
        controlY = 2 * y - controlY;
        g.bezierCurveTo(
          controlX + l,
          controlY + t,
          x + current[1] + l,
          y + current[2] + t,
          tempX + l,
          tempY + t
        );
        bounds.add(controlX, controlY);
        bounds.add(x + current[1], y + current[2]);
        bounds.add(tempX, tempY);

        // set control point to 2nd one of this command
        // "... the first control point is assumed to be the reflection of the second control point on the previous command relative to the current point."
        controlX = x + current[1];
        controlY = y + current[2];

        x = tempX;
        y = tempY;
        break;

      case 'S': // shorthand cubic bezierCurveTo, absolute
        tempX = current[3];
        tempY = current[4];
        // calculate reflection of previous control points
        controlX = 2*x - controlX;
        controlY = 2*y - controlY;
        g.bezierCurveTo(
          controlX + l,
          controlY + t,
          current[1] + l,
          current[2] + t,
          tempX + l,
          tempY + t
        );
        x = tempX;
        y = tempY;
        bounds.add(current[1], current[2]);
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        // set control point to 2nd one of this command
        // "... the first control point is assumed to be the reflection of the second control point on the previous command relative to the current point."
        controlX = current[1];
        controlY = current[2];

        break;

      case 'q': // quadraticCurveTo, relative
        // transform to absolute x,y
        tempX = x + current[3];
        tempY = y + current[4];

        controlX = x + current[1];
        controlY = y + current[2];

        g.quadraticCurveTo(
          controlX + l,
          controlY + t,
          tempX + l,
          tempY + t
        );
        x = tempX;
        y = tempY;
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        break;

      case 'Q': // quadraticCurveTo, absolute
        tempX = current[3];
        tempY = current[4];

        g.quadraticCurveTo(
          current[1] + l,
          current[2] + t,
          tempX + l,
          tempY + t
        );
        x = tempX;
        y = tempY;
        controlX = current[1];
        controlY = current[2];
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        break;

      case 't': // shorthand quadraticCurveTo, relative

        // transform to absolute x,y
        tempX = x + current[1];
        tempY = y + current[2];

        if (previous[0].match(/[QqTt]/) === null) {
          // If there is no previous command or if the previous command was not a Q, q, T or t,
          // assume the control point is coincident with the current point
          controlX = x;
          controlY = y;
        }
        else if (previous[0] === 't') {
          // calculate reflection of previous control points for t
          controlX = 2 * x - tempControlX;
          controlY = 2 * y - tempControlY;
        }
        else if (previous[0] === 'q') {
          // calculate reflection of previous control points for q
          controlX = 2 * x - controlX;
          controlY = 2 * y - controlY;
        }

        tempControlX = controlX;
        tempControlY = controlY;

        g.quadraticCurveTo(
          controlX + l,
          controlY + t,
          tempX + l,
          tempY + t
        );
        x = tempX;
        y = tempY;
        controlX = x + current[1];
        controlY = y + current[2];
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        break;

      case 'T':
        tempX = current[1];
        tempY = current[2];

        // calculate reflection of previous control points
        controlX = 2 * x - controlX;
        controlY = 2 * y - controlY;
        g.quadraticCurveTo(
          controlX + l,
          controlY + t,
          tempX + l,
          tempY + t
        );
        x = tempX;
        y = tempY;
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        break;

      case 'a':
        drawArc(g, x + l, y + t, [
          current[1],
          current[2],
          current[3],
          current[4],
          current[5],
          current[6] + x + l,
          current[7] + y + t
        ], bounds, l, t);
        x += current[6];
        y += current[7];
        break;

      case 'A':
        drawArc(g, x + l, y + t, [
          current[1],
          current[2],
          current[3],
          current[4],
          current[5],
          current[6] + l,
          current[7] + t
        ], bounds, l, t);
        x = current[6];
        y = current[7];
        break;

      case 'z':
      case 'Z':
        g.closePath();
        break;
    }
    previous = current;
  }
  return bounds.translate(l, t);
}

function bounds(path, bounds) {
  var current, // current instruction
      previous = null,
      x = 0, // current x
      y = 0, // current y
      controlX = 0, // current control point x
      controlY = 0, // current control point y
      tempX,
      tempY,
      tempControlX,
      tempControlY;

  for (var i=0, len=path.length; i<len; ++i) {
    current = path[i];

    switch (current[0]) { // first letter

      case 'l': // lineto, relative
        x += current[1];
        y += current[2];
        bounds.add(x, y);
        break;

      case 'L': // lineto, absolute
        x = current[1];
        y = current[2];
        bounds.add(x, y);
        break;

      case 'h': // horizontal lineto, relative
        x += current[1];
        bounds.add(x, y);
        break;

      case 'H': // horizontal lineto, absolute
        x = current[1];
        bounds.add(x, y);
        break;

      case 'v': // vertical lineto, relative
        y += current[1];
        bounds.add(x, y);
        break;

      case 'V': // verical lineto, absolute
        y = current[1];
        bounds.add(x, y);
        break;

      case 'm': // moveTo, relative
        x += current[1];
        y += current[2];
        bounds.add(x, y);
        break;

      case 'M': // moveTo, absolute
        x = current[1];
        y = current[2];
        bounds.add(x, y);
        break;

      case 'c': // bezierCurveTo, relative
        tempX = x + current[5];
        tempY = y + current[6];
        controlX = x + current[3];
        controlY = y + current[4];
        bounds.add(x + current[1], y + current[2]);
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        x = tempX;
        y = tempY;
        break;

      case 'C': // bezierCurveTo, absolute
        x = current[5];
        y = current[6];
        controlX = current[3];
        controlY = current[4];
        bounds.add(current[1], current[2]);
        bounds.add(controlX, controlY);
        bounds.add(x, y);
        break;

      case 's': // shorthand cubic bezierCurveTo, relative
        // transform to absolute x,y
        tempX = x + current[3];
        tempY = y + current[4];
        // calculate reflection of previous control points
        controlX = 2 * x - controlX;
        controlY = 2 * y - controlY;
        bounds.add(controlX, controlY);
        bounds.add(x + current[1], y + current[2]);
        bounds.add(tempX, tempY);

        // set control point to 2nd one of this command
        // "... the first control point is assumed to be the reflection of the second control point on the previous command relative to the current point."
        controlX = x + current[1];
        controlY = y + current[2];

        x = tempX;
        y = tempY;
        break;

      case 'S': // shorthand cubic bezierCurveTo, absolute
        tempX = current[3];
        tempY = current[4];
        // calculate reflection of previous control points
        controlX = 2*x - controlX;
        controlY = 2*y - controlY;
        x = tempX;
        y = tempY;
        bounds.add(current[1], current[2]);
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        // set control point to 2nd one of this command
        // "... the first control point is assumed to be the reflection of the second control point on the previous command relative to the current point."
        controlX = current[1];
        controlY = current[2];

        break;

      case 'q': // quadraticCurveTo, relative
        // transform to absolute x,y
        tempX = x + current[3];
        tempY = y + current[4];

        controlX = x + current[1];
        controlY = y + current[2];

        x = tempX;
        y = tempY;
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        break;

      case 'Q': // quadraticCurveTo, absolute
        tempX = current[3];
        tempY = current[4];

        x = tempX;
        y = tempY;
        controlX = current[1];
        controlY = current[2];
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        break;

      case 't': // shorthand quadraticCurveTo, relative

        // transform to absolute x,y
        tempX = x + current[1];
        tempY = y + current[2];

        if (previous[0].match(/[QqTt]/) === null) {
          // If there is no previous command or if the previous command was not a Q, q, T or t,
          // assume the control point is coincident with the current point
          controlX = x;
          controlY = y;
        }
        else if (previous[0] === 't') {
          // calculate reflection of previous control points for t
          controlX = 2 * x - tempControlX;
          controlY = 2 * y - tempControlY;
        }
        else if (previous[0] === 'q') {
          // calculate reflection of previous control points for q
          controlX = 2 * x - controlX;
          controlY = 2 * y - controlY;
        }

        tempControlX = controlX;
        tempControlY = controlY;

        x = tempX;
        y = tempY;
        controlX = x + current[1];
        controlY = y + current[2];
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        break;

      case 'T':
        tempX = current[1];
        tempY = current[2];

        // calculate reflection of previous control points
        controlX = 2 * x - controlX;
        controlY = 2 * y - controlY;

        x = tempX;
        y = tempY;
        bounds.add(controlX, controlY);
        bounds.add(tempX, tempY);
        break;

      case 'a':
        boundArc(x, y, [
          current[1],
          current[2],
          current[3],
          current[4],
          current[5],
          current[6] + x,
          current[7] + y
        ], bounds);
        x += current[6];
        y += current[7];
        break;

      case 'A':
        boundArc(x, y, [
          current[1],
          current[2],
          current[3],
          current[4],
          current[5],
          current[6],
          current[7]
        ], bounds);
        x = current[6];
        y = current[7];
        break;

      case 'z':
      case 'Z':
        break;
    }
    previous = current;
  }
  return bounds;
}

function area(items) {
  var o = items[0];
  var area = d3.svg.area()
    .x(function(d) { return d.x; })
    .y1(function(d) { return d.y; })
    .y0(function(d) { return d.y + d.height; });
  if (o.interpolate) area.interpolate(o.interpolate);
  if (o.tension != null) area.tension(o.tension);
  return area(items);
}

function line(items) {
  var o = items[0];
  var line = d3.svg.line()
   .x(function(d) { return d.x; })
   .y(function(d) { return d.y; });
  if (o.interpolate) line.interpolate(o.interpolate);
  if (o.tension != null) line.tension(o.tension);
  return line(items);
}

module.exports = {
  parse:  parse,
  render: render,
  bounds: bounds,
  area:   area,
  line:   line
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../core/Bounds":26}],61:[function(require,module,exports){
var dl = require('datalib');

var handler = function(el, model) {
  this._active = null;
  this._handlers = {};
  if (el) this.initialize(el);
  if (model) this.model(model);
};

function svgHandler(handler) {
  var that = this;
  return function(evt) {
    var target = evt.target,
        item = target.__data__;

    if (item) item = item.mark ? item : item[0];
    handler.call(that._obj, evt, item);
  };
}

function eventName(name) {
  var i = name.indexOf(".");
  return i < 0 ? name : name.slice(0,i);
}

var prototype = handler.prototype;

prototype.initialize = function(el, pad, obj) {
  this._el = d3.select(el).node();
  this._svg = d3.select(el).select("svg.marks").node();
  this._padding = pad;
  this._obj = obj || null;
  return this;
};

prototype.padding = function(pad) {
  this._padding = pad;
  return this;
};

prototype.model = function(model) {
  if (!arguments.length) return this._model;
  this._model = model;
  return this;
};

prototype.handlers = function() {
  var h = this._handlers;
  return dl.keys(h).reduce(function(a, k) {
    return h[k].reduce(function(a, x) { return (a.push(x), a); }, a);
  }, []);
};

// add an event handler
prototype.on = function(type, handler) {
  var name = eventName(type),
      h = this._handlers,
      dom = d3.select(this._svg).node();
      
  var x = {
    type: type,
    handler: handler,
    svg: svgHandler.call(this, handler)
  };
  h = h[name] || (h[name] = []);
  h.push(x);

  dom.addEventListener(name, x.svg);
  return this;
};

// remove an event handler
prototype.off = function(type, handler) {
  var name = eventName(type),
      h = this._handlers[name],
      dom = d3.select(this._svg).node();
  if (!h) return;
  for (var i=h.length; --i>=0;) {
    if (h[i].type !== type) continue;
    if (!handler || h[i].handler === handler) {
      dom.removeEventListener(name, h[i].svg);
      h.splice(i, 1);
    }
  }
  return this;
};

module.exports = handler;
},{"datalib":16}],62:[function(require,module,exports){
var dl = require('datalib'),
    marks = require('./marks');

var renderer = function() {
  this._svg = null;
  this._ctx = null;
  this._el = null;
  this._defs = {
    gradient: {},
    clipping: {}
  };
};

var prototype = renderer.prototype;

prototype.initialize = function(el, width, height, pad) {
  this._el = el;

  // remove any existing svg element
  d3.select(el).select("svg.marks").remove();

  // create svg element and initialize attributes
  this._svg = d3.select(el)
    .append("svg")
    .attr("class", "marks");
  
  // set the svg root group
  this._ctx = this._svg.append("g");
  
  return this.resize(width, height, pad);
};

prototype.resize = function(width, height, pad) {
  this._width = width;
  this._height = height;
  this._padding = pad;
  
  this._svg
    .attr("width", width + pad.left + pad.right)
    .attr("height", height + pad.top + pad.bottom);
    
  this._ctx
    .attr("transform", "translate("+pad.left+","+pad.top+")");

  return this;
};

prototype.context = function() {
  return this._ctx;
};

prototype.element = function() {
  return this._el;
};

prototype.updateDefs = function() {
  var svg = this._svg,
      all = this._defs,
      dgrad = dl.keys(all.gradient),
      dclip = dl.keys(all.clipping),
      defs = svg.select("defs"), grad, clip;

  // get or create svg defs block
  if (dgrad.length===0 && dclip.length==0) { defs.remove(); return; }
  if (defs.empty()) defs = svg.insert("defs", ":first-child");
  
  grad = defs.selectAll("linearGradient").data(dgrad, dl.identity);
  grad.enter().append("linearGradient").attr("id", dl.identity);
  grad.exit().remove();
  grad.each(function(id) {
    var def = all.gradient[id],
        grd = d3.select(this);

    // set gradient coordinates
    grd.attr({x1: def.x1, x2: def.x2, y1: def.y1, y2: def.y2});

    // set gradient stops
    stop = grd.selectAll("stop").data(def.stops);
    stop.enter().append("stop");
    stop.exit().remove();
    stop.attr("offset", function(d) { return d.offset; })
        .attr("stop-color", function(d) { return d.color; });
  });
  
  clip = defs.selectAll("clipPath").data(dclip, dl.identity);
  clip.enter().append("clipPath").attr("id", dl.identity);
  clip.exit().remove();
  clip.each(function(id) {
    var def = all.clipping[id],
        cr = d3.select(this).selectAll("rect").data([1]);
    cr.enter().append("rect");
    cr.attr("x", 0)
      .attr("y", 0)
      .attr("width", def.width)
      .attr("height", def.height);
  });
};

prototype.render = function(scene, items) {
  marks.current = this;

  if (items) {
    this.renderItems(dl.array(items));
  } else {
    this.draw(this._ctx, scene, -1);
  }
  this.updateDefs();

 delete marks.current;
};

prototype.renderItems = function(items) {
  var item, node, type, nest, i, n;

  for (i=0, n=items.length; i<n; ++i) {
    item = items[i];
    node = item._svg;
    type = item.mark.marktype;

    item = marks.nested[type] ? item.mark.items : item;
    marks.update[type].call(node, item);
    marks.style.call(node, item);
  }
}

prototype.draw = function(ctx, scene, index) {
  var marktype = scene.marktype,
      renderer = marks.draw[marktype];
  renderer.call(this, ctx, scene, index);
};

module.exports = renderer;
},{"./marks":64,"datalib":16}],63:[function(require,module,exports){
arguments[4][58][0].apply(exports,arguments)
},{"./Handler":61,"./Renderer":62,"dup":58}],64:[function(require,module,exports){
(function (global){
var dl = require('datalib'),
    d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null),
    config = require('../../util/config');

function x(o)     { return o.x || 0; }
function y(o)     { return o.y || 0; }
function yh(o)    { return o.y + o.height || 0; }
function key(o)   { return o.key; }
function size(o)  { return o.size==null ? 100 : o.size; }
function shape(o) { return o.shape || "circle"; }
    
var arc_path    = d3.svg.arc(),
    area_path   = d3.svg.area().x(x).y1(y).y0(yh),
    line_path   = d3.svg.line().x(x).y(y),
    symbol_path = d3.svg.symbol().type(shape).size(size);

var mark_id = 0,
    clip_id = 0;

var textAlign = {
  "left":   "start",
  "center": "middle",
  "right":  "end"
};

var styles = {
  "fill":             "fill",
  "fillOpacity":      "fill-opacity",
  "stroke":           "stroke",
  "strokeWidth":      "stroke-width",
  "strokeOpacity":    "stroke-opacity",
  "strokeCap":        "stroke-linecap",
  "strokeDash":       "stroke-dasharray",
  "strokeDashOffset": "stroke-dashoffset",
  "opacity":          "opacity"
};
var styleProps = dl.keys(styles);

function style(d) {
  var i, n, prop, name, value,
      o = d.mark ? d : d.length ? d[0] : null;
  if (o === null) return;

  for (i=0, n=styleProps.length; i<n; ++i) {
    prop = styleProps[i];
    name = styles[prop];
    value = o[prop];

    if (value == null) {
      if (name === "fill") this.style.setProperty(name, "none", null);
      else this.style.removeProperty(name);
    } else {
      if (value.id) {
        // ensure definition is included
        marks.current._defs.gradient[value.id] = value;
        value = "url(#" + value.id + ")";
      }
      this.style.setProperty(name, value+"", null);
    }
  }
}

function arc(o) {
  var x = o.x || 0,
      y = o.y || 0;
  this.setAttribute("transform", "translate("+x+","+y+")");
  this.setAttribute("d", arc_path(o));
}

function area(items) {
  if (!items.length) return;
  var o = items[0];
  area_path
    .interpolate(o.interpolate || "linear")
    .tension(o.tension == null ? 0.7 : o.tension);
  this.setAttribute("d", area_path(items));
}

function line(items) {
  if (!items.length) return;
  var o = items[0];
  line_path
    .interpolate(o.interpolate || "linear")
    .tension(o.tension == null ? 0.7 : o.tension);
  this.setAttribute("d", line_path(items));
}

function path(o) {
  var x = o.x || 0,
      y = o.y || 0;
  this.setAttribute("transform", "translate("+x+","+y+")");
  if (o.path != null) this.setAttribute("d", o.path);
}

function rect(o) {
  this.setAttribute("x", o.x || 0);
  this.setAttribute("y", o.y || 0);
  this.setAttribute("width", o.width || 0);
  this.setAttribute("height", o.height || 0);
}

function rule(o) {
  var x1 = o.x || 0,
      y1 = o.y || 0;
  this.setAttribute("x1", x1);
  this.setAttribute("y1", y1);
  this.setAttribute("x2", o.x2 != null ? o.x2 : x1);
  this.setAttribute("y2", o.y2 != null ? o.y2 : y1);
}

function symbol(o) {
  var x = o.x || 0,
      y = o.y || 0;
  this.setAttribute("transform", "translate("+x+","+y+")");
  this.setAttribute("d", symbol_path(o));
}

function image(o) {
  var w = o.width || (o.image && o.image.width) || 0,
      h = o.height || (o.image && o.image.height) || 0,
      x = o.x - (o.align === "center"
        ? w/2 : (o.align === "right" ? w : 0)),
      y = o.y - (o.baseline === "middle"
        ? h/2 : (o.baseline === "bottom" ? h : 0)),
      url = config.baseURL + o.url;
  
  this.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
  this.setAttribute("x", x);
  this.setAttribute("y", y);
  this.setAttribute("width", w);
  this.setAttribute("height", h);
}
  
function fontString(o) {
  return (o.fontStyle ? o.fontStyle + " " : "")
    + (o.fontVariant ? o.fontVariant + " " : "")
    + (o.fontWeight ? o.fontWeight + " " : "")
    + (o.fontSize != null ? o.fontSize : config.render.fontSize) + "px "
    + (o.font || config.render.font);
}

function text(o) {
  var x = o.x || 0,
      y = o.y || 0,
      dx = o.dx || 0,
      dy = o.dy || 0,
      a = o.angle || 0,
      r = o.radius || 0,
      align = textAlign[o.align || "left"],
      base = o.baseline==="top" ? ".9em"
           : o.baseline==="middle" ? ".35em" : 0;

  if (r) {
    var t = (o.theta || 0) - Math.PI/2;
    x += r * Math.cos(t);
    y += r * Math.sin(t);
  }

  this.setAttribute("x", x + dx);
  this.setAttribute("y", y + dy);
  this.setAttribute("text-anchor", align);
  
  if (a) this.setAttribute("transform", "rotate("+a+" "+x+","+y+")");
  else this.removeAttribute("transform");
  
  if (base) this.setAttribute("dy", base);
  else this.removeAttribute("dy");
  
  this.textContent = o.text;
  this.style.setProperty("font", fontString(o), null);
}

function group(o) {
  var x = o.x || 0,
      y = o.y || 0;
  this.setAttribute("transform", "translate("+x+","+y+")");

  if (o.clip) {
    var c = {width: o.width || 0, height: o.height || 0},
        id = o.clip_id || (o.clip_id = "clip" + clip_id++);
    marks.current._defs.clipping[id] = c;
    this.setAttribute("clip-path", "url(#"+id+")");
  }
}

function group_bg(o) {
  var w = o.width || 0,
      h = o.height || 0;
  this.setAttribute("width", w);
  this.setAttribute("height", h);
}

function cssClass(def) {
  var cls = "type-" + def.type;
  if (def.name) cls += " " + def.name;
  return cls;
}

function draw(tag, attr, nest) {
  return function(g, scene, index) {
    drawMark(g, scene, index, "mark_", tag, attr, nest);
  };
}

function drawMark(g, scene, index, prefix, tag, attr, nest) {
  var data = nest ? [scene.items] : scene.items,
      evts = scene.interactive===false ? "none" : null,
      grps = g.node().childNodes,
      notG = (tag !== "g"),
      p = (p = grps[index+1]) // +1 to skip group background rect
        ? d3.select(p)
        : g.append("g")
           .attr("id", "g"+(++mark_id))
           .attr("class", cssClass(scene.def));

  var id = p.attr("id"),
      s = "#" + id + " > " + tag,
      m = p.selectAll(s).data(data),
      e = m.enter().append(tag);

  if (notG) {
    p.style("pointer-events", evts);
    e.each(function(d) {
      if (d.mark) d._svg = this;
      else if (d.length) d[0]._svg = this;
    });
  } else {
    e.append("rect").attr("class","background").style("pointer-events",evts);
  }
  
  m.exit().remove();
  m.each(attr);
  if (notG) m.each(style);
  else p.selectAll(s+" > rect.background").each(group_bg).each(style);
  
  return p;
}

function drawGroup(g, scene, index, prefix) {    
  var p = drawMark(g, scene, index, prefix || "group_", "g", group),
      c = p.node().childNodes, n = c.length, i, j, m;
  
  for (i=0; i<n; ++i) {
    var items = c[i].__data__.items,
        legends = c[i].__data__.legendItems || [],
        axes = c[i].__data__.axisItems || [],
        sel = d3.select(c[i]),
        idx = 0;

    for (j=0, m=axes.length; j<m; ++j) {
      if (axes[j].def.layer === "back") {
        drawGroup.call(this, sel, axes[j], idx++, "axis_");
      }
    }
    for (j=0, m=items.length; j<m; ++j) {
      this.draw(sel, items[j], idx++);
    }
    for (j=0, m=axes.length; j<m; ++j) {
      if (axes[j].def.layer !== "back") {
        drawGroup.call(this, sel, axes[j], idx++, "axis_");
      }
    }
    for (j=0, m=legends.length; j<m; ++j) {
      drawGroup.call(this, sel, legends[j], idx++, "legend_");
    }
  }
}

var marks = module.exports = {
  update: {
    group:   rect,
    area:    area,
    line:    line,
    arc:     arc,
    path:    path,
    symbol:  symbol,
    rect:    rect,
    rule:    rule,
    text:    text,
    image:   image
  },
  nested: {
    "area": true,
    "line": true
  },
  style: style,
  draw: {
    group:   drawGroup,
    area:    draw("path", area, true),
    line:    draw("path", line, true),
    arc:     draw("path", arc),
    path:    draw("path", path),
    symbol:  draw("path", symbol),
    rect:    draw("rect", rect),
    rule:    draw("line", rule),
    text:    draw("text", text),
    image:   draw("image", image),
    draw:    draw // expose for extensibility
  },
  current: null
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../../util/config":91,"datalib":16}],65:[function(require,module,exports){
var Node = require('../dataflow/Node'),
    bounds = require('../util/bounds'),
    C = require('../util/constants'),
    debug = require('../util/debug');

function Bounder(model, mark) {
  this._mark = mark;
  return Node.prototype.init.call(this, model.graph).router(true);
}

var proto = (Bounder.prototype = new Node());

proto.evaluate = function(input) {
  debug(input, ["bounds", this._mark.marktype]);

  bounds.mark(this._mark);
  if (this._mark.marktype === C.GROUP) 
    bounds.mark(this._mark, null, false);

  input.reflow = true;
  return input;
};

module.exports = Bounder;
},{"../dataflow/Node":32,"../util/bounds":90,"../util/constants":92,"../util/debug":93}],66:[function(require,module,exports){
var dl = require('datalib'),
    Node = require('../dataflow/Node'),
    Encoder  = require('./Encoder'),
    Bounder  = require('./Bounder'),
    Item  = require('./Item'),
    parseData = require('../parse/data'),
    tuple = require('../dataflow/tuple'),
    changeset = require('../dataflow/changeset'),
    debug = require('../util/debug'),
    C = require('../util/constants');

function Builder() {    
  return arguments.length ? this.init.apply(this, arguments) : this;
}

var proto = (Builder.prototype = new Node());

proto.init = function(model, def, mark, parent, parent_id, inheritFrom) {
  Node.prototype.init.call(this, model.graph)
    .router(true)
    .collector(true);

  this._model = model;
  this._def   = def;
  this._mark  = mark;
  this._from  = (def.from ? def.from.data : null) || inheritFrom;
  this._ds    = dl.isString(this._from) ? model.data(this._from) : null;
  this._map   = {};

  this._revises = false;  // Should scenegraph items track _prev?

  mark.def = def;
  mark.marktype = def.type;
  mark.interactive = !(def.interactive === false);
  mark.items = [];

  this._parent = parent;
  this._parent_id = parent_id;

  if(def.from && (def.from.mark || def.from.transform || def.from.modify)) {
    inlineDs.call(this);
  }

  // Non-group mark builders are super nodes. Encoder and Bounder remain 
  // separate operators but are embedded and called by Builder.evaluate.
  this._isSuper = (this._def.type !== C.GROUP); 
  this._encoder = new Encoder(this._model, this._mark);
  this._bounder = new Bounder(this._model, this._mark);

  if(this._ds) { this._encoder.dependency(C.DATA, this._from); }

  // Since Builders are super nodes, copy over encoder dependencies
  // (bounder has no registered dependencies).
  this.dependency(C.DATA, this._encoder.dependency(C.DATA));
  this.dependency(C.SCALES, this._encoder.dependency(C.SCALES));
  this.dependency(C.SIGNALS, this._encoder.dependency(C.SIGNALS));

  return this;
};

proto.revises = function(p) {
  if(!arguments.length) return this._revises;

  // If we've not needed prev in the past, but a new inline ds needs it now
  // ensure existing items have prev set.
  if(!this._revises && p) {
    this._items.forEach(function(d) { if(d._prev === undefined) d._prev = C.SENTINEL; });
  }

  this._revises = this._revises || p;
  return this;
};

// Reactive geometry and mark-level transformations are handled here 
// because they need their group's data-joined context. 
function inlineDs() {
  var from = this._def.from,
      geom = from.mark,
      name, spec, sibling, output;

  if(geom) {
    name = ["vg", this._parent_id, geom].join("_");
    spec = {
      name: name,
      transform: from.transform, 
      modify: from.modify
    };
  } else {
    name = ["vg", this._from, this._def.type, Date.now()].join("_");
    spec = {
      name: name,
      source: this._from,
      transform: from.transform,
      modify: from.modify
    };
  }

  this._from = name;
  this._ds = parseData.datasource(this._model, spec);
  var revises = this._ds.revises();

  if(geom) {
    sibling = this.sibling(geom).revises(revises);
    if(sibling._isSuper) sibling.addListener(this._ds.listener());
    else sibling._bounder.addListener(this._ds.listener());
  } else {
    // At this point, we have a new datasource but it is empty as
    // the propagation cycle has already crossed the datasources. 
    // So, we repulse just this datasource. This should be safe
    // as the ds isn't connected to the scenegraph yet.
    
    var output = this._ds.source().revises(revises).last();
        input  = changeset.create(output);

    input.add = output.add;
    input.mod = output.mod;
    input.rem = output.rem;
    input.stamp = null;
    this._graph.propagate(input, this._ds.listener());
  }
}

proto.pipeline = function() {
  return [this];
};

proto.connect = function() {
  var builder = this;

  this._model.graph.connect(this.pipeline());
  this._encoder.dependency(C.SCALES).forEach(function(s) {
    builder._parent.scale(s).addListener(builder);
  });

  if(this._parent) {
    if(this._isSuper) this.addListener(this._parent._collector);
    else this._bounder.addListener(this._parent._collector);
  }

  return this;
};

proto.disconnect = function() {
  var builder = this;
  if(!this._listeners.length) return this;

  Node.prototype.disconnect.call(this);
  this._model.graph.disconnect(this.pipeline());
  this._encoder.dependency(C.SCALES).forEach(function(s) {
    builder._parent.scale(s).removeListener(builder);
  });
  return this;
};

proto.sibling = function(name) {
  return this._parent.child(name, this._parent_id);
};

proto.evaluate = function(input) {
  debug(input, ["building", this._from, this._def.type]);

  var output, fullUpdate, fcs, data;

  if(this._ds) {
    output = changeset.create(input);

    // We need to determine if any encoder dependencies have been updated.
    // However, the encoder's data source will likely be updated, and shouldn't
    // trigger all items to mod.
    data = dl.duplicate(output.data);
    delete output.data[this._ds.name()];
    fullUpdate = this._encoder.reevaluate(output);
    output.data = data;

    // If a scale or signal in the update propset has been updated, 
    // send forward all items for reencoding if we do an early return.
    if(fullUpdate) output.mod = this._mark.items.slice();

    fcs = this._ds.last();
    if(!fcs) {
      output.reflow = true
    } else if(fcs.stamp > this._stamp) {
      output = joinDatasource.call(this, fcs, this._ds.values(), fullUpdate);
    }
  } else {
    fullUpdate = this._encoder.reevaluate(input);
    data = dl.isFunction(this._def.from) ? this._def.from() : [C.SENTINEL];
    output = joinValues.call(this, input, data, fullUpdate);
  }

  output = this._graph.evaluate(output, this._encoder);
  return this._isSuper ? this._graph.evaluate(output, this._bounder) : output;
};

function newItem() {
  var prev = this._revises ? null : undefined,
      item = tuple.ingest(new Item(this._mark), prev);

  // For the root node's item
  if(this._def.width)  tuple.set(item, "width",  this._def.width);
  if(this._def.height) tuple.set(item, "height", this._def.height);
  return item;
};

function join(data, keyf, next, output, prev, mod) {
  var i, key, len, item, datum, enter;

  for(i=0, len=data.length; i<len; ++i) {
    datum = data[i];
    item  = keyf ? this._map[key = keyf(datum)] : prev[i];
    enter = item ? false : (item = newItem.call(this), true);
    item.status = enter ? C.ENTER : C.UPDATE;
    item.datum = datum;
    tuple.set(item, "key", key);
    this._map[key] = item;
    next.push(item);
    if(enter) output.add.push(item);
    else if(!mod || (mod && mod[datum._id])) output.mod.push(item);
  }
}

function joinDatasource(input, data, fullUpdate) {
  var output = changeset.create(input),
      keyf = keyFunction(this._def.key || "_id"),
      add = input.add, 
      mod = input.mod, 
      rem = input.rem,
      next = [],
      i, key, len, item, datum, enter;

  // Build rems first, and put them at the head of the next items
  // Then build the rest of the data values (which won't contain rem).
  // This will preserve the sort order without needing anything extra.

  for(i=0, len=rem.length; i<len; ++i) {
    item = this._map[key = keyf(rem[i])];
    item.status = C.EXIT;
    next.push(item);
    output.rem.push(item);
    this._map[key] = null;
  }

  join.call(this, data, keyf, next, output, null, tuple.idMap(fullUpdate ? data : mod));

  return (this._mark.items = next, output);
}

function joinValues(input, data, fullUpdate) {
  var output = changeset.create(input),
      keyf = keyFunction(this._def.key),
      prev = this._mark.items || [],
      next = [],
      i, key, len, item, datum, enter;

  for (i=0, len=prev.length; i<len; ++i) {
    item = prev[i];
    item.status = C.EXIT;
    if (keyf) this._map[item.key] = item;
  }
  
  join.call(this, data, keyf, next, output, prev, fullUpdate ? tuple.idMap(data) : null);

  for (i=0, len=prev.length; i<len; ++i) {
    item = prev[i];
    if (item.status === C.EXIT) {
      tuple.set(item, "key", keyf ? item.key : this._items.length);
      next.splice(0, 0, item);  // Keep item around for "exit" transition.
      output.rem.push(item);
    }
  }
  
  return (this._mark.items = next, output);
};

function keyFunction(key) {
  if (key == null) return null;
  var f = dl.array(key).map(dl.accessor);
  return function(d) {
    for (var s="", i=0, n=f.length; i<n; ++i) {
      if (i>0) s += "|";
      s += String(f[i](d));
    }
    return s;
  }
};

module.exports = Builder;
},{"../dataflow/Node":32,"../dataflow/changeset":34,"../dataflow/tuple":35,"../parse/data":42,"../util/constants":92,"../util/debug":93,"./Bounder":65,"./Encoder":67,"./Item":69,"datalib":16}],67:[function(require,module,exports){
var Node = require('../dataflow/Node'),
    C = require('../util/constants'),
    debug = require('../util/debug'),
    EMPTY = {};

function Encoder(model, mark) {
  var props = mark.def.properties || {},
      update = props.update;

  Node.prototype.init.call(this, model.graph)

  this._model = model;
  this._mark  = mark;

  if(update) {
    this.dependency(C.DATA, update.data);
    this.dependency(C.SCALES, update.scales);
    this.dependency(C.SIGNALS, update.signals);
  }

  return this;
}

var proto = (Encoder.prototype = new Node());

proto.evaluate = function(input) {
  debug(input, ["encoding", this._mark.def.type]);
  var items = this._mark.items,
      props = this._mark.def.properties || {},
      enter  = props.enter,
      update = props.update,
      exit   = props.exit,
      i, len, item;

  // Items marked for removal are at the head of items. Process them first.
  for(i=0, len=input.rem.length; i<len; ++i) {
    item = input.rem[i];
    if(update) encode.call(this, update, item, input.trans);
    if(exit)   encode.call(this, exit,   item, input.trans); 
    if(input.trans && !exit) input.trans.interpolate(item, EMPTY);
    else if(!input.trans) item.remove();
  }

  for(i=0, len=input.add.length; i<len; ++i) {
    item = input.add[i];
    if(enter)  encode.call(this, enter,  item, input.trans);
    if(update) encode.call(this, update, item, input.trans);
    item.status = C.UPDATE;
  }

  if(update) {
    for(i=0, len=input.mod.length; i<len; ++i) {
      item = input.mod[i];
      encode.call(this, update, item, input.trans);
    }
  }

  return input;
};

function encode(prop, item, trans, stamp) {
  var model = this._model,
      enc = prop.encode,
      sg = this._graph.signalValues(prop.signals||[]),
      db = (prop.data||[]).reduce(function(db, ds) { 
        return db[ds] = model.data(ds).values(), db;
      }, {});

  enc.call(enc, item, item.mark.group||item, trans, db, sg, model.predicates());
}

module.exports = Encoder;
},{"../dataflow/Node":32,"../util/constants":92,"../util/debug":93}],68:[function(require,module,exports){
var dl = require('datalib'),
    Node = require('../dataflow/Node'),
    Collector = require('../dataflow/Collector'),
    Builder = require('./Builder'),
    Scale = require('./Scale'),
    parseAxes = require('../parse/axes'),
    debug = require('../util/debug'),
    C = require('../util/constants');

function GroupBuilder() {
  this._children = {};
  this._scaler = null;
  this._recursor = null;

  this._scales = {};
  this.scale = scale.bind(this);
  return arguments.length ? this.init.apply(this, arguments) : this;
}

var proto = (GroupBuilder.prototype = new Builder());

proto.init = function(model, def, mark, parent, parent_id, inheritFrom) {
  var builder = this;

  this._scaler = new Node(model.graph);

  (def.scales||[]).forEach(function(s) { 
    s = builder.scale(s.name, new Scale(model, s, builder));
    builder._scaler.addListener(s);  // Scales should be computed after group is encoded
  });

  this._recursor = new Node(model.graph);
  this._recursor.evaluate = recurse.bind(this);

  var scales = (def.axes||[]).reduce(function(acc, x) {
    return (acc[x.scale] = 1, acc);
  }, {});
  this._recursor.dependency(C.SCALES, dl.keys(scales));

  // We only need a collector for up-propagation of bounds calculation,
  // so only GroupBuilders, and not regular Builders, have collectors.
  this._collector = new Collector(model.graph);

  return Builder.prototype.init.apply(this, arguments);
};

proto.evaluate = function(input) {
  var output = Builder.prototype.evaluate.apply(this, arguments),
      builder = this;

  output.add.forEach(function(group) { buildGroup.call(builder, output, group); });
  return output;
};

proto.pipeline = function() {
  return [this, this._scaler, this._recursor, this._collector, this._bounder];
};

proto.disconnect = function() {
  var builder = this;
  dl.keys(builder._children).forEach(function(group_id) {
    builder._children[group_id].forEach(function(c) {
      builder._recursor.removeListener(c.builder);
      c.builder.disconnect();
    })
  });

  builder._children = {};
  return Builder.prototype.disconnect.call(this);
};

proto.child = function(name, group_id) {
  var children = this._children[group_id],
      i = 0, len = children.length,
      child;

  for(; i<len; ++i) {
    child = children[i];
    if(child.type == C.MARK && child.builder._def.name == name) break;
  }

  return child.builder;
};

function recurse(input) {
  var builder = this,
      hasMarks = this._def.marks && this._def.marks.length > 0,
      hasAxes = this._def.axes && this._def.axes.length > 0,
      i, len, group, pipeline, def, inline = false;

  for(i=0, len=input.add.length; i<len; ++i) {
    group = input.add[i];
    if(hasMarks) buildMarks.call(this, input, group);
    if(hasAxes)  buildAxes.call(this, input, group);
  }

  // Wire up new children builders in reverse to minimize graph rewrites.
  for (i=input.add.length-1; i>=0; --i) {
    group = input.add[i];
    for (j=this._children[group._id].length-1; j>=0; --j) {
      c = this._children[group._id][j];
      c.builder.connect();
      pipeline = c.builder.pipeline();
      def = c.builder._def;

      // This new child needs to be built during this propagation cycle.
      // We could add its builder as a listener off the _recursor node, 
      // but try to inline it if we can to minimize graph dispatches.
      inline = (def.type !== C.GROUP);
      inline = inline && (this._model.data(c.from) !== undefined); 
      inline = inline && (pipeline[pipeline.length-1].listeners().length == 1); // Reactive geom
      c.inline = inline;

      if(inline) c.builder.evaluate(input);
      else this._recursor.addListener(c.builder);
    }
  }

  for(i=0, len=input.mod.length; i<len; ++i) {
    group = input.mod[i];
    // Remove temporary connection for marks that draw from a source
    if(hasMarks) {
      builder._children[group._id].forEach(function(c) {
        if(c.type == C.MARK && !c.inline && builder._model.data(c.from) !== undefined ) {
          builder._recursor.removeListener(c.builder);
        }
      });
    }

    // Update axes data defs
    if(hasAxes) {
      parseAxes(builder._model, builder._def.axes, group.axes, group);
      group.axes.forEach(function(a, i) { a.def() });
    }      
  }

  for(i=0, len=input.rem.length; i<len; ++i) {
    group = input.rem[i];
    // For deleted groups, disconnect their children
    builder._children[group._id].forEach(function(c) { 
      builder._recursor.removeListener(c.builder);
      c.builder.disconnect(); 
    });
    delete builder._children[group._id];
  }

  return input;
};

function scale(name, scale) {
  var group = this;
  if(arguments.length === 2) return (group._scales[name] = scale, scale);
  while(scale == null) {
    scale = group._scales[name];
    group = group.mark ? group.mark.group : group._parent;
    if(!group) break;
  }
  return scale;
}

function buildGroup(input, group) {
  debug(input, ["building group", group._id]);

  group._scales = group._scales || {};    
  group.scale  = scale.bind(group);

  group.items = group.items || [];
  this._children[group._id] = this._children[group._id] || [];

  group.axes = group.axes || [];
  group.axisItems = group.axisItems || [];
}

function buildMarks(input, group) {
  debug(input, ["building marks", group._id]);
  var marks = this._def.marks,
      listeners = [],
      mark, from, inherit, i, len, m, b;

  for(i=0, len=marks.length; i<len; ++i) {
    mark = marks[i];
    from = mark.from || {};
    inherit = "vg_"+group.datum._id;
    group.items[i] = {group: group};
    b = (mark.type === C.GROUP) ? new GroupBuilder() : new Builder();
    b.init(this._model, mark, group.items[i], this, group._id, inherit);
    this._children[group._id].push({ 
      builder: b, 
      from: from.data || (from.mark ? ("vg_" + group._id + "_" + from.mark) : inherit), 
      type: C.MARK 
    });
  }
}

function buildAxes(input, group) {
  var axes = group.axes,
      axisItems = group.axisItems,
      builder = this;

  parseAxes(this._model, this._def.axes, axes, group);
  axes.forEach(function(a, i) {
    var scale = builder._def.axes[i].scale,
        def = a.def(),
        b = null;

    axisItems[i] = {group: group, axisDef: def};
    b = (def.type === C.GROUP) ? new GroupBuilder() : new Builder();
    b.init(builder._model, def, axisItems[i], builder)
      .dependency(C.SCALES, scale);
    builder._children[group._id].push({ builder: b, type: C.AXIS, scale: scale });
  });
}

module.exports = GroupBuilder;
},{"../dataflow/Collector":29,"../dataflow/Node":32,"../parse/axes":41,"../util/constants":92,"../util/debug":93,"./Builder":66,"./Scale":70,"datalib":16}],69:[function(require,module,exports){
function Item(mark) {
  this.mark = mark;
}

var prototype = Item.prototype;

prototype.hasPropertySet = function(name) {
  var props = this.mark.def.properties;
  return props && props[name] != null;
};

prototype.cousin = function(offset, index) {
  if (offset === 0) return this;
  offset = offset || -1;
  var mark = this.mark,
      group = mark.group,
      iidx = index==null ? mark.items.indexOf(this) : index,
      midx = group.items.indexOf(mark) + offset;
  return group.items[midx].items[iidx];
};

prototype.sibling = function(offset) {
  if (offset === 0) return this;
  offset = offset || -1;
  var mark = this.mark,
      iidx = mark.items.indexOf(this) + offset;
  return mark.items[iidx];
};

prototype.remove = function() {
  var item = this,
      list = item.mark.items,
      i = list.indexOf(item);
  if (i >= 0) (i===list.length-1) ? list.pop() : list.splice(i, 1);
  return item;
};

prototype.touch = function() {
  if (this.pathCache) this.pathCache = null;
  if (this.mark.pathCache) this.mark.pathCache = null;
};

module.exports = Item;
},{}],70:[function(require,module,exports){
(function (global){
var dl = require('datalib'),
    d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null),
    Node = require('../dataflow/Node'),
    Aggregate = require('../transforms/Aggregate'),
    changeset = require('../dataflow/changeset'),
    debug = require('../util/debug'),
    config = require('../util/config'),
    C = require('../util/constants');

var GROUP_PROPERTY = {width: 1, height: 1};

function Scale(model, def, parent) {
  this._model   = model;
  this._def     = def;
  this._parent  = parent;
  this._updated = false;
  return Node.prototype.init.call(this, model.graph);
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
    deps = dl.array(deps);
    for(var i=0, len=deps.length; i<len; ++i) {
      this._graph[type == C.DATA ? C.DATA : C.SIGNAL](deps[i])
        .addListener(this._parent);
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
    if (!ctor) dl.error("Unrecognized scale type: " + type);
    (scale = ctor()).type = scale.type || type;
    scale.scaleName = this._def.name;
    scale._prev = {};
  }
  return scale;
}

function ordinal(scale, rng, group) {
  var def = this._def,
      prev = scale._prev,
      domain, sort, str, refs, dataDrivenRange = false;
  
  // range pre-processing for data-driven ranges
  if (dl.isObject(def.range) && !dl.isArray(def.range)) {
    dataDrivenRange = true;
    rng = dataRef.call(this, C.RANGE, def.range, scale, group);
  }
  
  // domain
  domain = dataRef.call(this, C.DOMAIN, def.domain, scale, group);
  if (domain && !dl.equal(prev.domain, domain)) {
    scale.domain(domain);
    prev.domain = domain;
    this._updated = true;
  } 

  // range
  if (dl.equal(prev.range, rng)) return;

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

  prev.range = rng;
  this._updated = true;
}

function quantitative(scale, rng, group) {
  var def = this._def,
      prev = scale._prev,
      domain, interval;

  // domain
  domain = (def.type === C.QUANTILE)
    ? dataRef.call(this, C.DOMAIN, def.domain, scale, group)
    : domainMinMax.call(this, scale, group);
  if (domain && !dl.equal(prev.domain, domain)) {
    scale.domain(domain);
    prev.domain = domain;
    this._updated = true;
  } 

  // range
  // vertical scales should flip by default, so use XOR here
  if (def.range === "height") rng = rng.reverse();
  if (dl.equal(prev.range, rng)) return;
  scale[def.round && scale.rangeRound ? "rangeRound" : "range"](rng);
  prev.range = rng;
  this._updated = true;

  // TODO: Support signals for these properties. Until then, only eval
  // them once.
  if (this._stamp > 0) return;
  if (def.exponent && def.type===C.POWER) scale.exponent(def.exponent);
  if (def.clamp) scale.clamp(true);
  if (def.nice) {
    if (def.type === C.TIME) {
      interval = d3.time[def.nice];
      if (!interval) dl.error("Unrecognized interval: " + interval);
      scale.nice(interval);
    } else {
      scale.nice();
    }
  }
}

function dataRef(which, def, scale, group) {
  if (dl.isArray(def)) return def.map(signal.bind(this));

  var self = this, graph = this._graph,
      refs = def.fields || dl.array(def),
      uniques = scale.type === C.ORDINAL || scale.type === C.QUANTILE,
      ck = "_"+which,
      cache = scale[ck],
      cacheField = {ops: []},  // the field and measures in the aggregator
      sort = def.sort,
      i, rlen, j, flen, r, fields, from, data, keys;

  if(!cache) {
    cache = scale[ck] = new Aggregate(graph);
    cacheField.ops = [];
    cache.singleton(true);
    if(uniques && sort) cacheField.ops.push(sort.stat);
  }

  for(i=0, rlen=refs.length; i<rlen; ++i) {
    r = refs[i];
    from = r.data || "vg_"+group.datum._id;
    data = graph.data(from)
      .revises(true)
      .last();

    if (data.stamp <= this._stamp) continue;

    fields = dl.array(r.field).map(function(f) {
      if (f.group) return dl.accessor(f.group)(group.datum)
      return f; // String or {"signal"}
    });

    if(uniques) {
      cacheField.name = sort ? sort.field : "_id";
      cache.fields.set(cache, [cacheField]);
      for(j=0, flen=fields.length; j<flen; ++j) {
        cache.group_by.set(cache, fields[j])
          .evaluate(data);
      }
    } else {
      for(j=0, flen=fields.length; j<flen; ++j) {
        cacheField.name = fields[j];
        cacheField.ops  = [C.MIN, C.MAX];
        cache.fields.set(cache, [cacheField]) // Treat as flat datasource
          .evaluate(data);
      }
    }

    this.dependency(C.DATA, from);
    cache.dependency(C.SIGNALS).forEach(function(s) { self.dependency(C.SIGNALS, s) });
  }

  data = cache.data();
  if (uniques) {
    keys = dl.keys(data)
      .filter(function(k) { return data[k] != null; });

    if (sort) {
      sort = sort.order.signal ? graph.signalRef(sort.order.signal) : sort.order;
      sort = (sort == C.DESC ? "-" : "+") + "tpl." + cacheField.name;
      sort = dl.comparator(sort);
      keys = keys.map(function(k) { return { key: k, tpl: data[k].tpl }})
        .sort(sort)
        .map(function(k) { return k.key; });
    // } else {  // "First seen" order
    //   sort = dl.comparator("tpl._id");
    }

    return keys;
  } else {
    data = data[""]; // Unpack flat aggregation
    return (data === null) ? [] : [data[C.SINGLETON].min, data[C.SINGLETON].max];
  }
}

function signal(v) {
  var s = v.signal, ref;
  if (!s) return v;
  this.dependency(C.SIGNALS, (ref = dl.field(s))[0]);
  return this._graph.signalRef(ref);
}

function domainMinMax(scale, group) {
  var def = this._def,
      domain = [null, null], refs, z;

  if (def.domain !== undefined) {
    domain = (!dl.isObject(def.domain)) ? domain :
      dataRef.call(this, C.DOMAIN, def.domain, scale, group);
  }

  z = domain.length - 1;
  if (def.domainMin !== undefined) {
    if (dl.isObject(def.domainMin)) {
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
    if (dl.isObject(def.domainMax)) {
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
      rng = [null, null];

  if (def.range !== undefined) {
    if (typeof def.range === 'string') {
      if (GROUP_PROPERTY[def.range]) {
        rng = [0, group[def.range]];
      } else if (config.range[def.range]) {
        rng = config.range[def.range];
      } else {
        dl.error("Unrecogized range: "+def.range);
        return rng;
      }
    } else if (dl.isArray(def.range)) {
      rng = def.range.map(signal.bind(this));
    } else if (dl.isObject(def.range)) {
      return null; // early exit
    } else {
      rng = [0, def.range];
    }
  }
  if (def.rangeMin !== undefined) {
    rng[0] = def.rangeMin.signal ? signal.call(this, def.rangeMin) : def.rangeMin;
  }
  if (def.rangeMax !== undefined) {
    rng[rng.length-1] = def.rangeMax.signal ? signal.call(this, def.rangeMax) : def.rangeMax;
  }
  
  if (def.reverse !== undefined) {
    var rev = def.reverse;
    if (dl.isObject(rev)) {
      rev = dl.accessor(rev.field)(group.datum);
    }
    if (rev) rng = rng.reverse();
  }
  
  return rng;
}

module.exports = Scale;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../dataflow/Node":32,"../dataflow/changeset":34,"../transforms/Aggregate":73,"../util/config":91,"../util/constants":92,"../util/debug":93,"datalib":16}],71:[function(require,module,exports){
var tuple = require('../dataflow/tuple'),
    calcBounds = require('../util/bounds'),
    C = require('../util/constants');

function Transition(duration, ease) {
  this.duration = duration || 500;
  this.ease = ease && d3.ease(ease) || d3.ease("cubic-in-out");
  this.updates = {next: null};
}

var prototype = Transition.prototype;

var skip = {
  "text": 1,
  "url":  1
};

prototype.interpolate = function(item, values, stamp) {
  var key, curr, next, interp, list = null;

  for (key in values) {
    curr = item[key];
    next = values[key];      
    if (curr !== next) {
      if (skip[key] || curr === undefined) {
        // skip interpolation for specific keys or undefined start values
        tuple.set(item, key, next);
      } else if (typeof curr === "number" && !isFinite(curr)) {
        // for NaN or infinite numeric values, skip to final value
        tuple.set(item, key, next);
      } else {
        // otherwise lookup interpolator
        interp = d3.interpolate(curr, next);
        interp.property = key;
        (list || (list=[])).push(interp);
      }
    }
  }

  if (list === null && item.status === C.EXIT) {
    list = []; // ensure exiting items are included
  }

  if (list != null) {
    list.item = item;
    list.ease = item.mark.ease || this.ease;
    list.next = this.updates.next;
    this.updates.next = list;
  }
  return this;
};

prototype.start = function(callback) {
  var t = this, prev = t.updates, curr = prev.next;
  for (; curr!=null; prev=curr, curr=prev.next) {
    if (curr.item.status === C.EXIT) curr.remove = true;
  }
  t.callback = callback;
  d3.timer(function(elapsed) { return step.call(t, elapsed); });
};

function step(elapsed) {
  var list = this.updates, prev = list, curr = prev.next,
      duration = this.duration,
      item, delay, f, e, i, n, stop = true;

  for (; curr!=null; prev=curr, curr=prev.next) {
    item = curr.item;
    delay = item.delay || 0;

    f = (elapsed - delay) / duration;
    if (f < 0) { stop = false; continue; }
    if (f > 1) f = 1;
    e = curr.ease(f);

    for (i=0, n=curr.length; i<n; ++i) {
      item[curr[i].property] = curr[i](e);
    }
    item.touch();
    calcBounds.item(item);

    if (f === 1) {
      if (curr.remove) item.remove();
      prev.next = curr.next;
      curr = prev;
    } else {
      stop = false;
    }
  }

  this.callback();
  return stop;
};

module.exports = Transition;
},{"../dataflow/tuple":35,"../util/bounds":90,"../util/constants":92}],72:[function(require,module,exports){
var dl = require('datalib'),
    config = require('../util/config'),
    tpl = require('../dataflow/tuple'),
    parseMark = require('../parse/mark');

function axs(model) {
  var scale,
      orient = config.axis.orient,
      offset = 0,
      titleOffset = config.axis.titleOffset,
      axisDef = {},
      layer = "front",
      grid = false,
      title = null,
      tickMajorSize = config.axis.tickSize,
      tickMinorSize = config.axis.tickSize,
      tickEndSize = config.axis.tickSize,
      tickPadding = config.axis.padding,
      tickValues = null,
      tickFormatString = null,
      tickFormat = null,
      tickSubdivide = 0,
      tickArguments = [config.axis.ticks],
      gridLineStyle = {},
      tickLabelStyle = {},
      majorTickStyle = {},
      minorTickStyle = {},
      titleStyle = {},
      domainStyle = {},
      m = { // Axis marks as references for updates
        gridLines: null,
        majorTicks: null,
        minorTicks: null,
        tickLabels: null,
        domain: null,
        title: null
      };

  var axis = {};

  function reset() {
    axisDef.type = null;
  };

  axis.def = function() {
    if(!axisDef.type) axis_def(scale);

    // tick format
    tickFormat = !tickFormatString ? null : ((scale.type === 'time')
      ? d3.time.format(tickFormatString)
      : d3.format(tickFormatString));

    // generate data
    // We don't _really_ need to model these as tuples as no further
    // data transformation is done. So we optimize for a high churn rate. 
    var injest = function(d) { return {data: d}; };
    var major = tickValues == null
      ? (scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain())
      : tickValues;
    var minor = vg_axisSubdivide(scale, major, tickSubdivide).map(injest);
    major = major.map(injest);
    var fmt = tickFormat==null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : String) : tickFormat;
    major.forEach(function(d) { d.label = fmt(d.data); });
    var tdata = title ? [title].map(injest) : [];

    axisDef.marks[0].from = function() { return grid ? major : []; };
    axisDef.marks[1].from = function() { return major; };
    axisDef.marks[2].from = function() { return minor; };
    axisDef.marks[3].from = axisDef.marks[1].from;
    axisDef.marks[4].from = function() { return [1]; };
    axisDef.marks[5].from = function() { return tdata; };
    axisDef.offset = offset;
    axisDef.orient = orient;
    axisDef.layer = layer;
    return axisDef;
  };

  function axis_def(scale) {
    // setup scale mapping
    var newScale, oldScale, range;
    if (scale.type === "ordinal") {
      newScale = {scale: scale.scaleName, offset: 0.5 + scale.rangeBand()/2};
      oldScale = newScale;
    } else {
      newScale = {scale: scale.scaleName, offset: 0.5};
      oldScale = {scale: scale.scaleName+":prev", offset: 0.5};
    }
    range = vg_axisScaleRange(scale);

    // setup axis marks
    if (!m.gridLines)  m.gridLines  = vg_axisTicks();
    if (!m.majorTicks) m.majorTicks = vg_axisTicks();
    if (!m.minorTicks) m.minorTicks = vg_axisTicks();
    if (!m.tickLabels) m.tickLabels = vg_axisTickLabels();
    if (!m.domain) m.domain = vg_axisDomain();
    if (!m.title)  m.title  = vg_axisTitle();
    m.gridLines.properties.enter.stroke = {value: config.axis.gridColor};

    // extend axis marks based on axis orientation
    vg_axisTicksExtend(orient, m.gridLines, oldScale, newScale, Infinity);
    vg_axisTicksExtend(orient, m.majorTicks, oldScale, newScale, tickMajorSize);
    vg_axisTicksExtend(orient, m.minorTicks, oldScale, newScale, tickMinorSize);
    vg_axisLabelExtend(orient, m.tickLabels, oldScale, newScale, tickMajorSize, tickPadding);

    vg_axisDomainExtend(orient, m.domain, range, tickEndSize);
    vg_axisTitleExtend(orient, m.title, range, titleOffset); // TODO get offset
    
    // add / override custom style properties
    dl.extend(m.gridLines.properties.update, gridLineStyle);
    dl.extend(m.majorTicks.properties.update, majorTickStyle);
    dl.extend(m.minorTicks.properties.update, minorTickStyle);
    dl.extend(m.tickLabels.properties.update, tickLabelStyle);
    dl.extend(m.domain.properties.update, domainStyle);
    dl.extend(m.title.properties.update, titleStyle);

    var marks = [m.gridLines, m.majorTicks, m.minorTicks, m.tickLabels, m.domain, m.title];
    dl.extend(axisDef, {
      type: "group",
      interactive: false,
      properties: { 
        enter: {
          encode: vg_axisUpdate,
          scales: [scale.scaleName],
          signals: [], data: []
        },
        update: {
          encode: vg_axisUpdate,
          scales: [scale.scaleName],
          signals: [], data: []
        }
      }
    });

    axisDef.marks = marks.map(function(m) { return parseMark(model, m); });
  };

  axis.scale = function(x) {
    if (!arguments.length) return scale;
    if (scale !== x) { scale = x; reset(); }
    return axis;
  };

  axis.orient = function(x) {
    if (!arguments.length) return orient;
    if (orient !== x) {
      orient = x in vg_axisOrients ? x + "" : config.axis.orient;
      reset();
    }
    return axis;
  };

  axis.title = function(x) {
    if (!arguments.length) return title;
    if (title !== x) { title = x; reset(); }
    return axis;
  };

  axis.ticks = function() {
    if (!arguments.length) return tickArguments;
    tickArguments = arguments;
    return axis;
  };

  axis.tickValues = function(x) {
    if (!arguments.length) return tickValues;
    tickValues = x;
    return axis;
  };

  axis.tickFormat = function(x) {
    if (!arguments.length) return tickFormatString;
    if (tickFormatString !== x) {
      tickFormatString = x;
      reset();
    }
    return axis;
  };
  
  axis.tickSize = function(x, y) {
    if (!arguments.length) return tickMajorSize;
    var n = arguments.length - 1,
        major = +x,
        minor = n > 1 ? +y : tickMajorSize,
        end   = n > 0 ? +arguments[n] : tickMajorSize;

    if (tickMajorSize !== major ||
        tickMinorSize !== minor ||
        tickEndSize !== end) {
      reset();
    }

    tickMajorSize = major;
    tickMinorSize = minor;
    tickEndSize = end;
    return axis;
  };

  axis.tickSubdivide = function(x) {
    if (!arguments.length) return tickSubdivide;
    tickSubdivide = +x;
    return axis;
  };
  
  axis.offset = function(x) {
    if (!arguments.length) return offset;
    offset = dl.isObject(x) ? x : +x;
    return axis;
  };

  axis.tickPadding = function(x) {
    if (!arguments.length) return tickPadding;
    if (tickPadding !== +x) { tickPadding = +x; reset(); }
    return axis;
  };

  axis.titleOffset = function(x) {
    if (!arguments.length) return titleOffset;
    if (titleOffset !== +x) { titleOffset = +x; reset(); }
    return axis;
  };

  axis.layer = function(x) {
    if (!arguments.length) return layer;
    if (layer !== x) { layer = x; reset(); }
    return axis;
  };

  axis.grid = function(x) {
    if (!arguments.length) return grid;
    if (grid !== x) { grid = x; reset(); }
    return axis;
  };

  axis.gridLineProperties = function(x) {
    if (!arguments.length) return gridLineStyle;
    if (gridLineStyle !== x) { gridLineStyle = x; }
    return axis;
  };

  axis.majorTickProperties = function(x) {
    if (!arguments.length) return majorTickStyle;
    if (majorTickStyle !== x) { majorTickStyle = x; }
    return axis;
  };

  axis.minorTickProperties = function(x) {
    if (!arguments.length) return minorTickStyle;
    if (minorTickStyle !== x) { minorTickStyle = x; }
    return axis;
  };

  axis.tickLabelProperties = function(x) {
    if (!arguments.length) return tickLabelStyle;
    if (tickLabelStyle !== x) { tickLabelStyle = x; }
    return axis;
  };

  axis.titleProperties = function(x) {
    if (!arguments.length) return titleStyle;
    if (titleStyle !== x) { titleStyle = x; }
    return axis;
  };

  axis.domainProperties = function(x) {
    if (!arguments.length) return domainStyle;
    if (domainStyle !== x) { domainStyle = x; }
    return axis;
  };
  
  axis.reset = function() { reset(); };

  return axis;
};

var vg_axisOrients = {top: 1, right: 1, bottom: 1, left: 1};

function vg_axisSubdivide(scale, ticks, m) {
  subticks = [];
  if (m && ticks.length > 1) {
    var extent = vg_axisScaleExtent(scale.domain()),
        subticks,
        i = -1,
        n = ticks.length,
        d = (ticks[1] - ticks[0]) / ++m,
        j,
        v;
    while (++i < n) {
      for (j = m; --j > 0;) {
        if ((v = +ticks[i] - j * d) >= extent[0]) {
          subticks.push(v);
        }
      }
    }
    for (--i, j = 0; ++j < m && (v = +ticks[i] + j * d) < extent[1];) {
      subticks.push(v);
    }
  }
  return subticks;
}

function vg_axisScaleExtent(domain) {
  var start = domain[0], stop = domain[domain.length - 1];
  return start < stop ? [start, stop] : [stop, start];
}

function vg_axisScaleRange(scale) {
  return scale.rangeExtent
    ? scale.rangeExtent()
    : vg_axisScaleExtent(scale.range());
}

var vg_axisAlign = {
  bottom: "center",
  top: "center",
  left: "right",
  right: "left"
};

var vg_axisBaseline = {
  bottom: "top",
  top: "bottom",
  left: "middle",
  right: "middle"
};

function vg_axisLabelExtend(orient, labels, oldScale, newScale, size, pad) {
  size = Math.max(size, 0) + pad;
  if (orient === "left" || orient === "top") {
    size *= -1;
  }  
  if (orient === "top" || orient === "bottom") {
    dl.extend(labels.properties.enter, {
      x: oldScale,
      y: {value: size},
    });
    dl.extend(labels.properties.update, {
      x: newScale,
      y: {value: size},
      align: {value: "center"},
      baseline: {value: vg_axisBaseline[orient]}
    });
  } else {
    dl.extend(labels.properties.enter, {
      x: {value: size},
      y: oldScale,
    });
    dl.extend(labels.properties.update, {
      x: {value: size},
      y: newScale,
      align: {value: vg_axisAlign[orient]},
      baseline: {value: "middle"}
    });
  }
}

function vg_axisTicksExtend(orient, ticks, oldScale, newScale, size) {
  var sign = (orient === "left" || orient === "top") ? -1 : 1;
  if (size === Infinity) {
    size = (orient === "top" || orient === "bottom")
      ? {group: "mark.group.height", mult: -sign}
      : {group: "mark.group.width", mult: -sign};
  } else {
    size = {value: sign * size};
  }
  if (orient === "top" || orient === "bottom") {
    dl.extend(ticks.properties.enter, {
      x:  oldScale,
      y:  {value: 0},
      y2: size
    });
    dl.extend(ticks.properties.update, {
      x:  newScale,
      y:  {value: 0},
      y2: size
    });
    dl.extend(ticks.properties.exit, {
      x:  newScale,
    });        
  } else {
    dl.extend(ticks.properties.enter, {
      x:  {value: 0},
      x2: size,
      y:  oldScale
    });
    dl.extend(ticks.properties.update, {
      x:  {value: 0},
      x2: size,
      y:  newScale
    });
    dl.extend(ticks.properties.exit, {
      y:  newScale,
    });
  }
}

function vg_axisTitleExtend(orient, title, range, offset) {
  var mid = ~~((range[0] + range[1]) / 2),
      sign = (orient === "top" || orient === "left") ? -1 : 1;
  
  if (orient === "bottom" || orient === "top") {
    dl.extend(title.properties.update, {
      x: {value: mid},
      y: {value: sign*offset},
      angle: {value: 0}
    });
  } else {
    dl.extend(title.properties.update, {
      x: {value: sign*offset},
      y: {value: mid},
      angle: {value: -90}
    });
  }
}

function vg_axisDomainExtend(orient, domain, range, size) {
  var path;
  if (orient === "top" || orient === "left") {
    size = -1 * size;
  }
  if (orient === "bottom" || orient === "top") {
    path = "M" + range[0] + "," + size + "V0H" + range[1] + "V" + size;
  } else {
    path = "M" + size + "," + range[0] + "H0V" + range[1] + "H" + size;
  }
  domain.properties.update.path = {value: path};
}

function vg_axisUpdate(item, group, trans, db, signals, predicates) {
  var o = trans ? {} : item,
      offset = item.mark.def.offset,
      orient = item.mark.def.orient,
      width  = group.width,
      height = group.height; // TODO fallback to global w,h?

  if (dl.isObject(offset)) {
    offset = -group.scale(offset.scale)(offset.value);
  }

  switch (orient) {
    case "left":   { tpl.set(o, 'x', -offset); tpl.set(o, 'y', 0); break; }
    case "right":  { tpl.set(o, 'x', width + offset); tpl.set(o, 'y', 0); break; }
    case "bottom": { tpl.set(o, 'x', 0); tpl.set(o, 'y', height + offset); break; }
    case "top":    { tpl.set(o, 'x', 0); tpl.set(o, 'y', -offset); break; }
    default:       { tpl.set(o, 'x', 0); tpl.set(o, 'y', 0); }
  }

  if (trans) trans.interpolate(item, o);
}

function vg_axisTicks() {
  return {
    type: "rule",
    interactive: false,
    key: "data",
    properties: {
      enter: {
        stroke: {value: config.axis.tickColor},
        strokeWidth: {value: config.axis.tickWidth},
        opacity: {value: 1e-6}
      },
      exit: { opacity: {value: 1e-6} },
      update: { opacity: {value: 1} }
    }
  };
}

function vg_axisTickLabels() {
  return {
    type: "text",
    interactive: true,
    key: "data",
    properties: {
      enter: {
        fill: {value: config.axis.tickLabelColor},
        font: {value: config.axis.tickLabelFont},
        fontSize: {value: config.axis.tickLabelFontSize},
        opacity: {value: 1e-6},
        text: {field: "label"}
      },
      exit: { opacity: {value: 1e-6} },
      update: { opacity: {value: 1} }
    }
  };
}

function vg_axisTitle() {
  return {
    type: "text",
    interactive: true,
    properties: {
      enter: {
        font: {value: config.axis.titleFont},
        fontSize: {value: config.axis.titleFontSize},
        fontWeight: {value: config.axis.titleFontWeight},
        fill: {value: config.axis.titleColor},
        align: {value: "center"},
        baseline: {value: "middle"},
        text: {field: "data"}
      },
      update: {}
    }
  };
}

function vg_axisDomain() {
  return {
    type: "path",
    interactive: false,
    properties: {
      enter: {
        x: {value: 0.5},
        y: {value: 0.5},
        stroke: {value: config.axis.axisColor},
        strokeWidth: {value: config.axis.axisWidth}
      },
      update: {}
    }
  };
}

module.exports = axs;
},{"../dataflow/tuple":35,"../parse/mark":46,"../util/config":91,"datalib":16}],73:[function(require,module,exports){
var dl = require('datalib'),
    Transform = require('./Transform'),
    GroupBy = require('./GroupBy'),
    tuple = require('../dataflow/tuple'), 
    changeset = require('../dataflow/changeset'), 
    meas = require('./measures'),
    debug = require('../util/debug'),
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
  this._fieldsDef   = null;
  this._Aggregators = null;
  this._singleton   = false;  // If true, all fields aggregated within a single monoid

  return this;
}

var proto = (Aggregate.prototype = new GroupBy());

proto.fields = {
  set: function(transform, fields) {
    var i, len, f, signals = {};
    for(i=0, len=fields.length; i<len; ++i) {
      f = fields[i];
      if(f.name.signal) signals[f.name.signal] = 1;
      dl.array(f.ops).forEach(function(o){ if(o.signal) signals[o.signal] = 1 });
    }

    transform._fieldsDef = fields;
    transform._Aggregators = null;
    transform.aggs();
    transform.dependency(C.SIGNALS, dl.keys(signals));
    return transform;
  }
};

proto.singleton = function(c) {
  if(!arguments.length) return this._singleton;
  this._singleton = c;
  return this;
};

proto.aggs = function() {
  var transform = this,
      graph = this._graph,
      fields = this._fieldsDef,
      aggs = this._Aggregators,
      f, i, k, name, ops, measures;

  if(aggs) return aggs;
  else aggs = this._Aggregators = []; 

  for (i = 0; i < fields.length; i++) {
    f = fields[i];
    if (f.ops.length === 0) continue;

    name = f.name.signal ? graph.signalRef(f.name.signal) : f.name;
    ops  = dl.array(f.ops.signal ? graph.signalRef(f.ops.signal) : f.ops);
    measures = ops.map(function(a) {
      a = a.signal ? graph.signalRef(a.signal) : a;
      return meas[a](name + '_' + transform._output[a]);
    });
    aggs.push({
      accessor: dl.accessor(name),
      field: this._singleton ? C.SINGLETON : name,
      measures: meas.create(measures)
    });
  }

  return aggs;
};

proto._reset = function(input, output) {
  this._Aggregators = null; // rebuild aggregators
  this.aggs();
  return GroupBy.prototype._reset.call(this, input, output);
};

proto._keys = function(x) {
  return this._gb.fields.length ? 
    GroupBy.prototype._keys.call(this, x) : {keys: [], key: ""};
};

proto._new_cell = function(x, k) {
  var cell = GroupBy.prototype._new_cell.call(this, x, k),
      aggs = this.aggs(),
      i = 0, len = aggs.length, 
      agg;

  for(; i<len; i++) {
    agg = aggs[i];
    cell[agg.field] = new agg.measures(cell, cell.tpl);
  }

  return cell;
};

proto._add = function(x) {
  var c = this._cell(x),
      aggs = this.aggs(),
      i = 0, len = aggs.length,
      agg;

  c.cnt++;
  for(; i<len; i++) {
    agg = aggs[i];
    c[agg.field].add(agg.accessor(x));
  }
  c.flg |= C.MOD_CELL;
};

proto._rem = function(x) {
  var c = this._cell(x),
      aggs = this.aggs(),
      i = 0, len = aggs.length,
      agg;

  c.cnt--;
  for(; i<len; i++) {
    agg = aggs[i];
    c[agg.field].rem(agg.accessor(x));
  }
  c.flg |= C.MOD_CELL;
};

proto.transform = function(input, reset) {
  debug(input, ["aggregate"]);

  this._gb = this.group_by.get(this._graph);

  var output = GroupBy.prototype.transform.call(this, input, reset),
      aggs = this.aggs(),
      len = aggs.length,
      i, k, c;

  for(k in this._cells) {
    c = this._cells[k];
    if(!c) continue;
    for(i=0; i<len; i++) {
      c[aggs[i].field].set();
    }
  }

  return output;
};

module.exports = Aggregate;
},{"../dataflow/changeset":34,"../dataflow/tuple":35,"../util/constants":92,"../util/debug":93,"./GroupBy":81,"./Transform":85,"./measures":89,"datalib":16}],74:[function(require,module,exports){
var dl = require('datalib'),
    Transform = require('./Transform'),
    tuple = require('../dataflow/tuple');

function Bin(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    field: {type: "field"},
    min: {type: "value"},
    max: {type: "value"},
    step: {type: "value"},
    maxbins: {type: "value", default: 20}
  });

  this._output = {"bin": "bin"};
  return this;
}

var proto = (Bin.prototype = new Transform());

proto.transform = function(input) {
  var transform = this,
      output = this._output.bin;
      
  var b = dl.bin({
    min: this.min.get(),
    max: this.max.get(),
    step: this.step.get(),
    maxbins: this.maxbins.get()
  });

  function update(d) {
    var v = transform.field.get().accessor(d);
    v = v == null ? null
      : b.start + b.step * ~~((v - b.start) / b.step);
    tuple.set(d, output, v, input.stamp);
  }
  input.add.forEach(update);
  input.mod.forEach(update);
  input.rem.forEach(update);

  return input;
};

module.exports = Bin;
},{"../dataflow/tuple":35,"./Transform":85,"datalib":16}],75:[function(require,module,exports){
var Transform = require('./Transform'),
    Collector = require('../dataflow/Collector'),
    debug = require('../util/debug'),
    tuple = require('../dataflow/tuple'),
    changeset = require('../dataflow/changeset');

function Cross(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    with: {type: "data"},
    diagonal: {type: "value", default: "true"}
  });

  this._output = {"left": "a", "right": "b"};
  this._collector = new Collector(graph);
  this._lastRem  = null; // Most recent stamp that rem occured. 
  this._lastWith = null; // Last time we crossed w/withds.
  this._ids   = {};
  this._cache = {};

  return this.router(true);
}

var proto = (Cross.prototype = new Transform());

// Each cached incoming tuple also has a stamp to track if we need to do
// lazy filtering of removed tuples.
function cache(x, t) {
  var c = this._cache[x._id] = this._cache[x._id] || {c: [], s: this._stamp};
  c.c.push(t);
}

function add(output, left, wdata, diag, x) {
  var data = left ? wdata : this._collector.data(), // Left tuples cross w/right.
      i = 0, len = data.length,
      prev  = x._prev !== undefined ? null : undefined, 
      t, y, id;

  for(; i<len; ++i) {
    y = data[i];
    id = left ? x._id+"_"+y._id : y._id+"_"+x._id;
    if(this._ids[id]) continue;
    if(x._id == y._id && !diag) continue;

    t = tuple.ingest({}, prev);
    t[this._output.left]  = left ? x : y;
    t[this._output.right] = left ? y : x;
    output.add.push(t);
    cache.call(this, x, t);
    cache.call(this, y, t);
    this._ids[id] = 1;
  }
}

function mod(output, left, x) {
  var cross = this,
      c = this._cache[x._id];

  if(this._lastRem > c.s) {  // Removed tuples haven't been filtered yet
    c.c = c.c.filter(function(y) {
      var t = y[cross._output[left ? "right" : "left"]];
      return cross._cache[t._id] !== null;
    });
    c.s = this._lastRem;
  }

  output.mod.push.apply(output.mod, c.c);
}

function rem(output, x) {
  output.rem.push.apply(output.rem, this._cache[x._id].c);
  this._cache[x._id] = null;
  this._lastRem = this._stamp;
}

function upFields(input, output) {
  if(input.add.length || input.rem.length) {
    output.fields[this._output.left]  = 1; 
    output.fields[this._output.right] = 1;
  }
}

proto.transform = function(input) {
  debug(input, ["crossing"]);

  // Materialize the current datasource. TODO: share collectors
  this._collector.evaluate(input);

  var w = this.with.get(this._graph),
      diag = this.diagonal.get(this._graph),
      selfCross = (!w.name),
      data = this._collector.data(),
      woutput = selfCross ? input : w.source.last(),
      wdata   = selfCross ? data : w.source.values(),
      output  = changeset.create(input),
      r = rem.bind(this, output); 

  input.rem.forEach(r);
  input.add.forEach(add.bind(this, output, true, wdata, diag));

  if(!selfCross && woutput.stamp > this._lastWith) {
    woutput.rem.forEach(r);
    woutput.add.forEach(add.bind(this, output, false, data, diag));
    woutput.mod.forEach(mod.bind(this, output, false));
    upFields.call(this, woutput, output);
    this._lastWith = woutput.stamp;
  }

  // Mods need to come after all removals have been run.
  input.mod.forEach(mod.bind(this, output, true));
  upFields.call(this, input, output);

  return output;
};

module.exports = Cross;
},{"../dataflow/Collector":29,"../dataflow/changeset":34,"../dataflow/tuple":35,"../util/debug":93,"./Transform":85}],76:[function(require,module,exports){
var Transform = require('./Transform'),
    GroupBy = require('./GroupBy'),
    tuple = require('../dataflow/tuple'), 
    changeset = require('../dataflow/changeset'),
    debug = require('../util/debug'),
    C = require('../util/constants');

function Facet(graph) {
  GroupBy.prototype.init.call(this, graph);
  Transform.addParameters(this, {keys: {type: "array<field>"} });

  this._pipeline = [];
  return this;
}

var proto = (Facet.prototype = new GroupBy());

proto.pipeline = function(pipeline) {
  if(!arguments.length) return this._pipeline;
  this._pipeline = pipeline;
  return this;
};

proto._reset = function(input, output) {
  var k, c;
  for(k in this._cells) {
    c = this._cells[k];
    if(!c) continue;
    output.rem.push(c.tpl);
    c.delete();
  }
  this._cells = {};
};

proto._new_tuple = function(x, k) {
  return tuple.ingest(k, null);
};

proto._new_cell = function(x, k) {
  // Rather than sharing the pipeline between all nodes,
  // give each cell its individual pipeline. This allows
  // dynamically added collectors to do the right thing
  // when wiring up the pipelines.
  var cell = GroupBy.prototype._new_cell.call(this, x, k),
      pipeline = this._pipeline.map(function(n) { return n.clone(); }),
      facet = this,
      t = cell.tpl;

  cell.ds = this._graph.data("vg_"+t._id, pipeline, t);
  cell.delete = function() {
    debug({}, ["deleting cell", k.key]);
    facet.removeListener(pipeline[0]);
    facet._graph.disconnect(pipeline);
  };

  this.addListener(pipeline[0]);

  return cell;
};

proto._add = function(x) {
  var cell = GroupBy.prototype._add.call(this, x);
  cell.ds._input.add.push(x);
  return cell;
};

proto._mod = function(x, reset) {
  var cell = GroupBy.prototype._mod.call(this, x, reset);
  if(!(cell.flg & C.ADD_CELL)) cell.ds._input.mod.push(x); // Propagate tuples
  cell.flg |= C.MOD_CELL;
  return cell;
};

proto._rem = function(x) {
  var cell = GroupBy.prototype._rem.call(this, x);
  cell.ds._input.rem.push(x);
  return cell;
};

proto.transform = function(input, reset) {
  debug(input, ["faceting"]);

  this._gb = this.keys.get(this._graph);

  var output = GroupBy.prototype.transform.call(this, input, reset),
      k, c;

  for(k in this._cells) {
    c = this._cells[k];
    if(c == null) continue;
    if(c.cnt === 0) {
      c.delete();
    } else {
      // propagate sort, signals, fields, etc.
      changeset.copy(input, c.ds._input);
    }
  }

  return output;
};

module.exports = Facet;
},{"../dataflow/changeset":34,"../dataflow/tuple":35,"../util/constants":92,"../util/debug":93,"./GroupBy":81,"./Transform":85}],77:[function(require,module,exports){
var Transform = require('./Transform'),
    changeset = require('../dataflow/changeset'), 
    expr = require('../parse/expr'),
    debug = require('../util/debug'),
    C = require('../util/constants');

function Filter(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {test: {type: "expr"} });

  this._skip = {};
  return this;
}

var proto = (Filter.prototype = new Transform());

function test(x) {
  return expr.eval(this._graph, this.test.get(this._graph), 
    x, null, null, null, this.dependency(C.SIGNALS));
};

proto.transform = function(input) {
  debug(input, ["filtering"]);
  var output = changeset.create(input),
      skip = this._skip,
      f = this;

  input.rem.forEach(function(x) {
    if (skip[x._id] !== 1) output.rem.push(x);
    else skip[x._id] = 0;
  });

  input.add.forEach(function(x) {
    if (test.call(f, x)) output.add.push(x);
    else skip[x._id] = 1;
  });

  input.mod.forEach(function(x) {
    var b = test.call(f, x),
        s = (skip[x._id] === 1);
    if (b && s) {
      skip[x._id] = 0;
      output.add.push(x);
    } else if (b && !s) {
      output.mod.push(x);
    } else if (!b && s) {
      // do nothing, keep skip true
    } else { // !b && !s
      output.rem.push(x);
      skip[x._id] = 1;
    }
  });

  return output;
};

module.exports = Filter;
},{"../dataflow/changeset":34,"../parse/expr":44,"../util/constants":92,"../util/debug":93,"./Transform":85}],78:[function(require,module,exports){
var Transform = require('./Transform'),
    debug = require('../util/debug'), 
    tuple = require('../dataflow/tuple'), 
    changeset = require('../dataflow/changeset');

function Fold(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    fields: {type: "array<field>"} 
  });

  this._output = {key: "key", value: "value"};
  this._cache = {};

  return this.router(true).revises(true);
}

var proto = (Fold.prototype = new Transform());

function rst(input, output) { 
  for(var id in this._cache) output.rem.push.apply(output.rem, this._cache[id]);
  this._cache = {};
};

function get_tuple(x, i, len) {
  var list = this._cache[x._id] || (this._cache[x._id] = Array(len));
  return list[i] || (list[i] = tuple.derive(x, x._prev));
};

function fn(data, fields, accessors, out, stamp) {
  var i = 0, dlen = data.length,
      j, flen = fields.length,
      d, t;

  for(; i<dlen; ++i) {
    d = data[i];
    for(j=0; j<flen; ++j) {
      t = get_tuple.call(this, d, j, flen);  
      tuple.set(t, this._output.key, fields[j]);
      tuple.set(t, this._output.value, accessors[j](d));
      out.push(t);
    }      
  }
};

proto.transform = function(input, reset) {
  debug(input, ["folding"]);

  var fold = this,
      on = this.fields.get(this._graph),
      fields = on.fields, accessors = on.accessors,
      output = changeset.create(input);

  if(reset) rst.call(this, input, output);

  fn.call(this, input.add, fields, accessors, output.add, input.stamp);
  fn.call(this, input.mod, fields, accessors, reset ? output.add : output.mod, input.stamp);
  input.rem.forEach(function(x) {
    output.rem.push.apply(output.rem, fold._cache[x._id]);
    fold._cache[x._id] = null;
  });

  // If we're only propagating values, don't mark key/value as updated.
  if(input.add.length || input.rem.length || 
    fields.some(function(f) { return !!input.fields[f]; }))
      output.fields[this._output.key] = 1, output.fields[this._output.value] = 1;
  return output;
};

module.exports = Fold;
},{"../dataflow/changeset":34,"../dataflow/tuple":35,"../util/debug":93,"./Transform":85}],79:[function(require,module,exports){
(function (global){
var Transform = require('./Transform'),
    Collector = require('../dataflow/Collector'),
    tuple = require('../dataflow/tuple'),
    changeset = require('../dataflow/changeset'),
    d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null);

function Force(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    size: {type: "array<value>", default: [500, 500]},
    links: {type: "data"},
    linkDistance: {type: "field", default: 20},
    linkStrength: {type: "field", default: 1},
    charge: {type: "field", default: 30},
    chargeDistance: {type: "field", default: Infinity},
    iterations: {type: "value", default: 500},
    friction: {type: "value", default: 0.9},
    theta: {type: "value", default: 0.8},
    gravity: {type: "value", default: 0.1},
    alpha: {type: "value", default: 0.1}
  });

  this._nodes = [];
  this._links = [];
  this._layout = d3.layout.force();

  this._output = {
    "x": "force:x",
    "y": "force:y",
    "source": "force:source",
    "target": "force:target"
  };

  return this;
}

var proto = (Force.prototype = new Transform());

function get(transform, name) {
  var v = transform[name].get(transform._graph);
  return v.accessor
    ? function(x) { return v.accessor(x.tuple); }
    : v.field;
}

proto.transform = function(nodeInput) {
  // get variables
  var g = this._graph,
      linkInput = this.links.get(g).source.last(),
      layout = this._layout,
      output = this._output,
      nodes = this._nodes,
      links = this._links,
      iter = this.iterations.get(g);

  // process added nodes
  nodeInput.add.forEach(function(n) {
    nodes.push({tuple: n});
  });

  // process added edges
  linkInput.add.forEach(function(l) {
    var link = {
      tuple: l,
      source: nodes[l.source],
      target: nodes[l.target]
    };
    tuple.set(l, output.source, link.source.tuple);
    tuple.set(l, output.target, link.target.tuple);
    links.push(link);
  });

  // TODO process "mod" of edge source or target?

  // configure layout
  layout
    .size(this.size.get(g))
    .linkDistance(get(this, "linkDistance"))
    .linkStrength(get(this, "linkStrength"))
    .charge(get(this, "charge"))
    .chargeDistance(get(this, "chargeDistance"))
    .friction(this.friction.get(g))
    .theta(this.theta.get(g))
    .gravity(this.gravity.get(g))
    .alpha(this.alpha.get(g))
    .nodes(nodes)
    .links(links);

  // run layout
  layout.start();
  for (var i=0; i<iter; ++i) {
    layout.tick();
  }
  layout.stop();

  // copy layout values to nodes
  nodes.forEach(function(n) {
    tuple.set(n.tuple, output.x, n.x);
    tuple.set(n.tuple, output.y, n.y);
  });

  // process removed nodes
  if (nodeInput.rem.length > 0) {
    var nodeIds = tuple.idMap(nodeInput.rem);
    this._nodes = nodes.filter(function(n) { return !nodeIds[n.tuple._id]; });
  }

  // process removed edges
  if (linkInput.rem.length > 0) {
    var linkIds = tuple.idMap(linkInput.rem);
    this._links = links.filter(function(l) { return !linkIds[l.tuple._id]; });
  }

  // return changeset
  nodeInput.fields[output.x] = 1;
  nodeInput.fields[output.y] = 1;
  return nodeInput;
};

module.exports = Force;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../dataflow/Collector":29,"../dataflow/changeset":34,"../dataflow/tuple":35,"./Transform":85}],80:[function(require,module,exports){
var Transform = require('./Transform'),
    tuple = require('../dataflow/tuple'), 
    expression = require('../parse/expr'),
    debug = require('../util/debug'),
    C = require('../util/constants');

function Formula(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    field: {type: "value"},
    expr:  {type: "expr"}
  });

  return this;
}

var proto = (Formula.prototype = new Transform());

proto.transform = function(input) {
  debug(input, ["formulating"]);
  var t = this, 
      g = this._graph,
      field = this.field.get(g),
      expr = this.expr.get(g),
      deps = this.dependency(C.SIGNALS);
  
  function set(x) {
    var val = expression.eval(g, expr, x, null, null, null, deps);
    tuple.set(x, field, val);
  }

  input.add.forEach(set);
  
  if (this.reevaluate(input)) {
    input.mod.forEach(set);
  }

  input.fields[field] = 1;
  return input;
};

module.exports = Formula;
},{"../dataflow/tuple":35,"../parse/expr":44,"../util/constants":92,"../util/debug":93,"./Transform":85}],81:[function(require,module,exports){
var Transform = require('./Transform'),
    tuple = require('../dataflow/tuple'),
    changeset = require('../dataflow/changeset'),
    C = require('../util/constants');

function GroupBy(graph) {
  if(graph) this.init(graph);
  return this;
}

var proto = (GroupBy.prototype = new Transform());

proto.init = function(graph) {
  this._gb = null; // fields+accessors to groupby fields
  this._cells = {};
  return Transform.prototype.init.call(this, graph)
    .router(true).revises(true);
};

proto.data = function() { return this._cells; };

proto._reset = function(input, output) {
  var k, c;
  for(k in this._cells) {
    if(!(c = this._cells[k])) continue;
    output.rem.push(c.tpl);
  }
  this._cells = {};
};

proto._keys = function(x) {
  var acc = this._gb.accessors || [this._gb.accessor];
  var keys = acc.reduce(function(g, f) {
    return ((v = f(x)) !== undefined) ? (g.push(v), g) : g;
  }, []), k = keys.join("|"), v;
  return keys.length > 0 ? {keys: keys, key: k} : undefined;
};

proto._cell = function(x) {
  var k = this._keys(x);
  return this._cells[k.key] || (this._cells[k.key] = this._new_cell(x, k));
};

proto._new_cell = function(x, k) {
  return {
    cnt: 0,
    tpl: this._new_tuple(x, k),
    flg: C.ADD_CELL
  };
};

proto._new_tuple = function(x, k) {
  var gb = this._gb,
      fields = gb.fields || [gb.field],
      acc = gb.accessors || [gb.accessor],
      t = {}, i, len;

  for(i=0, len=fields.length; i<len; ++i) {
    t[fields[i]] = acc[i](x);
  } 

  return tuple.ingest(t, null);
};

proto._add = function(x) {
  var cell = this._cell(x);
  cell.cnt += 1;
  cell.flg |= C.MOD_CELL;
  return cell;
};

proto._rem = function(x) {
  var cell = this._cell(x);
  cell.cnt -= 1;
  cell.flg |= C.MOD_CELL;
  return cell;
};

proto._mod = function(x, reset) {
  if(x._prev && x._prev !== C.SENTINEL && this._keys(x._prev) !== undefined) {
    this._rem(x._prev);
    return this._add(x);
  } else if(reset) { // Signal change triggered reflow
    return this._add(x);
  }
  return this._cell(x);
};

proto.transform = function(input, reset) {
  var groupBy = this,
      output = changeset.create(input),
      k, c, f, t;

  if(reset) this._reset(input, output);

  input.add.forEach(function(x) { groupBy._add(x); });
  input.mod.forEach(function(x) { groupBy._mod(x, reset); });
  input.rem.forEach(function(x) {
    if(x._prev && x._prev !== C.SENTINEL && groupBy._keys(x._prev) !== undefined) {
      groupBy._rem(x._prev);
    } else {
      groupBy._rem(x);
    }
  });

  for(k in this._cells) {
    c = this._cells[k];
    if(!c) continue;
    f = c.flg;
    t = c.tpl;

    if(c.cnt === 0) {
      if(f === C.MOD_CELL) output.rem.push(t);
      this._cells[k] = null;
    } else if(f & C.ADD_CELL) {
      output.add.push(t);
    } else if(f & C.MOD_CELL) {
      output.mod.push(t);
    }
    c.flg = 0;
  }

  return output;
};

module.exports = GroupBy;
},{"../dataflow/changeset":34,"../dataflow/tuple":35,"../util/constants":92,"./Transform":85}],82:[function(require,module,exports){
var dl = require('datalib'),
    expr = require('../parse/expr'),
    C = require('../util/constants');

var arrayType = /array/i,
    dataType  = /data/i,
    fieldType = /field/i,
    exprType  = /expr/i;

function Parameter(name, type) {
  this._name = name;
  this._type = type;

  // If parameter is defined w/signals, it must be resolved
  // on every pulse.
  this._value = [];
  this._accessors = [];
  this._resolution = false;
  this._signals = {};
}

var proto = Parameter.prototype;

proto._get = function() {
  var isArray = arrayType.test(this._type),
      isData  = dataType.test(this._type),
      isField = fieldType.test(this._type);

  if (isData) {
    return isArray ? { names: this._value, sources: this._accessors } :
      { name: this._value[0], source: this._accessors[0] };
  } else if (isField) {
    return isArray ? { fields: this._value, accessors: this._accessors } :
      { field: this._value[0], accessor: this._accessors[0] };
  } else {
    return isArray ? this._value : this._value[0];
  }
};

proto.get = function(graph) {
  var isData  = dataType.test(this._type),
      isField = fieldType.test(this._type),
      s, idx, val;

  // If we don't require resolution, return the value immediately.
  if (!this._resolution) return this._get();

  if (isData) {
    this._accessors = this._value.map(function(v) { return graph.data(v); });
    return this._get(); // TODO: support signal as dataTypes
  }

  for(s in this._signals) {
    idx  = this._signals[s];
    val  = graph.signalRef(s);

    if (isField) {
      this._accessors[idx] = this._value[idx] != val ? 
        dl.accessor(val) : this._accessors[idx];
    }

    this._value[idx] = val;
  }

  return this._get();
};

proto.set = function(transform, value) {
  var param = this, 
      isExpr = exprType.test(this._type),
      isData  = dataType.test(this._type),
      isField = fieldType.test(this._type);

  this._value = dl.array(value).map(function(v, i) {
    if (dl.isString(v)) {
      if (isExpr) {
        var e = expr(v);
        transform.dependency(C.FIELDS,  e.fields);
        transform.dependency(C.SIGNALS, e.signals);
        return e.fn;
      } else if (isField) {  // Backwards compatibility
        param._accessors[i] = dl.accessor(v);
        transform.dependency(C.FIELDS, v);
      } else if (isData) {
        param._resolution = true;
        transform.dependency(C.DATA, v);
      }
      return v;
    } else if (v.value !== undefined) {
      return v.value;
    } else if (v.field !== undefined) {
      param._accessors[i] = dl.accessor(v.field);
      transform.dependency(C.FIELDS, v.field);
      return v.field;
    } else if (v.signal !== undefined) {
      param._resolution = true;
      param._signals[v.signal] = i;
      transform.dependency(C.SIGNALS, v.signal);
      return v.signal;
    }

    return v;
  });

  return transform;
};

module.exports = Parameter;
},{"../parse/expr":44,"../util/constants":92,"datalib":16}],83:[function(require,module,exports){
var dl = require('datalib'),
    Transform = require('./Transform'),
    expr = require('../parse/expr'),
    debug = require('../util/debug');

function Sort(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {by: {type: "array<field>"} });
  return this.router(true);
}

var proto = (Sort.prototype = new Transform());

proto.transform = function(input) {
  debug(input, ["sorting"]);

  if(input.add.length || input.mod.length || input.rem.length) {
    input.sort = dl.comparator(this.by.get(this._graph).fields);
  }

  return input;
};

module.exports = Sort;
},{"../parse/expr":44,"../util/debug":93,"./Transform":85,"datalib":16}],84:[function(require,module,exports){
var dl = require('datalib'),
    Transform = require('./Transform'),
    Collector = require('../dataflow/Collector'),
    tuple = require('../dataflow/tuple'),
    changeset = require('../dataflow/changeset');

function Stack(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    groupby: {type: "array<field>"},
    sortby: {type: "array<field>"},
    value: {type: "field"},
    offset: {type: "value", default: "zero"}
  });

  this._output = {
    "start": "y2",
    "stop": "y",
    "mid": "cy"
  };
  this._collector = new Collector(graph);

  return this;
}

var proto = (Stack.prototype = new Transform());

proto.transform = function(input) {
  // Materialize the current datasource. TODO: share collectors
  this._collector.evaluate(input);
  var data = this._collector.data();

  var g = this._graph,
      groupby = this.groupby.get(g).accessors,
      sortby = dl.comparator(this.sortby.get(g).fields),
      value = this.value.get(g).accessor,
      offset = this.offset.get(g),
      output = this._output;

  // partition, sum, and sort the stack groups
  var groups = partition(data, groupby, sortby, value);

  // compute stack layouts per group
  for (var i=0, max=groups.max; i<groups.length; ++i) {
    var group = groups[i],
        sum = group.sum,
        off = offset==="center" ? (max - sum)/2 : 0,
        scale = offset==="normalize" ? (1/sum) : 1,
        i, x, a, b = off, v = 0;

    // set stack coordinates for each datum in group
    for (j=0; j<group.length; ++j) {
      x = group[j];
      a = b; // use previous value for start point
      v += value(x);
      b = scale * v + off; // compute end point
      tuple.set(x, output.start, a);
      tuple.set(x, output.stop, b);
      tuple.set(x, output.mid, 0.5 * (a + b));
    }
  }

  input.fields[output.start] = 1;
  input.fields[output.stop] = 1;
  input.fields[output.mid] = 1;
  return input;
};

function partition(data, groupby, sortby, value) {
  var groups = [],
      map, i, x, k, g, s, max;

  // partition data points into stack groups
  if (groupby == null) {
    groups.push(data.slice());
  } else {
    for (map={}, i=0; i<data.length; ++i) {
      x = data[i];
      k = (groupby.map(function(f) { return f(x); }));
      g = map[k] || (groups.push(map[k] = []), map[k]);
      g.push(x);
    }
  }

  // compute sums of groups, sort groups as needed
  for (k=0, max=0; k<groups.length; ++k) {
    g = groups[k];
    for (i=0, s=0; i<g.length; ++i) {
      s += value(g[i]);
    }
    g.sum = s;
    if (s > max) max = s;
    if (sortby != null) g.sort(sortby);
  }
  groups.max = max;

  return groups;
}

module.exports = Stack;
},{"../dataflow/Collector":29,"../dataflow/changeset":34,"../dataflow/tuple":35,"./Transform":85,"datalib":16}],85:[function(require,module,exports){
var Node = require('../dataflow/Node'),
    Parameter = require('./Parameter'),
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
  for(var k in this) { 
    if(n[k]) continue;
    n[k] = this[k]; 
  }
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

module.exports = Transform;
},{"../dataflow/Node":32,"../util/constants":92,"./Parameter":82}],86:[function(require,module,exports){
var Transform = require('./Transform'),
    GroupBy = require('./GroupBy'),
    tuple = require('../dataflow/tuple'),
    debug = require('../util/debug');

function Unique(graph) {
  GroupBy.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    field: {type: "field"},
    as: {type: "value"}
  });

  return this;
}

var proto = (Unique.prototype = new GroupBy());

proto._new_tuple = function(x) {
  var o  = {},
      on = this.field.get(this._graph),
      as = this.as.get(this._graph);

  o[as] = on.accessor(x);
  return tuple.ingest(o, null);
};

proto.transform = function(input, reset) {
  debug(input, ["uniques"]);
  this._gb = this.field.get(this._graph);
  return GroupBy.prototype.transform.call(this, input, reset);
};

module.exports = Unique;
},{"../dataflow/tuple":35,"../util/debug":93,"./GroupBy":81,"./Transform":85}],87:[function(require,module,exports){
var dl = require('datalib'),
    Transform = require('./Transform'),
    Collector = require('../dataflow/Collector'),
    debug = require('../util/debug');

function Zip(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    with: {type: "data"},
    as:  {type: "value"},
    key: {type: "field", default: "data"},
    withKey: {type: "field", default: null},
    default: {type: "value"}
  });

  this._map = {};
  this._collector = new Collector(graph);
  this._lastJoin = 0;

  return this.revises(true);
}

var proto = (Zip.prototype = new Transform());

function mp(k) {
  return this._map[k] || (this._map[k] = []);
};

proto.transform = function(input) {
  var w = this.with.get(this._graph),
      wds = w.source,
      woutput = wds.last(),
      wdata = wds.values(),
      key = this.key.get(this._graph),
      withKey = this.withKey.get(this._graph),
      as = this.as.get(this._graph),
      dflt = this.default.get(this._graph),
      map = mp.bind(this),
      rem = {};

  debug(input, ["zipping", w.name]);

  if(withKey.field) {
    if(woutput && woutput.stamp > this._lastJoin) {
      woutput.rem.forEach(function(x) {
        var m = map(withKey.accessor(x));
        if(m[0]) m[0].forEach(function(d) { d[as] = dflt });
        m[1] = null;
      });

      woutput.add.forEach(function(x) { 
        var m = map(withKey.accessor(x));
        if(m[0]) m[0].forEach(function(d) { d[as] = x });
        m[1] = x;
      });
      
      // Only process woutput.mod tuples if the join key has changed.
      // Other field updates will auto-propagate via prototype.
      if(woutput.fields[withKey.field]) {
        woutput.mod.forEach(function(x) {
          var prev;
          if(!x._prev || (prev = withKey.accessor(x._prev)) === undefined) return;
          var prevm = map(prev);
          if(prevm[0]) prevm[0].forEach(function(d) { d[as] = dflt });
          prevm[1] = null;

          var m = map(withKey.accessor(x));
          if(m[0]) m[0].forEach(function(d) { d[as] = x });
          m[1] = x;
        });
      }

      this._lastJoin = woutput.stamp;
    }
  
    input.add.forEach(function(x) {
      var m = map(key.accessor(x));
      x[as] = m[1] || dflt;
      (m[0]=m[0]||[]).push(x);
    });

    input.rem.forEach(function(x) { 
      var k = key.accessor(x);
      (rem[k]=rem[k]||{})[x._id] = 1;
    });

    if(input.fields[key.field]) {
      input.mod.forEach(function(x) {
        var prev;
        if(!x._prev || (prev = key.accessor(x._prev)) === undefined) return;

        var m = map(key.accessor(x));
        x[as] = m[1] || dflt;
        (m[0]=m[0]||[]).push(x);
        (rem[prev]=rem[prev]||{})[x._id] = 1;
      });
    }

    dl.keys(rem).forEach(function(k) { 
      var m = map(k);
      if(!m[0]) return;
      m[0] = m[0].filter(function(x) { return rem[k][x._id] !== 1 });
    });
  } else {
    // We only need to run a non-key-join again if we've got any add/rem
    // on input or woutput
    if(input.add.length == 0 && input.rem.length == 0 && 
        woutput.add.length == 0 && woutput.rem.length == 0) return input;

    // If we don't have a key-join, then we need to materialize both
    // data sources to iterate through them. 
    this._collector.evaluate(input);

    var data = this._collector.data(), 
        wlen = wdata.length, i;

    for(i = 0; i < data.length; i++) { data[i][as] = wdata[i%wlen]; }
  }

  input.fields[as] = 1;
  return input;
};

module.exports = Zip;
},{"../dataflow/Collector":29,"../util/debug":93,"./Transform":85,"datalib":16}],88:[function(require,module,exports){
module.exports = {
  aggregate:  require('./Aggregate'),
  bin:        require('./Bin'),
  cross:      require('./Cross'),
  facet:      require('./Facet'),
  filter:     require('./Filter'),
  fold:       require('./Fold'),
  force:      require('./Force'),
  formula:    require('./Formula'),
  sort:       require('./Sort'),
  stack:      require('./Stack'),
  unique:     require('./Unique'),
  zip:        require('./Zip')
};
},{"./Aggregate":73,"./Bin":74,"./Cross":75,"./Facet":76,"./Filter":77,"./Fold":78,"./Force":79,"./Formula":80,"./Sort":83,"./Stack":84,"./Unique":86,"./Zip":87}],89:[function(require,module,exports){
var dl = require('datalib'),
    tuple = require('../dataflow/tuple'),
    quickselect = require('../util/quickselect'),
    C = require('../util/constants');

var types = {
  "count": measure({
    name: "count",
    init: "",
    add:  "",
    rem:  "",
    set:  "this.cell.cnt"
  }),
  "_counts": measure({
    name: "_counts",
    init: "this.cnts = {};",
    add:  "this.cnts[v] = ++this.cnts[v] || 1;",
    rem:  "this.cnts[v] = --this.cnts[v] < 0 ? 0 : this.cnts[v];",
    set:  "",
    req:  ["count"]
  }),
  "sum": measure({
    name: "sum",
    init: "this.sum = 0;",
    add:  "this.sum += v;",
    rem:  "this.sum -= v;",
    set:  "this.sum"
  }),
  "avg": measure({
    name: "avg",
    init: "this.avg = 0;",
    add:  "var d = v - this.avg; this.avg += d / this.cell.cnt;",
    rem:  "var d = v - this.avg; this.avg -= d / this.cell.cnt;",
    set:  "this.avg",
    req:  ["count"], idx: 1
  }),
  "var": measure({
    name: "var",
    init: "this.dev = 0;",
    add:  "this.dev += d * (v - this.avg);",
    rem:  "this.dev -= d * (v - this.avg);",
    set:  "this.dev / (this.cell.cnt-1)",
    req:  ["avg"], idx: 2
  }),
  "varp": measure({
    name: "varp",
    init: "",
    add:  "",
    rem:  "",
    set:  "this.dev / this.cell.cnt",
    req:  ["var"], idx: 3
  }),
  "stdev": measure({
    name: "stdev",
    init: "",
    add:  "",
    rem:  "",
    set:  "Math.sqrt(this.dev / (this.cell.cnt-1))",
    req:  ["var"], idx: 4
  }),
  "stdevp": measure({
    name: "stdevp",
    init: "",
    add:  "",
    rem:  "",
    set:  "Math.sqrt(this.dev / this.cell.cnt)",
    req:  ["var"], idx: 5
  }),
  "min": measure({
    name: "min",
    init: "this.min = +Infinity;",
    add:  "this.min = v < this.min ? v : this.min;",
    rem:  "var self = this; this.min = v == this.min " +
          "? this.keys(this.cnts).reduce(function(m, v) { " +
          "   return self.cnts[(v = +v)] > 0 && v < m ? v : m }, +Infinity) " + 
          ": this.min;",
    set:  "this.min",
    req: ["_counts"], idx: 6
  }),
  "max": measure({
    name: "max",
    init: "this.max = -Infinity;",
    add:  "this.max = v > this.max ? v : this.max;",
    rem:  "var self = this; this.max = v == this.max " +
          "? this.keys(this.cnts).reduce(function(m, v) { " +
          "   return self.cnts[(v = +v)] > 0 && v > m ? v : m }, -Infinity) " + 
          ": this.max;",
    set:  "this.max",
    req: ["_counts"], idx: 7
  }),
  "median": measure({
    name: "median",
    init: "this.vals = []; ",
    add:  "if(this.vals) this.vals.push(v); ",
    rem:  "this.vals = null;",
    set:  "this.cell.cnt % 2 ? this.sel(~~(this.cell.cnt/2), this.vals, this.cnts) : "+
          "0.5 * (this.sel(~~(this.cell.cnt/2)-1, this.vals, this.cnts) + this.sel(~~(this.cell.cnt/2), this.vals, this.cnts))",
    req: ["_counts"], idx: 8
  })
};

function measure(base) {
  return function(out) {
    var m = Object.create(base);
    m.out = out || base.name;
    if (!m.idx) m.idx = 0;
    return m;
  };
}

function resolve(agg) {
  function collect(m, a) {
    (a.req || []).forEach(function(r) {
      if (!m[r]) collect(m, m[r] = types[r]());
    });
    return m;
  }
  var map = agg.reduce(collect,
    agg.reduce(function(m, a) { return (m[a.name] = a, m); }, {}));
  var all = [];
  for (var k in map) all.push(map[k]);
  all.sort(function(a,b) { return a.idx - b.idx; });
  return all;
}

function compile(agg) {
  var all = resolve(agg),
      ctr = "this.tpl = t; this.cell = c;",
      add = "",
      rem = "",
      set = "var t = this.tpl;";

  all.forEach(function(a) { ctr += a.init; add += a.add; rem += a.rem; });
  agg.forEach(function(a) { set += "this.tuple.set(t,'"+a.out+"',"+a.set+");"; });
  set += "return t;";

  ctr = Function("c", "t", ctr);
  ctr.prototype.add = Function("v", add);
  ctr.prototype.rem = Function("v", rem);
  ctr.prototype.set = Function("stamp", set);
  ctr.prototype.mod = mod;
  ctr.prototype.keys = dl.keys;
  ctr.prototype.sel = quickselect;
  ctr.prototype.tuple = tuple;
  return ctr;
}

function mod(v_new, v_old) {
  if (v_old === undefined || v_old === v_new) return;
  this.rem(v_old);
  this.add(v_new);
};

types.create   = compile;
module.exports = types;
},{"../dataflow/tuple":35,"../util/constants":92,"../util/quickselect":94,"datalib":16}],90:[function(require,module,exports){
(function (global){
var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null),
    Bounds = require('../core/Bounds'),
    canvas = require('../render/canvas/path'),
    config = require('./config');

var parse = canvas.parse,
    boundPath = canvas.bounds,
    areaPath = canvas.area,
    linePath = canvas.line,
    halfpi = Math.PI / 2,
    sqrt3 = Math.sqrt(3),
    tan30 = Math.tan(30 * Math.PI / 180),
    gfx = null;

function fontString(o) {
  return (o.fontStyle ? o.fontStyle + " " : "")
    + (o.fontVariant ? o.fontVariant + " " : "")
    + (o.fontWeight ? o.fontWeight + " " : "")
    + (o.fontSize != null ? o.fontSize : config.render.fontSize) + "px "
    + (o.font || config.render.font);
}

function context() {
  // TODO: how to check if nodeJS in requireJS?
  return gfx || (gfx = (/*config.isNode
    ? new (require("canvas"))(1,1)
    : */d3.select("body").append("canvas")
        .attr("class", "vega_hidden")
        .attr("width", 1)
        .attr("height", 1)
        .style("display", "none")
        .node())
    .getContext("2d"));
}

function pathBounds(o, path, bounds) {
  if (path == null) {
    bounds.set(0, 0, 0, 0);
  } else {
    boundPath(path, bounds);
    if (o.stroke && o.opacity !== 0 && o.strokeWidth > 0) {
      bounds.expand(o.strokeWidth);
    }
  }
  return bounds;
}

function path(o, bounds) {
  var p = o.path
    ? o.pathCache || (o.pathCache = parse(o.path))
    : null;
  return pathBounds(o, p, bounds);
}

function area(o, bounds) {
  var items = o.mark.items, o = items[0];
  var p = o.pathCache || (o.pathCache = parse(areaPath(items)));
  return pathBounds(items[0], p, bounds);
}

function line(o, bounds) {
  var items = o.mark.items, o = items[0];
  var p = o.pathCache || (o.pathCache = parse(linePath(items)));
  return pathBounds(items[0], p, bounds);
}

function rect(o, bounds) {
  var x = o.x || 0,
      y = o.y || 0,
      w = (x + o.width) || 0,
      h = (y + o.height) || 0;
  bounds.set(x, y, w, h);
  if (o.stroke && o.opacity !== 0 && o.strokeWidth > 0) {
    bounds.expand(o.strokeWidth);
  }
  return bounds;
}

function image(o, bounds) {
  var w = o.width || 0,
      h = o.height || 0,
      x = (o.x||0) - (o.align === "center"
          ? w/2 : (o.align === "right" ? w : 0)),
      y = (o.y||0) - (o.baseline === "middle"
          ? h/2 : (o.baseline === "bottom" ? h : 0));
  return bounds.set(x, y, x+w, y+h);
}

function rule(o, bounds) {
  var x1, y1;
  bounds.set(
    x1 = o.x || 0,
    y1 = o.y || 0,
    o.x2 != null ? o.x2 : x1,
    o.y2 != null ? o.y2 : y1
  );
  if (o.stroke && o.opacity !== 0 && o.strokeWidth > 0) {
    bounds.expand(o.strokeWidth);
  }
  return bounds;
}

function arc(o, bounds) {
  var cx = o.x || 0,
      cy = o.y || 0,
      ir = o.innerRadius || 0,
      or = o.outerRadius || 0,
      sa = (o.startAngle || 0) - halfpi,
      ea = (o.endAngle || 0) - halfpi,
      xmin = Infinity, xmax = -Infinity,
      ymin = Infinity, ymax = -Infinity,
      a, i, n, x, y, ix, iy, ox, oy;

  var angles = [sa, ea],
      s = sa - (sa%halfpi);
  for (i=0; i<4 && s<ea; ++i, s+=halfpi) {
    angles.push(s);
  }

  for (i=0, n=angles.length; i<n; ++i) {
    a = angles[i];
    x = Math.cos(a); ix = ir*x; ox = or*x;
    y = Math.sin(a); iy = ir*y; oy = or*y;
    xmin = Math.min(xmin, ix, ox);
    xmax = Math.max(xmax, ix, ox);
    ymin = Math.min(ymin, iy, oy);
    ymax = Math.max(ymax, iy, oy);
  }

  bounds.set(cx+xmin, cy+ymin, cx+xmax, cy+ymax);
  if (o.stroke && o.opacity !== 0 && o.strokeWidth > 0) {
    bounds.expand(o.strokeWidth);
  }
  return bounds;
}

function symbol(o, bounds) {
  var size = o.size != null ? o.size : 100,
      x = o.x || 0,
      y = o.y || 0,
      r, t, rx, ry;

  switch (o.shape) {
    case "cross":
      r = Math.sqrt(size / 5) / 2;
      t = 3*r;
      bounds.set(x-t, y-r, x+t, y+r);
      break;

    case "diamond":
      ry = Math.sqrt(size / (2 * tan30));
      rx = ry * tan30;
      bounds.set(x-rx, y-ry, x+rx, y+ry);
      break;

    case "square":
      t = Math.sqrt(size);
      r = t / 2;
      bounds.set(x-r, y-r, x+r, y+r);
      break;

    case "triangle-down":
      rx = Math.sqrt(size / sqrt3);
      ry = rx * sqrt3 / 2;
      bounds.set(x-rx, y-ry, x+rx, y+ry);
      break;

    case "triangle-up":
      rx = Math.sqrt(size / sqrt3);
      ry = rx * sqrt3 / 2;
      bounds.set(x-rx, y-ry, x+rx, y+ry);
      break;

    default:
      r = Math.sqrt(size/Math.PI);
      bounds.set(x-r, y-r, x+r, y+r);
  }
  if (o.stroke && o.opacity !== 0 && o.strokeWidth > 0) {
    bounds.expand(o.strokeWidth);
  }
  return bounds;
}

function text(o, bounds, noRotate) {
  var x = (o.x || 0) + (o.dx || 0),
      y = (o.y || 0) + (o.dy || 0),
      h = o.fontSize || config.render.fontSize,
      a = o.align,
      b = o.baseline,
      r = o.radius || 0,
      g = context(), w, t;

  g.font = fontString(o);
  g.textAlign = a || "left";
  g.textBaseline = b || "alphabetic";
  w = g.measureText(o.text || "").width;

  if (r) {
    t = (o.theta || 0) - Math.PI/2;
    x += r * Math.cos(t);
    y += r * Math.sin(t);
  }

  // horizontal
  if (a === "center") {
    x = x - (w / 2);
  } else if (a === "right") {
    x = x - w;
  } else {
    // left by default, do nothing
  }

  /// TODO find a robust solution for heights.
  /// These offsets work for some but not all fonts.

  // vertical
  if (b === "top") {
    y = y + (h/5);
  } else if (b === "bottom") {
    y = y - h;
  } else if (b === "middle") {
    y = y - (h/2) + (h/10);
  } else {
    y = y - 4*h/5; // alphabetic by default
  }
  
  bounds.set(x, y, x+w, y+h);
  if (o.angle && !noRotate) {
    bounds.rotate(o.angle*Math.PI/180, o.x||0, o.y||0);
  }
  return bounds.expand(noRotate ? 0 : 1);
}

function group(g, bounds, includeLegends) {
  var axes = g.axisItems || [],
      legends = g.legendItems || [], j, m;

  for (j=0, m=axes.length; j<m; ++j) {
    bounds.union(axes[j].bounds);
  }
  for (j=0, m=g.items.length; j<m; ++j) {
    bounds.union(g.items[j].bounds);
  }
  if (includeLegends) {
    for (j=0, m=legends.length; j<m; ++j) {
      bounds.union(legends[j].bounds);
    }
    if (g.width != null && g.height != null) {
      bounds.add(g.width, g.height);
    }
    if (g.x != null && g.y != null) {
      bounds.add(0, 0);
    }
  }
  bounds.translate(g.x||0, g.y||0);
  return bounds;
}

var methods = {
  group:  group,
  symbol: symbol,
  image:  image,
  rect:   rect,
  rule:   rule,
  arc:    arc,
  text:   text,
  path:   path,
  area:   area,
  line:   line
};

function itemBounds(item, func, opt) {
  func = func || methods[item.mark.marktype];
  if (!item.bounds_prev) item['bounds:prev'] = new Bounds();
  var b = item.bounds, pb = item['bounds:prev'];
  if (b) pb.clear().union(b);
  item.bounds = func(item, b ? b.clear() : new Bounds(), opt);
  if (!b) pb.clear().union(item.bounds);
  return item.bounds;
}

function markBounds(mark, bounds, opt) {
  bounds = bounds || mark.bounds && mark.bounds.clear() || new Bounds();
  var type  = mark.marktype,
      func  = methods[type],
      items = mark.items,
      item, i, len;
      
  if (type==="area" || type==="line") {
    if (items.length) {
      items[0].bounds = func(items[0], bounds);
    }
  } else {
    for (i=0, len=items.length; i<len; ++i) {
      bounds.union(itemBounds(items[i], func, opt));
    }
  }
  mark.bounds = bounds;
}

module.exports = {
  mark:  markBounds,
  item:  itemBounds,
  text:  text,
  group: group
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"../core/Bounds":26,"../render/canvas/path":60,"./config":91}],91:[function(require,module,exports){
(function (global){
var d3 = (typeof window !== "undefined" ? window.d3 : typeof global !== "undefined" ? global.d3 : null),
    config = {};

config.debug = false;

config.load = {
  // base url for loading external data files
  // used only for server-side operation
  baseURL: "",
  // Allows domain restriction when using data loading via XHR.
  // To enable, set it to a list of allowed domains
  // e.g., ['wikipedia.org', 'eff.org']
  domainWhiteList: false
};

// version and namepsaces for exported svg
config.svgNamespace =
  'version="1.1" xmlns="http://www.w3.org/2000/svg" ' +
  'xmlns:xlink="http://www.w3.org/1999/xlink"';

// inset padding for automatic padding calculation
config.autopadInset = 5;

// extensible scale lookup table
// all d3.scale.* instances also supported
config.scale = {
  time: d3.time.scale,
  utc:  d3.time.scale.utc
};

// default rendering settings
config.render = {
  lineWidth: 1,
  lineCap:   "butt",
  font:      "sans-serif",
  fontSize:  11
};

// default axis properties
config.axis = {
  orient: "bottom",
  ticks: 10,
  padding: 3,
  axisColor: "#000",
  gridColor: "#d8d8d8",
  tickColor: "#000",
  tickLabelColor: "#000",
  axisWidth: 1,
  tickWidth: 1,
  tickSize: 6,
  tickLabelFontSize: 11,
  tickLabelFont: "sans-serif",
  titleColor: "#000",
  titleFont: "sans-serif",
  titleFontSize: 11,
  titleFontWeight: "bold",
  titleOffset: 35
};

// default legend properties
config.legend = {
  orient: "right",
  offset: 10,
  padding: 3,
  gradientStrokeColor: "#888",
  gradientStrokeWidth: 1,
  gradientHeight: 16,
  gradientWidth: 100,
  labelColor: "#000",
  labelFontSize: 10,
  labelFont: "sans-serif",
  labelAlign: "left",
  labelBaseline: "middle",
  labelOffset: 8,
  symbolShape: "circle",
  symbolSize: 50,
  symbolColor: "#888",
  symbolStrokeWidth: 1,
  titleColor: "#000",
  titleFont: "sans-serif",
  titleFontSize: 11,
  titleFontWeight: "bold"
};

// default color values
config.color = {
  rgb: [128, 128, 128],
  lab: [50, 0, 0],
  hcl: [0, 0, 50],
  hsl: [0, 0, 0.5]
};

// default scale ranges
config.range = {
  category10: [
    "#1f77b4",
    "#ff7f0e",
    "#2ca02c",
    "#d62728",
    "#9467bd",
    "#8c564b",
    "#e377c2",
    "#7f7f7f",
    "#bcbd22",
    "#17becf"
  ],
  category20: [
    "#1f77b4",
    "#aec7e8",
    "#ff7f0e",
    "#ffbb78",
    "#2ca02c",
    "#98df8a",
    "#d62728",
    "#ff9896",
    "#9467bd",
    "#c5b0d5",
    "#8c564b",
    "#c49c94",
    "#e377c2",
    "#f7b6d2",
    "#7f7f7f",
    "#c7c7c7",
    "#bcbd22",
    "#dbdb8d",
    "#17becf",
    "#9edae5"
  ],
  shapes: [
    "circle",
    "cross",
    "diamond",
    "square",
    "triangle-down",
    "triangle-up"
  ]
};

module.exports = config;
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],92:[function(require,module,exports){
module.exports = {
  ADD_CELL: 1,
  MOD_CELL: 2,

  DATA: "data",
  FIELDS:  "fields",
  SCALES:  "scales",
  SIGNAL:  "signal",
  SIGNALS: "signals",

  GROUP: "group",

  ENTER: "enter",
  UPDATE: "update",
  EXIT: "exit",

  SENTINEL: {"sentinel": 1},
  SINGLETON: "_singleton",

  ADD: "add",
  REMOVE: "remove",
  TOGGLE: "toggle",
  CLEAR: "clear",

  LINEAR: "linear",
  ORDINAL: "ordinal",
  LOG: "log",
  POWER: "pow",
  TIME: "time",
  QUANTILE: "quantile",

  DOMAIN: "domain",
  RANGE: "range",

  MARK: "mark",
  AXIS: "axis",

  COUNT: "count",
  MIN: "min",
  MAX: "max",

  ASC: "asc",
  DESC: "desc"
};
},{}],93:[function(require,module,exports){
var config = require('./config');
var ts;

module.exports = function(input, args) {
  if (!config.debug) return;
  var log = Function.prototype.bind.call(console.log, console);
  args.unshift(input.stamp||-1);
  args.unshift(Date.now() - ts);
  if(input.add) args.push(input.add.length, input.mod.length, input.rem.length, !!input.reflow);
  log.apply(console, args);
  ts = Date.now();
};
},{"./config":91}],94:[function(require,module,exports){
var dl = require('datalib');

module.exports = function quickselect(k, x, c) {
  function swap(a, b) {
    var t = x[a];
    x[a] = x[b];
    x[b] = t;
  }

  // x may be null, in which case assemble an array from c (counts)
  if(x === null) {
    x = [];
    dl.keys(c).forEach(function(k) {
      var i = 0, len = c[k];
      k = +k || k;
      for(; i<len; ++i) x.push(k);
    });
  }
  
  var left = 0,
      right = x.length - 1,
      pos, i, pivot;
  
  while (left < right) {
    pivot = x[k];
    swap(k, right);
    for (i = pos = left; i < right; ++i) {
      if (x[i] < pivot) { swap(i, pos++); }
    }
    swap(right, pos);
    if (pos === k) break;
    if (pos < k) left = pos + 1;
    else right = pos - 1;
  }
  return x[k];
};
},{"datalib":16}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1yZXNvbHZlL2VtcHR5LmpzIiwibm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhbGliL3NyYy9iaW4uanMiLCJub2RlX21vZHVsZXMvZGF0YWxpYi9zcmMvZ2VuZXJhdGUuanMiLCJub2RlX21vZHVsZXMvZGF0YWxpYi9zcmMvaW1wb3J0L2Zvcm1hdHMvY3N2LmpzIiwibm9kZV9tb2R1bGVzL2RhdGFsaWIvc3JjL2ltcG9ydC9mb3JtYXRzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2RhdGFsaWIvc3JjL2ltcG9ydC9mb3JtYXRzL2pzb24uanMiLCJub2RlX21vZHVsZXMvZGF0YWxpYi9zcmMvaW1wb3J0L2Zvcm1hdHMvdG9wb2pzb24uanMiLCJub2RlX21vZHVsZXMvZGF0YWxpYi9zcmMvaW1wb3J0L2Zvcm1hdHMvdHJlZWpzb24uanMiLCJub2RlX21vZHVsZXMvZGF0YWxpYi9zcmMvaW1wb3J0L2Zvcm1hdHMvdHN2LmpzIiwibm9kZV9tb2R1bGVzL2RhdGFsaWIvc3JjL2ltcG9ydC9pbmZlci10eXBlcy5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhbGliL3NyYy9pbXBvcnQvbG9hZC5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhbGliL3NyYy9pbXBvcnQvbG9hZGVycy5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhbGliL3NyYy9pbXBvcnQvcmVhZC5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhbGliL3NyYy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhbGliL3NyYy9sb2cuanMiLCJub2RlX21vZHVsZXMvZGF0YWxpYi9zcmMvc3RhdHMuanMiLCJub2RlX21vZHVsZXMvZGF0YWxpYi9zcmMvc3VtbWFyeS5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhbGliL3NyYy90ZW1wbGF0ZS5qcyIsIm5vZGVfbW9kdWxlcy9kYXRhbGliL3NyYy90cmVlLmpzIiwibm9kZV9tb2R1bGVzL2RhdGFsaWIvc3JjL3RydW5jYXRlLmpzIiwibm9kZV9tb2R1bGVzL2RhdGFsaWIvc3JjL3V0aWwuanMiLCJub2RlX21vZHVsZXMvaGVhcC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9oZWFwL2xpYi9oZWFwLmpzIiwic3JjL2NvcmUvQm91bmRzLmpzIiwic3JjL2NvcmUvTW9kZWwuanMiLCJzcmMvY29yZS9WaWV3LmpzIiwic3JjL2RhdGFmbG93L0NvbGxlY3Rvci5qcyIsInNyYy9kYXRhZmxvdy9EYXRhc291cmNlLmpzIiwic3JjL2RhdGFmbG93L0dyYXBoLmpzIiwic3JjL2RhdGFmbG93L05vZGUuanMiLCJzcmMvZGF0YWZsb3cvU2lnbmFsLmpzIiwic3JjL2RhdGFmbG93L2NoYW5nZXNldC5qcyIsInNyYy9kYXRhZmxvdy90dXBsZS5qcyIsInNyYy9leHByZXNzaW9uL2NvZGVnZW4uanMiLCJzcmMvZXhwcmVzc2lvbi9jb25zdGFudHMuanMiLCJzcmMvZXhwcmVzc2lvbi9mdW5jdGlvbnMuanMiLCJzcmMvZXhwcmVzc2lvbi9pbmRleC5qcyIsInNyYy9leHByZXNzaW9uL3BhcnNlci5qcyIsInNyYy9wYXJzZS9heGVzLmpzIiwic3JjL3BhcnNlL2RhdGEuanMiLCJzcmMvcGFyc2UvZXZlbnRzLmpzIiwic3JjL3BhcnNlL2V4cHIuanMiLCJzcmMvcGFyc2UvaW50ZXJhY3RvcnMuanMiLCJzcmMvcGFyc2UvbWFyay5qcyIsInNyYy9wYXJzZS9tYXJrcy5qcyIsInNyYy9wYXJzZS9tb2RpZnkuanMiLCJzcmMvcGFyc2UvcGFkZGluZy5qcyIsInNyYy9wYXJzZS9wcmVkaWNhdGVzLmpzIiwic3JjL3BhcnNlL3Byb3BlcnRpZXMuanMiLCJzcmMvcGFyc2Uvc2lnbmFscy5qcyIsInNyYy9wYXJzZS9zcGVjLmpzIiwic3JjL3BhcnNlL3N0cmVhbXMuanMiLCJzcmMvcGFyc2UvdHJhbnNmb3Jtcy5qcyIsInNyYy9yZW5kZXIvY2FudmFzL0hhbmRsZXIuanMiLCJzcmMvcmVuZGVyL2NhbnZhcy9SZW5kZXJlci5qcyIsInNyYy9yZW5kZXIvY2FudmFzL2luZGV4LmpzIiwic3JjL3JlbmRlci9jYW52YXMvbWFya3MuanMiLCJzcmMvcmVuZGVyL2NhbnZhcy9wYXRoLmpzIiwic3JjL3JlbmRlci9zdmcvSGFuZGxlci5qcyIsInNyYy9yZW5kZXIvc3ZnL1JlbmRlcmVyLmpzIiwic3JjL3JlbmRlci9zdmcvbWFya3MuanMiLCJzcmMvc2NlbmUvQm91bmRlci5qcyIsInNyYy9zY2VuZS9CdWlsZGVyLmpzIiwic3JjL3NjZW5lL0VuY29kZXIuanMiLCJzcmMvc2NlbmUvR3JvdXBCdWlsZGVyLmpzIiwic3JjL3NjZW5lL0l0ZW0uanMiLCJzcmMvc2NlbmUvU2NhbGUuanMiLCJzcmMvc2NlbmUvVHJhbnNpdGlvbi5qcyIsInNyYy9zY2VuZS9heGlzLmpzIiwic3JjL3RyYW5zZm9ybXMvQWdncmVnYXRlLmpzIiwic3JjL3RyYW5zZm9ybXMvQmluLmpzIiwic3JjL3RyYW5zZm9ybXMvQ3Jvc3MuanMiLCJzcmMvdHJhbnNmb3Jtcy9GYWNldC5qcyIsInNyYy90cmFuc2Zvcm1zL0ZpbHRlci5qcyIsInNyYy90cmFuc2Zvcm1zL0ZvbGQuanMiLCJzcmMvdHJhbnNmb3Jtcy9Gb3JjZS5qcyIsInNyYy90cmFuc2Zvcm1zL0Zvcm11bGEuanMiLCJzcmMvdHJhbnNmb3Jtcy9Hcm91cEJ5LmpzIiwic3JjL3RyYW5zZm9ybXMvUGFyYW1ldGVyLmpzIiwic3JjL3RyYW5zZm9ybXMvU29ydC5qcyIsInNyYy90cmFuc2Zvcm1zL1N0YWNrLmpzIiwic3JjL3RyYW5zZm9ybXMvVHJhbnNmb3JtLmpzIiwic3JjL3RyYW5zZm9ybXMvVW5pcXVlLmpzIiwic3JjL3RyYW5zZm9ybXMvWmlwLmpzIiwic3JjL3RyYW5zZm9ybXMvaW5kZXguanMiLCJzcmMvdHJhbnNmb3Jtcy9tZWFzdXJlcy5qcyIsInNyYy91dGlsL2JvdW5kcy5qcyIsInNyYy91dGlsL2NvbmZpZy5qcyIsInNyYy91dGlsL2NvbnN0YW50cy5qcyIsInNyYy91dGlsL2RlYnVnLmpzIiwic3JjL3V0aWwvcXVpY2tzZWxlY3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN4REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ25OQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDajBFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdjZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQzNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdlBBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFOQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3JrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDanVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ25JQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzVTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Z0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDMUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUNqVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29yZToge1xuICAgIFZpZXc6IHJlcXVpcmUoJy4vY29yZS9WaWV3JylcbiAgfSxcbiAgZGF0YWZsb3c6IHtcbiAgICBjaGFuZ2VzZXQ6IHJlcXVpcmUoJy4vZGF0YWZsb3cvY2hhbmdlc2V0JyksXG4gICAgRGF0YXNvdXJjZTogcmVxdWlyZSgnLi9kYXRhZmxvdy9EYXRhc291cmNlJyksXG4gICAgR3JhcGg6IHJlcXVpcmUoJy4vZGF0YWZsb3cvR3JhcGgnKSxcbiAgICBOb2RlOiByZXF1aXJlKCcuL2RhdGFmbG93L05vZGUnKVxuICB9LFxuICBwYXJzZToge1xuICAgIHNwZWM6IHJlcXVpcmUoJy4vcGFyc2Uvc3BlYycpXG4gIH0sXG4gIHNjZW5lOiB7XG4gICAgQnVpbGRlcjogcmVxdWlyZSgnLi9zY2VuZS9CdWlsZGVyJyksXG4gICAgR3JvdXBCdWlsZGVyOiByZXF1aXJlKCcuL3NjZW5lL0dyb3VwQnVpbGRlcicpXG4gIH0sXG4gIHRyYW5zZm9ybXM6IHJlcXVpcmUoJy4vdHJhbnNmb3Jtcy9pbmRleCcpLFxuICBjb25maWc6IHJlcXVpcmUoJy4vdXRpbC9jb25maWcnKSxcbiAgdXRpbDogcmVxdWlyZSgnZGF0YWxpYicpXG59OyIsbnVsbCwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob3B0KSB7XG4gIG9wdCA9IG9wdCB8fCB7fTtcblxuICAvLyBkZXRlcm1pbmUgcmFuZ2VcbiAgdmFyIG1heGIgPSBvcHQubWF4YmlucyB8fCAxMDI0LFxuICAgICAgYmFzZSA9IG9wdC5iYXNlIHx8IDEwLFxuICAgICAgZGl2ID0gb3B0LmRpdiB8fCBbNSwgMl0sXG4gICAgICBtaW5zID0gb3B0Lm1pbnN0ZXAgfHwgMCxcbiAgICAgIGxvZ2IgPSBNYXRoLmxvZyhiYXNlKSxcbiAgICAgIGxldmVsID0gTWF0aC5jZWlsKE1hdGgubG9nKG1heGIpIC8gbG9nYiksXG4gICAgICBtaW4gPSBvcHQubWluLFxuICAgICAgbWF4ID0gb3B0Lm1heCxcbiAgICAgIHNwYW4gPSBtYXggLSBtaW4sXG4gICAgICBzdGVwID0gTWF0aC5tYXgobWlucywgTWF0aC5wb3coYmFzZSwgTWF0aC5yb3VuZChNYXRoLmxvZyhzcGFuKSAvIGxvZ2IpIC0gbGV2ZWwpKSxcbiAgICAgIG5iaW5zID0gTWF0aC5jZWlsKHNwYW4gLyBzdGVwKSxcbiAgICAgIHByZWNpc2lvbiwgdiwgaSwgZXBzO1xuXG4gIGlmIChvcHQuc3RlcCAhPSBudWxsKSB7XG4gICAgc3RlcCA9IG9wdC5zdGVwO1xuICB9IGVsc2UgaWYgKG9wdC5zdGVwcykge1xuICAgIC8vIGlmIHByb3ZpZGVkLCBsaW1pdCBjaG9pY2UgdG8gYWNjZXB0YWJsZSBzdGVwIHNpemVzXG4gICAgc3RlcCA9IG9wdC5zdGVwc1tNYXRoLm1pbihcbiAgICAgICAgb3B0LnN0ZXBzLmxlbmd0aCAtIDEsXG4gICAgICAgIGJpc2VjdExlZnQob3B0LnN0ZXBzLCBzcGFuIC8gbWF4YiwgMCwgb3B0LnN0ZXBzLmxlbmd0aClcbiAgICApXTtcbiAgfSBlbHNlIHtcbiAgICAvLyBpbmNyZWFzZSBzdGVwIHNpemUgaWYgdG9vIG1hbnkgYmluc1xuICAgIGRvIHtcbiAgICAgIHN0ZXAgKj0gYmFzZTtcbiAgICAgIG5iaW5zID0gTWF0aC5jZWlsKHNwYW4gLyBzdGVwKTtcbiAgICB9IHdoaWxlIChuYmlucyA+IG1heGIpO1xuXG4gICAgLy8gZGVjcmVhc2Ugc3RlcCBzaXplIGlmIGFsbG93ZWRcbiAgICBmb3IgKGkgPSAwOyBpIDwgZGl2Lmxlbmd0aDsgKytpKSB7XG4gICAgICB2ID0gc3RlcCAvIGRpdltpXTtcbiAgICAgIGlmICh2ID49IG1pbnMgJiYgc3BhbiAvIHYgPD0gbWF4Yikge1xuICAgICAgICBzdGVwID0gdjtcbiAgICAgICAgbmJpbnMgPSBNYXRoLmNlaWwoc3BhbiAvIHN0ZXApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIHVwZGF0ZSBwcmVjaXNpb24sIG1pbiBhbmQgbWF4XG4gIHYgPSBNYXRoLmxvZyhzdGVwKTtcbiAgcHJlY2lzaW9uID0gdiA+PSAwID8gMCA6IH5+KC12IC8gbG9nYikgKyAxO1xuICBlcHMgPSAobWluPDAgPyAtMSA6IDEpICogTWF0aC5wb3coYmFzZSwgLXByZWNpc2lvbiAtIDEpO1xuICBtaW4gPSBNYXRoLm1pbihtaW4sIE1hdGguZmxvb3IobWluIC8gc3RlcCArIGVwcykgKiBzdGVwKTtcbiAgbWF4ID0gTWF0aC5jZWlsKG1heCAvIHN0ZXApICogc3RlcDtcblxuICByZXR1cm4ge1xuICAgIHN0YXJ0OiBtaW4sXG4gICAgc3RvcDogbWF4LFxuICAgIHN0ZXA6IHN0ZXAsXG4gICAgdW5pdDogcHJlY2lzaW9uXG4gIH07XG59O1xuXG5mdW5jdGlvbiBiaXNlY3RMZWZ0KGEsIHgsIGxvLCBoaSkge1xuICB3aGlsZSAobG8gPCBoaSkge1xuICAgIHZhciBtaWQgPSBsbyArIGhpID4+PiAxO1xuICAgIGlmICh1LmNtcChhW21pZF0sIHgpIDwgMCkgeyBsbyA9IG1pZCArIDE7IH1cbiAgICBlbHNlIHsgaGkgPSBtaWQ7IH1cbiAgfVxuICByZXR1cm4gbG87XG59IiwidmFyIGdlbiA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbmdlbi5yZXBlYXQgPSBmdW5jdGlvbih2YWwsIG4pIHtcbiAgdmFyIGEgPSBBcnJheShuKSwgaTtcbiAgZm9yIChpPTA7IGk8bjsgKytpKSBhW2ldID0gdmFsO1xuICByZXR1cm4gYTtcbn07XG5cbmdlbi56ZXJvZXMgPSBmdW5jdGlvbihuKSB7XG4gIHJldHVybiBnZW4ucmVwZWF0KDAsIG4pO1xufTtcblxuZ2VuLnJhbmdlID0gZnVuY3Rpb24oc3RhcnQsIHN0b3AsIHN0ZXApIHtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAzKSB7XG4gICAgc3RlcCA9IDE7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyKSB7XG4gICAgICBzdG9wID0gc3RhcnQ7XG4gICAgICBzdGFydCA9IDA7XG4gICAgfVxuICB9XG4gIGlmICgoc3RvcCAtIHN0YXJ0KSAvIHN0ZXAgPT0gSW5maW5pdHkpIHRocm93IG5ldyBFcnJvcignSW5maW5pdGUgcmFuZ2UnKTtcbiAgdmFyIHJhbmdlID0gW10sIGkgPSAtMSwgajtcbiAgaWYgKHN0ZXAgPCAwKSB3aGlsZSAoKGogPSBzdGFydCArIHN0ZXAgKiArK2kpID4gc3RvcCkgcmFuZ2UucHVzaChqKTtcbiAgZWxzZSB3aGlsZSAoKGogPSBzdGFydCArIHN0ZXAgKiArK2kpIDwgc3RvcCkgcmFuZ2UucHVzaChqKTtcbiAgcmV0dXJuIHJhbmdlO1xufTtcblxuZ2VuLnJhbmRvbSA9IHt9O1xuXG5nZW4ucmFuZG9tLnVuaWZvcm0gPSBmdW5jdGlvbihtaW4sIG1heCkge1xuXHRtaW4gPSBtaW4gfHwgMDtcblx0bWF4ID0gbWF4IHx8IDE7XG5cdHZhciBkZWx0YSA9IG1heCAtIG1pbjtcblx0dmFyIGYgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gbWluICsgZGVsdGEgKiBNYXRoLnJhbmRvbSgpO1xuXHR9O1xuXHRmLnNhbXBsZXMgPSBmdW5jdGlvbihuKSB7IHJldHVybiBnZW4uemVyb2VzKG4pLm1hcChmKTsgfTtcblx0cmV0dXJuIGY7XG59O1xuXG5nZW4ucmFuZG9tLmludGVnZXIgPSBmdW5jdGlvbihhLCBiKSB7XG5cdGlmIChiID09PSB1bmRlZmluZWQpIHtcblx0XHRiID0gYTtcblx0XHRhID0gMDtcblx0fVxuXHR2YXIgZiA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiBhICsgTWF0aC5tYXgoMCwgTWF0aC5mbG9vcihiKihNYXRoLnJhbmRvbSgpLTAuMDAxKSkpO1xuXHR9O1xuXHRmLnNhbXBsZXMgPSBmdW5jdGlvbihuKSB7IHJldHVybiBnZW4uemVyb2VzKG4pLm1hcChmKTsgfTtcblx0cmV0dXJuIGY7XG59O1xuXG5nZW4ucmFuZG9tLm5vcm1hbCA9IGZ1bmN0aW9uKG1lYW4sIHN0ZGV2KSB7XG5cdG1lYW4gPSBtZWFuIHx8IDA7XG5cdHN0ZGV2ID0gc3RkZXYgfHwgMTtcblx0dmFyIG5leHQgPSB1bmRlZmluZWQ7XG5cdHZhciBmID0gZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHggPSAwLCB5ID0gMCwgcmRzLCBjO1xuXHRcdGlmIChuZXh0ICE9PSB1bmRlZmluZWQpIHtcblx0XHRcdHggPSBuZXh0O1xuXHRcdFx0bmV4dCA9IHVuZGVmaW5lZDtcblx0XHRcdHJldHVybiB4O1xuXHRcdH1cblx0XHRkbyB7XG5cdFx0XHR4ID0gTWF0aC5yYW5kb20oKSoyLTE7XG5cdFx0XHR5ID0gTWF0aC5yYW5kb20oKSoyLTE7XG5cdFx0XHRyZHMgPSB4KnggKyB5Knk7XG5cdFx0fSB3aGlsZSAocmRzID09IDAgfHwgcmRzID4gMSk7XG5cdFx0YyA9IE1hdGguc3FydCgtMipNYXRoLmxvZyhyZHMpL3Jkcyk7IC8vIEJveC1NdWxsZXIgdHJhbnNmb3JtXG5cdFx0bmV4dCA9IG1lYW4gKyB5KmMqc3RkZXY7XG5cdFx0cmV0dXJuIG1lYW4gKyB4KmMqc3RkZXY7XG5cdH07XG5cdGYuc2FtcGxlcyA9IGZ1bmN0aW9uKG4pIHsgcmV0dXJuIGdlbi56ZXJvZXMobikubWFwKGYpOyB9O1xuXHRyZXR1cm4gZjtcbn07IiwidmFyIGQzID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuZDMgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmQzIDogbnVsbCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGF0YSwgZm9ybWF0KSB7XG4gIHZhciBkID0gZDMuY3N2LnBhcnNlKGRhdGEgPyBkYXRhLnRvU3RyaW5nKCkgOiBkYXRhKTtcbiAgcmV0dXJuIGQ7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gIGpzb246IHJlcXVpcmUoJy4vanNvbicpLFxuICBjc3Y6IHJlcXVpcmUoJy4vY3N2JyksXG4gIHRzdjogcmVxdWlyZSgnLi90c3YnKSxcbiAgdG9wb2pzb246IHJlcXVpcmUoJy4vdG9wb2pzb24nKSxcbiAgdHJlZWpzb246IHJlcXVpcmUoJy4vdHJlZWpzb24nKVxufTsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4uLy4uL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihkYXRhLCBmb3JtYXQpIHtcbiAgdmFyIGQgPSB1dGlsLmlzT2JqZWN0KGRhdGEpID8gZGF0YSA6IEpTT04ucGFyc2UoZGF0YSk7XG4gIGlmIChmb3JtYXQgJiYgZm9ybWF0LnByb3BlcnR5KSB7XG4gICAgZCA9IHV0aWwuYWNjZXNzb3IoZm9ybWF0LnByb3BlcnR5KShkKTtcbiAgfVxuICByZXR1cm4gZDtcbn07XG4iLCJ2YXIganNvbiA9IHJlcXVpcmUoJy4vanNvbicpO1xudmFyIHRvcG9qc29uID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cudG9wb2pzb24gOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLnRvcG9qc29uIDogbnVsbCk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oZGF0YSwgZm9ybWF0KSB7XG4gIGlmICh0b3BvanNvbiA9PSBudWxsKSB7IHRocm93IEVycm9yKFwiVG9wb0pTT04gbGlicmFyeSBub3QgbG9hZGVkLlwiKTsgfVxuXG4gIHZhciB0ID0ganNvbihkYXRhLCBmb3JtYXQpLCBvYmo7XG5cbiAgaWYgKGZvcm1hdCAmJiBmb3JtYXQuZmVhdHVyZSkge1xuICAgIGlmIChvYmogPSB0Lm9iamVjdHNbZm9ybWF0LmZlYXR1cmVdKSB7XG4gICAgICByZXR1cm4gdG9wb2pzb24uZmVhdHVyZSh0LCBvYmopLmZlYXR1cmVzXG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKFwiSW52YWxpZCBUb3BvSlNPTiBvYmplY3Q6IFwiK2Zvcm1hdC5mZWF0dXJlKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoZm9ybWF0ICYmIGZvcm1hdC5tZXNoKSB7XG4gICAgaWYgKG9iaiA9IHQub2JqZWN0c1tmb3JtYXQubWVzaF0pIHtcbiAgICAgIHJldHVybiBbdG9wb2pzb24ubWVzaCh0LCB0Lm9iamVjdHNbZm9ybWF0Lm1lc2hdKV07XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKFwiSW52YWxpZCBUb3BvSlNPTiBvYmplY3Q6IFwiICsgZm9ybWF0Lm1lc2gpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBFcnJvcihcIk1pc3NpbmcgVG9wb0pTT04gZmVhdHVyZSBvciBtZXNoIHBhcmFtZXRlci5cIik7XG4gIH1cblxuICByZXR1cm4gW107XG59O1xuIiwidmFyIHRyZWUgPSByZXF1aXJlKCcuLi8uLi90cmVlJyk7XG52YXIganNvbiA9IHJlcXVpcmUoJy4vanNvbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRhdGEsIGZvcm1hdCkge1xuICBkYXRhID0ganNvbihkYXRhLCBmb3JtYXQpO1xuICByZXR1cm4gdHJlZS50b1RhYmxlKGRhdGEsIChmb3JtYXQgJiYgZm9ybWF0LmNoaWxkcmVuKSk7XG59OyIsInZhciBkMyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmQzIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5kMyA6IG51bGwpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRhdGEsIGZvcm1hdCkge1xuICB2YXIgZCA9IGQzLnRzdi5wYXJzZShkYXRhID8gZGF0YS50b1N0cmluZygpIDogZGF0YSk7XG4gIHJldHVybiBkO1xufTtcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi4vdXRpbCcpO1xuXG52YXIgdGVzdHMgPSB7XG4gIGJvb2w6IGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHg9PT1cInRydWVcIiB8fCB4PT09XCJmYWxzZVwiIHx8IHV0aWwuaXNCb29sZWFuKHgpOyB9LFxuICBkYXRlOiBmdW5jdGlvbih4KSB7IHJldHVybiAhaXNOYU4oRGF0ZS5wYXJzZSh4KSk7IH0sXG4gIG51bTogZnVuY3Rpb24oeCkgeyByZXR1cm4gIWlzTmFOKCt4KSAmJiAhdXRpbC5pc0RhdGUoeCk7IH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIHZhciBpLCBqLCB2O1xuICBcbiAgLy8gdHlwZXMgdG8gdGVzdCBmb3JcbiAgdmFyIHR5cGVzID0gW1xuICAgIHt0eXBlOiBcImJvb2xlYW5cIiwgdGVzdDogdGVzdHMuYm9vbH0sXG4gICAge3R5cGU6IFwibnVtYmVyXCIsIHRlc3Q6IHRlc3RzLm51bX0sXG4gICAge3R5cGU6IFwiZGF0ZVwiLCB0ZXN0OiB0ZXN0cy5kYXRlfVxuICBdO1xuICBcbiAgZm9yIChpPTA7IGk8dmFsdWVzLmxlbmd0aDsgKytpKSB7XG4gICAgLy8gZ2V0IG5leHQgdmFsdWUgdG8gdGVzdFxuICAgIHYgPSBmID8gZih2YWx1ZXNbaV0pIDogdmFsdWVzW2ldO1xuICAgIC8vIHRlc3QgdmFsdWUgYWdhaW5zdCByZW1haW5pbmcgdHlwZXNcbiAgICBmb3IgKGo9MDsgajx0eXBlcy5sZW5ndGg7ICsraikge1xuICAgICAgaWYgKHYgIT0gbnVsbCAmJiAhdHlwZXNbal0udGVzdCh2KSkge1xuICAgICAgICB0eXBlcy5zcGxpY2UoaiwgMSk7XG4gICAgICAgIGogLT0gMTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gaWYgbm8gdHlwZXMgbGVmdCwgcmV0dXJuICdzdHJpbmcnXG4gICAgaWYgKHR5cGVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFwic3RyaW5nXCI7XG4gIH1cbiAgXG4gIHJldHVybiB0eXBlc1swXS50eXBlO1xufTsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4uL3V0aWwnKTtcblxuLy8gTWF0Y2hlcyBhYnNvbHV0ZSBVUkxzIHdpdGggb3B0aW9uYWwgcHJvdG9jb2xcbi8vICAgaHR0cHM6Ly8uLi4gICAgZmlsZTovLy4uLiAgICAvLy4uLlxudmFyIHByb3RvY29sX3JlID0gL14oW0EtWmEtel0rOik/XFwvXFwvLztcblxuLy8gU3BlY2lhbCB0cmVhdG1lbnQgaW4gbm9kZS5qcyBmb3IgdGhlIGZpbGU6IHByb3RvY29sXG52YXIgZmlsZVByb3RvY29sID0gJ2ZpbGU6Ly8nO1xuXG4vLyBWYWxpZGF0ZSBhbmQgY2xlYW51cCBVUkwgdG8gZW5zdXJlIHRoYXQgaXQgaXMgYWxsb3dlZCB0byBiZSBhY2Nlc3NlZFxuLy8gUmV0dXJucyBjbGVhbmVkIHVwIFVSTCwgb3IgZmFsc2UgaWYgYWNjZXNzIGlzIG5vdCBhbGxvd2VkXG5mdW5jdGlvbiBzYW5pdGl6ZVVybChvcHQpIHtcbiAgdmFyIHVybCA9IG9wdC51cmw7XG4gIGlmICghdXJsICYmIG9wdC5maWxlKSB7IHJldHVybiBmaWxlUHJvdG9jb2wgKyBvcHQuZmlsZTsgfVxuXG4gIC8vIEluIGNhc2UgdGhpcyBpcyBhIHJlbGF0aXZlIHVybCAoaGFzIG5vIGhvc3QpLCBwcmVwZW5kIG9wdC5iYXNlVVJMXG4gIGlmIChvcHQuYmFzZVVSTCAmJiAhcHJvdG9jb2xfcmUudGVzdCh1cmwpKSB7XG4gICAgaWYgKCF1dGlsLnN0YXJ0c1dpdGgodXJsLCAnLycpICYmIG9wdC5iYXNlVVJMW29wdC5iYXNlVVJMLmxlbmd0aC0xXSAhPT0gJy8nKSB7XG4gICAgICB1cmwgPSAnLycgKyB1cmw7IC8vIEVuc3VyZSB0aGF0IHRoZXJlIGlzIGEgc2xhc2ggYmV0d2VlbiB0aGUgYmFzZVVSTCAoZS5nLiBob3N0bmFtZSkgYW5kIHVybFxuICAgIH1cbiAgICB1cmwgPSBvcHQuYmFzZVVSTCArIHVybDtcbiAgfVxuICAvLyByZWxhdGl2ZSBwcm90b2NvbCwgc3RhcnRzIHdpdGggJy8vJ1xuICBpZiAodXRpbC5pc05vZGUgJiYgdXRpbC5zdGFydHNXaXRoKHVybCwgJy8vJykpIHtcbiAgICB1cmwgPSAob3B0LmRlZmF1bHRQcm90b2NvbCB8fCAnaHR0cCcpICsgJzonICsgdXJsO1xuICB9XG4gIC8vIElmIG9wdC5kb21haW5XaGl0ZUxpc3QgaXMgc2V0LCBvbmx5IGFsbG93cyB1cmwsIHdob3NlIGhvc3RuYW1lXG4gIC8vICogSXMgdGhlIHNhbWUgYXMgdGhlIG9yaWdpbiAod2luZG93LmxvY2F0aW9uLmhvc3RuYW1lKVxuICAvLyAqIEVxdWFscyBvbmUgb2YgdGhlIHZhbHVlcyBpbiB0aGUgd2hpdGVsaXN0XG4gIC8vICogSXMgYSBwcm9wZXIgc3ViZG9tYWluIG9mIG9uZSBvZiB0aGUgdmFsdWVzIGluIHRoZSB3aGl0ZWxpc3RcbiAgaWYgKG9wdC5kb21haW5XaGl0ZUxpc3QpIHtcbiAgICB2YXIgZG9tYWluLCBvcmlnaW47XG4gICAgaWYgKHV0aWwuaXNOb2RlKSB7XG4gICAgICAvLyByZWxhdGl2ZSBwcm90b2NvbCBpcyBicm9rZW46IGh0dHBzOi8vZ2l0aHViLmNvbS9kZWZ1bmN0em9tYmllL25vZGUtdXJsL2lzc3Vlcy81XG4gICAgICB2YXIgcGFydHMgPSByZXF1aXJlKCd1cmwnKS5wYXJzZSh1cmwpO1xuICAgICAgZG9tYWluID0gcGFydHMuaG9zdG5hbWU7XG4gICAgICBvcmlnaW4gPSBudWxsO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgIGEuaHJlZiA9IHVybDtcbiAgICAgIC8vIEZyb20gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy83MzY1MTMvaG93LWRvLWktcGFyc2UtYS11cmwtaW50by1ob3N0bmFtZS1hbmQtcGF0aC1pbi1qYXZhc2NyaXB0XG4gICAgICAvLyBJRSBkb2Vzbid0IHBvcHVsYXRlIGFsbCBsaW5rIHByb3BlcnRpZXMgd2hlbiBzZXR0aW5nIC5ocmVmIHdpdGggYSByZWxhdGl2ZSBVUkwsXG4gICAgICAvLyBob3dldmVyIC5ocmVmIHdpbGwgcmV0dXJuIGFuIGFic29sdXRlIFVSTCB3aGljaCB0aGVuIGNhbiBiZSB1c2VkIG9uIGl0c2VsZlxuICAgICAgLy8gdG8gcG9wdWxhdGUgdGhlc2UgYWRkaXRpb25hbCBmaWVsZHMuXG4gICAgICBpZiAoYS5ob3N0ID09IFwiXCIpIHtcbiAgICAgICAgYS5ocmVmID0gYS5ocmVmO1xuICAgICAgfVxuICAgICAgZG9tYWluID0gYS5ob3N0bmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgICAgb3JpZ2luID0gd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lO1xuICAgIH1cblxuICAgIGlmIChvcmlnaW4gIT09IGRvbWFpbikge1xuICAgICAgdmFyIHdoaXRlTGlzdGVkID0gb3B0LmRvbWFpbldoaXRlTGlzdC5zb21lKGZ1bmN0aW9uIChkKSB7XG4gICAgICAgIHZhciBpZHggPSBkb21haW4ubGVuZ3RoIC0gZC5sZW5ndGg7XG4gICAgICAgIHJldHVybiBkID09PSBkb21haW4gfHxcbiAgICAgICAgICAoaWR4ID4gMSAmJiBkb21haW5baWR4LTFdID09PSAnLicgJiYgZG9tYWluLmxhc3RJbmRleE9mKGQpID09PSBpZHgpO1xuICAgICAgfSk7XG4gICAgICBpZiAoIXdoaXRlTGlzdGVkKSB7XG4gICAgICAgIHRocm93ICdVUkwgaXMgbm90IHdoaXRlbGlzdGVkOiAnICsgdXJsO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdXJsO1xufVxuXG5mdW5jdGlvbiBsb2FkKG9wdCwgY2FsbGJhY2spIHtcbiAgdmFyIGVycm9yID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24oZSkgeyB0aHJvdyBlOyB9O1xuICBcbiAgdHJ5IHtcbiAgICB2YXIgdXJsID0gbG9hZC5zYW5pdGl6ZVVybChvcHQpOyAvLyBlbmFibGUgb3ZlcnJpZGVcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgZXJyb3IoZXJyKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoIXVybCkge1xuICAgIGVycm9yKCdJbnZhbGlkIFVSTDogJyArIHVybCk7XG4gIH0gZWxzZSBpZiAoIXV0aWwuaXNOb2RlKSB7XG4gICAgLy8gaW4gYnJvd3NlciwgdXNlIHhoclxuICAgIHJldHVybiB4aHIodXJsLCBjYWxsYmFjayk7XG4gIH0gZWxzZSBpZiAodXRpbC5zdGFydHNXaXRoKHVybCwgZmlsZVByb3RvY29sKSkge1xuICAgIC8vIGluIG5vZGUuanMsIGlmIHVybCBzdGFydHMgd2l0aCAnZmlsZTovLycsIHN0cmlwIGl0IGFuZCBsb2FkIGZyb20gZmlsZVxuICAgIHJldHVybiBmaWxlKHVybC5zbGljZShmaWxlUHJvdG9jb2wubGVuZ3RoKSwgY2FsbGJhY2spO1xuICB9IGVsc2Uge1xuICAgIC8vIGZvciByZWd1bGFyIFVSTHMgaW4gbm9kZS5qc1xuICAgIHJldHVybiBodHRwKHVybCwgY2FsbGJhY2spO1xuICB9XG59XG5cbmZ1bmN0aW9uIHhockhhc1Jlc3BvbnNlKHJlcXVlc3QpIHtcbiAgdmFyIHR5cGUgPSByZXF1ZXN0LnJlc3BvbnNlVHlwZTtcbiAgcmV0dXJuIHR5cGUgJiYgdHlwZSAhPT0gXCJ0ZXh0XCJcbiAgICAgID8gcmVxdWVzdC5yZXNwb25zZSAvLyBudWxsIG9uIGVycm9yXG4gICAgICA6IHJlcXVlc3QucmVzcG9uc2VUZXh0OyAvLyBcIlwiIG9uIGVycm9yXG59XG5cbmZ1bmN0aW9uIHhocih1cmwsIGNhbGxiYWNrKSB7XG4gIHZhciBhc3luYyA9ICEhY2FsbGJhY2s7XG4gIHZhciByZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0O1xuICAvLyBJZiBJRSBkb2VzIG5vdCBzdXBwb3J0IENPUlMsIHVzZSBYRG9tYWluUmVxdWVzdCAoY29waWVkIGZyb20gZDMueGhyKVxuICBpZiAodGhpcy5YRG9tYWluUmVxdWVzdFxuICAgICAgJiYgIShcIndpdGhDcmVkZW50aWFsc1wiIGluIHJlcXVlc3QpXG4gICAgICAmJiAvXihodHRwKHMpPzopP1xcL1xcLy8udGVzdCh1cmwpKSByZXF1ZXN0ID0gbmV3IFhEb21haW5SZXF1ZXN0O1xuXG4gIGZ1bmN0aW9uIHJlc3BvbmQoKSB7XG4gICAgdmFyIHN0YXR1cyA9IHJlcXVlc3Quc3RhdHVzO1xuICAgIGlmICghc3RhdHVzICYmIHhockhhc1Jlc3BvbnNlKHJlcXVlc3QpIHx8IHN0YXR1cyA+PSAyMDAgJiYgc3RhdHVzIDwgMzAwIHx8IHN0YXR1cyA9PT0gMzA0KSB7XG4gICAgICBjYWxsYmFjayhudWxsLCByZXF1ZXN0LnJlc3BvbnNlVGV4dCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNhbGxiYWNrKHJlcXVlc3QsIG51bGwpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChhc3luYykge1xuICAgIFwib25sb2FkXCIgaW4gcmVxdWVzdFxuICAgICAgPyByZXF1ZXN0Lm9ubG9hZCA9IHJlcXVlc3Qub25lcnJvciA9IHJlc3BvbmRcbiAgICAgIDogcmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbigpIHsgcmVxdWVzdC5yZWFkeVN0YXRlID4gMyAmJiByZXNwb25kKCk7IH07XG4gIH1cbiAgXG4gIHJlcXVlc3Qub3BlbihcIkdFVFwiLCB1cmwsIGFzeW5jKTtcbiAgcmVxdWVzdC5zZW5kKCk7XG4gIFxuICBpZiAoIWFzeW5jICYmIHhockhhc1Jlc3BvbnNlKHJlcXVlc3QpKSB7XG4gICAgcmV0dXJuIHJlcXVlc3QucmVzcG9uc2VUZXh0O1xuICB9XG59XG5cbmZ1bmN0aW9uIGZpbGUoZmlsZSwgY2FsbGJhY2spIHtcbiAgdmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcbiAgaWYgKCFjYWxsYmFjaykge1xuICAgIHJldHVybiBmcy5yZWFkRmlsZVN5bmMoZmlsZSwgJ3V0ZjgnKTtcbiAgfVxuICByZXF1aXJlKCdmcycpLnJlYWRGaWxlKGZpbGUsIGNhbGxiYWNrKTtcbn1cblxuZnVuY3Rpb24gaHR0cCh1cmwsIGNhbGxiYWNrKSB7XG4gIGlmICghY2FsbGJhY2spIHtcbiAgICByZXR1cm4gcmVxdWlyZSgnc3luYy1yZXF1ZXN0JykoJ0dFVCcsIHVybCkuZ2V0Qm9keSgpO1xuICB9XG4gIHJlcXVpcmUoJ3JlcXVlc3QnKSh1cmwsIGZ1bmN0aW9uKGVycm9yLCByZXNwb25zZSwgYm9keSkge1xuICAgIGlmICghZXJyb3IgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMjAwKSB7XG4gICAgICBjYWxsYmFjayhudWxsLCBib2R5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY2FsbGJhY2soZXJyb3IsIG51bGwpO1xuICAgIH1cbiAgfSk7XG59XG5cbmxvYWQuc2FuaXRpemVVcmwgPSBzYW5pdGl6ZVVybDtcblxubW9kdWxlLmV4cG9ydHMgPSBsb2FkO1xuIiwidmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG52YXIgbG9hZCA9IHJlcXVpcmUoJy4vbG9hZCcpO1xudmFyIHJlYWQgPSByZXF1aXJlKCcuL3JlYWQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlsXG4gIC5rZXlzKHJlYWQuZm9ybWF0cylcbiAgLnJlZHVjZShmdW5jdGlvbihvdXQsIHR5cGUpIHtcbiAgICBvdXRbdHlwZV0gPSBmdW5jdGlvbihvcHQsIGZvcm1hdCwgY2FsbGJhY2spIHtcbiAgICAgIC8vIHByb2Nlc3MgYXJndW1lbnRzXG4gICAgICBpZiAodXRpbC5pc1N0cmluZyhvcHQpKSBvcHQgPSB7dXJsOiBvcHR9O1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgdXRpbC5pc0Z1bmN0aW9uKGZvcm1hdCkpIHtcbiAgICAgICAgY2FsbGJhY2sgPSBmb3JtYXQ7XG4gICAgICAgIGZvcm1hdCA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgLy8gc2V0IHVwIHJlYWQgZm9ybWF0XG4gICAgICBmb3JtYXQgPSB1dGlsLmV4dGVuZCh7cGFyc2U6ICdhdXRvJ30sIGZvcm1hdCk7XG4gICAgICBmb3JtYXQudHlwZSA9IHR5cGU7XG5cbiAgICAgIC8vIGxvYWQgZGF0YVxuICAgICAgdmFyIGRhdGEgPSBsb2FkKG9wdCwgY2FsbGJhY2sgPyBmdW5jdGlvbihlcnJvciwgZGF0YSkge1xuICAgICAgICBpZiAoZXJyb3IpIGNhbGxiYWNrKGVycm9yLCBudWxsKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBkYXRhIGxvYWRlZCwgbm93IHBhcnNlIGl0IChhc3luYylcbiAgICAgICAgICBkYXRhID0gcmVhZChkYXRhLCBmb3JtYXQpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgY2FsbGJhY2soZSwgbnVsbCk7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2sobnVsbCwgZGF0YSk7XG4gICAgICB9IDogdW5kZWZpbmVkKTtcbiAgICAgIFxuICAgICAgLy8gZGF0YSBsb2FkZWQsIG5vdyBwYXJzZSBpdCAoc3luYylcbiAgICAgIGlmIChkYXRhKSByZXR1cm4gcmVhZChkYXRhLCBmb3JtYXQpO1xuICAgIH07XG4gICAgcmV0dXJuIG91dDtcbiAgfSwge30pO1xuIiwidmFyIHV0aWwgPSByZXF1aXJlKCcuLi91dGlsJyk7XG52YXIgZm9ybWF0cyA9IHJlcXVpcmUoJy4vZm9ybWF0cycpO1xudmFyIGluZmVyID0gcmVxdWlyZSgnLi9pbmZlci10eXBlcycpO1xuXG52YXIgUEFSU0VSUyA9IHtcbiAgXCJudW1iZXJcIjogdXRpbC5udW1iZXIsXG4gIFwiYm9vbGVhblwiOiB1dGlsLmJvb2xlYW4sXG4gIFwiZGF0ZVwiOiB1dGlsLmRhdGVcbn07XG5cbmZ1bmN0aW9uIHJlYWQoZGF0YSwgZm9ybWF0KSB7XG4gIHZhciB0eXBlID0gKGZvcm1hdCAmJiBmb3JtYXQudHlwZSkgfHwgXCJqc29uXCI7XG4gIGRhdGEgPSBmb3JtYXRzW3R5cGVdKGRhdGEsIGZvcm1hdCk7XG4gIGlmIChmb3JtYXQgJiYgZm9ybWF0LnBhcnNlKSBwYXJzZShkYXRhLCBmb3JtYXQucGFyc2UpO1xuICByZXR1cm4gZGF0YTtcbn1cblxuZnVuY3Rpb24gcGFyc2UoZGF0YSwgdHlwZXMpIHtcbiAgdmFyIGNvbHMsIHBhcnNlcnMsIGQsIGksIGosIGNsZW4sIGxlbiA9IGRhdGEubGVuZ3RoO1xuXG4gIGlmICh0eXBlcyA9PT0gJ2F1dG8nKSB7XG4gICAgLy8gcGVyZm9ybSB0eXBlIGluZmVyZW5jZVxuICAgIHR5cGVzID0gdXRpbC5rZXlzKGRhdGFbMF0pLnJlZHVjZShmdW5jdGlvbih0eXBlcywgYykge1xuICAgICAgdmFyIHR5cGUgPSBpbmZlcihkYXRhLCB1dGlsLmFjY2Vzc29yKGMpKTtcbiAgICAgIGlmIChQQVJTRVJTW3R5cGVdKSB0eXBlc1tjXSA9IHR5cGU7XG4gICAgICByZXR1cm4gdHlwZXM7XG4gICAgfSwge30pO1xuICB9XG4gIGNvbHMgPSB1dGlsLmtleXModHlwZXMpO1xuICBwYXJzZXJzID0gY29scy5tYXAoZnVuY3Rpb24oYykgeyByZXR1cm4gUEFSU0VSU1t0eXBlc1tjXV07IH0pO1xuXG4gIGZvciAoaT0wLCBjbGVuPWNvbHMubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgZCA9IGRhdGFbaV07XG4gICAgZm9yIChqPTA7IGo8Y2xlbjsgKytqKSB7XG4gICAgICBkW2NvbHNbal1dID0gcGFyc2Vyc1tqXShkW2NvbHNbal1dKTtcbiAgICB9XG4gIH1cbn1cblxucmVhZC5mb3JtYXRzID0gZm9ybWF0cztcbnJlYWQucGFyc2UgPSBwYXJzZTtcbm1vZHVsZS5leHBvcnRzID0gcmVhZDsiLCJ2YXIgZGwgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxudXRpbC5leHRlbmQoZGwsIHV0aWwpO1xudXRpbC5leHRlbmQoZGwsIHJlcXVpcmUoJy4vZ2VuZXJhdGUnKSk7XG51dGlsLmV4dGVuZChkbCwgcmVxdWlyZSgnLi9zdGF0cycpKTtcbmRsLmJpbiA9IHJlcXVpcmUoJy4vYmluJyk7XG5kbC5zdW1tYXJ5ID0gcmVxdWlyZSgnLi9zdW1tYXJ5Jyk7XG5kbC50ZW1wbGF0ZSA9IHJlcXVpcmUoJy4vdGVtcGxhdGUnKTtcbmRsLnRydW5jYXRlID0gcmVxdWlyZSgnLi90cnVuY2F0ZScpO1xuXG5kbC5sb2FkID0gcmVxdWlyZSgnLi9pbXBvcnQvbG9hZCcpO1xuZGwucmVhZCA9IHJlcXVpcmUoJy4vaW1wb3J0L3JlYWQnKTtcbnV0aWwuZXh0ZW5kKGRsLCByZXF1aXJlKCcuL2ltcG9ydC9sb2FkZXJzJykpO1xuXG52YXIgbG9nID0gcmVxdWlyZSgnLi9sb2cnKTtcbmRsLmxvZyA9IGZ1bmN0aW9uKG1zZykgeyBsb2cobXNnLCBsb2cuTE9HKTsgfTtcbmRsLmxvZy5zaWxlbnQgPSBsb2cuc2lsZW50O1xuZGwuZXJyb3IgPSBmdW5jdGlvbihtc2cpIHsgbG9nKG1zZywgbG9nLkVSUik7IH07XG4iLCJ2YXIgTE9HID0gXCJMT0dcIjtcbnZhciBFUlIgPSBcIkVSUlwiO1xudmFyIHNpbGVudCA9IGZhbHNlO1xuXG5mdW5jdGlvbiBwcmVwYXJlKG1zZywgdHlwZSkge1xuICByZXR1cm4gJ1snICsgW1xuICAgICdcIicrKHR5cGUgfHwgTE9HKSsnXCInLFxuICAgIERhdGUubm93KCksXG4gICAgJ1wiJyttc2crJ1wiJ1xuICBdLmpvaW4oXCIsIFwiKSArICddJztcbn1cblxuZnVuY3Rpb24gbG9nKG1zZywgdHlwZSkge1xuICBpZiAoIXNpbGVudCkge1xuICAgIG1zZyA9IHByZXBhcmUobXNnLCB0eXBlKTtcbiAgICBjb25zb2xlLmVycm9yKG1zZyk7XG4gIH1cbn1cblxubG9nLnNpbGVudCA9IGZ1bmN0aW9uKHZhbCkgeyBzaWxlbnQgPSAhIXZhbDsgfTtcblxubG9nLkxPRyA9IExPRztcbmxvZy5FUlIgPSBFUlI7XG5tb2R1bGUuZXhwb3J0cyA9IGxvZzsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHN0YXRzID0ge307XG5cbnN0YXRzLnVuaXF1ZSA9IGZ1bmN0aW9uKHZhbHVlcywgZiwgcmVzdWx0cykge1xuICBpZiAoIXV0aWwuaXNBcnJheSh2YWx1ZXMpIHx8IHZhbHVlcy5sZW5ndGg9PT0wKSByZXR1cm4gW107XG4gIHJlc3VsdHMgPSByZXN1bHRzIHx8IFtdO1xuICB2YXIgdSA9IHt9LCB2LCBpO1xuICBmb3IgKGk9MCwgbj12YWx1ZXMubGVuZ3RoOyBpPG47ICsraSkge1xuICAgIHYgPSBmID8gZih2YWx1ZXNbaV0pIDogdmFsdWVzW2ldO1xuICAgIGlmICh2IGluIHUpIHtcbiAgICAgIHVbdl0gKz0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgdVt2XSA9IDE7XG4gICAgICByZXN1bHRzLnB1c2godik7XG4gICAgfVxuICB9XG4gIHJlc3VsdHMuY291bnRzID0gdTtcbiAgcmV0dXJuIHJlc3VsdHM7XG59O1xuXG5zdGF0cy5jb3VudCA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICBpZiAoIXV0aWwuaXNBcnJheSh2YWx1ZXMpIHx8IHZhbHVlcy5sZW5ndGg9PT0wKSByZXR1cm4gMDtcbiAgdmFyIHYsIGksIGNvdW50ID0gMDtcbiAgZm9yIChpPTAsIG49dmFsdWVzLmxlbmd0aDsgaTxuOyArK2kpIHtcbiAgICB2ID0gZiA/IGYodmFsdWVzW2ldKSA6IHZhbHVlc1tpXTtcbiAgICBpZiAodiAhPSBudWxsKSBjb3VudCArPSAxO1xuICB9XG4gIHJldHVybiBjb3VudDtcbn07XG5cbnN0YXRzLmNvdW50LmRpc3RpbmN0ID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIGlmICghdXRpbC5pc0FycmF5KHZhbHVlcykgfHwgdmFsdWVzLmxlbmd0aD09PTApIHJldHVybiAwO1xuICB2YXIgdSA9IHt9LCB2LCBpLCBjb3VudCA9IDA7XG4gIGZvciAoaT0wLCBuPXZhbHVlcy5sZW5ndGg7IGk8bjsgKytpKSB7XG4gICAgdiA9IGYgPyBmKHZhbHVlc1tpXSkgOiB2YWx1ZXNbaV07XG4gICAgaWYgKHYgaW4gdSkgY29udGludWU7XG4gICAgdVt2XSA9IDE7XG4gICAgY291bnQgKz0gMTtcbiAgfVxuICByZXR1cm4gY291bnQ7XG59O1xuXG5zdGF0cy5jb3VudC5udWxscyA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICBpZiAoIXV0aWwuaXNBcnJheSh2YWx1ZXMpIHx8IHZhbHVlcy5sZW5ndGg9PT0wKSByZXR1cm4gMDtcbiAgdmFyIHYsIGksIGNvdW50ID0gMDtcbiAgZm9yIChpPTAsIG49dmFsdWVzLmxlbmd0aDsgaTxuOyArK2kpIHtcbiAgICB2ID0gZiA/IGYodmFsdWVzW2ldKSA6IHZhbHVlc1tpXTtcbiAgICBpZiAodiA9PSBudWxsKSBjb3VudCArPSAxO1xuICB9XG4gIHJldHVybiBjb3VudDtcbn07XG5cbnN0YXRzLm1lZGlhbiA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICBpZiAoIXV0aWwuaXNBcnJheSh2YWx1ZXMpIHx8IHZhbHVlcy5sZW5ndGg9PT0wKSByZXR1cm4gMDtcbiAgaWYgKGYpIHZhbHVlcyA9IHZhbHVlcy5tYXAoZik7XG4gIHZhbHVlcyA9IHZhbHVlcy5maWx0ZXIodXRpbC5pc05vdE51bGwpLnNvcnQodXRpbC5jbXApO1xuICB2YXIgaGFsZiA9IE1hdGguZmxvb3IodmFsdWVzLmxlbmd0aC8yKTtcbiAgaWYgKHZhbHVlcy5sZW5ndGggJSAyKSB7XG4gICAgcmV0dXJuIHZhbHVlc1toYWxmXTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gKHZhbHVlc1toYWxmLTFdICsgdmFsdWVzW2hhbGZdKSAvIDIuMDtcbiAgfVxufTtcblxuc3RhdHMubWVhbiA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICBpZiAoIXV0aWwuaXNBcnJheSh2YWx1ZXMpIHx8IHZhbHVlcy5sZW5ndGg9PT0wKSByZXR1cm4gMDtcbiAgdmFyIG1lYW4gPSAwLCBkZWx0YSwgaSwgYywgdjtcbiAgZm9yIChpPTAsIGM9MDsgaTx2YWx1ZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2ID0gZiA/IGYodmFsdWVzW2ldKSA6IHZhbHVlc1tpXTtcbiAgICBpZiAodiAhPSBudWxsKSB7XG4gICAgICBkZWx0YSA9IHYgLSBtZWFuO1xuICAgICAgbWVhbiA9IG1lYW4gKyBkZWx0YSAvICgrK2MpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gbWVhbjtcbn07XG5cbnN0YXRzLnZhcmlhbmNlID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIGlmICghdXRpbC5pc0FycmF5KHZhbHVlcykgfHwgdmFsdWVzLmxlbmd0aD09PTApIHJldHVybiAwO1xuICB2YXIgbWVhbiA9IDAsIE0yID0gMCwgZGVsdGEsIGksIGMsIHY7XG4gIGZvciAoaT0wLCBjPTA7IGk8dmFsdWVzLmxlbmd0aDsgKytpKSB7XG4gICAgdiA9IGYgPyBmKHZhbHVlc1tpXSkgOiB2YWx1ZXNbaV07XG4gICAgaWYgKHYgIT0gbnVsbCkge1xuICAgICAgZGVsdGEgPSB2IC0gbWVhbjtcbiAgICAgIG1lYW4gPSBtZWFuICsgZGVsdGEgLyAoKytjKTtcbiAgICAgIE0yID0gTTIgKyBkZWx0YSAqICh2IC0gbWVhbik7XG4gICAgfVxuICB9XG4gIE0yID0gTTIgLyAoYyAtIDEpO1xuICByZXR1cm4gTTI7XG59O1xuXG5zdGF0cy5zdGRldiA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICByZXR1cm4gTWF0aC5zcXJ0KHN0YXRzLnZhcmlhbmNlKHZhbHVlcywgZikpO1xufTtcblxuc3RhdHMuc2tldyA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICB2YXIgYXZnID0gc3RhdHMubWVhbih2YWx1ZXMsIGYpLFxuICAgICAgbWVkID0gc3RhdHMubWVkaWFuKHZhbHVlcywgZiksXG4gICAgICBzdGQgPSBzdGF0cy5zdGRldih2YWx1ZXMsIGYpO1xuICByZXR1cm4gc3RkID09PSAwID8gMCA6IChhdmcgLSBtZWQpIC8gc3RkO1xufTtcblxuc3RhdHMubWlubWF4ID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIHZhciBzID0ge21pbjogK0luZmluaXR5LCBtYXg6IC1JbmZpbml0eX0sIHYsIGksIG47XG4gIGZvciAoaT0wOyBpPHZhbHVlcy5sZW5ndGg7ICsraSkge1xuICAgIHYgPSBmID8gZih2YWx1ZXNbaV0pIDogdmFsdWVzW2ldO1xuICAgIGlmICh2ICE9IG51bGwpIHtcbiAgICAgIGlmICh2ID4gcy5tYXgpIHMubWF4ID0gdjtcbiAgICAgIGlmICh2IDwgcy5taW4pIHMubWluID0gdjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHM7XG59O1xuXG5zdGF0cy5taW5JbmRleCA9IGZ1bmN0aW9uKHZhbHVlcywgZikge1xuICBpZiAoIXV0aWwuaXNBcnJheSh2YWx1ZXMpIHx8IHZhbHVlcy5sZW5ndGg9PTApIHJldHVybiAtMTtcbiAgdmFyIGlkeCA9IDAsIHYsIGksIG4sIG1pbiA9ICtJbmZpbml0eTtcbiAgZm9yIChpPTA7IGk8dmFsdWVzLmxlbmd0aDsgKytpKSB7XG4gICAgdiA9IGYgPyBmKHZhbHVlc1tpXSkgOiB2YWx1ZXNbaV07XG4gICAgaWYgKHYgIT0gbnVsbCAmJiB2IDwgbWluKSB7IG1pbiA9IHY7IGlkeCA9IGk7IH1cbiAgfVxuICByZXR1cm4gaWR4O1xufTtcblxuc3RhdHMubWF4SW5kZXggPSBmdW5jdGlvbih2YWx1ZXMsIGYpIHtcbiAgaWYgKCF1dGlsLmlzQXJyYXkodmFsdWVzKSB8fCB2YWx1ZXMubGVuZ3RoPT0wKSByZXR1cm4gLTE7XG4gIHZhciBpZHggPSAwLCB2LCBpLCBuLCBtYXggPSAtSW5maW5pdHk7XG4gIGZvciAoaT0wOyBpPHZhbHVlcy5sZW5ndGg7ICsraSkge1xuICAgIHYgPSBmID8gZih2YWx1ZXNbaV0pIDogdmFsdWVzW2ldO1xuICAgIGlmICh2ICE9IG51bGwgJiYgdiA+IG1heCkgeyBtYXggPSB2OyBpZHggPSBpOyB9XG4gIH1cbiAgcmV0dXJuIGlkeDtcbn07XG5cbnN0YXRzLmVudHJvcHkgPSBmdW5jdGlvbihjb3VudHMpIHtcbiAgdmFyIGksIHAsIHMgPSAwLCBIID0gMDtcbiAgZm9yIChpPTA7IGk8Y291bnRzLmxlbmd0aDsgKytpKSB7XG4gICAgcyArPSBjb3VudHNbaV07XG4gIH1cbiAgaWYgKHMgPT09IDApIHJldHVybiAwO1xuICBmb3IgKGk9MDsgaTxjb3VudHMubGVuZ3RoOyArK2kpIHtcbiAgICBwID0gY291bnRzW2ldIC8gcztcbiAgICBpZiAocCA+IDApIEggKz0gcCAqIE1hdGgubG9nKHApIC8gTWF0aC5MTjI7XG4gIH1cbiAgcmV0dXJuIC1IO1xufTtcblxuc3RhdHMuZW50cm9weS5ub3JtYWxpemVkID0gZnVuY3Rpb24oY291bnRzKSB7XG4gIHZhciBIID0gc3RhdHMuZW50cm9weShjb3VudHMpO1xuICB2YXIgbWF4ID0gLU1hdGgubG9nKDEvY291bnRzLmxlbmd0aCkgLyBNYXRoLkxOMjtcbiAgcmV0dXJuIEggLyBtYXg7XG59O1xuXG5zdGF0cy5wcm9maWxlID0gZnVuY3Rpb24odmFsdWVzLCBmKSB7XG4gIGlmICghdXRpbC5pc0FycmF5KHZhbHVlcykgfHwgdmFsdWVzLmxlbmd0aD09PTApIHJldHVybiBudWxsO1xuXG4gIC8vIGluaXRcbiAgdmFyIHAgPSB7fSxcbiAgICAgIG1lYW4gPSAwLFxuICAgICAgY291bnQgPSAwLFxuICAgICAgZGlzdGluY3QgPSAwLFxuICAgICAgbWluID0gZiA/IGYodmFsdWVzWzBdKSA6IHZhbHVlc1swXSxcbiAgICAgIG1heCA9IG1pbixcbiAgICAgIE0yID0gMCxcbiAgICAgIG1lZGlhbiA9IG51bGwsXG4gICAgICB2YWxzID0gW10sXG4gICAgICB1ID0ge30sIGRlbHRhLCBzZCwgaSwgdiwgeCwgaGFsZjtcblxuICAvLyBjb21wdXRlIHN1bW1hcnkgc3RhdHNcbiAgZm9yIChpPTAsIGM9MDsgaTx2YWx1ZXMubGVuZ3RoOyArK2kpIHtcbiAgICB2ID0gZiA/IGYodmFsdWVzW2ldKSA6IHZhbHVlc1tpXTtcbiAgICBpZiAodiAhPSBudWxsKSB7XG4gICAgICAvLyB1cGRhdGUgdW5pcXVlIHZhbHVlc1xuICAgICAgdVt2XSA9ICh2IGluIHUpID8gdVt2XSArIDEgOiAoZGlzdGluY3QgKz0gMSwgMSk7XG4gICAgICAvLyB1cGRhdGUgbWluL21heFxuICAgICAgaWYgKHYgPCBtaW4pIG1pbiA9IHY7XG4gICAgICBpZiAodiA+IG1heCkgbWF4ID0gdjtcbiAgICAgIC8vIHVwZGF0ZSBzdGF0c1xuICAgICAgeCA9ICh0eXBlb2YgdiA9PT0gJ3N0cmluZycpID8gdi5sZW5ndGggOiB2O1xuICAgICAgZGVsdGEgPSB4IC0gbWVhbjtcbiAgICAgIG1lYW4gPSBtZWFuICsgZGVsdGEgLyAoKytjb3VudCk7XG4gICAgICBNMiA9IE0yICsgZGVsdGEgKiAoeCAtIG1lYW4pO1xuICAgICAgdmFscy5wdXNoKHgpO1xuICAgIH1cbiAgfVxuICBNMiA9IE0yIC8gKGNvdW50IC0gMSk7XG4gIHNkID0gTWF0aC5zcXJ0KE0yKTtcblxuICAvLyBjb21wdXRlIG1lZGlhblxuICB2YWxzLnNvcnQodXRpbC5jbXApO1xuICBoYWxmID0gTWF0aC5mbG9vcih2YWxzLmxlbmd0aC8yKTtcbiAgbWVkaWFuID0gKHZhbHMubGVuZ3RoICUgMilcbiAgID8gdmFsc1toYWxmXVxuICAgOiAodmFsc1toYWxmLTFdICsgdmFsc1toYWxmXSkgLyAyLjA7XG5cbiAgcmV0dXJuIHtcbiAgICB1bmlxdWU6ICAgdSxcbiAgICBjb3VudDogICAgY291bnQsXG4gICAgbnVsbHM6ICAgIHZhbHVlcy5sZW5ndGggLSBjb3VudCxcbiAgICBkaXN0aW5jdDogZGlzdGluY3QsXG4gICAgbWluOiAgICAgIG1pbixcbiAgICBtYXg6ICAgICAgbWF4LFxuICAgIG1lYW46ICAgICBtZWFuLFxuICAgIG1lZGlhbjogICBtZWRpYW4sXG4gICAgc3RkZXY6ICAgIHNkLFxuICAgIHNrZXc6ICAgICBzZCA9PT0gMCA/IDAgOiAobWVhbiAtIG1lZGlhbikgLyBzZFxuICB9O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBzdGF0czsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIHN0YXRzID0gcmVxdWlyZSgnLi9zdGF0cycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGRhdGEsIGZpZWxkcykge1xuICBpZiAoZGF0YSA9PSBudWxsIHx8IGRhdGEubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbDtcbiAgZmllbGRzID0gZmllbGRzIHx8IHV0aWwua2V5cyhkYXRhWzBdKTtcblxuICB2YXIgcHJvZmlsZXMgPSBmaWVsZHMubWFwKGZ1bmN0aW9uKGYpIHtcbiAgICB2YXIgcCA9IHN0YXRzLnByb2ZpbGUoZGF0YSwgdXRpbC5hY2Nlc3NvcihmKSk7XG4gICAgcmV0dXJuIChwLmZpZWxkID0gZiwgcCk7XG4gIH0pO1xuICBcbiAgcHJvZmlsZXMudG9TdHJpbmcgPSBwcmludFN1bW1hcnk7XG4gIHJldHVybiBwcm9maWxlcztcbn07XG5cbmZ1bmN0aW9uIHByaW50U3VtbWFyeSgpIHtcbiAgdmFyIHByb2ZpbGVzID0gdGhpcztcbiAgdmFyIHN0ciA9IFtdO1xuICBwcm9maWxlcy5mb3JFYWNoKGZ1bmN0aW9uKHApIHtcbiAgICBzdHIucHVzaChcIi0tLS0tIEZpZWxkOiAnXCIgKyBwLmZpZWxkICsgXCInIC0tLS0tXCIpO1xuICAgIGlmICh0eXBlb2YgcC5taW4gPT09ICdzdHJpbmcnIHx8IHAuZGlzdGluY3QgPCAxMCkge1xuICAgICAgc3RyLnB1c2gocHJpbnRDYXRlZ29yaWNhbFByb2ZpbGUocCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIucHVzaChwcmludFF1YW50aXRhdGl2ZVByb2ZpbGUocCkpO1xuICAgIH1cbiAgICBzdHIucHVzaChcIlwiKTtcbiAgfSk7XG4gIHJldHVybiBzdHIuam9pbihcIlxcblwiKTtcbn1cblxuZnVuY3Rpb24gcHJpbnRRdWFudGl0YXRpdmVQcm9maWxlKHApIHtcbiAgcmV0dXJuIFtcbiAgICBcImRpc3RpbmN0OiBcIiArIHAuZGlzdGluY3QsXG4gICAgXCJudWxsczogICAgXCIgKyBwLm51bGxzLFxuICAgIFwibWluOiAgICAgIFwiICsgcC5taW4sXG4gICAgXCJtYXg6ICAgICAgXCIgKyBwLm1heCxcbiAgICBcIm1lZGlhbjogICBcIiArIHAubWVkaWFuLFxuICAgIFwibWVhbjogICAgIFwiICsgcC5tZWFuLFxuICAgIFwic3RkZXY6ICAgIFwiICsgcC5zdGRldixcbiAgICBcInNrZXc6ICAgICBcIiArIHAuc2tld1xuICBdLmpvaW4oXCJcXG5cIik7XG59XG5cbmZ1bmN0aW9uIHByaW50Q2F0ZWdvcmljYWxQcm9maWxlKHApIHtcbiAgdmFyIGxpc3QgPSBbXG4gICAgXCJkaXN0aW5jdDogXCIgKyBwLmRpc3RpbmN0LFxuICAgIFwibnVsbHM6ICAgIFwiICsgcC5udWxscyxcbiAgICBcInRvcCB2YWx1ZXM6IFwiXG4gIF07XG4gIHZhciB1ID0gcC51bmlxdWU7XG4gIHZhciB0b3AgPSB1dGlsLmtleXModSlcbiAgICAuc29ydChmdW5jdGlvbihhLGIpIHsgcmV0dXJuIHVbYl0gLSB1W2FdOyB9KVxuICAgIC5zbGljZSgwLCA2KVxuICAgIC5tYXAoZnVuY3Rpb24odikgeyByZXR1cm4gXCIgJ1wiICsgdiArIFwiJyAoXCIgKyB1W3ZdICsgXCIpXCI7IH0pO1xuICByZXR1cm4gbGlzdC5jb25jYXQodG9wKS5qb2luKFwiXFxuXCIpO1xufSIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgZDMgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5kMyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuZDMgOiBudWxsKTtcblxudmFyIGNvbnRleHQgPSB7XG4gIGZvcm1hdHM6ICAgIFtdLFxuICBmb3JtYXRfbWFwOiB7fSxcbiAgdHJ1bmNhdGU6ICAgcmVxdWlyZSgnLi90cnVuY2F0ZScpXG59O1xuXG5mdW5jdGlvbiB0ZW1wbGF0ZSh0ZXh0KSB7XG4gIHZhciBzcmMgPSBzb3VyY2UodGV4dCwgXCJkXCIpO1xuICBzcmMgPSBcInZhciBfX3Q7IHJldHVybiBcIiArIHNyYyArIFwiO1wiO1xuXG4gIHRyeSB7XG4gICAgcmV0dXJuIChuZXcgRnVuY3Rpb24oXCJkXCIsIHNyYykpLmJpbmQoY29udGV4dCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBlLnNvdXJjZSA9IHNyYztcbiAgICB0aHJvdyBlO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gdGVtcGxhdGU7XG5cbi8vIGNsZWFyIGNhY2hlIG9mIGZvcm1hdCBvYmplY3RzXG4vLyBjYW4gKmJyZWFrKiBwcmlvciB0ZW1wbGF0ZSBmdW5jdGlvbnMsIHNvIGludm9rZSB3aXRoIGNhcmVcbnRlbXBsYXRlLmNsZWFyRm9ybWF0Q2FjaGUgPSBmdW5jdGlvbigpIHtcbiAgY29udGV4dC5mb3JtYXRzID0gW107XG4gIGNvbnRleHQuZm9ybWF0X21hcCA9IHt9O1xufTtcblxuZnVuY3Rpb24gc291cmNlKHRleHQsIHZhcmlhYmxlKSB7XG4gIHZhcmlhYmxlID0gdmFyaWFibGUgfHwgXCJvYmpcIjtcbiAgdmFyIGluZGV4ID0gMDtcbiAgdmFyIHNyYyA9IFwiJ1wiO1xuICB2YXIgcmVnZXggPSB0ZW1wbGF0ZV9yZTtcblxuICAvLyBDb21waWxlIHRoZSB0ZW1wbGF0ZSBzb3VyY2UsIGVzY2FwaW5nIHN0cmluZyBsaXRlcmFscyBhcHByb3ByaWF0ZWx5LlxuICB0ZXh0LnJlcGxhY2UocmVnZXgsIGZ1bmN0aW9uKG1hdGNoLCBpbnRlcnBvbGF0ZSwgb2Zmc2V0KSB7XG4gICAgc3JjICs9IHRleHRcbiAgICAgIC5zbGljZShpbmRleCwgb2Zmc2V0KVxuICAgICAgLnJlcGxhY2UodGVtcGxhdGVfZXNjYXBlciwgdGVtcGxhdGVfZXNjYXBlQ2hhcik7XG4gICAgaW5kZXggPSBvZmZzZXQgKyBtYXRjaC5sZW5ndGg7XG5cbiAgICBpZiAoaW50ZXJwb2xhdGUpIHtcbiAgICAgIHNyYyArPSBcIidcXG4rKChfX3Q9KFwiXG4gICAgICAgICsgdGVtcGxhdGVfdmFyKGludGVycG9sYXRlLCB2YXJpYWJsZSlcbiAgICAgICAgKyBcIikpPT1udWxsPycnOl9fdCkrXFxuJ1wiO1xuICAgIH1cblxuICAgIC8vIEFkb2JlIFZNcyBuZWVkIHRoZSBtYXRjaCByZXR1cm5lZCB0byBwcm9kdWNlIHRoZSBjb3JyZWN0IG9mZmVzdC5cbiAgICByZXR1cm4gbWF0Y2g7XG4gIH0pO1xuICByZXR1cm4gc3JjICsgXCInXCI7XG59XG5cbmZ1bmN0aW9uIHRlbXBsYXRlX3Zhcih0ZXh0LCB2YXJpYWJsZSkge1xuICB2YXIgZmlsdGVycyA9IHRleHQuc3BsaXQoJ3wnKTtcbiAgdmFyIHByb3AgPSBmaWx0ZXJzLnNoaWZ0KCkudHJpbSgpO1xuICB2YXIgZm9ybWF0ID0gW107XG4gIHZhciBzdHJpbmdDYXN0ID0gdHJ1ZTtcbiAgXG4gIGZ1bmN0aW9uIHN0cmNhbGwoZm4pIHtcbiAgICBmbiA9IGZuIHx8IFwiXCI7XG4gICAgaWYgKHN0cmluZ0Nhc3QpIHtcbiAgICAgIHN0cmluZ0Nhc3QgPSBmYWxzZTtcbiAgICAgIHNyYyA9IFwiU3RyaW5nKFwiICsgc3JjICsgXCIpXCIgKyBmbjtcbiAgICB9IGVsc2Uge1xuICAgICAgc3JjICs9IGZuO1xuICAgIH1cbiAgICByZXR1cm4gc3JjO1xuICB9XG4gIFxuICB2YXIgc3JjID0gdXRpbC5maWVsZChwcm9wKS5tYXAodXRpbC5zdHIpLmpvaW4oXCJdW1wiKTtcbiAgc3JjID0gdmFyaWFibGUgKyBcIltcIiArIHNyYyArIFwiXVwiO1xuICBcbiAgZm9yICh2YXIgaT0wOyBpPGZpbHRlcnMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgZiA9IGZpbHRlcnNbaV0sIGFyZ3MgPSBudWxsLCBwaWR4LCBhLCBiO1xuXG4gICAgaWYgKChwaWR4PWYuaW5kZXhPZignOicpKSA+IDApIHtcbiAgICAgIGYgPSBmLnNsaWNlKDAsIHBpZHgpO1xuICAgICAgYXJncyA9IGZpbHRlcnNbaV0uc2xpY2UocGlkeCsxKS5zcGxpdCgnLCcpXG4gICAgICAgIC5tYXAoZnVuY3Rpb24ocykgeyByZXR1cm4gcy50cmltKCk7IH0pO1xuICAgIH1cbiAgICBmID0gZi50cmltKCk7XG5cbiAgICBzd2l0Y2ggKGYpIHtcbiAgICAgIGNhc2UgJ2xlbmd0aCc6XG4gICAgICAgIHN0cmNhbGwoJy5sZW5ndGgnKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdsb3dlcic6XG4gICAgICAgIHN0cmNhbGwoJy50b0xvd2VyQ2FzZSgpJyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndXBwZXInOlxuICAgICAgICBzdHJjYWxsKCcudG9VcHBlckNhc2UoKScpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2xvd2VyLWxvY2FsZSc6XG4gICAgICAgIHN0cmNhbGwoJy50b0xvY2FsZUxvd2VyQ2FzZSgpJyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndXBwZXItbG9jYWxlJzpcbiAgICAgICAgc3RyY2FsbCgnLnRvTG9jYWxlVXBwZXJDYXNlKCknKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICd0cmltJzpcbiAgICAgICAgc3RyY2FsbCgnLnRyaW0oKScpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2xlZnQnOlxuICAgICAgICBhID0gdXRpbC5udW1iZXIoYXJnc1swXSk7XG4gICAgICAgIHN0cmNhbGwoJy5zbGljZSgwLCcgKyBhICsgJyknKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdyaWdodCc6XG4gICAgICAgIGEgPSB1dGlsLm51bWJlcihhcmdzWzBdKTtcbiAgICAgICAgc3RyY2FsbCgnLnNsaWNlKC0nICsgYSArJyknKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICdtaWQnOlxuICAgICAgICBhID0gdXRpbC5udW1iZXIoYXJnc1swXSk7XG4gICAgICAgIGIgPSBhICsgdXRpbC5udW1iZXIoYXJnc1sxXSk7XG4gICAgICAgIHN0cmNhbGwoJy5zbGljZSgrJythKycsJytiKycpJyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAnc2xpY2UnOlxuICAgICAgICBhID0gdXRpbC5udW1iZXIoYXJnc1swXSk7XG4gICAgICAgIHN0cmNhbGwoJy5zbGljZSgnKyBhXG4gICAgICAgICAgKyAoYXJncy5sZW5ndGggPiAxID8gJywnICsgdXRpbC5udW1iZXIoYXJnc1sxXSkgOiAnJylcbiAgICAgICAgICArICcpJyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndHJ1bmNhdGUnOlxuICAgICAgICBhID0gdXRpbC5udW1iZXIoYXJnc1swXSk7XG4gICAgICAgIGIgPSBhcmdzWzFdO1xuICAgICAgICBiID0gKGIhPT1cImxlZnRcIiAmJiBiIT09XCJtaWRkbGVcIiAmJiBiIT09XCJjZW50ZXJcIikgPyBcInJpZ2h0XCIgOiBiO1xuICAgICAgICBzcmMgPSAndGhpcy50cnVuY2F0ZSgnICsgc3RyY2FsbCgpICsgJywnICsgYSArICcsXCInICsgYiArICdcIiknO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ251bWJlcic6XG4gICAgICAgIGEgPSB0ZW1wbGF0ZV9mb3JtYXQoYXJnc1swXSwgZDMuZm9ybWF0KTtcbiAgICAgICAgc3RyaW5nQ2FzdCA9IGZhbHNlO1xuICAgICAgICBzcmMgPSAndGhpcy5mb3JtYXRzWycrYSsnXSgnK3NyYysnKSc7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAndGltZSc6XG4gICAgICAgIGEgPSB0ZW1wbGF0ZV9mb3JtYXQoYXJnc1swXSwgZDMudGltZS5mb3JtYXQpO1xuICAgICAgICBzdHJpbmdDYXN0ID0gZmFsc2U7XG4gICAgICAgIHNyYyA9ICd0aGlzLmZvcm1hdHNbJythKyddKCcrc3JjKycpJztcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBFcnJvcihcIlVucmVjb2duaXplZCB0ZW1wbGF0ZSBmaWx0ZXI6IFwiICsgZik7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHNyYztcbn1cblxudmFyIHRlbXBsYXRlX3JlID0gL1xce1xceyguKz8pXFx9XFx9fCQvZztcblxuLy8gQ2VydGFpbiBjaGFyYWN0ZXJzIG5lZWQgdG8gYmUgZXNjYXBlZCBzbyB0aGF0IHRoZXkgY2FuIGJlIHB1dCBpbnRvIGFcbi8vIHN0cmluZyBsaXRlcmFsLlxudmFyIHRlbXBsYXRlX2VzY2FwZXMgPSB7XG4gIFwiJ1wiOiAgICAgIFwiJ1wiLFxuICAnXFxcXCc6ICAgICAnXFxcXCcsXG4gICdcXHInOiAgICAgJ3InLFxuICAnXFxuJzogICAgICduJyxcbiAgJ1xcdTIwMjgnOiAndTIwMjgnLFxuICAnXFx1MjAyOSc6ICd1MjAyOSdcbn07XG5cbnZhciB0ZW1wbGF0ZV9lc2NhcGVyID0gL1xcXFx8J3xcXHJ8XFxufFxcdTIwMjh8XFx1MjAyOS9nO1xuXG5mdW5jdGlvbiB0ZW1wbGF0ZV9lc2NhcGVDaGFyKG1hdGNoKSB7XG4gIHJldHVybiAnXFxcXCcgKyB0ZW1wbGF0ZV9lc2NhcGVzW21hdGNoXTtcbn07XG5cbmZ1bmN0aW9uIHRlbXBsYXRlX2Zvcm1hdChwYXR0ZXJuLCBmbXQpIHtcbiAgaWYgKChwYXR0ZXJuWzBdID09PSBcIidcIiAmJiBwYXR0ZXJuW3BhdHRlcm4ubGVuZ3RoLTFdID09PSBcIidcIikgfHxcbiAgICAgIChwYXR0ZXJuWzBdICE9PSAnXCInICYmIHBhdHRlcm5bcGF0dGVybi5sZW5ndGgtMV0gPT09ICdcIicpKSB7XG4gICAgcGF0dGVybiA9IHBhdHRlcm4uc2xpY2UoMSwgLTEpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IEVycm9yKFwiRm9ybWF0IHBhdHRlcm4gbXVzdCBiZSBxdW90ZWQ6IFwiICsgcGF0dGVybik7XG4gIH1cbiAgaWYgKCFjb250ZXh0LmZvcm1hdF9tYXBbcGF0dGVybl0pIHtcbiAgICB2YXIgZiA9IGZtdChwYXR0ZXJuKTtcbiAgICB2YXIgaSA9IGNvbnRleHQuZm9ybWF0cy5sZW5ndGg7XG4gICAgY29udGV4dC5mb3JtYXRzLnB1c2goZik7XG4gICAgY29udGV4dC5mb3JtYXRfbWFwW3BhdHRlcm5dID0gaTtcbiAgfVxuICByZXR1cm4gY29udGV4dC5mb3JtYXRfbWFwW3BhdHRlcm5dO1xufTtcbiIsInZhciBGSUVMRFMgPSB7XG4gIGlkOiBcIl90cmVlX2lkXCIsXG4gIHBhcmVudDogXCJfdHJlZV9wYXJlbnRcIixcbiAgY2hpbGRyZW46IFwiY2hpbGRyZW5cIlxufTtcblxuZnVuY3Rpb24gdG9UYWJsZSh0cmVlLCBjaGlsZHJlbkZpZWxkLCBpZEZpZWxkLCBwYXJlbnRGaWVsZCkge1xuICBjaGlsZHJlbkZpZWxkID0gY2hpbGRyZW5GaWVsZCB8fCBGSUVMRFMuY2hpbGRyZW47XG4gIGlkRmllbGQgPSBpZEZpZWxkIHx8IEZJRUxEUy5pZDtcbiAgcGFyZW50RmllbGQgPSBwYXJlbnRGaWVsZCB8fCBGSUVMRFMucGFyZW50O1xuICB2YXIgbGlzdCA9IFtdO1xuICB2YXIgaWQgPSAwO1xuICBcbiAgZnVuY3Rpb24gdmlzaXQobm9kZSwgcGFyZW50SWQpIHtcbiAgICB2YXIgbmlkID0gbm9kZVtpZEZpZWxkXSA9IGlkKys7XG4gICAgbm9kZVtwYXJlbnRGaWVsZF0gPSBwYXJlbnRJZDtcbiAgICBsaXN0LnB1c2gobm9kZSk7XG4gICAgXG4gICAgdmFyIGNoaWxkcmVuID0gbm9kZVtjaGlsZHJlbkZpZWxkXTtcbiAgICBpZiAoY2hpbGRyZW4pIHtcbiAgICAgIGZvciAodmFyIGk9MDsgaTxjaGlsZHJlbi5sZW5ndGg7ICsraSkge1xuICAgICAgICB2aXNpdChjaGlsZHJlbltpXSwgbmlkKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgXG4gIHZpc2l0KHRyZWUsIC0xKTtcbiAgcmV0dXJuIGxpc3Q7XG59XG5cbmZ1bmN0aW9uIGZyb21UYWJsZShsaXN0LCBjaGlsZHJlbkZpZWxkLCBpZEZpZWxkLCBwYXJlbnRGaWVsZCkge1xuICBjaGlsZHJlbkZpZWxkID0gY2hpbGRyZW5GaWVsZCB8fCBGSUVMRFMuY2hpbGRyZW47XG4gIGlkRmllbGQgPSBpZEZpZWxkIHx8IEZJRUxEUy5pZDtcbiAgcGFyZW50RmllbGQgPSBwYXJlbnRGaWVsZCB8fCBGSUVMRFMucGFyZW50O1xuICB2YXIgcm9vdCA9IG51bGw7XG4gIFxuICBsaXN0LmZvckVhY2goZnVuY3Rpb24obm9kZSkge1xuICAgIGlmIChub2RlW2NoaWxkcmVuRmllbGRdKSB7XG4gICAgICBub2RlW2NoaWxkcmVuRmllbGRdID0gbnVsbDtcbiAgICB9O1xuICB9KVxuICBcbiAgbGlzdC5mb3JFYWNoKGZ1bmN0aW9uKG5vZGUpIHtcbiAgICB2YXIgcGlkID0gbm9kZVtwYXJlbnRGaWVsZF07XG4gICAgaWYgKHBpZCA9PT0gLTEpIHtcbiAgICAgIHJvb3QgPSBub2RlO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcCA9IG5vZGVzW3BpZF07XG4gICAgICB2YXIgY2hpbGRyZW4gPSBwW2NoaWxkcmVuRmllbGRdIHx8IChwW2NoaWxkcmVuRmllbGRdID0gW10pO1xuICAgICAgY2hpbGRyZW4ucHVzaChub2RlKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiByb290O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgdG9UYWJsZTogdG9UYWJsZSxcbiAgZnJvbVRhYmxlOiBmcm9tVGFibGUsXG4gIGZpZWxkczogRklFTERTXG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocywgbGVuZ3RoLCBwb3MsIHdvcmQsIGVsbGlwc2lzKSB7XG4gIHZhciBsZW4gPSBzLmxlbmd0aDtcbiAgaWYgKGxlbiA8PSBsZW5ndGgpIHJldHVybiBzO1xuICBlbGxpcHNpcyA9IGVsbGlwc2lzIHx8IFwiLi4uXCI7XG4gIHZhciBsID0gTWF0aC5tYXgoMCwgbGVuZ3RoIC0gZWxsaXBzaXMubGVuZ3RoKTtcblxuICBzd2l0Y2ggKHBvcykge1xuICAgIGNhc2UgXCJsZWZ0XCI6XG4gICAgICByZXR1cm4gZWxsaXBzaXMgKyAod29yZCA/IHVfdHJ1bmNhdGVPbldvcmQocyxsLDEpIDogcy5zbGljZShsZW4tbCkpO1xuICAgIGNhc2UgXCJtaWRkbGVcIjpcbiAgICBjYXNlIFwiY2VudGVyXCI6XG4gICAgICB2YXIgbDEgPSBNYXRoLmNlaWwobC8yKSwgbDIgPSBNYXRoLmZsb29yKGwvMik7XG4gICAgICByZXR1cm4gKHdvcmQgPyB0cnVuY2F0ZU9uV29yZChzLGwxKSA6IHMuc2xpY2UoMCxsMSkpICsgZWxsaXBzaXNcbiAgICAgICAgKyAod29yZCA/IHRydW5jYXRlT25Xb3JkKHMsbDIsMSkgOiBzLnNsaWNlKGxlbi1sMikpO1xuICAgIGRlZmF1bHQ6XG4gICAgICByZXR1cm4gKHdvcmQgPyB0cnVuY2F0ZU9uV29yZChzLGwpIDogcy5zbGljZSgwLGwpKSArIGVsbGlwc2lzO1xuICB9XG59O1xuXG5mdW5jdGlvbiB0cnVuY2F0ZU9uV29yZChzLCBsZW4sIHJldikge1xuICB2YXIgY250ID0gMCwgdG9rID0gcy5zcGxpdCh0cnVuY2F0ZV93b3JkX3JlKTtcbiAgaWYgKHJldikge1xuICAgIHMgPSAodG9rID0gdG9rLnJldmVyc2UoKSlcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24odykgeyBjbnQgKz0gdy5sZW5ndGg7IHJldHVybiBjbnQgPD0gbGVuOyB9KVxuICAgICAgLnJldmVyc2UoKTtcbiAgfSBlbHNlIHtcbiAgICBzID0gdG9rLmZpbHRlcihmdW5jdGlvbih3KSB7IGNudCArPSB3Lmxlbmd0aDsgcmV0dXJuIGNudCA8PSBsZW47IH0pO1xuICB9XG4gIHJldHVybiBzLmxlbmd0aCA/IHMuam9pbihcIlwiKS50cmltKCkgOiB0b2tbMF0uc2xpY2UoMCwgbGVuKTtcbn1cblxudmFyIHRydW5jYXRlX3dvcmRfcmUgPSAvKFtcXHUwMDA5XFx1MDAwQVxcdTAwMEJcXHUwMDBDXFx1MDAwRFxcdTAwMjBcXHUwMEEwXFx1MTY4MFxcdTE4MEVcXHUyMDAwXFx1MjAwMVxcdTIwMDJcXHUyMDAzXFx1MjAwNFxcdTIwMDVcXHUyMDA2XFx1MjAwN1xcdTIwMDhcXHUyMDA5XFx1MjAwQVxcdTIwMkZcXHUyMDVGXFx1MjAyOFxcdTIwMjlcXHUzMDAwXFx1RkVGRl0pLztcbiIsInZhciB1ID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gd2hlcmUgYXJlIHdlP1xuXG51LmlzTm9kZSA9IHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJ1xuICAgICAgICAmJiB0eXBlb2YgcHJvY2Vzcy5zdGRlcnIgIT09ICd1bmRlZmluZWQnO1xuXG4vLyB0eXBlIGNoZWNraW5nIGZ1bmN0aW9uc1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG51LmlzT2JqZWN0ID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBvYmogPT09IE9iamVjdChvYmopO1xufTtcblxudS5pc0Z1bmN0aW9uID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKG9iaikgPT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbn07XG5cbnUuaXNTdHJpbmcgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBTdHJpbmddJztcbn07XG4gIFxudS5pc0FycmF5ID0gQXJyYXkuaXNBcnJheSB8fCBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxudS5pc051bWJlciA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IE51bWJlcl0nO1xufTtcblxudS5pc0Jvb2xlYW4gPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwob2JqKSA9PSAnW29iamVjdCBCb29sZWFuXSc7XG59O1xuXG51LmlzRGF0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbChvYmopID09ICdbb2JqZWN0IERhdGVdJztcbn07XG5cbnUuaXNOb3ROdWxsID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBvYmogIT0gbnVsbDsgLy8gVE9ETyBpbmNsdWRlIE5hTiBoZXJlP1xufTtcblxuLy8gdHlwZSBjb2VyY2lvbiBmdW5jdGlvbnNcblxudS5udW1iZXIgPSBmdW5jdGlvbihzKSB7IHJldHVybiBzID09IG51bGwgPyBudWxsIDogK3M7IH07XG5cbnUuYm9vbGVhbiA9IGZ1bmN0aW9uKHMpIHsgcmV0dXJuIHMgPT0gbnVsbCA/IG51bGwgOiBzPT09J2ZhbHNlJyA/IGZhbHNlIDogISFzOyB9O1xuXG51LmRhdGUgPSBmdW5jdGlvbihzKSB7IHJldHVybiBzID09IG51bGwgPyBudWxsIDogRGF0ZS5wYXJzZShzKTsgfVxuXG51LmFycmF5ID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geCAhPSBudWxsID8gKHUuaXNBcnJheSh4KSA/IHggOiBbeF0pIDogW107IH07XG5cbnUuc3RyID0gZnVuY3Rpb24oeCkge1xuICByZXR1cm4gdS5pc0FycmF5KHgpID8gXCJbXCIgKyB4Lm1hcCh1LnN0cikgKyBcIl1cIlxuICAgIDogdS5pc09iamVjdCh4KSA/IEpTT04uc3RyaW5naWZ5KHgpXG4gICAgOiB1LmlzU3RyaW5nKHgpID8gKFwiJ1wiK3V0aWxfZXNjYXBlX3N0cih4KStcIidcIikgOiB4O1xufTtcblxudmFyIGVzY2FwZV9zdHJfcmUgPSAvKF58W15cXFxcXSknL2c7XG5cbmZ1bmN0aW9uIHV0aWxfZXNjYXBlX3N0cih4KSB7XG4gIHJldHVybiB4LnJlcGxhY2UoZXNjYXBlX3N0cl9yZSwgXCIkMVxcXFwnXCIpO1xufVxuXG4vLyB1dGlsaXR5IGZ1bmN0aW9uc1xuXG51LmlkZW50aXR5ID0gZnVuY3Rpb24oeCkgeyByZXR1cm4geDsgfTtcblxudS50cnVlID0gZnVuY3Rpb24oKSB7IHJldHVybiB0cnVlOyB9O1xuXG51LmR1cGxpY2F0ZSA9IGZ1bmN0aW9uKG9iaikge1xuICByZXR1cm4gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShvYmopKTtcbn07XG5cbnUuZXF1YWwgPSBmdW5jdGlvbihhLCBiKSB7XG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShhKSA9PT0gSlNPTi5zdHJpbmdpZnkoYik7XG59O1xuXG51LmV4dGVuZCA9IGZ1bmN0aW9uKG9iaikge1xuICBmb3IgKHZhciB4LCBuYW1lLCBpPTEsIGxlbj1hcmd1bWVudHMubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgeCA9IGFyZ3VtZW50c1tpXTtcbiAgICBmb3IgKG5hbWUgaW4geCkgeyBvYmpbbmFtZV0gPSB4W25hbWVdOyB9XG4gIH1cbiAgcmV0dXJuIG9iajtcbn07XG5cbnUua2V5cyA9IGZ1bmN0aW9uKHgpIHtcbiAgdmFyIGtleXMgPSBbXSwgaztcbiAgZm9yIChrIGluIHgpIGtleXMucHVzaChrKTtcbiAgcmV0dXJuIGtleXM7XG59O1xuXG51LnZhbHMgPSBmdW5jdGlvbih4KSB7XG4gIHZhciB2YWxzID0gW10sIGs7XG4gIGZvciAoayBpbiB4KSB2YWxzLnB1c2goeFtrXSk7XG4gIHJldHVybiB2YWxzO1xufTtcblxudS50b01hcCA9IGZ1bmN0aW9uKGxpc3QpIHtcbiAgcmV0dXJuIGxpc3QucmVkdWNlKGZ1bmN0aW9uKG9iaiwgeCkge1xuICAgIHJldHVybiAob2JqW3hdID0gMSwgb2JqKTtcbiAgfSwge30pO1xufTtcblxudS5rZXlzdHIgPSBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgLy8gdXNlIHRvIGVuc3VyZSBjb25zaXN0ZW50IGtleSBnZW5lcmF0aW9uIGFjcm9zcyBtb2R1bGVzXG4gIHJldHVybiB2YWx1ZXMuam9pbihcInxcIik7XG59O1xuXG4vLyBkYXRhIGFjY2VzcyBmdW5jdGlvbnNcblxudS5maWVsZCA9IGZ1bmN0aW9uKGYpIHtcbiAgcmV0dXJuIGYuc3BsaXQoXCJcXFxcLlwiKVxuICAgIC5tYXAoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5zcGxpdChcIi5cIik7IH0pXG4gICAgLnJlZHVjZShmdW5jdGlvbihhLCBiKSB7XG4gICAgICBpZiAoYS5sZW5ndGgpIHsgYVthLmxlbmd0aC0xXSArPSBcIi5cIiArIGIuc2hpZnQoKTsgfVxuICAgICAgYS5wdXNoLmFwcGx5KGEsIGIpO1xuICAgICAgcmV0dXJuIGE7XG4gICAgfSwgW10pO1xufTtcblxudS5hY2Nlc3NvciA9IGZ1bmN0aW9uKGYpIHtcbiAgdmFyIHM7XG4gIHJldHVybiAodS5pc0Z1bmN0aW9uKGYpIHx8IGY9PW51bGwpXG4gICAgPyBmIDogdS5pc1N0cmluZyhmKSAmJiAocz11LmZpZWxkKGYpKS5sZW5ndGggPiAxXG4gICAgPyBmdW5jdGlvbih4KSB7IHJldHVybiBzLnJlZHVjZShmdW5jdGlvbih4LGYpIHtcbiAgICAgICAgICByZXR1cm4geFtmXTtcbiAgICAgICAgfSwgeCk7XG4gICAgICB9XG4gICAgOiBmdW5jdGlvbih4KSB7IHJldHVybiB4W2ZdOyB9O1xufTtcblxudS5tdXRhdG9yID0gZnVuY3Rpb24oZikge1xuICB2YXIgcztcbiAgcmV0dXJuIHUuaXNTdHJpbmcoZikgJiYgKHM9dS5maWVsZChmKSkubGVuZ3RoID4gMVxuICAgID8gZnVuY3Rpb24oeCwgdikge1xuICAgICAgICBmb3IgKHZhciBpPTA7IGk8cy5sZW5ndGgtMTsgKytpKSB4ID0geFtzW2ldXTtcbiAgICAgICAgeFtzW2ldXSA9IHY7XG4gICAgICB9XG4gICAgOiBmdW5jdGlvbih4LCB2KSB7IHhbZl0gPSB2OyB9O1xufTtcblxuXG4vLyBjb21wYXJpc29uIC8gc29ydGluZyBmdW5jdGlvbnNcblxudS5jb21wYXJhdG9yID0gZnVuY3Rpb24oc29ydCkge1xuICB2YXIgc2lnbiA9IFtdO1xuICBpZiAoc29ydCA9PT0gdW5kZWZpbmVkKSBzb3J0ID0gW107XG4gIHNvcnQgPSB1LmFycmF5KHNvcnQpLm1hcChmdW5jdGlvbihmKSB7XG4gICAgdmFyIHMgPSAxO1xuICAgIGlmICAgICAgKGZbMF0gPT09IFwiLVwiKSB7IHMgPSAtMTsgZiA9IGYuc2xpY2UoMSk7IH1cbiAgICBlbHNlIGlmIChmWzBdID09PSBcIitcIikgeyBzID0gKzE7IGYgPSBmLnNsaWNlKDEpOyB9XG4gICAgc2lnbi5wdXNoKHMpO1xuICAgIHJldHVybiB1LmFjY2Vzc29yKGYpO1xuICB9KTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGEsYikge1xuICAgIHZhciBpLCBuLCBmLCB4LCB5O1xuICAgIGZvciAoaT0wLCBuPXNvcnQubGVuZ3RoOyBpPG47ICsraSkge1xuICAgICAgZiA9IHNvcnRbaV07IHggPSBmKGEpOyB5ID0gZihiKTtcbiAgICAgIGlmICh4IDwgeSkgcmV0dXJuIC0xICogc2lnbltpXTtcbiAgICAgIGlmICh4ID4geSkgcmV0dXJuIHNpZ25baV07XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9O1xufTtcblxudS5jbXAgPSBmdW5jdGlvbihhLCBiKSB7XG4gIGlmIChhIDwgYikge1xuICAgIHJldHVybiAtMTtcbiAgfSBlbHNlIGlmIChhID4gYikge1xuICAgIHJldHVybiAxO1xuICB9IGVsc2UgaWYgKGEgPj0gYikge1xuICAgIHJldHVybiAwO1xuICB9IGVsc2UgaWYgKGEgPT09IG51bGwgJiYgYiA9PT0gbnVsbCkge1xuICAgIHJldHVybiAwO1xuICB9IGVsc2UgaWYgKGEgPT09IG51bGwpIHtcbiAgICByZXR1cm4gLTE7XG4gIH0gZWxzZSBpZiAoYiA9PT0gbnVsbCkge1xuICAgIHJldHVybiAxO1xuICB9XG4gIHJldHVybiBOYU47XG59XG5cbnUubnVtY21wID0gZnVuY3Rpb24oYSwgYikgeyByZXR1cm4gYSAtIGI7IH07XG5cbnUuc3RhYmxlc29ydCA9IGZ1bmN0aW9uKGFycmF5LCBzb3J0QnksIGtleUZuKSB7XG4gIHZhciBpbmRpY2VzID0gYXJyYXkucmVkdWNlKGZ1bmN0aW9uKGlkeCwgdiwgaSkge1xuICAgIHJldHVybiAoaWR4W2tleUZuKHYpXSA9IGksIGlkeCk7XG4gIH0sIHt9KTtcblxuICBhcnJheS5zb3J0KGZ1bmN0aW9uKGEsIGIpIHtcbiAgICB2YXIgc2EgPSBzb3J0QnkoYSksXG4gICAgICAgIHNiID0gc29ydEJ5KGIpO1xuICAgIHJldHVybiBzYSA8IHNiID8gLTEgOiBzYSA+IHNiID8gMVxuICAgICAgICAgOiAoaW5kaWNlc1trZXlGbihhKV0gLSBpbmRpY2VzW2tleUZuKGIpXSk7XG4gIH0pO1xuXG4gIHJldHVybiBhcnJheTtcbn07XG5cbi8vIHN0cmluZyBmdW5jdGlvbnNcblxuLy8gRVM2IGNvbXBhdGliaWxpdHkgcGVyIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL0dsb2JhbF9PYmplY3RzL1N0cmluZy9zdGFydHNXaXRoI1BvbHlmaWxsXG4vLyBXZSBjb3VsZCBoYXZlIHVzZWQgdGhlIHBvbHlmaWxsIGNvZGUsIGJ1dCBsZXRzIHdhaXQgdW50aWwgRVM2IGJlY29tZXMgYSBzdGFuZGFyZCBmaXJzdFxudS5zdGFydHNXaXRoID0gU3RyaW5nLnByb3RvdHlwZS5zdGFydHNXaXRoXG4gID8gZnVuY3Rpb24oc3RyaW5nLCBzZWFyY2hTdHJpbmcpIHtcbiAgICByZXR1cm4gc3RyaW5nLnN0YXJ0c1dpdGgoc2VhcmNoU3RyaW5nKTtcbiAgfVxuICA6IGZ1bmN0aW9uKHN0cmluZywgc2VhcmNoU3RyaW5nKSB7XG4gICAgcmV0dXJuIHN0cmluZy5sYXN0SW5kZXhPZihzZWFyY2hTdHJpbmcsIDApID09PSAwO1xuICB9OyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvaGVhcCcpO1xuIiwiLy8gR2VuZXJhdGVkIGJ5IENvZmZlZVNjcmlwdCAxLjguMFxuKGZ1bmN0aW9uKCkge1xuICB2YXIgSGVhcCwgZGVmYXVsdENtcCwgZmxvb3IsIGhlYXBpZnksIGhlYXBwb3AsIGhlYXBwdXNoLCBoZWFwcHVzaHBvcCwgaGVhcHJlcGxhY2UsIGluc29ydCwgbWluLCBubGFyZ2VzdCwgbnNtYWxsZXN0LCB1cGRhdGVJdGVtLCBfc2lmdGRvd24sIF9zaWZ0dXA7XG5cbiAgZmxvb3IgPSBNYXRoLmZsb29yLCBtaW4gPSBNYXRoLm1pbjtcblxuXG4gIC8qXG4gIERlZmF1bHQgY29tcGFyaXNvbiBmdW5jdGlvbiB0byBiZSB1c2VkXG4gICAqL1xuXG4gIGRlZmF1bHRDbXAgPSBmdW5jdGlvbih4LCB5KSB7XG4gICAgaWYgKHggPCB5KSB7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfVxuICAgIGlmICh4ID4geSkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfVxuICAgIHJldHVybiAwO1xuICB9O1xuXG5cbiAgLypcbiAgSW5zZXJ0IGl0ZW0geCBpbiBsaXN0IGEsIGFuZCBrZWVwIGl0IHNvcnRlZCBhc3N1bWluZyBhIGlzIHNvcnRlZC5cbiAgXG4gIElmIHggaXMgYWxyZWFkeSBpbiBhLCBpbnNlcnQgaXQgdG8gdGhlIHJpZ2h0IG9mIHRoZSByaWdodG1vc3QgeC5cbiAgXG4gIE9wdGlvbmFsIGFyZ3MgbG8gKGRlZmF1bHQgMCkgYW5kIGhpIChkZWZhdWx0IGEubGVuZ3RoKSBib3VuZCB0aGUgc2xpY2VcbiAgb2YgYSB0byBiZSBzZWFyY2hlZC5cbiAgICovXG5cbiAgaW5zb3J0ID0gZnVuY3Rpb24oYSwgeCwgbG8sIGhpLCBjbXApIHtcbiAgICB2YXIgbWlkO1xuICAgIGlmIChsbyA9PSBudWxsKSB7XG4gICAgICBsbyA9IDA7XG4gICAgfVxuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgaWYgKGxvIDwgMCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdsbyBtdXN0IGJlIG5vbi1uZWdhdGl2ZScpO1xuICAgIH1cbiAgICBpZiAoaGkgPT0gbnVsbCkge1xuICAgICAgaGkgPSBhLmxlbmd0aDtcbiAgICB9XG4gICAgd2hpbGUgKGxvIDwgaGkpIHtcbiAgICAgIG1pZCA9IGZsb29yKChsbyArIGhpKSAvIDIpO1xuICAgICAgaWYgKGNtcCh4LCBhW21pZF0pIDwgMCkge1xuICAgICAgICBoaSA9IG1pZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvID0gbWlkICsgMTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIChbXS5zcGxpY2UuYXBwbHkoYSwgW2xvLCBsbyAtIGxvXS5jb25jYXQoeCkpLCB4KTtcbiAgfTtcblxuXG4gIC8qXG4gIFB1c2ggaXRlbSBvbnRvIGhlYXAsIG1haW50YWluaW5nIHRoZSBoZWFwIGludmFyaWFudC5cbiAgICovXG5cbiAgaGVhcHB1c2ggPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgY21wKSB7XG4gICAgaWYgKGNtcCA9PSBudWxsKSB7XG4gICAgICBjbXAgPSBkZWZhdWx0Q21wO1xuICAgIH1cbiAgICBhcnJheS5wdXNoKGl0ZW0pO1xuICAgIHJldHVybiBfc2lmdGRvd24oYXJyYXksIDAsIGFycmF5Lmxlbmd0aCAtIDEsIGNtcCk7XG4gIH07XG5cblxuICAvKlxuICBQb3AgdGhlIHNtYWxsZXN0IGl0ZW0gb2ZmIHRoZSBoZWFwLCBtYWludGFpbmluZyB0aGUgaGVhcCBpbnZhcmlhbnQuXG4gICAqL1xuXG4gIGhlYXBwb3AgPSBmdW5jdGlvbihhcnJheSwgY21wKSB7XG4gICAgdmFyIGxhc3RlbHQsIHJldHVybml0ZW07XG4gICAgaWYgKGNtcCA9PSBudWxsKSB7XG4gICAgICBjbXAgPSBkZWZhdWx0Q21wO1xuICAgIH1cbiAgICBsYXN0ZWx0ID0gYXJyYXkucG9wKCk7XG4gICAgaWYgKGFycmF5Lmxlbmd0aCkge1xuICAgICAgcmV0dXJuaXRlbSA9IGFycmF5WzBdO1xuICAgICAgYXJyYXlbMF0gPSBsYXN0ZWx0O1xuICAgICAgX3NpZnR1cChhcnJheSwgMCwgY21wKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuaXRlbSA9IGxhc3RlbHQ7XG4gICAgfVxuICAgIHJldHVybiByZXR1cm5pdGVtO1xuICB9O1xuXG5cbiAgLypcbiAgUG9wIGFuZCByZXR1cm4gdGhlIGN1cnJlbnQgc21hbGxlc3QgdmFsdWUsIGFuZCBhZGQgdGhlIG5ldyBpdGVtLlxuICBcbiAgVGhpcyBpcyBtb3JlIGVmZmljaWVudCB0aGFuIGhlYXBwb3AoKSBmb2xsb3dlZCBieSBoZWFwcHVzaCgpLCBhbmQgY2FuIGJlXG4gIG1vcmUgYXBwcm9wcmlhdGUgd2hlbiB1c2luZyBhIGZpeGVkIHNpemUgaGVhcC4gTm90ZSB0aGF0IHRoZSB2YWx1ZVxuICByZXR1cm5lZCBtYXkgYmUgbGFyZ2VyIHRoYW4gaXRlbSEgVGhhdCBjb25zdHJhaW5zIHJlYXNvbmFibGUgdXNlIG9mXG4gIHRoaXMgcm91dGluZSB1bmxlc3Mgd3JpdHRlbiBhcyBwYXJ0IG9mIGEgY29uZGl0aW9uYWwgcmVwbGFjZW1lbnQ6XG4gICAgICBpZiBpdGVtID4gYXJyYXlbMF1cbiAgICAgICAgaXRlbSA9IGhlYXByZXBsYWNlKGFycmF5LCBpdGVtKVxuICAgKi9cblxuICBoZWFwcmVwbGFjZSA9IGZ1bmN0aW9uKGFycmF5LCBpdGVtLCBjbXApIHtcbiAgICB2YXIgcmV0dXJuaXRlbTtcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIHJldHVybml0ZW0gPSBhcnJheVswXTtcbiAgICBhcnJheVswXSA9IGl0ZW07XG4gICAgX3NpZnR1cChhcnJheSwgMCwgY21wKTtcbiAgICByZXR1cm4gcmV0dXJuaXRlbTtcbiAgfTtcblxuXG4gIC8qXG4gIEZhc3QgdmVyc2lvbiBvZiBhIGhlYXBwdXNoIGZvbGxvd2VkIGJ5IGEgaGVhcHBvcC5cbiAgICovXG5cbiAgaGVhcHB1c2hwb3AgPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgY21wKSB7XG4gICAgdmFyIF9yZWY7XG4gICAgaWYgKGNtcCA9PSBudWxsKSB7XG4gICAgICBjbXAgPSBkZWZhdWx0Q21wO1xuICAgIH1cbiAgICBpZiAoYXJyYXkubGVuZ3RoICYmIGNtcChhcnJheVswXSwgaXRlbSkgPCAwKSB7XG4gICAgICBfcmVmID0gW2FycmF5WzBdLCBpdGVtXSwgaXRlbSA9IF9yZWZbMF0sIGFycmF5WzBdID0gX3JlZlsxXTtcbiAgICAgIF9zaWZ0dXAoYXJyYXksIDAsIGNtcCk7XG4gICAgfVxuICAgIHJldHVybiBpdGVtO1xuICB9O1xuXG5cbiAgLypcbiAgVHJhbnNmb3JtIGxpc3QgaW50byBhIGhlYXAsIGluLXBsYWNlLCBpbiBPKGFycmF5Lmxlbmd0aCkgdGltZS5cbiAgICovXG5cbiAgaGVhcGlmeSA9IGZ1bmN0aW9uKGFycmF5LCBjbXApIHtcbiAgICB2YXIgaSwgX2ksIF9qLCBfbGVuLCBfcmVmLCBfcmVmMSwgX3Jlc3VsdHMsIF9yZXN1bHRzMTtcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIF9yZWYxID0gKGZ1bmN0aW9uKCkge1xuICAgICAgX3Jlc3VsdHMxID0gW107XG4gICAgICBmb3IgKHZhciBfaiA9IDAsIF9yZWYgPSBmbG9vcihhcnJheS5sZW5ndGggLyAyKTsgMCA8PSBfcmVmID8gX2ogPCBfcmVmIDogX2ogPiBfcmVmOyAwIDw9IF9yZWYgPyBfaisrIDogX2otLSl7IF9yZXN1bHRzMS5wdXNoKF9qKTsgfVxuICAgICAgcmV0dXJuIF9yZXN1bHRzMTtcbiAgICB9KS5hcHBseSh0aGlzKS5yZXZlcnNlKCk7XG4gICAgX3Jlc3VsdHMgPSBbXTtcbiAgICBmb3IgKF9pID0gMCwgX2xlbiA9IF9yZWYxLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICBpID0gX3JlZjFbX2ldO1xuICAgICAgX3Jlc3VsdHMucHVzaChfc2lmdHVwKGFycmF5LCBpLCBjbXApKTtcbiAgICB9XG4gICAgcmV0dXJuIF9yZXN1bHRzO1xuICB9O1xuXG5cbiAgLypcbiAgVXBkYXRlIHRoZSBwb3NpdGlvbiBvZiB0aGUgZ2l2ZW4gaXRlbSBpbiB0aGUgaGVhcC5cbiAgVGhpcyBmdW5jdGlvbiBzaG91bGQgYmUgY2FsbGVkIGV2ZXJ5IHRpbWUgdGhlIGl0ZW0gaXMgYmVpbmcgbW9kaWZpZWQuXG4gICAqL1xuXG4gIHVwZGF0ZUl0ZW0gPSBmdW5jdGlvbihhcnJheSwgaXRlbSwgY21wKSB7XG4gICAgdmFyIHBvcztcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIHBvcyA9IGFycmF5LmluZGV4T2YoaXRlbSk7XG4gICAgaWYgKHBvcyA9PT0gLTEpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgX3NpZnRkb3duKGFycmF5LCAwLCBwb3MsIGNtcCk7XG4gICAgcmV0dXJuIF9zaWZ0dXAoYXJyYXksIHBvcywgY21wKTtcbiAgfTtcblxuXG4gIC8qXG4gIEZpbmQgdGhlIG4gbGFyZ2VzdCBlbGVtZW50cyBpbiBhIGRhdGFzZXQuXG4gICAqL1xuXG4gIG5sYXJnZXN0ID0gZnVuY3Rpb24oYXJyYXksIG4sIGNtcCkge1xuICAgIHZhciBlbGVtLCByZXN1bHQsIF9pLCBfbGVuLCBfcmVmO1xuICAgIGlmIChjbXAgPT0gbnVsbCkge1xuICAgICAgY21wID0gZGVmYXVsdENtcDtcbiAgICB9XG4gICAgcmVzdWx0ID0gYXJyYXkuc2xpY2UoMCwgbik7XG4gICAgaWYgKCFyZXN1bHQubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICBoZWFwaWZ5KHJlc3VsdCwgY21wKTtcbiAgICBfcmVmID0gYXJyYXkuc2xpY2Uobik7XG4gICAgZm9yIChfaSA9IDAsIF9sZW4gPSBfcmVmLmxlbmd0aDsgX2kgPCBfbGVuOyBfaSsrKSB7XG4gICAgICBlbGVtID0gX3JlZltfaV07XG4gICAgICBoZWFwcHVzaHBvcChyZXN1bHQsIGVsZW0sIGNtcCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQuc29ydChjbXApLnJldmVyc2UoKTtcbiAgfTtcblxuXG4gIC8qXG4gIEZpbmQgdGhlIG4gc21hbGxlc3QgZWxlbWVudHMgaW4gYSBkYXRhc2V0LlxuICAgKi9cblxuICBuc21hbGxlc3QgPSBmdW5jdGlvbihhcnJheSwgbiwgY21wKSB7XG4gICAgdmFyIGVsZW0sIGksIGxvcywgcmVzdWx0LCBfaSwgX2osIF9sZW4sIF9yZWYsIF9yZWYxLCBfcmVzdWx0cztcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIGlmIChuICogMTAgPD0gYXJyYXkubGVuZ3RoKSB7XG4gICAgICByZXN1bHQgPSBhcnJheS5zbGljZSgwLCBuKS5zb3J0KGNtcCk7XG4gICAgICBpZiAoIXJlc3VsdC5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH1cbiAgICAgIGxvcyA9IHJlc3VsdFtyZXN1bHQubGVuZ3RoIC0gMV07XG4gICAgICBfcmVmID0gYXJyYXkuc2xpY2Uobik7XG4gICAgICBmb3IgKF9pID0gMCwgX2xlbiA9IF9yZWYubGVuZ3RoOyBfaSA8IF9sZW47IF9pKyspIHtcbiAgICAgICAgZWxlbSA9IF9yZWZbX2ldO1xuICAgICAgICBpZiAoY21wKGVsZW0sIGxvcykgPCAwKSB7XG4gICAgICAgICAgaW5zb3J0KHJlc3VsdCwgZWxlbSwgMCwgbnVsbCwgY21wKTtcbiAgICAgICAgICByZXN1bHQucG9wKCk7XG4gICAgICAgICAgbG9zID0gcmVzdWx0W3Jlc3VsdC5sZW5ndGggLSAxXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gICAgaGVhcGlmeShhcnJheSwgY21wKTtcbiAgICBfcmVzdWx0cyA9IFtdO1xuICAgIGZvciAoaSA9IF9qID0gMCwgX3JlZjEgPSBtaW4obiwgYXJyYXkubGVuZ3RoKTsgMCA8PSBfcmVmMSA/IF9qIDwgX3JlZjEgOiBfaiA+IF9yZWYxOyBpID0gMCA8PSBfcmVmMSA/ICsrX2ogOiAtLV9qKSB7XG4gICAgICBfcmVzdWx0cy5wdXNoKGhlYXBwb3AoYXJyYXksIGNtcCkpO1xuICAgIH1cbiAgICByZXR1cm4gX3Jlc3VsdHM7XG4gIH07XG5cbiAgX3NpZnRkb3duID0gZnVuY3Rpb24oYXJyYXksIHN0YXJ0cG9zLCBwb3MsIGNtcCkge1xuICAgIHZhciBuZXdpdGVtLCBwYXJlbnQsIHBhcmVudHBvcztcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIG5ld2l0ZW0gPSBhcnJheVtwb3NdO1xuICAgIHdoaWxlIChwb3MgPiBzdGFydHBvcykge1xuICAgICAgcGFyZW50cG9zID0gKHBvcyAtIDEpID4+IDE7XG4gICAgICBwYXJlbnQgPSBhcnJheVtwYXJlbnRwb3NdO1xuICAgICAgaWYgKGNtcChuZXdpdGVtLCBwYXJlbnQpIDwgMCkge1xuICAgICAgICBhcnJheVtwb3NdID0gcGFyZW50O1xuICAgICAgICBwb3MgPSBwYXJlbnRwb3M7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiBhcnJheVtwb3NdID0gbmV3aXRlbTtcbiAgfTtcblxuICBfc2lmdHVwID0gZnVuY3Rpb24oYXJyYXksIHBvcywgY21wKSB7XG4gICAgdmFyIGNoaWxkcG9zLCBlbmRwb3MsIG5ld2l0ZW0sIHJpZ2h0cG9zLCBzdGFydHBvcztcbiAgICBpZiAoY21wID09IG51bGwpIHtcbiAgICAgIGNtcCA9IGRlZmF1bHRDbXA7XG4gICAgfVxuICAgIGVuZHBvcyA9IGFycmF5Lmxlbmd0aDtcbiAgICBzdGFydHBvcyA9IHBvcztcbiAgICBuZXdpdGVtID0gYXJyYXlbcG9zXTtcbiAgICBjaGlsZHBvcyA9IDIgKiBwb3MgKyAxO1xuICAgIHdoaWxlIChjaGlsZHBvcyA8IGVuZHBvcykge1xuICAgICAgcmlnaHRwb3MgPSBjaGlsZHBvcyArIDE7XG4gICAgICBpZiAocmlnaHRwb3MgPCBlbmRwb3MgJiYgIShjbXAoYXJyYXlbY2hpbGRwb3NdLCBhcnJheVtyaWdodHBvc10pIDwgMCkpIHtcbiAgICAgICAgY2hpbGRwb3MgPSByaWdodHBvcztcbiAgICAgIH1cbiAgICAgIGFycmF5W3Bvc10gPSBhcnJheVtjaGlsZHBvc107XG4gICAgICBwb3MgPSBjaGlsZHBvcztcbiAgICAgIGNoaWxkcG9zID0gMiAqIHBvcyArIDE7XG4gICAgfVxuICAgIGFycmF5W3Bvc10gPSBuZXdpdGVtO1xuICAgIHJldHVybiBfc2lmdGRvd24oYXJyYXksIHN0YXJ0cG9zLCBwb3MsIGNtcCk7XG4gIH07XG5cbiAgSGVhcCA9IChmdW5jdGlvbigpIHtcbiAgICBIZWFwLnB1c2ggPSBoZWFwcHVzaDtcblxuICAgIEhlYXAucG9wID0gaGVhcHBvcDtcblxuICAgIEhlYXAucmVwbGFjZSA9IGhlYXByZXBsYWNlO1xuXG4gICAgSGVhcC5wdXNocG9wID0gaGVhcHB1c2hwb3A7XG5cbiAgICBIZWFwLmhlYXBpZnkgPSBoZWFwaWZ5O1xuXG4gICAgSGVhcC51cGRhdGVJdGVtID0gdXBkYXRlSXRlbTtcblxuICAgIEhlYXAubmxhcmdlc3QgPSBubGFyZ2VzdDtcblxuICAgIEhlYXAubnNtYWxsZXN0ID0gbnNtYWxsZXN0O1xuXG4gICAgZnVuY3Rpb24gSGVhcChjbXApIHtcbiAgICAgIHRoaXMuY21wID0gY21wICE9IG51bGwgPyBjbXAgOiBkZWZhdWx0Q21wO1xuICAgICAgdGhpcy5ub2RlcyA9IFtdO1xuICAgIH1cblxuICAgIEhlYXAucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gaGVhcHB1c2godGhpcy5ub2RlcywgeCwgdGhpcy5jbXApO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBoZWFwcG9wKHRoaXMubm9kZXMsIHRoaXMuY21wKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUucGVlayA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubm9kZXNbMF07XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLmNvbnRhaW5zID0gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHRoaXMubm9kZXMuaW5kZXhPZih4KSAhPT0gLTE7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLnJlcGxhY2UgPSBmdW5jdGlvbih4KSB7XG4gICAgICByZXR1cm4gaGVhcHJlcGxhY2UodGhpcy5ub2RlcywgeCwgdGhpcy5jbXApO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5wdXNocG9wID0gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIGhlYXBwdXNocG9wKHRoaXMubm9kZXMsIHgsIHRoaXMuY21wKTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUuaGVhcGlmeSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGhlYXBpZnkodGhpcy5ub2RlcywgdGhpcy5jbXApO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS51cGRhdGVJdGVtID0gZnVuY3Rpb24oeCkge1xuICAgICAgcmV0dXJuIHVwZGF0ZUl0ZW0odGhpcy5ub2RlcywgeCwgdGhpcy5jbXApO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubm9kZXMgPSBbXTtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUuZW1wdHkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzLmxlbmd0aCA9PT0gMDtcbiAgICB9O1xuXG4gICAgSGVhcC5wcm90b3R5cGUuc2l6ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubm9kZXMubGVuZ3RoO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5jbG9uZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGhlYXA7XG4gICAgICBoZWFwID0gbmV3IEhlYXAoKTtcbiAgICAgIGhlYXAubm9kZXMgPSB0aGlzLm5vZGVzLnNsaWNlKDApO1xuICAgICAgcmV0dXJuIGhlYXA7XG4gICAgfTtcblxuICAgIEhlYXAucHJvdG90eXBlLnRvQXJyYXkgPSBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLm5vZGVzLnNsaWNlKDApO1xuICAgIH07XG5cbiAgICBIZWFwLnByb3RvdHlwZS5pbnNlcnQgPSBIZWFwLnByb3RvdHlwZS5wdXNoO1xuXG4gICAgSGVhcC5wcm90b3R5cGUudG9wID0gSGVhcC5wcm90b3R5cGUucGVlaztcblxuICAgIEhlYXAucHJvdG90eXBlLmZyb250ID0gSGVhcC5wcm90b3R5cGUucGVlaztcblxuICAgIEhlYXAucHJvdG90eXBlLmhhcyA9IEhlYXAucHJvdG90eXBlLmNvbnRhaW5zO1xuXG4gICAgSGVhcC5wcm90b3R5cGUuY29weSA9IEhlYXAucHJvdG90eXBlLmNsb25lO1xuXG4gICAgcmV0dXJuIEhlYXA7XG5cbiAgfSkoKTtcblxuICAoZnVuY3Rpb24ocm9vdCwgZmFjdG9yeSkge1xuICAgIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgIHJldHVybiBkZWZpbmUoW10sIGZhY3RvcnkpO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgICByZXR1cm4gbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiByb290LkhlYXAgPSBmYWN0b3J5KCk7XG4gICAgfVxuICB9KSh0aGlzLCBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gSGVhcDtcbiAgfSk7XG5cbn0pLmNhbGwodGhpcyk7XG4iLCJ2YXIgYm91bmRzID0gZnVuY3Rpb24oYikge1xuICB0aGlzLmNsZWFyKCk7XG4gIGlmIChiKSB0aGlzLnVuaW9uKGIpO1xufTtcblxudmFyIHByb3RvdHlwZSA9IGJvdW5kcy5wcm90b3R5cGU7XG5cbnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLngxID0gK051bWJlci5NQVhfVkFMVUU7XG4gIHRoaXMueTEgPSArTnVtYmVyLk1BWF9WQUxVRTtcbiAgdGhpcy54MiA9IC1OdW1iZXIuTUFYX1ZBTFVFO1xuICB0aGlzLnkyID0gLU51bWJlci5NQVhfVkFMVUU7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uKHgxLCB5MSwgeDIsIHkyKSB7XG4gIHRoaXMueDEgPSB4MTtcbiAgdGhpcy55MSA9IHkxO1xuICB0aGlzLngyID0geDI7XG4gIHRoaXMueTIgPSB5MjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24oeCwgeSkge1xuICBpZiAoeCA8IHRoaXMueDEpIHRoaXMueDEgPSB4O1xuICBpZiAoeSA8IHRoaXMueTEpIHRoaXMueTEgPSB5O1xuICBpZiAoeCA+IHRoaXMueDIpIHRoaXMueDIgPSB4O1xuICBpZiAoeSA+IHRoaXMueTIpIHRoaXMueTIgPSB5O1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvdHlwZS5leHBhbmQgPSBmdW5jdGlvbihkKSB7XG4gIHRoaXMueDEgLT0gZDtcbiAgdGhpcy55MSAtPSBkO1xuICB0aGlzLngyICs9IGQ7XG4gIHRoaXMueTIgKz0gZDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90b3R5cGUucm91bmQgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy54MSA9IE1hdGguZmxvb3IodGhpcy54MSk7XG4gIHRoaXMueTEgPSBNYXRoLmZsb29yKHRoaXMueTEpO1xuICB0aGlzLngyID0gTWF0aC5jZWlsKHRoaXMueDIpO1xuICB0aGlzLnkyID0gTWF0aC5jZWlsKHRoaXMueTIpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvdHlwZS50cmFuc2xhdGUgPSBmdW5jdGlvbihkeCwgZHkpIHtcbiAgdGhpcy54MSArPSBkeDtcbiAgdGhpcy54MiArPSBkeDtcbiAgdGhpcy55MSArPSBkeTtcbiAgdGhpcy55MiArPSBkeTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90b3R5cGUucm90YXRlID0gZnVuY3Rpb24oYW5nbGUsIHgsIHkpIHtcbiAgdmFyIGNvcyA9IE1hdGguY29zKGFuZ2xlKSxcbiAgICAgIHNpbiA9IE1hdGguc2luKGFuZ2xlKSxcbiAgICAgIGN4ID0geCAtIHgqY29zICsgeSpzaW4sXG4gICAgICBjeSA9IHkgLSB4KnNpbiAtIHkqY29zLFxuICAgICAgeDEgPSB0aGlzLngxLCB4MiA9IHRoaXMueDIsXG4gICAgICB5MSA9IHRoaXMueTEsIHkyID0gdGhpcy55MjtcblxuICByZXR1cm4gdGhpcy5jbGVhcigpXG4gICAgLmFkZChjb3MqeDEgLSBzaW4qeTEgKyBjeCwgIHNpbip4MSArIGNvcyp5MSArIGN5KVxuICAgIC5hZGQoY29zKngxIC0gc2luKnkyICsgY3gsICBzaW4qeDEgKyBjb3MqeTIgKyBjeSlcbiAgICAuYWRkKGNvcyp4MiAtIHNpbip5MSArIGN4LCAgc2luKngyICsgY29zKnkxICsgY3kpXG4gICAgLmFkZChjb3MqeDIgLSBzaW4qeTIgKyBjeCwgIHNpbip4MiArIGNvcyp5MiArIGN5KTtcbn1cblxucHJvdG90eXBlLnVuaW9uID0gZnVuY3Rpb24oYikge1xuICBpZiAoYi54MSA8IHRoaXMueDEpIHRoaXMueDEgPSBiLngxO1xuICBpZiAoYi55MSA8IHRoaXMueTEpIHRoaXMueTEgPSBiLnkxO1xuICBpZiAoYi54MiA+IHRoaXMueDIpIHRoaXMueDIgPSBiLngyO1xuICBpZiAoYi55MiA+IHRoaXMueTIpIHRoaXMueTIgPSBiLnkyO1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvdHlwZS5lbmNsb3NlcyA9IGZ1bmN0aW9uKGIpIHtcbiAgcmV0dXJuIGIgJiYgKFxuICAgIHRoaXMueDEgPD0gYi54MSAmJlxuICAgIHRoaXMueDIgPj0gYi54MiAmJlxuICAgIHRoaXMueTEgPD0gYi55MSAmJlxuICAgIHRoaXMueTIgPj0gYi55MlxuICApO1xufTtcblxucHJvdG90eXBlLmludGVyc2VjdHMgPSBmdW5jdGlvbihiKSB7XG4gIHJldHVybiBiICYmICEoXG4gICAgdGhpcy54MiA8IGIueDEgfHxcbiAgICB0aGlzLngxID4gYi54MiB8fFxuICAgIHRoaXMueTIgPCBiLnkxIHx8XG4gICAgdGhpcy55MSA+IGIueTJcbiAgKTtcbn07XG5cbnByb3RvdHlwZS5jb250YWlucyA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgcmV0dXJuICEoXG4gICAgeCA8IHRoaXMueDEgfHxcbiAgICB4ID4gdGhpcy54MiB8fFxuICAgIHkgPCB0aGlzLnkxIHx8XG4gICAgeSA+IHRoaXMueTJcbiAgKTtcbn07XG5cbnByb3RvdHlwZS53aWR0aCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy54MiAtIHRoaXMueDE7XG59O1xuXG5wcm90b3R5cGUuaGVpZ2h0ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnkyIC0gdGhpcy55MTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gYm91bmRzOyIsInZhciBHcmFwaCA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L0dyYXBoJyksIFxuICAgIE5vZGUgID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvTm9kZScpLFxuICAgIEdyb3VwQnVpbGRlciA9IHJlcXVpcmUoJy4uL3NjZW5lL0dyb3VwQnVpbGRlcicpLFxuICAgIGNoYW5nZXNldCA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L2NoYW5nZXNldCcpLCBcbiAgICBkbCA9IHJlcXVpcmUoJ2RhdGFsaWInKTtcblxuZnVuY3Rpb24gTW9kZWwoKSB7XG4gIHRoaXMuX2RlZnMgPSB7fTtcbiAgdGhpcy5fcHJlZGljYXRlcyA9IHt9O1xuICB0aGlzLl9zY2VuZSA9IG51bGw7XG5cbiAgdGhpcy5ncmFwaCA9IG5ldyBHcmFwaCgpO1xuXG4gIHRoaXMuX25vZGUgPSBuZXcgTm9kZSh0aGlzLmdyYXBoKTtcbiAgdGhpcy5fYnVpbGRlciA9IG51bGw7IC8vIFRvcC1sZXZlbCBzY2VuZWdyYXBoIGJ1aWxkZXJcbn07XG5cbnZhciBwcm90byA9IE1vZGVsLnByb3RvdHlwZTtcblxucHJvdG8uZGVmcyA9IGZ1bmN0aW9uKGRlZnMpIHtcbiAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5fZGVmcztcbiAgdGhpcy5fZGVmcyA9IGRlZnM7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG8uZGF0YSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZGF0YSA9IHRoaXMuZ3JhcGguZGF0YS5hcHBseSh0aGlzLmdyYXBoLCBhcmd1bWVudHMpO1xuICBpZihhcmd1bWVudHMubGVuZ3RoID4gMSkgeyAgLy8gbmV3IERhdGFzb3VyY2VcbiAgICB0aGlzLl9ub2RlLmFkZExpc3RlbmVyKGRhdGEucGlwZWxpbmUoKVswXSk7XG4gIH1cblxuICByZXR1cm4gZGF0YTtcbn07XG5cbmZ1bmN0aW9uIHByZWRpY2F0ZXMobmFtZSkge1xuICB2YXIgbSA9IHRoaXMsIHByZWRpY2F0ZXMgPSB7fTtcbiAgaWYoIWRsLmlzQXJyYXkobmFtZSkpIHJldHVybiB0aGlzLl9wcmVkaWNhdGVzW25hbWVdO1xuICBuYW1lLmZvckVhY2goZnVuY3Rpb24obikgeyBwcmVkaWNhdGVzW25dID0gbS5fcHJlZGljYXRlc1tuXSB9KTtcbiAgcmV0dXJuIHByZWRpY2F0ZXM7XG59XG5cbnByb3RvLnByZWRpY2F0ZSA9IGZ1bmN0aW9uKG5hbWUsIHByZWRpY2F0ZSkge1xuICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAxKSByZXR1cm4gcHJlZGljYXRlcy5jYWxsKHRoaXMsIG5hbWUpO1xuICByZXR1cm4gKHRoaXMuX3ByZWRpY2F0ZXNbbmFtZV0gPSBwcmVkaWNhdGUpO1xufTtcblxucHJvdG8ucHJlZGljYXRlcyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fcHJlZGljYXRlczsgfTtcblxucHJvdG8uc2NlbmUgPSBmdW5jdGlvbihyZW5kZXJlcikge1xuICBpZighYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX3NjZW5lO1xuICBpZih0aGlzLl9idWlsZGVyKSB0aGlzLl9ub2RlLnJlbW92ZUxpc3RlbmVyKHRoaXMuX2J1aWxkZXIuZGlzY29ubmVjdCgpKTtcbiAgdGhpcy5fYnVpbGRlciA9IG5ldyBHcm91cEJ1aWxkZXIodGhpcywgdGhpcy5fZGVmcy5tYXJrcywgdGhpcy5fc2NlbmU9e30pO1xuICB0aGlzLl9ub2RlLmFkZExpc3RlbmVyKHRoaXMuX2J1aWxkZXIuY29ubmVjdCgpKTtcbiAgdmFyIHAgPSB0aGlzLl9idWlsZGVyLnBpcGVsaW5lKCk7XG4gIHBbcC5sZW5ndGgtMV0uYWRkTGlzdGVuZXIocmVuZGVyZXIpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvLmFkZExpc3RlbmVyID0gZnVuY3Rpb24obCkgeyB0aGlzLl9ub2RlLmFkZExpc3RlbmVyKGwpOyB9O1xucHJvdG8ucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbihsKSB7IHRoaXMuX25vZGUucmVtb3ZlTGlzdGVuZXIobCk7IH07XG5cbnByb3RvLmZpcmUgPSBmdW5jdGlvbihjcykge1xuICBpZighY3MpIGNzID0gY2hhbmdlc2V0LmNyZWF0ZSgpO1xuICB0aGlzLmdyYXBoLnByb3BhZ2F0ZShjcywgdGhpcy5fbm9kZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1vZGVsOyIsInZhciBkMyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmQzIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5kMyA6IG51bGwpLFxuICAgIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIE5vZGUgPSByZXF1aXJlKCcuLi9kYXRhZmxvdy9Ob2RlJyksXG4gICAgcGFyc2VTdHJlYW1zID0gcmVxdWlyZSgnLi4vcGFyc2Uvc3RyZWFtcycpLFxuICAgIGNhbnZhcyA9IHJlcXVpcmUoJy4uL3JlbmRlci9jYW52YXMvaW5kZXgnKSxcbiAgICBzdmcgPSByZXF1aXJlKCcuLi9yZW5kZXIvc3ZnL2luZGV4JyksXG4gICAgVHJhbnNpdGlvbiA9IHJlcXVpcmUoJy4uL3NjZW5lL1RyYW5zaXRpb24nKSxcbiAgICBjb25maWcgPSByZXF1aXJlKCcuLi91dGlsL2NvbmZpZycpLFxuICAgIGRlYnVnID0gcmVxdWlyZSgnLi4vdXRpbC9kZWJ1ZycpLFxuICAgIGNoYW5nZXNldCA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L2NoYW5nZXNldCcpO1xuXG52YXIgVmlldyA9IGZ1bmN0aW9uKGVsLCB3aWR0aCwgaGVpZ2h0LCBtb2RlbCkge1xuICB0aGlzLl9lbCAgICA9IG51bGw7XG4gIHRoaXMuX21vZGVsID0gbnVsbDtcbiAgdGhpcy5fd2lkdGggPSB0aGlzLl9fd2lkdGggPSB3aWR0aCB8fCA1MDA7XG4gIHRoaXMuX2hlaWdodCA9IHRoaXMuX19oZWlnaHQgPSBoZWlnaHQgfHwgMzAwO1xuICB0aGlzLl9hdXRvcGFkID0gMTtcbiAgdGhpcy5fcGFkZGluZyA9IHt0b3A6MCwgbGVmdDowLCBib3R0b206MCwgcmlnaHQ6MH07XG4gIHRoaXMuX3ZpZXdwb3J0ID0gbnVsbDtcbiAgdGhpcy5fcmVuZGVyZXIgPSBudWxsO1xuICB0aGlzLl9oYW5kbGVyID0gbnVsbDtcbiAgdGhpcy5faW8gPSBjYW52YXM7XG4gIGlmIChlbCkgdGhpcy5pbml0aWFsaXplKGVsKTtcbn07XG5cbnZhciBwcm90b3R5cGUgPSBWaWV3LnByb3RvdHlwZTtcblxucHJvdG90eXBlLm1vZGVsID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5fbW9kZWw7XG4gIGlmICh0aGlzLl9tb2RlbCAhPT0gbW9kZWwpIHtcbiAgICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICAgIGlmICh0aGlzLl9oYW5kbGVyKSB0aGlzLl9oYW5kbGVyLm1vZGVsKG1vZGVsKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvdHlwZS5kYXRhID0gZnVuY3Rpb24oZGF0YSkge1xuICB2YXIgbSA9IHRoaXMubW9kZWwoKTtcbiAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbS5kYXRhKCk7XG4gIGRsLmtleXMoZGF0YSkuZm9yRWFjaChmdW5jdGlvbihkKSB7IG0uZGF0YShkKS5hZGQoZGwuZHVwbGljYXRlKGRhdGFbZF0pKTsgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG90eXBlLndpZHRoID0gZnVuY3Rpb24od2lkdGgpIHtcbiAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5fX3dpZHRoO1xuICBpZiAodGhpcy5fX3dpZHRoICE9PSB3aWR0aCkge1xuICAgIHRoaXMuX3dpZHRoID0gdGhpcy5fX3dpZHRoID0gd2lkdGg7XG4gICAgaWYgKHRoaXMuX2VsKSB0aGlzLmluaXRpYWxpemUodGhpcy5fZWwucGFyZW50Tm9kZSk7XG4gICAgaWYgKHRoaXMuX3N0cmljdCkgdGhpcy5fYXV0b3BhZCA9IDE7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90b3R5cGUuaGVpZ2h0ID0gZnVuY3Rpb24oaGVpZ2h0KSB7XG4gIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX19oZWlnaHQ7XG4gIGlmICh0aGlzLl9faGVpZ2h0ICE9PSBoZWlnaHQpIHtcbiAgICB0aGlzLl9oZWlnaHQgPSB0aGlzLl9faGVpZ2h0ID0gaGVpZ2h0O1xuICAgIGlmICh0aGlzLl9lbCkgdGhpcy5pbml0aWFsaXplKHRoaXMuX2VsLnBhcmVudE5vZGUpO1xuICAgIGlmICh0aGlzLl9zdHJpY3QpIHRoaXMuX2F1dG9wYWQgPSAxO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG90eXBlLnBhZGRpbmcgPSBmdW5jdGlvbihwYWQpIHtcbiAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5fcGFkZGluZztcbiAgaWYgKHRoaXMuX3BhZGRpbmcgIT09IHBhZCkge1xuICAgIGlmIChkbC5pc1N0cmluZyhwYWQpKSB7XG4gICAgICB0aGlzLl9hdXRvcGFkID0gMTtcbiAgICAgIHRoaXMuX3BhZGRpbmcgPSB7dG9wOjAsIGxlZnQ6MCwgYm90dG9tOjAsIHJpZ2h0OjB9O1xuICAgICAgdGhpcy5fc3RyaWN0ID0gKHBhZCA9PT0gXCJzdHJpY3RcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2F1dG9wYWQgPSAwO1xuICAgICAgdGhpcy5fcGFkZGluZyA9IHBhZDtcbiAgICAgIHRoaXMuX3N0cmljdCA9IGZhbHNlO1xuICAgIH1cbiAgICBpZiAodGhpcy5fZWwpIHtcbiAgICAgIHRoaXMuX3JlbmRlcmVyLnJlc2l6ZSh0aGlzLl93aWR0aCwgdGhpcy5faGVpZ2h0LCBwYWQpO1xuICAgICAgdGhpcy5faGFuZGxlci5wYWRkaW5nKHBhZCk7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG90eXBlLmF1dG9wYWQgPSBmdW5jdGlvbihvcHQpIHtcbiAgaWYgKHRoaXMuX2F1dG9wYWQgPCAxKSByZXR1cm4gdGhpcztcbiAgZWxzZSB0aGlzLl9hdXRvcGFkID0gMDtcblxuICB2YXIgcGFkID0gdGhpcy5fcGFkZGluZyxcbiAgICAgIGIgPSB0aGlzLm1vZGVsKCkuc2NlbmUoKS5ib3VuZHMsXG4gICAgICBpbnNldCA9IGNvbmZpZy5hdXRvcGFkSW5zZXQsXG4gICAgICBsID0gYi54MSA8IDAgPyBNYXRoLmNlaWwoLWIueDEpICsgaW5zZXQgOiAwLFxuICAgICAgdCA9IGIueTEgPCAwID8gTWF0aC5jZWlsKC1iLnkxKSArIGluc2V0IDogMCxcbiAgICAgIHIgPSBiLngyID4gdGhpcy5fd2lkdGggID8gTWF0aC5jZWlsKCtiLngyIC0gdGhpcy5fd2lkdGgpICsgaW5zZXQgOiAwLFxuICAgICAgYiA9IGIueTIgPiB0aGlzLl9oZWlnaHQgPyBNYXRoLmNlaWwoK2IueTIgLSB0aGlzLl9oZWlnaHQpICsgaW5zZXQgOiAwO1xuICBwYWQgPSB7bGVmdDpsLCB0b3A6dCwgcmlnaHQ6ciwgYm90dG9tOmJ9O1xuXG4gIGlmICh0aGlzLl9zdHJpY3QpIHtcbiAgICB0aGlzLl9hdXRvcGFkID0gMDtcbiAgICB0aGlzLl9wYWRkaW5nID0gcGFkO1xuICAgIHRoaXMuX3dpZHRoID0gTWF0aC5tYXgoMCwgdGhpcy5fX3dpZHRoIC0gKGwrcikpO1xuICAgIHRoaXMuX2hlaWdodCA9IE1hdGgubWF4KDAsIHRoaXMuX19oZWlnaHQgLSAodCtiKSk7XG4gICAgdGhpcy5fbW9kZWwud2lkdGgodGhpcy5fd2lkdGgpO1xuICAgIHRoaXMuX21vZGVsLmhlaWdodCh0aGlzLl9oZWlnaHQpO1xuICAgIGlmICh0aGlzLl9lbCkgdGhpcy5pbml0aWFsaXplKHRoaXMuX2VsLnBhcmVudE5vZGUpO1xuICAgIHRoaXMudXBkYXRlKCk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYWRkaW5nKHBhZCkudXBkYXRlKG9wdCk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90b3R5cGUudmlld3BvcnQgPSBmdW5jdGlvbihzaXplKSB7XG4gIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX3ZpZXdwb3J0O1xuICBpZiAodGhpcy5fdmlld3BvcnQgIT09IHNpemUpIHtcbiAgICB0aGlzLl92aWV3cG9ydCA9IHNpemU7XG4gICAgaWYgKHRoaXMuX2VsKSB0aGlzLmluaXRpYWxpemUodGhpcy5fZWwucGFyZW50Tm9kZSk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90b3R5cGUucmVuZGVyZXIgPSBmdW5jdGlvbih0eXBlKSB7XG4gIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX2lvO1xuICBpZiAodHlwZSA9PT0gXCJjYW52YXNcIikgdHlwZSA9IGNhbnZhcztcbiAgaWYgKHR5cGUgPT09IFwic3ZnXCIpIHR5cGUgPSBzdmc7XG4gIGlmICh0aGlzLl9pbyAhPT0gdHlwZSkge1xuICAgIHRoaXMuX2lvID0gdHlwZTtcbiAgICB0aGlzLl9yZW5kZXJlciA9IG51bGw7XG4gICAgaWYgKHRoaXMuX2VsKSB0aGlzLmluaXRpYWxpemUodGhpcy5fZWwucGFyZW50Tm9kZSk7XG4gICAgaWYgKHRoaXMuX2J1aWxkKSB0aGlzLnJlbmRlcigpO1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbihlbCkge1xuICB2YXIgdiA9IHRoaXMsIHByZXZIYW5kbGVyLFxuICAgICAgdyA9IHYuX3dpZHRoLCBoID0gdi5faGVpZ2h0LCBwYWQgPSB2Ll9wYWRkaW5nO1xuICBcbiAgLy8gY2xlYXIgcHJlLWV4aXN0aW5nIGNvbnRhaW5lclxuICBkMy5zZWxlY3QoZWwpLnNlbGVjdChcImRpdi52ZWdhXCIpLnJlbW92ZSgpO1xuICBcbiAgLy8gYWRkIGRpdiBjb250YWluZXJcbiAgdGhpcy5fZWwgPSBlbCA9IGQzLnNlbGVjdChlbClcbiAgICAuYXBwZW5kKFwiZGl2XCIpXG4gICAgLmF0dHIoXCJjbGFzc1wiLCBcInZlZ2FcIilcbiAgICAuc3R5bGUoXCJwb3NpdGlvblwiLCBcInJlbGF0aXZlXCIpXG4gICAgLm5vZGUoKTtcbiAgaWYgKHYuX3ZpZXdwb3J0KSB7XG4gICAgZDMuc2VsZWN0KGVsKVxuICAgICAgLnN0eWxlKFwid2lkdGhcIiwgICh2Ll92aWV3cG9ydFswXSB8fCB3KStcInB4XCIpXG4gICAgICAuc3R5bGUoXCJoZWlnaHRcIiwgKHYuX3ZpZXdwb3J0WzFdIHx8IGgpK1wicHhcIilcbiAgICAgIC5zdHlsZShcIm92ZXJmbG93XCIsIFwiYXV0b1wiKTtcbiAgfVxuICBcbiAgLy8gcmVuZGVyZXJcbiAgdi5fcmVuZGVyZXIgPSAodi5fcmVuZGVyZXIgfHwgbmV3IHRoaXMuX2lvLlJlbmRlcmVyKCkpXG4gICAgLmluaXRpYWxpemUoZWwsIHcsIGgsIHBhZCk7XG4gIFxuICAvLyBpbnB1dCBoYW5kbGVyXG4gIHByZXZIYW5kbGVyID0gdi5faGFuZGxlcjtcbiAgdi5faGFuZGxlciA9IG5ldyB0aGlzLl9pby5IYW5kbGVyKClcbiAgICAuaW5pdGlhbGl6ZShlbCwgcGFkLCB2KVxuICAgIC5tb2RlbCh2Ll9tb2RlbCk7XG5cbiAgaWYgKHByZXZIYW5kbGVyKSB7XG4gICAgcHJldkhhbmRsZXIuaGFuZGxlcnMoKS5mb3JFYWNoKGZ1bmN0aW9uKGgpIHtcbiAgICAgIHYuX2hhbmRsZXIub24oaC50eXBlLCBoLmhhbmRsZXIpO1xuICAgIH0pO1xuICB9IGVsc2Uge1xuICAgIC8vIFJlZ2lzdGVyIGV2ZW50IGxpc3RlbmVycyBmb3Igc2lnbmFsIHN0cmVhbSBkZWZpbml0aW9ucy5cbiAgICBwYXJzZVN0cmVhbXModGhpcyk7XG4gIH1cbiAgXG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKG9wdCkgeyAgICBcbiAgb3B0ID0gb3B0IHx8IHt9O1xuICB2YXIgdiA9IHRoaXMsXG4gICAgICB0cmFucyA9IG9wdC5kdXJhdGlvblxuICAgICAgICA/IG5ldyBUcmFuc2l0aW9uKG9wdC5kdXJhdGlvbiwgb3B0LmVhc2UpXG4gICAgICAgIDogbnVsbDtcblxuICAvLyBUT0RPOiB3aXRoIHN0cmVhbWluZyBkYXRhIEFQSSwgYWRkcyBzaG91bGQgZGwuZHVwbGljYXRlIGp1c3QgcGFyc2VTcGVjXG4gIC8vIHRvIHByZXZlbnQgVmVnYSBmcm9tIHBvbGx1dGluZyB0aGUgZW52aXJvbm1lbnQuXG5cbiAgdmFyIGNzID0gY2hhbmdlc2V0LmNyZWF0ZSgpO1xuICBpZih0cmFucykgY3MudHJhbnMgPSB0cmFucztcbiAgaWYob3B0LnJlZmxvdyAhPT0gdW5kZWZpbmVkKSBjcy5yZWZsb3cgPSBvcHQucmVmbG93XG5cbiAgaWYoIXYuX2J1aWxkKSB7XG4gICAgdi5fcmVuZGVyTm9kZSA9IG5ldyBOb2RlKHYuX21vZGVsLmdyYXBoKVxuICAgICAgLnJvdXRlcih0cnVlKTtcblxuICAgIHYuX3JlbmRlck5vZGUuZXZhbHVhdGUgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgZGVidWcoaW5wdXQsIFtcInJlbmRlcmluZ1wiXSk7XG5cbiAgICAgIHZhciBzID0gdi5fbW9kZWwuc2NlbmUoKTtcbiAgICAgIGlmKGlucHV0LnRyYW5zKSB7XG4gICAgICAgIGlucHV0LnRyYW5zLnN0YXJ0KGZ1bmN0aW9uKGl0ZW1zKSB7IHYuX3JlbmRlcmVyLnJlbmRlcihzLCBpdGVtcyk7IH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdi5fcmVuZGVyZXIucmVuZGVyKHMpO1xuICAgICAgfVxuXG4gICAgICAvLyBGb3IgYWxsIHVwZGF0ZWQgZGF0YXNvdXJjZXMsIGZpbmFsaXplIHRoZWlyIGNoYW5nZXNldHMuXG4gICAgICB2YXIgZCwgZHM7XG4gICAgICBmb3IoZCBpbiBpbnB1dC5kYXRhKSB7XG4gICAgICAgIGRzID0gdi5fbW9kZWwuZGF0YShkKTtcbiAgICAgICAgaWYoIWRzLnJldmlzZXMoKSkgY29udGludWU7XG4gICAgICAgIGNoYW5nZXNldC5maW5hbGl6ZShkcy5sYXN0KCkpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gaW5wdXQ7XG4gICAgfTtcblxuICAgIHYuX21vZGVsLnNjZW5lKHYuX3JlbmRlck5vZGUpO1xuICAgIHYuX2J1aWxkID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIFB1bHNlIHRoZSBlbnRpcmUgbW9kZWwgKERhdGFzb3VyY2VzICsgc2NlbmUpLlxuICB2Ll9tb2RlbC5maXJlKGNzKTtcblxuICByZXR1cm4gdi5hdXRvcGFkKG9wdCk7XG59O1xuXG5wcm90b3R5cGUub24gPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5faGFuZGxlci5vbi5hcHBseSh0aGlzLl9oYW5kbGVyLCBhcmd1bWVudHMpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5faGFuZGxlci5vZmYuYXBwbHkodGhpcy5faGFuZGxlciwgYXJndW1lbnRzKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5WaWV3LmZhY3RvcnkgPSBmdW5jdGlvbihtb2RlbCkge1xuICByZXR1cm4gZnVuY3Rpb24ob3B0KSB7XG4gICAgb3B0ID0gb3B0IHx8IHt9O1xuICAgIHZhciBkZWZzID0gbW9kZWwuZGVmcygpO1xuICAgIHZhciB2ID0gbmV3IFZpZXcoKVxuICAgICAgLm1vZGVsKG1vZGVsKVxuICAgICAgLndpZHRoKGRlZnMud2lkdGgpXG4gICAgICAuaGVpZ2h0KGRlZnMuaGVpZ2h0KVxuICAgICAgLnBhZGRpbmcoZGVmcy5wYWRkaW5nKVxuICAgICAgLnJlbmRlcmVyKG9wdC5yZW5kZXJlciB8fCBcImNhbnZhc1wiKTtcblxuICAgIGlmIChvcHQuZWwpIHYuaW5pdGlhbGl6ZShvcHQuZWwpO1xuICAgIGlmIChvcHQuZGF0YSkgdi5kYXRhKG9wdC5kYXRhKTtcbiAgXG4gICAgcmV0dXJuIHY7XG4gIH07ICAgIFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3OyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi9Ob2RlJyksXG4gICAgY2hhbmdlc2V0ID0gcmVxdWlyZSgnLi9jaGFuZ2VzZXQnKSxcbiAgICBkZWJ1ZyA9IHJlcXVpcmUoJy4uL3V0aWwvZGVidWcnKSxcbiAgICBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKTtcblxuZnVuY3Rpb24gQ29sbGVjdG9yKGdyYXBoKSB7XG4gIE5vZGUucHJvdG90eXBlLmluaXQuY2FsbCh0aGlzLCBncmFwaCk7XG4gIHRoaXMuX2RhdGEgPSBbXTtcbiAgcmV0dXJuIHRoaXMucm91dGVyKHRydWUpXG4gICAgLmNvbGxlY3Rvcih0cnVlKTtcbn1cblxudmFyIHByb3RvID0gKENvbGxlY3Rvci5wcm90b3R5cGUgPSBuZXcgTm9kZSgpKTtcblxucHJvdG8uZGF0YSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fZGF0YTsgfVxuXG5wcm90by5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIGRlYnVnKGlucHV0LCBbXCJjb2xsZWN0aW5nXCJdKTtcblxuICBpZihpbnB1dC5yZWZsb3cpIHtcbiAgICBpbnB1dCA9IGNoYW5nZXNldC5jcmVhdGUoaW5wdXQpO1xuICAgIGlucHV0Lm1vZCA9IHRoaXMuX2RhdGEuc2xpY2UoKTtcbiAgICByZXR1cm4gaW5wdXQ7XG4gIH1cblxuICBpZihpbnB1dC5yZW0ubGVuZ3RoKSB7XG4gICAgdmFyIGlkcyA9IGlucHV0LnJlbS5yZWR1Y2UoZnVuY3Rpb24obSx4KSB7IHJldHVybiAobVt4Ll9pZF09MSwgbSk7IH0sIHt9KTtcbiAgICB0aGlzLl9kYXRhID0gdGhpcy5fZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4gaWRzW3guX2lkXSAhPT0gMTsgfSk7XG4gIH1cblxuICBpZihpbnB1dC5hZGQubGVuZ3RoKSB7XG4gICAgdGhpcy5fZGF0YSA9IHRoaXMuX2RhdGEubGVuZ3RoID8gdGhpcy5fZGF0YS5jb25jYXQoaW5wdXQuYWRkKSA6IGlucHV0LmFkZDtcbiAgfVxuXG4gIGlmKGlucHV0LnNvcnQpIHtcbiAgICB0aGlzLl9kYXRhLnNvcnQoaW5wdXQuc29ydCk7XG4gIH1cblxuICByZXR1cm4gaW5wdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbGxlY3RvcjsiLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgY2hhbmdlc2V0ID0gcmVxdWlyZSgnLi9jaGFuZ2VzZXQnKSwgXG4gICAgdHVwbGUgPSByZXF1aXJlKCcuL3R1cGxlJyksIFxuICAgIE5vZGUgPSByZXF1aXJlKCcuL05vZGUnKSxcbiAgICBDb2xsZWN0b3IgPSByZXF1aXJlKCcuL0NvbGxlY3RvcicpLFxuICAgIGRlYnVnID0gcmVxdWlyZSgnLi4vdXRpbC9kZWJ1ZycpLFxuICAgIEMgPSByZXF1aXJlKCcuLi91dGlsL2NvbnN0YW50cycpO1xuXG5mdW5jdGlvbiBEYXRhc291cmNlKGdyYXBoLCBuYW1lLCBmYWNldCkge1xuICB0aGlzLl9ncmFwaCA9IGdyYXBoO1xuICB0aGlzLl9uYW1lID0gbmFtZTtcbiAgdGhpcy5fZGF0YSA9IFtdO1xuICB0aGlzLl9zb3VyY2UgPSBudWxsO1xuICB0aGlzLl9mYWNldCA9IGZhY2V0O1xuICB0aGlzLl9pbnB1dCA9IGNoYW5nZXNldC5jcmVhdGUoKTtcbiAgdGhpcy5fb3V0cHV0ID0gbnVsbDsgICAgLy8gT3V0cHV0IGNoYW5nZXNldFxuXG4gIHRoaXMuX3BpcGVsaW5lICA9IG51bGw7IC8vIFBpcGVsaW5lIG9mIHRyYW5zZm9ybWF0aW9ucy5cbiAgdGhpcy5fY29sbGVjdG9yID0gbnVsbDsgLy8gQ29sbGVjdG9yIHRvIG1hdGVyaWFsaXplIG91dHB1dCBvZiBwaXBlbGluZVxuICB0aGlzLl9yZXZpc2VzID0gZmFsc2U7IC8vIERvZXMgYW55IHBpcGVsaW5lIG9wZXJhdG9yIG5lZWQgdG8gdHJhY2sgcHJldj9cbn07XG5cbnZhciBwcm90byA9IERhdGFzb3VyY2UucHJvdG90eXBlO1xuXG5wcm90by5uYW1lID0gZnVuY3Rpb24obmFtZSkge1xuICBpZighYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX25hbWU7XG4gIHJldHVybiAodGhpcy5fbmFtZSA9IG5hbWUsIHRoaXMpO1xufTtcblxucHJvdG8uc291cmNlID0gZnVuY3Rpb24oc3JjKSB7XG4gIGlmKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5fc291cmNlO1xuICByZXR1cm4gKHRoaXMuX3NvdXJjZSA9IHRoaXMuX2dyYXBoLmRhdGEoc3JjKSk7XG59O1xuXG5wcm90by5hZGQgPSBmdW5jdGlvbihkKSB7XG4gIHZhciBwcmV2ID0gdGhpcy5fcmV2aXNlcyA/IG51bGwgOiB1bmRlZmluZWQ7XG5cbiAgdGhpcy5faW5wdXQuYWRkID0gdGhpcy5faW5wdXQuYWRkXG4gICAgLmNvbmNhdChkbC5hcnJheShkKS5tYXAoZnVuY3Rpb24oZCkgeyByZXR1cm4gdHVwbGUuaW5nZXN0KGQsIHByZXYpOyB9KSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG8ucmVtb3ZlID0gZnVuY3Rpb24od2hlcmUpIHtcbiAgdmFyIGQgPSB0aGlzLl9kYXRhLmZpbHRlcih3aGVyZSk7XG4gIHRoaXMuX2lucHV0LnJlbSA9IHRoaXMuX2lucHV0LnJlbS5jb25jYXQoZCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG8udXBkYXRlID0gZnVuY3Rpb24od2hlcmUsIGZpZWxkLCBmdW5jKSB7XG4gIHZhciBtb2QgPSB0aGlzLl9pbnB1dC5tb2QsXG4gICAgICBpZHMgPSB0dXBsZS5pZE1hcChtb2QpLFxuICAgICAgcHJldiA9IHRoaXMuX3JldmlzZXMgPyBudWxsIDogdW5kZWZpbmVkOyBcblxuICB0aGlzLl9pbnB1dC5maWVsZHNbZmllbGRdID0gMTtcbiAgdGhpcy5fZGF0YS5maWx0ZXIod2hlcmUpLmZvckVhY2goZnVuY3Rpb24oeCkge1xuICAgIHZhciBwcmV2ID0geFtmaWVsZF0sXG4gICAgICAgIG5leHQgPSBmdW5jKHgpO1xuICAgIGlmIChwcmV2ICE9PSBuZXh0KSB7XG4gICAgICB0dXBsZS5zZXQoeCwgZmllbGQsIG5leHQpO1xuICAgICAgaWYoaWRzW3guX2lkXSAhPT0gMSkge1xuICAgICAgICBtb2QucHVzaCh4KTtcbiAgICAgICAgaWRzW3guX2lkXSA9IDE7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90by52YWx1ZXMgPSBmdW5jdGlvbihkYXRhKSB7XG4gIGlmKCFhcmd1bWVudHMubGVuZ3RoKVxuICAgIHJldHVybiB0aGlzLl9jb2xsZWN0b3IgPyB0aGlzLl9jb2xsZWN0b3IuZGF0YSgpIDogdGhpcy5fZGF0YTtcblxuICAvLyBSZXBsYWNlIGJhY2tpbmcgZGF0YVxuICB0aGlzLl9pbnB1dC5yZW0gPSB0aGlzLl9kYXRhLnNsaWNlKCk7XG4gIGlmIChkYXRhKSB7IHRoaXMuYWRkKGRhdGEpOyB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuZnVuY3Rpb24gc2V0X3ByZXYoZCkgeyBpZihkLl9wcmV2ID09PSB1bmRlZmluZWQpIGQuX3ByZXYgPSBDLlNFTlRJTkVMOyB9XG5cbnByb3RvLnJldmlzZXMgPSBmdW5jdGlvbihwKSB7XG4gIGlmKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5fcmV2aXNlcztcblxuICAvLyBJZiB3ZSd2ZSBub3QgbmVlZGVkIHByZXYgaW4gdGhlIHBhc3QsIGJ1dCBhIG5ldyBkYXRhZmxvdyBub2RlIG5lZWRzIGl0IG5vd1xuICAvLyBlbnN1cmUgZXhpc3RpbmcgdHVwbGVzIGhhdmUgcHJldiBzZXQuXG4gIGlmKCF0aGlzLl9yZXZpc2VzICYmIHApIHtcbiAgICB0aGlzLl9kYXRhLmZvckVhY2goc2V0X3ByZXYpO1xuICAgIHRoaXMuX2lucHV0LmFkZC5mb3JFYWNoKHNldF9wcmV2KTsgLy8gTmV3IHR1cGxlcyB0aGF0IGhhdmVuJ3QgeWV0IGJlZW4gbWVyZ2VkIGludG8gX2RhdGFcbiAgfVxuXG4gIHRoaXMuX3JldmlzZXMgPSB0aGlzLl9yZXZpc2VzIHx8IHA7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG8ubGFzdCA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fb3V0cHV0OyB9O1xuXG5wcm90by5maXJlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgaWYoaW5wdXQpIHRoaXMuX2lucHV0ID0gaW5wdXQ7XG4gIHRoaXMuX2dyYXBoLnByb3BhZ2F0ZSh0aGlzLl9pbnB1dCwgdGhpcy5fcGlwZWxpbmVbMF0pOyBcbn07XG5cbnByb3RvLnBpcGVsaW5lID0gZnVuY3Rpb24ocGlwZWxpbmUpIHtcbiAgdmFyIGRzID0gdGhpcywgbiwgYztcbiAgaWYoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0aGlzLl9waXBlbGluZTtcblxuICBpZihwaXBlbGluZS5sZW5ndGgpIHtcbiAgICAvLyBJZiB3ZSBoYXZlIGEgcGlwZWxpbmUsIGFkZCBhIGNvbGxlY3RvciB0byB0aGUgZW5kIHRvIG1hdGVyaWFsaXplXG4gICAgLy8gdGhlIG91dHB1dC5cbiAgICBkcy5fY29sbGVjdG9yID0gbmV3IENvbGxlY3Rvcih0aGlzLl9ncmFwaCk7XG4gICAgcGlwZWxpbmUucHVzaChkcy5fY29sbGVjdG9yKTtcbiAgICBkcy5fcmV2aXNlcyA9IHBpcGVsaW5lLnNvbWUoZnVuY3Rpb24ocCkgeyByZXR1cm4gcC5yZXZpc2VzKCk7IH0pO1xuICB9XG5cbiAgLy8gSW5wdXQgbm9kZSBhcHBsaWVzIHRoZSBkYXRhc291cmNlJ3MgZGVsdGEsIGFuZCBwcm9wYWdhdGVzIGl0IHRvIFxuICAvLyB0aGUgcmVzdCBvZiB0aGUgcGlwZWxpbmUuIEl0IHJlY2VpdmVzIHRvdWNoZXMgdG8gcmVmbG93IGRhdGEuXG4gIHZhciBpbnB1dCA9IG5ldyBOb2RlKHRoaXMuX2dyYXBoKVxuICAgIC5yb3V0ZXIodHJ1ZSlcbiAgICAuY29sbGVjdG9yKHRydWUpO1xuXG4gIGlucHV0LmV2YWx1YXRlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICBkZWJ1ZyhpbnB1dCwgW1wiaW5wdXRcIiwgZHMuX25hbWVdKTtcblxuICAgIHZhciBkZWx0YSA9IGRzLl9pbnB1dCwgXG4gICAgICAgIG91dCA9IGNoYW5nZXNldC5jcmVhdGUoaW5wdXQpLFxuICAgICAgICByZW07XG5cbiAgICAvLyBEZWx0YSBtaWdodCBjb250YWluIGZpZWxkcyB1cGRhdGVkIHRocm91Z2ggQVBJXG4gICAgZGwua2V5cyhkZWx0YS5maWVsZHMpLmZvckVhY2goZnVuY3Rpb24oZikgeyBvdXQuZmllbGRzW2ZdID0gMSB9KTtcblxuICAgIGlmKGlucHV0LnJlZmxvdykge1xuICAgICAgb3V0Lm1vZCA9IGRzLl9kYXRhLnNsaWNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHVwZGF0ZSBkYXRhXG4gICAgICBpZihkZWx0YS5yZW0ubGVuZ3RoKSB7XG4gICAgICAgIHJlbSA9IHR1cGxlLmlkTWFwKGRlbHRhLnJlbSk7XG4gICAgICAgIGRzLl9kYXRhID0gZHMuX2RhdGFcbiAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uKHgpIHsgcmV0dXJuIHJlbVt4Ll9pZF0gIT09IDEgfSk7XG4gICAgICB9XG5cbiAgICAgIGlmKGRlbHRhLmFkZC5sZW5ndGgpIGRzLl9kYXRhID0gZHMuX2RhdGEuY29uY2F0KGRlbHRhLmFkZCk7XG5cbiAgICAgIC8vIHJlc2V0IGNoYW5nZSBsaXN0XG4gICAgICBkcy5faW5wdXQgPSBjaGFuZ2VzZXQuY3JlYXRlKCk7XG5cbiAgICAgIG91dC5hZGQgPSBkZWx0YS5hZGQ7IFxuICAgICAgb3V0Lm1vZCA9IGRlbHRhLm1vZDtcbiAgICAgIG91dC5yZW0gPSBkZWx0YS5yZW07XG4gICAgfVxuXG4gICAgcmV0dXJuIChvdXQuZmFjZXQgPSBkcy5fZmFjZXQsIG91dCk7XG4gIH07XG5cbiAgcGlwZWxpbmUudW5zaGlmdChpbnB1dCk7XG5cbiAgLy8gT3V0cHV0IG5vZGUgY2FwdHVyZXMgdGhlIGxhc3QgY2hhbmdlc2V0IHNlZW4gYnkgdGhpcyBkYXRhc291cmNlXG4gIC8vIChuZWVkZWQgZm9yIGpvaW5zIGFuZCBidWlsZHMpIGFuZCBtYXRlcmlhbGl6ZXMgYW55IG5lc3RlZCBkYXRhLlxuICAvLyBJZiB0aGlzIGRhdGFzb3VyY2UgaXMgZmFjZXRlZCwgbWF0ZXJpYWxpemVzIHRoZSB2YWx1ZXMgaW4gdGhlIGZhY2V0LlxuICB2YXIgb3V0cHV0ID0gbmV3IE5vZGUodGhpcy5fZ3JhcGgpXG4gICAgLnJvdXRlcih0cnVlKVxuICAgIC5jb2xsZWN0b3IodHJ1ZSk7XG5cbiAgb3V0cHV0LmV2YWx1YXRlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICBkZWJ1ZyhpbnB1dCwgW1wib3V0cHV0XCIsIGRzLl9uYW1lXSk7XG4gICAgdmFyIG91dHB1dCA9IGNoYW5nZXNldC5jcmVhdGUoaW5wdXQsIHRydWUpO1xuXG4gICAgaWYoZHMuX2ZhY2V0KSB7XG4gICAgICBkcy5fZmFjZXQudmFsdWVzID0gZHMudmFsdWVzKCk7XG4gICAgICBpbnB1dC5mYWNldCA9IG51bGw7XG4gICAgfVxuXG4gICAgZHMuX291dHB1dCA9IGlucHV0O1xuICAgIG91dHB1dC5kYXRhW2RzLl9uYW1lXSA9IDE7XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcblxuICBwaXBlbGluZS5wdXNoKG91dHB1dCk7XG5cbiAgdGhpcy5fcGlwZWxpbmUgPSBwaXBlbGluZTtcbiAgdGhpcy5fZ3JhcGguY29ubmVjdChkcy5fcGlwZWxpbmUpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvLmxpc3RlbmVyID0gZnVuY3Rpb24oKSB7IFxuICB2YXIgbCA9IG5ldyBOb2RlKHRoaXMuX2dyYXBoKS5yb3V0ZXIodHJ1ZSksXG4gICAgICBkZXN0ID0gdGhpcyxcbiAgICAgIHByZXYgPSB0aGlzLl9yZXZpc2VzID8gbnVsbCA6IHVuZGVmaW5lZDtcblxuICBsLmV2YWx1YXRlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICBkZXN0Ll9zcmNNYXAgPSBkZXN0Ll9zcmNNYXAgfHwge307ICAvLyB0byBwcm9wYWdhdGUgdHVwbGVzIGNvcnJlY3RseVxuICAgIHZhciBtYXAgPSBkZXN0Ll9zcmNNYXAsXG4gICAgICAgIG91dHB1dCAgPSBjaGFuZ2VzZXQuY3JlYXRlKGlucHV0KTtcblxuICAgIG91dHB1dC5hZGQgPSBpbnB1dC5hZGQubWFwKGZ1bmN0aW9uKHQpIHtcbiAgICAgIHJldHVybiAobWFwW3QuX2lkXSA9IHR1cGxlLmRlcml2ZSh0LCB0Ll9wcmV2ICE9PSB1bmRlZmluZWQgPyB0Ll9wcmV2IDogcHJldikpO1xuICAgIH0pO1xuICAgIG91dHB1dC5tb2QgPSBpbnB1dC5tb2QubWFwKGZ1bmN0aW9uKHQpIHsgcmV0dXJuIG1hcFt0Ll9pZF07IH0pO1xuICAgIG91dHB1dC5yZW0gPSBpbnB1dC5yZW0ubWFwKGZ1bmN0aW9uKHQpIHsgXG4gICAgICB2YXIgbyA9IG1hcFt0Ll9pZF07XG4gICAgICBtYXBbdC5faWRdID0gbnVsbDtcbiAgICAgIHJldHVybiBvO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIChkZXN0Ll9pbnB1dCA9IG91dHB1dCk7XG4gIH07XG5cbiAgbC5hZGRMaXN0ZW5lcih0aGlzLl9waXBlbGluZVswXSk7XG4gIHJldHVybiBsO1xufTtcblxucHJvdG8uYWRkTGlzdGVuZXIgPSBmdW5jdGlvbihsKSB7XG4gIGlmKGwgaW5zdGFuY2VvZiBEYXRhc291cmNlKSB7XG4gICAgaWYodGhpcy5fY29sbGVjdG9yKSB0aGlzLl9jb2xsZWN0b3IuYWRkTGlzdGVuZXIobC5saXN0ZW5lcigpKTtcbiAgICBlbHNlIHRoaXMuX3BpcGVsaW5lWzBdLmFkZExpc3RlbmVyKGwubGlzdGVuZXIoKSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fcGlwZWxpbmVbdGhpcy5fcGlwZWxpbmUubGVuZ3RoLTFdLmFkZExpc3RlbmVyKGwpOyAgICAgIFxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90by5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKGwpIHtcbiAgdGhpcy5fcGlwZWxpbmVbdGhpcy5fcGlwZWxpbmUubGVuZ3RoLTFdLnJlbW92ZUxpc3RlbmVyKGwpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBEYXRhc291cmNlOyIsInZhciBkbCA9IHJlcXVpcmUoJ2RhdGFsaWInKSxcbiAgICBIZWFwID0gcmVxdWlyZSgnaGVhcCcpLFxuICAgIERhdGFzb3VyY2UgPSByZXF1aXJlKCcuL0RhdGFzb3VyY2UnKSxcbiAgICBTaWduYWwgPSByZXF1aXJlKCcuL1NpZ25hbCcpLFxuICAgIGNoYW5nZXNldCA9IHJlcXVpcmUoJy4vY2hhbmdlc2V0JyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyksXG4gICAgQyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uc3RhbnRzJyk7XG5cbmZ1bmN0aW9uIEdyYXBoKCkge1xuICB0aGlzLl9zdGFtcCA9IDA7XG4gIHRoaXMuX3JhbmsgID0gMDtcblxuICB0aGlzLl9kYXRhID0ge307XG4gIHRoaXMuX3NpZ25hbHMgPSB7fTtcblxuICB0aGlzLmRvTm90UHJvcGFnYXRlID0ge307XG59XG5cbnZhciBwcm90byA9IEdyYXBoLnByb3RvdHlwZTtcblxucHJvdG8uZGF0YSA9IGZ1bmN0aW9uKG5hbWUsIHBpcGVsaW5lLCBmYWNldCkge1xuICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAxKSByZXR1cm4gdGhpcy5fZGF0YVtuYW1lXTtcbiAgcmV0dXJuICh0aGlzLl9kYXRhW25hbWVdID0gbmV3IERhdGFzb3VyY2UodGhpcywgbmFtZSwgZmFjZXQpXG4gICAgLnBpcGVsaW5lKHBpcGVsaW5lKSk7XG59O1xuXG5mdW5jdGlvbiBzaWduYWwobmFtZSkge1xuICB2YXIgbSA9IHRoaXMsIGksIGxlbjtcbiAgaWYoIWRsLmlzQXJyYXkobmFtZSkpIHJldHVybiB0aGlzLl9zaWduYWxzW25hbWVdO1xuICByZXR1cm4gbmFtZS5tYXAoZnVuY3Rpb24obikgeyBtLl9zaWduYWxzW25dOyB9KTtcbn1cblxucHJvdG8uc2lnbmFsID0gZnVuY3Rpb24obmFtZSwgaW5pdCkge1xuICB2YXIgbSA9IHRoaXM7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHJldHVybiBzaWduYWwuY2FsbCh0aGlzLCBuYW1lKTtcbiAgcmV0dXJuICh0aGlzLl9zaWduYWxzW25hbWVdID0gbmV3IFNpZ25hbCh0aGlzLCBuYW1lLCBpbml0KSk7XG59O1xuXG5wcm90by5zaWduYWxWYWx1ZXMgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBncmFwaCA9IHRoaXM7XG4gIGlmKCFkbC5pc0FycmF5KG5hbWUpKSByZXR1cm4gdGhpcy5fc2lnbmFsc1tuYW1lXS52YWx1ZSgpO1xuICByZXR1cm4gbmFtZS5yZWR1Y2UoZnVuY3Rpb24oc2csIG4pIHtcbiAgICByZXR1cm4gKHNnW25dID0gZ3JhcGguX3NpZ25hbHNbbl0udmFsdWUoKSwgc2cpO1xuICB9LCB7fSk7XG59O1xuXG5wcm90by5zaWduYWxSZWYgPSBmdW5jdGlvbihyZWYpIHtcbiAgaWYoIWRsLmlzQXJyYXkocmVmKSkgcmVmID0gZGwuZmllbGQocmVmKTtcbiAgdmFyIHZhbHVlID0gdGhpcy5zaWduYWwocmVmLnNoaWZ0KCkpLnZhbHVlKCk7XG4gIGlmKHJlZi5sZW5ndGggPiAwKSB7XG4gICAgdmFyIGZuID0gRnVuY3Rpb24oXCJzXCIsIFwicmV0dXJuIHNbXCIrcmVmLm1hcChkbC5zdHIpLmpvaW4oXCJdW1wiKStcIl1cIik7XG4gICAgdmFsdWUgPSBmbi5jYWxsKG51bGwsIHZhbHVlKTtcbiAgfVxuXG4gIHJldHVybiB2YWx1ZTtcbn07XG5cbnZhciBzY2hlZHVsZSA9IGZ1bmN0aW9uKGEsIGIpIHtcbiAgLy8gSWYgdGhlIG5vZGVzIGFyZSBlcXVhbCwgcHJvcGFnYXRlIHRoZSBub24tcmVmbG93IHB1bHNlIGZpcnN0LFxuICAvLyBzbyB0aGF0IHdlIGNhbiBpZ25vcmUgc3Vic2VxdWVudCByZWZsb3cgcHVsc2VzLiBcbiAgaWYoYS5yYW5rID09IGIucmFuaykgcmV0dXJuIGEucHVsc2UucmVmbG93ID8gMSA6IC0xO1xuICBlbHNlIHJldHVybiBhLnJhbmsgLSBiLnJhbms7IFxufTtcblxucHJvdG8ucHJvcGFnYXRlID0gZnVuY3Rpb24ocHVsc2UsIG5vZGUpIHtcbiAgdmFyIHYsIGwsIG4sIHAsIHIsIGksIGxlbiwgcmVmbG93ZWQ7XG5cbiAgLy8gbmV3IFBRIHdpdGggZWFjaCBwcm9wYWdhdGlvbiBjeWNsZSBzbyB0aGF0IHdlIGNhbiBwdWxzZSBicmFuY2hlc1xuICAvLyBvZiB0aGUgZGF0YWZsb3cgZ3JhcGggZHVyaW5nIGEgcHJvcGFnYXRpb24gKGUuZy4sIHdoZW4gY3JlYXRpbmdcbiAgLy8gYSBuZXcgaW5saW5lIGRhdGFzb3VyY2UpLlxuICB2YXIgcHEgPSBuZXcgSGVhcChzY2hlZHVsZSk7IFxuXG4gIGlmKHB1bHNlLnN0YW1wKSB0aHJvdyBcIlB1bHNlIGFscmVhZHkgaGFzIGEgbm9uLXplcm8gc3RhbXBcIlxuXG4gIHB1bHNlLnN0YW1wID0gKyt0aGlzLl9zdGFtcDtcbiAgcHEucHVzaCh7IG5vZGU6IG5vZGUsIHB1bHNlOiBwdWxzZSwgcmFuazogbm9kZS5yYW5rKCkgfSk7XG5cbiAgd2hpbGUgKHBxLnNpemUoKSA+IDApIHtcbiAgICB2ID0gcHEucG9wKCksIG4gPSB2Lm5vZGUsIHAgPSB2LnB1bHNlLCByID0gdi5yYW5rLCBsID0gbi5fbGlzdGVuZXJzO1xuICAgIHJlZmxvd2VkID0gcC5yZWZsb3cgJiYgbi5sYXN0KCkgPj0gcC5zdGFtcDtcblxuICAgIGlmKHJlZmxvd2VkKSBjb250aW51ZTsgLy8gRG9uJ3QgbmVlZGxlc3NseSByZWZsb3cgb3BzLlxuXG4gICAgLy8gQSBub2RlJ3MgcmFuayBtaWdodCBjaGFuZ2UgZHVyaW5nIGEgcHJvcGFnYXRpb24gKGUuZy4gaW5zdGFudGlhdGluZ1xuICAgIC8vIGEgZ3JvdXAncyBkYXRhZmxvdyBicmFuY2gpLiBSZS1xdWV1ZSBpZiBpdCBoYXMuIFRcbiAgICAvLyBUT0RPOiB1c2UgcHEucmVwbGFjZSBvciBwcS5wb3BwdXNoP1xuICAgIGlmKHIgIT0gbi5yYW5rKCkpIHtcbiAgICAgIGRlYnVnKHAsIFsnUmFuayBtaXNtYXRjaCcsIHIsIG4ucmFuaygpXSk7XG4gICAgICBwcS5wdXNoKHsgbm9kZTogbiwgcHVsc2U6IHAsIHJhbms6IG4ucmFuaygpIH0pO1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcCA9IHRoaXMuZXZhbHVhdGUocCwgbik7XG5cbiAgICAvLyBFdmVuIGlmIHdlIGRpZG4ndCBydW4gdGhlIG5vZGUsIHdlIHN0aWxsIHdhbnQgdG8gcHJvcGFnYXRlIFxuICAgIC8vIHRoZSBwdWxzZS4gXG4gICAgaWYgKHAgIT09IHRoaXMuZG9Ob3RQcm9wYWdhdGUpIHtcbiAgICAgIGZvciAoaSA9IDAsIGxlbiA9IGwubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgICAgcHEucHVzaCh7IG5vZGU6IGxbaV0sIHB1bHNlOiBwLCByYW5rOiBsW2ldLl9yYW5rIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLy8gQ29ubmVjdCBhIGJyYW5jaCBvZiBkYXRhZmxvdyBub2Rlcy4gXG4vLyBEZXBlbmRlbmNpZXMgZ2V0IHdpcmVkIHRvIHRoZSBuZWFyZXN0IGNvbGxlY3Rvci4gXG5mdW5jdGlvbiBmb3JFYWNoTm9kZShicmFuY2gsIGZuKSB7XG4gIHZhciBub2RlLCBjb2xsZWN0b3IsIGksIGxlbjtcbiAgZm9yKGk9MCwgbGVuPWJyYW5jaC5sZW5ndGg7IGk8bGVuOyArK2kpIHtcbiAgICBub2RlID0gYnJhbmNoW2ldO1xuICAgIGlmKG5vZGUuY29sbGVjdG9yKCkpIGNvbGxlY3RvciA9IG5vZGU7XG4gICAgZm4obm9kZSwgY29sbGVjdG9yLCBpKTtcbiAgfVxufVxuXG5wcm90by5jb25uZWN0ID0gZnVuY3Rpb24oYnJhbmNoKSB7XG4gIGRlYnVnKHt9LCBbJ2Nvbm5lY3RpbmcnXSk7XG4gIHZhciBncmFwaCA9IHRoaXM7XG4gIGZvckVhY2hOb2RlKGJyYW5jaCwgZnVuY3Rpb24obiwgYywgaSkge1xuICAgIHZhciBkYXRhID0gbi5kZXBlbmRlbmN5KEMuREFUQSksXG4gICAgICAgIHNpZ25hbHMgPSBuLmRlcGVuZGVuY3koQy5TSUdOQUxTKTtcblxuICAgIGlmKGRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKGQpIHsgXG4gICAgICAgIGdyYXBoLmRhdGEoZClcbiAgICAgICAgICAucmV2aXNlcyhuLnJldmlzZXMoKSlcbiAgICAgICAgICAuYWRkTGlzdGVuZXIoYyk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZihzaWduYWxzLmxlbmd0aCA+IDApIHtcbiAgICAgIHNpZ25hbHMuZm9yRWFjaChmdW5jdGlvbihzKSB7IGdyYXBoLnNpZ25hbChzKS5hZGRMaXN0ZW5lcihjKTsgfSk7XG4gICAgfVxuXG4gICAgaWYoaSA+IDApIHtcbiAgICAgIGJyYW5jaFtpLTFdLmFkZExpc3RlbmVyKGJyYW5jaFtpXSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gYnJhbmNoO1xufTtcblxucHJvdG8uZGlzY29ubmVjdCA9IGZ1bmN0aW9uKGJyYW5jaCkge1xuICBkZWJ1Zyh7fSwgWydkaXNjb25uZWN0aW5nJ10pO1xuICB2YXIgZ3JhcGggPSB0aGlzO1xuXG4gIGZvckVhY2hOb2RlKGJyYW5jaCwgZnVuY3Rpb24obiwgYywgaSkge1xuICAgIHZhciBkYXRhID0gbi5kZXBlbmRlbmN5KEMuREFUQSksXG4gICAgICAgIHNpZ25hbHMgPSBuLmRlcGVuZGVuY3koQy5TSUdOQUxTKTtcblxuICAgIGlmKGRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKGQpIHsgZ3JhcGguZGF0YShkKS5yZW1vdmVMaXN0ZW5lcihjKTsgfSk7XG4gICAgfVxuXG4gICAgaWYoc2lnbmFscy5sZW5ndGggPiAwKSB7XG4gICAgICBzaWduYWxzLmZvckVhY2goZnVuY3Rpb24ocykgeyBncmFwaC5zaWduYWwocykucmVtb3ZlTGlzdGVuZXIoYykgfSk7XG4gICAgfVxuXG4gICAgbi5kaXNjb25uZWN0KCk7ICBcbiAgfSk7XG5cbiAgcmV0dXJuIGJyYW5jaDtcbn07XG5cbnByb3RvLnJlZXZhbHVhdGUgPSBmdW5jdGlvbihwdWxzZSwgbm9kZSkge1xuICB2YXIgcmVmbG93ZWQgPSAhcHVsc2UucmVmbG93IHx8IChwdWxzZS5yZWZsb3cgJiYgbm9kZS5sYXN0KCkgPj0gcHVsc2Uuc3RhbXApLFxuICAgICAgcnVuID0gISFwdWxzZS5hZGQubGVuZ3RoIHx8ICEhcHVsc2UucmVtLmxlbmd0aCB8fCBub2RlLnJvdXRlcigpO1xuICBydW4gPSBydW4gfHwgIXJlZmxvd2VkO1xuICByZXR1cm4gcnVuIHx8IG5vZGUucmVldmFsdWF0ZShwdWxzZSk7XG59O1xuXG5wcm90by5ldmFsdWF0ZSA9IGZ1bmN0aW9uKHB1bHNlLCBub2RlKSB7XG4gIGlmKCF0aGlzLnJlZXZhbHVhdGUocHVsc2UsIG5vZGUpKSByZXR1cm4gcHVsc2U7XG4gIHB1bHNlID0gbm9kZS5ldmFsdWF0ZShwdWxzZSk7XG4gIG5vZGUubGFzdChwdWxzZS5zdGFtcCk7XG4gIHJldHVybiBwdWxzZVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBHcmFwaDsiLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgQyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uc3RhbnRzJyksXG4gICAgUkVFVkFMID0gW0MuREFUQSwgQy5GSUVMRFMsIEMuU0NBTEVTLCBDLlNJR05BTFNdO1xuXG52YXIgbm9kZV9pZCA9IDE7XG5cbmZ1bmN0aW9uIE5vZGUoZ3JhcGgpIHtcbiAgaWYoZ3JhcGgpIHRoaXMuaW5pdChncmFwaCk7XG4gIHJldHVybiB0aGlzO1xufVxuXG52YXIgcHJvdG8gPSBOb2RlLnByb3RvdHlwZTtcblxucHJvdG8uaW5pdCA9IGZ1bmN0aW9uKGdyYXBoKSB7XG4gIHRoaXMuX2lkID0gbm9kZV9pZCsrO1xuICB0aGlzLl9ncmFwaCA9IGdyYXBoO1xuICB0aGlzLl9yYW5rID0gKytncmFwaC5fcmFuazsgLy8gRm9yIHRvcG9sb2dpYWwgc29ydFxuICB0aGlzLl9zdGFtcCA9IDA7ICAvLyBMYXN0IHN0YW1wIHNlZW5cblxuICB0aGlzLl9saXN0ZW5lcnMgPSBbXTtcbiAgdGhpcy5fcmVnaXN0ZXJlZCA9IHt9OyAvLyBUbyBwcmV2ZW50IGR1cGxpY2F0ZSBsaXN0ZW5lcnNcblxuICB0aGlzLl9kZXBzID0ge1xuICAgIGRhdGE6ICAgIFtdLFxuICAgIGZpZWxkczogIFtdLFxuICAgIHNjYWxlczogIFtdLFxuICAgIHNpZ25hbHM6IFtdLFxuICB9O1xuXG4gIHRoaXMuX2lzUm91dGVyID0gZmFsc2U7IC8vIFJlc3BvbnNpYmxlIGZvciBwcm9wYWdhdGluZyB0dXBsZXMsIGNhbm5vdCBldmVyIGJlIHNraXBwZWRcbiAgdGhpcy5faXNDb2xsZWN0b3IgPSBmYWxzZTsgIC8vIEhvbGRzIGEgbWF0ZXJpYWxpemVkIGRhdGFzZXQsIHB1bHNlIHRvIHJlZmxvd1xuICB0aGlzLl9yZXZpc2VzID0gZmFsc2U7IC8vIERvZXMgdGhlIG9wZXJhdG9yIHJlcXVpcmUgdHVwbGVzJyBwcmV2aW91cyB2YWx1ZXM/IFxuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gIHZhciBuID0gbmV3IE5vZGUodGhpcy5fZ3JhcGgpO1xuICBuLmV2YWx1YXRlID0gdGhpcy5ldmFsdWF0ZTtcbiAgbi5fZGVwcyA9IHRoaXMuX2RlcHM7XG4gIG4uX2lzUm91dGVyID0gdGhpcy5faXNSb3V0ZXI7XG4gIG4uX2lzQ29sbGVjdG9yID0gdGhpcy5faXNDb2xsZWN0b3I7XG4gIHJldHVybiBuO1xufTtcblxucHJvdG8ucmFuayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fcmFuazsgfTtcblxucHJvdG8ubGFzdCA9IGZ1bmN0aW9uKHN0YW1wKSB7IFxuICBpZighYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX3N0YW1wO1xuICB0aGlzLl9zdGFtcCA9IHN0YW1wO1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvLmRlcGVuZGVuY3kgPSBmdW5jdGlvbih0eXBlLCBkZXBzKSB7XG4gIHZhciBkID0gdGhpcy5fZGVwc1t0eXBlXTtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkgcmV0dXJuIGQ7XG4gIGlmKGRlcHMgPT09IG51bGwpIHsgLy8gQ2xlYXIgZGVwZW5kZW5jaWVzIG9mIGEgY2VydGFpbiB0eXBlXG4gICAgd2hpbGUoZC5sZW5ndGggPiAwKSBkLnBvcCgpO1xuICB9IGVsc2Uge1xuICAgIGlmKCFkbC5pc0FycmF5KGRlcHMpICYmIGQuaW5kZXhPZihkZXBzKSA8IDApIGQucHVzaChkZXBzKTtcbiAgICBlbHNlIGQucHVzaC5hcHBseShkLCBkbC5hcnJheShkZXBzKSk7XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90by5yb3V0ZXIgPSBmdW5jdGlvbihib29sKSB7XG4gIGlmKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5faXNSb3V0ZXI7XG4gIHRoaXMuX2lzUm91dGVyID0gISFib29sXG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG8uY29sbGVjdG9yID0gZnVuY3Rpb24oYm9vbCkge1xuICBpZighYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX2lzQ29sbGVjdG9yO1xuICB0aGlzLl9pc0NvbGxlY3RvciA9ICEhYm9vbDtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90by5yZXZpc2VzID0gZnVuY3Rpb24oYm9vbCkge1xuICBpZighYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX3JldmlzZXM7XG4gIHRoaXMuX3JldmlzZXMgPSAhIWJvb2w7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG8ubGlzdGVuZXJzID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9saXN0ZW5lcnM7XG59O1xuXG5wcm90by5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKGwpIHtcbiAgaWYoIShsIGluc3RhbmNlb2YgTm9kZSkpIHRocm93IFwiTGlzdGVuZXIgaXMgbm90IGEgTm9kZVwiO1xuICBpZih0aGlzLl9yZWdpc3RlcmVkW2wuX2lkXSkgcmV0dXJuIHRoaXM7XG5cbiAgdGhpcy5fbGlzdGVuZXJzLnB1c2gobCk7XG4gIHRoaXMuX3JlZ2lzdGVyZWRbbC5faWRdID0gMTtcbiAgaWYodGhpcy5fcmFuayA+IGwuX3JhbmspIHtcbiAgICB2YXIgcSA9IFtsXTtcbiAgICB3aGlsZShxLmxlbmd0aCkge1xuICAgICAgdmFyIGN1ciA9IHEuc3BsaWNlKDAsMSlbMF07XG4gICAgICBjdXIuX3JhbmsgPSArK3RoaXMuX2dyYXBoLl9yYW5rO1xuICAgICAgcS5wdXNoLmFwcGx5KHEsIGN1ci5fbGlzdGVuZXJzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24gKGwpIHtcbiAgdmFyIGZvdW5kU2VuZGluZyA9IGZhbHNlO1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gdGhpcy5fbGlzdGVuZXJzLmxlbmd0aDsgaSA8IGxlbiAmJiAhZm91bmRTZW5kaW5nOyBpKyspIHtcbiAgICBpZiAodGhpcy5fbGlzdGVuZXJzW2ldID09PSBsKSB7XG4gICAgICB0aGlzLl9saXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xuICAgICAgdGhpcy5fcmVnaXN0ZXJlZFtsLl9pZF0gPSBudWxsO1xuICAgICAgZm91bmRTZW5kaW5nID0gdHJ1ZTtcbiAgICB9XG4gIH1cbiAgXG4gIHJldHVybiBmb3VuZFNlbmRpbmc7XG59O1xuXG5wcm90by5kaXNjb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2xpc3RlbmVycyA9IFtdO1xuICB0aGlzLl9yZWdpc3RlcmVkID0ge307XG59O1xuXG5wcm90by5ldmFsdWF0ZSA9IGZ1bmN0aW9uKHB1bHNlKSB7IHJldHVybiBwdWxzZTsgfVxuXG5wcm90by5yZWV2YWx1YXRlID0gZnVuY3Rpb24ocHVsc2UpIHtcbiAgdmFyIG5vZGUgPSB0aGlzLCByZWV2YWwgPSBmYWxzZTtcbiAgcmV0dXJuIFJFRVZBTC5zb21lKGZ1bmN0aW9uKHByb3ApIHtcbiAgICByZWV2YWwgPSByZWV2YWwgfHwgbm9kZS5fZGVwc1twcm9wXS5zb21lKGZ1bmN0aW9uKGspIHsgcmV0dXJuICEhcHVsc2VbcHJvcF1ba10gfSk7XG4gICAgcmV0dXJuIHJlZXZhbDtcbiAgfSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5vZGU7IiwidmFyIE5vZGUgPSByZXF1aXJlKCcuL05vZGUnKSxcbiAgICBjaGFuZ2VzZXQgPSByZXF1aXJlKCcuL2NoYW5nZXNldCcpO1xuXG5mdW5jdGlvbiBTaWduYWwoZ3JhcGgsIG5hbWUsIGluaXQpIHtcbiAgTm9kZS5wcm90b3R5cGUuaW5pdC5jYWxsKHRoaXMsIGdyYXBoKTtcbiAgdGhpcy5fbmFtZSAgPSBuYW1lO1xuICB0aGlzLl92YWx1ZSA9IGluaXQ7XG4gIHJldHVybiB0aGlzO1xufTtcblxudmFyIHByb3RvID0gKFNpZ25hbC5wcm90b3R5cGUgPSBuZXcgTm9kZSgpKTtcblxucHJvdG8ubmFtZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fbmFtZTsgfTtcblxucHJvdG8udmFsdWUgPSBmdW5jdGlvbih2YWwpIHtcbiAgaWYoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0aGlzLl92YWx1ZTtcbiAgdGhpcy5fdmFsdWUgPSB2YWw7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG8uZmlyZSA9IGZ1bmN0aW9uKGNzKSB7XG4gIGlmKCFjcykgY3MgPSBjaGFuZ2VzZXQuY3JlYXRlKG51bGwsIHRydWUpO1xuICBjcy5zaWduYWxzW3RoaXMuX25hbWVdID0gMTtcbiAgdGhpcy5fZ3JhcGgucHJvcGFnYXRlKGNzLCB0aGlzKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU2lnbmFsOyIsInZhciBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKTtcbnZhciBSRUVWQUwgPSBbQy5EQVRBLCBDLkZJRUxEUywgQy5TQ0FMRVMsIEMuU0lHTkFMU107XG5cbmZ1bmN0aW9uIGNyZWF0ZShjcywgcmVmbG93KSB7XG4gIHZhciBvdXQgPSB7fTtcbiAgY29weShjcywgb3V0KTtcblxuICBvdXQuYWRkID0gW107XG4gIG91dC5tb2QgPSBbXTtcbiAgb3V0LnJlbSA9IFtdO1xuXG4gIG91dC5yZWZsb3cgPSByZWZsb3c7XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gcmVzZXRfcHJldih4KSB7XG4gIHguX3ByZXYgPSAoeC5fcHJldiA9PT0gdW5kZWZpbmVkKSA/IHVuZGVmaW5lZCA6IEMuU0VOVElORUw7XG59XG5cbmZ1bmN0aW9uIGZpbmFsaXplKGNzKSB7XG4gIGZvcihpPTAsIGxlbj1jcy5hZGQubGVuZ3RoOyBpPGxlbjsgKytpKSByZXNldF9wcmV2KGNzLmFkZFtpXSk7XG4gIGZvcihpPTAsIGxlbj1jcy5tb2QubGVuZ3RoOyBpPGxlbjsgKytpKSByZXNldF9wcmV2KGNzLm1vZFtpXSk7XG59XG5cbmZ1bmN0aW9uIGNvcHkoYSwgYikge1xuICBiLnN0YW1wID0gYSA/IGEuc3RhbXAgOiAwO1xuICBiLnNvcnQgID0gYSA/IGEuc29ydCAgOiBudWxsO1xuICBiLmZhY2V0ID0gYSA/IGEuZmFjZXQgOiBudWxsO1xuICBiLnRyYW5zID0gYSA/IGEudHJhbnMgOiBudWxsO1xuICBSRUVWQUwuZm9yRWFjaChmdW5jdGlvbihkKSB7IGJbZF0gPSBhID8gYVtkXSA6IHt9OyB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZTogY3JlYXRlLFxuICBjb3B5OiBjb3B5LFxuICBmaW5hbGl6ZTogZmluYWxpemUsXG59OyIsInZhciBkbCA9IHJlcXVpcmUoJ2RhdGFsaWInKSxcbiAgICBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKSxcbiAgICB0dXBsZV9pZCA9IDE7XG5cbi8vIE9iamVjdC5jcmVhdGUgaXMgZXhwZW5zaXZlLiBTbywgd2hlbiBpbmdlc3RpbmcsIHRydXN0IHRoYXQgdGhlXG4vLyBkYXR1bSBpcyBhbiBvYmplY3QgdGhhdCBoYXMgYmVlbiBhcHByb3ByaWF0ZWx5IHNhbmRib3hlZCBmcm9tIFxuLy8gdGhlIG91dHNpZGUgZW52aXJvbm1lbnQuIFxuZnVuY3Rpb24gaW5nZXN0KGRhdHVtLCBwcmV2KSB7XG4gIGRhdHVtID0gZGwuaXNPYmplY3QoZGF0dW0pID8gZGF0dW0gOiB7ZGF0YTogZGF0dW19O1xuICBkYXR1bS5faWQgPSB0dXBsZV9pZCsrO1xuICBkYXR1bS5fcHJldiA9IChwcmV2ICE9PSB1bmRlZmluZWQpID8gKHByZXYgfHwgQy5TRU5USU5FTCkgOiB1bmRlZmluZWQ7XG4gIHJldHVybiBkYXR1bTtcbn1cblxuZnVuY3Rpb24gZGVyaXZlKGRhdHVtLCBwcmV2KSB7XG4gIHJldHVybiBpbmdlc3QoT2JqZWN0LmNyZWF0ZShkYXR1bSksIHByZXYpO1xufVxuXG4vLyBXQVJOSU5HOiBvcGVyYXRvcnMgc2hvdWxkIG9ubHkgY2FsbCB0aGlzIG9uY2UgcGVyIHRpbWVzdGFtcCFcbmZ1bmN0aW9uIHNldCh0LCBrLCB2KSB7XG4gIHZhciBwcmV2ID0gdFtrXTtcbiAgaWYocHJldiA9PT0gdikgcmV0dXJuO1xuICBzZXRfcHJldih0LCBrKTtcbiAgdFtrXSA9IHY7XG59XG5cbmZ1bmN0aW9uIHNldF9wcmV2KHQsIGspIHtcbiAgaWYodC5fcHJldiA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gIHQuX3ByZXYgPSAodC5fcHJldiA9PT0gQy5TRU5USU5FTCkgPyB7fSA6IHQuX3ByZXY7XG4gIHQuX3ByZXZba10gPSB0W2tdO1xufVxuXG5mdW5jdGlvbiByZXNldCgpIHsgdHVwbGVfaWQgPSAxOyB9XG5cbmZ1bmN0aW9uIGlkTWFwKGEpIHtcbiAgcmV0dXJuIGEucmVkdWNlKGZ1bmN0aW9uKG0seCkge1xuICAgIHJldHVybiAobVt4Ll9pZF0gPSAxLCBtKTtcbiAgfSwge30pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGluZ2VzdDogaW5nZXN0LFxuICBkZXJpdmU6IGRlcml2ZSxcbiAgc2V0OiAgICBzZXQsXG4gIHByZXY6ICAgc2V0X3ByZXYsXG4gIHJlc2V0OiAgcmVzZXQsXG4gIGlkTWFwOiAgaWRNYXBcbn07IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9wdCkge1xuICBvcHQgPSBvcHQgfHwge307XG4gIHZhciBjb25zdGFudHMgPSBvcHQuY29uc3RhbnRzIHx8IHJlcXVpcmUoJy4vY29uc3RhbnRzJyk7XG4gIHZhciBmdW5jdGlvbnMgPSAob3B0LmZ1bmN0aW9ucyB8fCByZXF1aXJlKCcuL2Z1bmN0aW9ucycpKShjb2RlZ2VuKTtcbiAgdmFyIGlkV2hpdGVMaXN0ID0gb3B0LmlkV2hpdGVMaXN0ID8gZGwudG9NYXAob3B0LmlkV2hpdGVMaXN0KSA6IG51bGw7XG4gIHZhciBpZEJsYWNrTGlzdCA9IG9wdC5pZEJsYWNrTGlzdCA/IGRsLnRvTWFwKG9wdC5pZEJsYWNrTGlzdCkgOiBudWxsO1xuICB2YXIgbWVtYmVyRGVwdGggPSAwO1xuXG4gIC8vIFRPRE8gZ2VuZXJhbGl6ZT9cbiAgdmFyIERBVFVNID0gJ2QnO1xuICB2YXIgU0lHTkFMX1BSRUZJWCA9ICdzZy4nO1xuICB2YXIgc2lnbmFscyA9IHt9O1xuICB2YXIgZmllbGRzID0ge307XG5cbiAgZnVuY3Rpb24gY29kZWdlbl93cmFwKGFzdCkgeyAgICBcbiAgICB2YXIgcmV0dmFsID0ge1xuICAgICAgZm46IGNvZGVnZW4oYXN0KSxcbiAgICAgIHNpZ25hbHM6IGRsLmtleXMoc2lnbmFscyksXG4gICAgICBmaWVsZHM6IGRsLmtleXMoZmllbGRzKVxuICAgIH07XG4gICAgc2lnbmFscyA9IHt9O1xuICAgIGZpZWxkcyA9IHt9O1xuICAgIHJldHVybiByZXR2YWw7XG4gIH1cblxuICBmdW5jdGlvbiBjb2RlZ2VuKGFzdCkge1xuICAgIGlmIChhc3QgaW5zdGFuY2VvZiBTdHJpbmcpIHJldHVybiBhc3Q7XG4gICAgdmFyIGdlbmVyYXRvciA9IENPREVHRU5fVFlQRVNbYXN0LnR5cGVdO1xuICAgIGlmIChnZW5lcmF0b3IgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5zdXBwb3J0ZWQgdHlwZTogXCIgKyBhc3QudHlwZSk7XG4gICAgfVxuICAgIHJldHVybiBnZW5lcmF0b3IoYXN0KTtcbiAgfVxuXG4gIHZhciBDT0RFR0VOX1RZUEVTID0ge1xuICAgIFwiTGl0ZXJhbFwiOiBmdW5jdGlvbihuKSB7XG4gICAgICAgIHJldHVybiBuLnJhdztcbiAgICAgIH0sXG4gICAgXCJJZGVudGlmaWVyXCI6IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgdmFyIGlkID0gbi5uYW1lO1xuICAgICAgICBpZiAobWVtYmVyRGVwdGggPiAwKSB7XG4gICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjb25zdGFudHMuaGFzT3duUHJvcGVydHkoaWQpKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbnN0YW50c1tpZF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlkV2hpdGVMaXN0KSB7XG4gICAgICAgICAgaWYgKGlkV2hpdGVMaXN0Lmhhc093blByb3BlcnR5KGlkKSkge1xuICAgICAgICAgICAgcmV0dXJuIGlkO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzaWduYWxzW2lkXSA9IDE7XG4gICAgICAgICAgICByZXR1cm4gU0lHTkFMX1BSRUZJWCArIGlkOyAvLyBIQUNLaXNoLi4uXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChpZEJsYWNrTGlzdCAmJiBpZEJsYWNrTGlzdC5oYXNPd25Qcm9wZXJ0eShpZCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbGxlZ2FsIGlkZW50aWZpZXI6IFwiICsgaWQpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpZDtcbiAgICAgIH0sXG4gICAgXCJQcm9ncmFtXCI6IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgcmV0dXJuIG4uYm9keS5tYXAoY29kZWdlbikuam9pbihcIlxcblwiKTtcbiAgICAgIH0sXG4gICAgXCJNZW1iZXJFeHByZXNzaW9uXCI6IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgdmFyIGQgPSAhbi5jb21wdXRlZDtcbiAgICAgICAgdmFyIG8gPSBjb2RlZ2VuKG4ub2JqZWN0KTtcbiAgICAgICAgaWYgKGQpIG1lbWJlckRlcHRoICs9IDE7XG4gICAgICAgIHZhciBwID0gY29kZWdlbihuLnByb3BlcnR5KTtcbiAgICAgICAgaWYgKG8gPT09IERBVFVNKSB7IGZpZWxkc1twXSA9IDE7IH0gLy8gSEFDS2lzaC4uLlxuICAgICAgICBpZiAoZCkgbWVtYmVyRGVwdGggLT0gMTtcbiAgICAgICAgcmV0dXJuIG8gKyAoZCA/IFwiLlwiK3AgOiBcIltcIitwK1wiXVwiKTtcbiAgICAgIH0sXG4gICAgXCJDYWxsRXhwcmVzc2lvblwiOiBmdW5jdGlvbihuKSB7XG4gICAgICAgIGlmIChuLmNhbGxlZS50eXBlICE9PSBcIklkZW50aWZpZXJcIikge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIklsbGVnYWwgY2FsbGVlIHR5cGU6IFwiICsgbi5jYWxsZWUudHlwZSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGNhbGxlZSA9IG4uY2FsbGVlLm5hbWU7XG4gICAgICAgIHZhciBhcmdzID0gbi5hcmd1bWVudHM7XG4gICAgICAgIHZhciBmbiA9IGZ1bmN0aW9ucy5oYXNPd25Qcm9wZXJ0eShjYWxsZWUpICYmIGZ1bmN0aW9uc1tjYWxsZWVdO1xuICAgICAgICBpZiAoIWZuKSB0aHJvdyBuZXcgRXJyb3IoXCJVbnJlY29nbml6ZWQgZnVuY3Rpb246IFwiICsgY2FsbGVlKTtcbiAgICAgICAgcmV0dXJuIGZuIGluc3RhbmNlb2YgRnVuY3Rpb25cbiAgICAgICAgICA/IGZuKGFyZ3MpXG4gICAgICAgICAgOiBmbiArIFwiKFwiICsgYXJncy5tYXAoY29kZWdlbikuam9pbihcIixcIikgKyBcIilcIjtcbiAgICAgIH0sXG4gICAgXCJBcnJheUV4cHJlc3Npb25cIjogZnVuY3Rpb24obikge1xuICAgICAgICByZXR1cm4gXCJbXCIgKyBuLmVsZW1lbnRzLm1hcChjb2RlZ2VuKS5qb2luKFwiLFwiKSArIFwiXVwiO1xuICAgICAgfSxcbiAgICBcIkJpbmFyeUV4cHJlc3Npb25cIjogZnVuY3Rpb24obikge1xuICAgICAgICByZXR1cm4gXCIoXCIgKyBjb2RlZ2VuKG4ubGVmdCkgKyBuLm9wZXJhdG9yICsgY29kZWdlbihuLnJpZ2h0KSArIFwiKVwiO1xuICAgICAgfSxcbiAgICBcIlVuYXJ5RXhwcmVzc2lvblwiOiBmdW5jdGlvbihuKSB7XG4gICAgICAgIHJldHVybiBcIihcIiArIG4ub3BlcmF0b3IgKyBjb2RlZ2VuKG4uYXJndW1lbnQpICsgXCIpXCI7XG4gICAgICB9LFxuICAgIFwiVXBkYXRlRXhwcmVzc2lvblwiOiBmdW5jdGlvbihuKSB7XG4gICAgICAgIHJldHVybiBcIihcIiArIChwcmVmaXhcbiAgICAgICAgICA/IG4ub3BlcmF0b3IgKyBjb2RlZ2VuKG4uYXJndW1lbnQpXG4gICAgICAgICAgOiBjb2RlZ2VuKG4uYXJndW1lbnQpICsgbi5vcGVyYXRvclxuICAgICAgICApICsgXCIpXCI7XG4gICAgICB9LFxuICAgIFwiQ29uZGl0aW9uYWxFeHByZXNzaW9uXCI6IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgcmV0dXJuIFwiKFwiICsgY29kZWdlbihuLnRlc3QpXG4gICAgICAgICAgKyBcIj9cIiArIGNvZGVnZW4obi5jb25zZXF1ZW50KVxuICAgICAgICAgICsgXCI6XCIgKyBjb2RlZ2VuKG4uYWx0ZXJuYXRlKVxuICAgICAgICAgICsgXCIpXCI7XG4gICAgICB9LFxuICAgIFwiTG9naWNhbEV4cHJlc3Npb25cIjogZnVuY3Rpb24obikge1xuICAgICAgICByZXR1cm4gXCIoXCIgKyBjb2RlZ2VuKG4ubGVmdCkgKyBuLm9wZXJhdG9yICsgY29kZWdlbihuLnJpZ2h0KSArIFwiKVwiO1xuICAgICAgfSxcbiAgICBcIk9iamVjdEV4cHJlc3Npb25cIjogZnVuY3Rpb24obikge1xuICAgICAgICByZXR1cm4gXCJ7XCIgKyBuLnByb3BlcnRpZXMubWFwKGNvZGVnZW4pLmpvaW4oXCIsXCIpICsgXCJ9XCI7XG4gICAgICB9LFxuICAgIFwiUHJvcGVydHlcIjogZnVuY3Rpb24obikge1xuICAgICAgICBtZW1iZXJEZXB0aCArPSAxO1xuICAgICAgICB2YXIgayA9IGNvZGVnZW4obi5rZXkpO1xuICAgICAgICBtZW1iZXJEZXB0aCAtPSAxO1xuICAgICAgICByZXR1cm4gayArIFwiOlwiICsgY29kZWdlbihuLnZhbHVlKTtcbiAgICAgIH0sXG4gICAgXCJFeHByZXNzaW9uU3RhdGVtZW50XCI6IGZ1bmN0aW9uKG4pIHtcbiAgICAgICAgcmV0dXJuIGNvZGVnZW4obi5leHByZXNzaW9uKTtcbiAgICAgIH1cbiAgfTtcbiAgXG4gIHJldHVybiBjb2RlZ2VuX3dyYXA7XG59OyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBcIk5hTlwiOiAgICAgXCJOYU5cIixcbiAgXCJFXCI6ICAgICAgIFwiTWF0aC5FXCIsXG4gIFwiTE4yXCI6ICAgICBcIk1hdGguTE4yXCIsXG4gIFwiTE4xMFwiOiAgICBcIk1hdGguTE4xMFwiLFxuICBcIkxPRzJFXCI6ICAgXCJNYXRoLkxPRzJFXCIsXG4gIFwiTE9HMTBFXCI6ICBcIk1hdGguTE9HMTBFXCIsXG4gIFwiUElcIjogICAgICBcIk1hdGguUElcIixcbiAgXCJTUVJUMV8yXCI6IFwiTWF0aC5TUVJUMV8yXCIsXG4gIFwiU1FSVDJcIjogICBcIk1hdGguU1FSVDJcIlxufTsiLCJ2YXIgZGF0YWxpYiA9IHJlcXVpcmUoJ2RhdGFsaWInKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjb2RlZ2VuKSB7XG5cbiAgZnVuY3Rpb24gZm5jYWxsKG5hbWUsIGFyZ3MsIGNhc3QsIHR5cGUpIHtcbiAgICB2YXIgb2JqID0gY29kZWdlbihhcmdzWzBdKTtcbiAgICBpZiAoY2FzdCkge1xuICAgICAgb2JqID0gY2FzdCArIFwiKFwiICsgb2JqICsgXCIpXCI7XG4gICAgICBpZiAoZGwuc3RhcnRzV2l0aChjYXN0LCBcIm5ldyBcIikpIG9iaiA9IFwiKFwiICsgb2JqICsgXCIpXCI7XG4gICAgfVxuICAgIHJldHVybiBvYmogKyBcIi5cIiArIG5hbWUgKyAodHlwZSA8IDAgPyBcIlwiIDogdHlwZSA9PT0gMFxuICAgICAgPyBcIigpXCJcbiAgICAgIDogXCIoXCIgKyBhcmdzLnNsaWNlKDEpLm1hcChjb2RlZ2VuKS5qb2luKFwiLFwiKSArIFwiKVwiKTtcbiAgfVxuICBcbiAgdmFyIERBVEUgPSBcIm5ldyBEYXRlXCI7XG4gIHZhciBTVFJJTkcgPSBcIlN0cmluZ1wiO1xuICB2YXIgUkVHRVhQID0gXCJSZWdFeHBcIjtcblxuICByZXR1cm4ge1xuICAgIC8vIE1BVEggZnVuY3Rpb25zXG4gICAgXCJpc05hTlwiOiAgICBcImlzTmFOXCIsXG4gICAgXCJpc0Zpbml0ZVwiOiBcImlzRmluaXRlXCIsXG4gICAgXCJhYnNcIjogICAgICBcIk1hdGguYWJzXCIsXG4gICAgXCJhY29zXCI6ICAgICBcIk1hdGguYWNvc1wiLFxuICAgIFwiYXNpblwiOiAgICAgXCJNYXRoLmFzaW5cIixcbiAgICBcImF0YW5cIjogICAgIFwiTWF0aC5hdGFuXCIsXG4gICAgXCJhdGFuMlwiOiAgICBcIk1hdGguYXRhbjJcIixcbiAgICBcImNlaWxcIjogICAgIFwiTWF0aC5jZWlsXCIsXG4gICAgXCJjb3NcIjogICAgICBcIk1hdGguY29zXCIsXG4gICAgXCJleHBcIjogICAgICBcIk1hdGguZXhwXCIsXG4gICAgXCJmbG9vclwiOiAgICBcIk1hdGguZmxvb3JcIixcbiAgICBcImxvZ1wiOiAgICAgIFwiTWF0aC5sb2dcIixcbiAgICBcIm1heFwiOiAgICAgIFwiTWF0aC5tYXhcIixcbiAgICBcIm1pblwiOiAgICAgIFwiTWF0aC5taW5cIixcbiAgICBcInBvd1wiOiAgICAgIFwiTWF0aC5wb3dcIixcbiAgICBcInJhbmRvbVwiOiAgIFwiTWF0aC5yYW5kb21cIixcbiAgICBcInJvdW5kXCI6ICAgIFwiTWF0aC5yb3VuZFwiLFxuICAgIFwic2luXCI6ICAgICAgXCJNYXRoLnNpblwiLFxuICAgIFwic3FydFwiOiAgICAgXCJNYXRoLnNxcnRcIixcbiAgICBcInRhblwiOiAgICAgIFwiTWF0aC50YW5cIixcblxuICAgIC8vIERBVEUgZnVuY3Rpb25zXG4gICAgXCJub3dcIjogICAgICBcIkRhdGUubm93XCIsXG4gICAgXCJkYXRldGltZVwiOiBcIm5ldyBEYXRlXCIsXG4gICAgXCJkYXRlXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImdldERhdGVcIiwgYXJncywgREFURSwgMCk7XG4gICAgICB9LFxuICAgIFwiZGF5XCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImdldERheVwiLCBhcmdzLCBEQVRFLCAwKTtcbiAgICAgIH0sXG4gICAgXCJ5ZWFyXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImdldEZ1bGxZZWFyXCIsIGFyZ3MsIERBVEUsIDApO1xuICAgICAgfSxcbiAgICBcIm1vbnRoXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImdldE1vbnRoXCIsIGFyZ3MsIERBVEUsIDApO1xuICAgICAgfSxcbiAgICBcImhvdXJzXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImdldEhvdXJzXCIsIGFyZ3MsIERBVEUsIDApO1xuICAgICAgfSxcbiAgICBcIm1pbnV0ZXNcIjogZnVuY3Rpb24oYXJncykge1xuICAgICAgICByZXR1cm4gZm5jYWxsKFwiZ2V0TWludXRlc1wiLCBhcmdzLCBEQVRFLCAwKTtcbiAgICAgIH0sXG4gICAgXCJzZWNvbmRzXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImdldFNlY29uZHNcIiwgYXJncywgREFURSwgMCk7XG4gICAgICB9LFxuICAgIFwibWlsbGlzZWNvbmRzXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImdldE1pbGxpc2Vjb25kc1wiLCBhcmdzLCBEQVRFLCAwKTtcbiAgICAgIH0sXG4gICAgXCJ0aW1lXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImdldFRpbWVcIiwgYXJncywgREFURSwgMCk7XG4gICAgICB9LFxuICAgIFwidGltZXpvbmVvZmZzZXRcIjogZnVuY3Rpb24oYXJncykge1xuICAgICAgICByZXR1cm4gZm5jYWxsKFwiZ2V0VGltZXpvbmVPZmZzZXRcIiwgYXJncywgREFURSwgMCk7XG4gICAgICB9LFxuICAgIFwidXRjZGF0ZVwiOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBmbmNhbGwoXCJnZXRVVENEYXRlXCIsIGFyZ3MsIERBVEUsIDApO1xuICAgICAgfSxcbiAgICBcInV0Y2RheVwiOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBmbmNhbGwoXCJnZXRVVENEYXlcIiwgYXJncywgREFURSwgMCk7XG4gICAgICB9LFxuICAgIFwidXRjeWVhclwiOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBmbmNhbGwoXCJnZXRVVENGdWxsWWVhclwiLCBhcmdzLCBEQVRFLCAwKTtcbiAgICAgIH0sXG4gICAgXCJ1dGNtb250aFwiOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBmbmNhbGwoXCJnZXRVVENNb250aFwiLCBhcmdzLCBEQVRFLCAwKTtcbiAgICAgIH0sXG4gICAgXCJ1dGNob3Vyc1wiOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBmbmNhbGwoXCJnZXRVVENIb3Vyc1wiLCBhcmdzLCBEQVRFLCAwKTtcbiAgICAgIH0sXG4gICAgXCJ1dGNtaW51dGVzXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImdldFVUQ01pbnV0ZXNcIiwgYXJncywgREFURSwgMCk7XG4gICAgICB9LFxuICAgIFwidXRjc2Vjb25kc1wiOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBmbmNhbGwoXCJnZXRVVENTZWNvbmRzXCIsIGFyZ3MsIERBVEUsIDApO1xuICAgICAgfSxcbiAgICBcInV0Y21pbGxpc2Vjb25kc1wiOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBmbmNhbGwoXCJnZXRVVENNaWxsaXNlY29uZHNcIiwgYXJncywgREFURSwgMCk7XG4gICAgICB9LFxuXG4gICAgLy8gc2hhcmVkIHNlcXVlbmNlIGZ1bmN0aW9uc1xuICAgIFwibGVuZ3RoXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImxlbmd0aFwiLCBhcmdzLCBudWxsLCAtMSk7XG4gICAgICB9LFxuICAgIFwiaW5kZXhvZlwiOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBmbmNhbGwoXCJpbmRleE9mXCIsIGFyZ3MsIG51bGwpO1xuICAgICAgfSxcbiAgICBcImxhc3RpbmRleG9mXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcImxhc3RJbmRleE9mXCIsIGFyZ3MsIG51bGwpO1xuICAgICAgfSxcblxuICAgIC8vIFNUUklORyBmdW5jdGlvbnNcbiAgICBcInBhcnNlRmxvYXRcIjogXCJwYXJzZUZsb2F0XCIsXG4gICAgXCJwYXJzZUludFwiOiBcInBhcnNlSW50XCIsXG4gICAgXCJ1cHBlclwiOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBmbmNhbGwoXCJ0b1VwcGVyQ2FzZVwiLCBhcmdzLCBTVFJJTkcsIDApO1xuICAgICAgfSxcbiAgICBcImxvd2VyXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGZuY2FsbChcInRvTG93ZXJDYXNlXCIsIGFyZ3MsIFNUUklORywgMCk7XG4gICAgICB9LFxuICAgIFwic2xpY2VcIjogZnVuY3Rpb24oYXJncykge1xuICAgICAgICByZXR1cm4gZm5jYWxsKFwic2xpY2VcIiwgYXJncywgU1RSSU5HKTtcbiAgICAgIH0sXG4gICAgXCJzdWJzdHJpbmdcIjogZnVuY3Rpb24oYXJncykge1xuICAgICAgICByZXR1cm4gZm5jYWxsKFwic3Vic3RyaW5nXCIsIGFyZ3MsIFNUUklORyk7XG4gICAgICB9LFxuXG4gICAgLy8gUkVHRVhQIGZ1bmN0aW9uc1xuICAgIFwidGVzdFwiOiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgIHJldHVybiBmbmNhbGwoXCJ0ZXN0XCIsIGFyZ3MsIFJFR0VYUCk7XG4gICAgICB9LFxuICAgIFxuICAgIC8vIENvbnRyb2wgRmxvdyBmdW5jdGlvbnNcbiAgICBcImlmXCI6IGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoIDwgMylcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGFyZ3VtZW50cyB0byBpZiBmdW5jdGlvbi5cIik7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDMpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlRvbyBtYW55IGFyZ3VtZW50cyB0byBpZiBmdW5jdGlvbi5cIik7XG4gICAgICAgIHZhciBhID0gYXJncy5tYXAoY29kZWdlbik7XG4gICAgICAgIHJldHVybiBhWzBdK1wiP1wiK2FbMV0rXCI6XCIrYVsyXTtcbiAgICAgIH1cbiAgfTtcbn07IiwidmFyIHBhcnNlciA9IHJlcXVpcmUoJy4vcGFyc2VyJyksXG4gICAgY29kZWdlbiA9IHJlcXVpcmUoJy4vY29kZWdlbicpO1xuICAgIFxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHBhcnNlOiBmdW5jdGlvbihpbnB1dCwgb3B0KSB7IHJldHVybiBwYXJzZXIucGFyc2UoXCIoXCIraW5wdXQrXCIpXCIsIG9wdCk7IH0sXG4gIGNvZGU6IGZ1bmN0aW9uKG9wdCkgeyByZXR1cm4gY29kZWdlbihvcHQpOyB9XG59O1xuIiwiLypcbiAgVGhlIGZvbGxvd2luZyBleHByZXNzaW9uIHBhcnNlciBpcyBiYXNlZCBvbiBFc3ByaW1hIChodHRwOi8vZXNwcmltYS5vcmcvKS5cbiAgT3JpZ2luYWwgaGVhZGVyIGNvbW1lbnQgYW5kIGxpY2Vuc2UgZm9yIEVzcHJpbWEgaXMgaW5jbHVkZWQgaGVyZTpcblxuICBDb3B5cmlnaHQgKEMpIDIwMTMgQXJpeWEgSGlkYXlhdCA8YXJpeWEuaGlkYXlhdEBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMyBUaGFkZGVlIFR5bCA8dGhhZGRlZS50eWxAZ21haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTMgTWF0aGlhcyBCeW5lbnMgPG1hdGhpYXNAcWl3aS5iZT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgTWF0aGlhcyBCeW5lbnMgPG1hdGhpYXNAcWl3aS5iZT5cbiAgQ29weXJpZ2h0IChDKSAyMDEyIEpvb3N0LVdpbSBCb2VrZXN0ZWlqbiA8am9vc3Qtd2ltQGJvZWtlc3RlaWpuLm5sPlxuICBDb3B5cmlnaHQgKEMpIDIwMTIgS3JpcyBLb3dhbCA8a3Jpcy5rb3dhbEBjaXhhci5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBZdXN1a2UgU3V6dWtpIDx1dGF0YW5lLnRlYUBnbWFpbC5jb20+XG4gIENvcHlyaWdodCAoQykgMjAxMiBBcnBhZCBCb3Jzb3MgPGFycGFkLmJvcnNvc0Bnb29nbGVtYWlsLmNvbT5cbiAgQ29weXJpZ2h0IChDKSAyMDExIEFyaXlhIEhpZGF5YXQgPGFyaXlhLmhpZGF5YXRAZ21haWwuY29tPlxuXG4gIFJlZGlzdHJpYnV0aW9uIGFuZCB1c2UgaW4gc291cmNlIGFuZCBiaW5hcnkgZm9ybXMsIHdpdGggb3Igd2l0aG91dFxuICBtb2RpZmljYXRpb24sIGFyZSBwZXJtaXR0ZWQgcHJvdmlkZWQgdGhhdCB0aGUgZm9sbG93aW5nIGNvbmRpdGlvbnMgYXJlIG1ldDpcblxuICAgICogUmVkaXN0cmlidXRpb25zIG9mIHNvdXJjZSBjb2RlIG11c3QgcmV0YWluIHRoZSBhYm92ZSBjb3B5cmlnaHRcbiAgICAgIG5vdGljZSwgdGhpcyBsaXN0IG9mIGNvbmRpdGlvbnMgYW5kIHRoZSBmb2xsb3dpbmcgZGlzY2xhaW1lci5cbiAgICAqIFJlZGlzdHJpYnV0aW9ucyBpbiBiaW5hcnkgZm9ybSBtdXN0IHJlcHJvZHVjZSB0aGUgYWJvdmUgY29weXJpZ2h0XG4gICAgICBub3RpY2UsIHRoaXMgbGlzdCBvZiBjb25kaXRpb25zIGFuZCB0aGUgZm9sbG93aW5nIGRpc2NsYWltZXIgaW4gdGhlXG4gICAgICBkb2N1bWVudGF0aW9uIGFuZC9vciBvdGhlciBtYXRlcmlhbHMgcHJvdmlkZWQgd2l0aCB0aGUgZGlzdHJpYnV0aW9uLlxuXG4gIFRISVMgU09GVFdBUkUgSVMgUFJPVklERUQgQlkgVEhFIENPUFlSSUdIVCBIT0xERVJTIEFORCBDT05UUklCVVRPUlMgXCJBUyBJU1wiXG4gIEFORCBBTlkgRVhQUkVTUyBPUiBJTVBMSUVEIFdBUlJBTlRJRVMsIElOQ0xVRElORywgQlVUIE5PVCBMSU1JVEVEIFRPLCBUSEVcbiAgSU1QTElFRCBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSBBTkQgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0VcbiAgQVJFIERJU0NMQUlNRUQuIElOIE5PIEVWRU5UIFNIQUxMIDxDT1BZUklHSFQgSE9MREVSPiBCRSBMSUFCTEUgRk9SIEFOWVxuICBESVJFQ1QsIElORElSRUNULCBJTkNJREVOVEFMLCBTUEVDSUFMLCBFWEVNUExBUlksIE9SIENPTlNFUVVFTlRJQUwgREFNQUdFU1xuICAoSU5DTFVESU5HLCBCVVQgTk9UIExJTUlURUQgVE8sIFBST0NVUkVNRU5UIE9GIFNVQlNUSVRVVEUgR09PRFMgT1IgU0VSVklDRVM7XG4gIExPU1MgT0YgVVNFLCBEQVRBLCBPUiBQUk9GSVRTOyBPUiBCVVNJTkVTUyBJTlRFUlJVUFRJT04pIEhPV0VWRVIgQ0FVU0VEIEFORFxuICBPTiBBTlkgVEhFT1JZIE9GIExJQUJJTElUWSwgV0hFVEhFUiBJTiBDT05UUkFDVCwgU1RSSUNUIExJQUJJTElUWSwgT1IgVE9SVFxuICAoSU5DTFVESU5HIE5FR0xJR0VOQ0UgT1IgT1RIRVJXSVNFKSBBUklTSU5HIElOIEFOWSBXQVkgT1VUIE9GIFRIRSBVU0UgT0ZcbiAgVEhJUyBTT0ZUV0FSRSwgRVZFTiBJRiBBRFZJU0VEIE9GIFRIRSBQT1NTSUJJTElUWSBPRiBTVUNIIERBTUFHRS5cbiovXG5tb2R1bGUuZXhwb3J0cyA9IChmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBUb2tlbixcbiAgICAgIFRva2VuTmFtZSxcbiAgICAgIFN5bnRheCxcbiAgICAgIFByb3BlcnR5S2luZCxcbiAgICAgIE1lc3NhZ2VzLFxuICAgICAgUmVnZXgsXG4gICAgICBzb3VyY2UsXG4gICAgICBzdHJpY3QsXG4gICAgICBpbmRleCxcbiAgICAgIGxpbmVOdW1iZXIsXG4gICAgICBsaW5lU3RhcnQsXG4gICAgICBsZW5ndGgsXG4gICAgICBsb29rYWhlYWQsXG4gICAgICBzdGF0ZSxcbiAgICAgIGV4dHJhO1xuXG4gIFRva2VuID0ge1xuICAgICAgQm9vbGVhbkxpdGVyYWw6IDEsXG4gICAgICBFT0Y6IDIsXG4gICAgICBJZGVudGlmaWVyOiAzLFxuICAgICAgS2V5d29yZDogNCxcbiAgICAgIE51bGxMaXRlcmFsOiA1LFxuICAgICAgTnVtZXJpY0xpdGVyYWw6IDYsXG4gICAgICBQdW5jdHVhdG9yOiA3LFxuICAgICAgU3RyaW5nTGl0ZXJhbDogOCxcbiAgICAgIFJlZ3VsYXJFeHByZXNzaW9uOiA5XG4gIH07XG5cbiAgVG9rZW5OYW1lID0ge307XG4gIFRva2VuTmFtZVtUb2tlbi5Cb29sZWFuTGl0ZXJhbF0gPSAnQm9vbGVhbic7XG4gIFRva2VuTmFtZVtUb2tlbi5FT0ZdID0gJzxlbmQ+JztcbiAgVG9rZW5OYW1lW1Rva2VuLklkZW50aWZpZXJdID0gJ0lkZW50aWZpZXInO1xuICBUb2tlbk5hbWVbVG9rZW4uS2V5d29yZF0gPSAnS2V5d29yZCc7XG4gIFRva2VuTmFtZVtUb2tlbi5OdWxsTGl0ZXJhbF0gPSAnTnVsbCc7XG4gIFRva2VuTmFtZVtUb2tlbi5OdW1lcmljTGl0ZXJhbF0gPSAnTnVtZXJpYyc7XG4gIFRva2VuTmFtZVtUb2tlbi5QdW5jdHVhdG9yXSA9ICdQdW5jdHVhdG9yJztcbiAgVG9rZW5OYW1lW1Rva2VuLlN0cmluZ0xpdGVyYWxdID0gJ1N0cmluZyc7XG4gIFRva2VuTmFtZVtUb2tlbi5SZWd1bGFyRXhwcmVzc2lvbl0gPSAnUmVndWxhckV4cHJlc3Npb24nO1xuXG4gIFN5bnRheCA9IHtcbiAgICAgIEFzc2lnbm1lbnRFeHByZXNzaW9uOiAnQXNzaWdubWVudEV4cHJlc3Npb24nLFxuICAgICAgQXJyYXlFeHByZXNzaW9uOiAnQXJyYXlFeHByZXNzaW9uJyxcbiAgICAgIEJpbmFyeUV4cHJlc3Npb246ICdCaW5hcnlFeHByZXNzaW9uJyxcbiAgICAgIENhbGxFeHByZXNzaW9uOiAnQ2FsbEV4cHJlc3Npb24nLFxuICAgICAgQ29uZGl0aW9uYWxFeHByZXNzaW9uOiAnQ29uZGl0aW9uYWxFeHByZXNzaW9uJyxcbiAgICAgIEV4cHJlc3Npb25TdGF0ZW1lbnQ6ICdFeHByZXNzaW9uU3RhdGVtZW50JyxcbiAgICAgIElkZW50aWZpZXI6ICdJZGVudGlmaWVyJyxcbiAgICAgIExpdGVyYWw6ICdMaXRlcmFsJyxcbiAgICAgIExvZ2ljYWxFeHByZXNzaW9uOiAnTG9naWNhbEV4cHJlc3Npb24nLFxuICAgICAgTWVtYmVyRXhwcmVzc2lvbjogJ01lbWJlckV4cHJlc3Npb24nLFxuICAgICAgT2JqZWN0RXhwcmVzc2lvbjogJ09iamVjdEV4cHJlc3Npb24nLFxuICAgICAgUHJvZ3JhbTogJ1Byb2dyYW0nLFxuICAgICAgUHJvcGVydHk6ICdQcm9wZXJ0eScsXG4gICAgICBVbmFyeUV4cHJlc3Npb246ICdVbmFyeUV4cHJlc3Npb24nLFxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1VwZGF0ZUV4cHJlc3Npb24nXG4gIH07XG5cbiAgUHJvcGVydHlLaW5kID0ge1xuICAgICAgRGF0YTogMSxcbiAgICAgIEdldDogMixcbiAgICAgIFNldDogNFxuICB9O1xuXG4gIC8vIEVycm9yIG1lc3NhZ2VzIHNob3VsZCBiZSBpZGVudGljYWwgdG8gVjguXG4gIE1lc3NhZ2VzID0ge1xuICAgICAgVW5leHBlY3RlZFRva2VuOiAgJ1VuZXhwZWN0ZWQgdG9rZW4gJTAnLFxuICAgICAgVW5leHBlY3RlZE51bWJlcjogICdVbmV4cGVjdGVkIG51bWJlcicsXG4gICAgICBVbmV4cGVjdGVkU3RyaW5nOiAgJ1VuZXhwZWN0ZWQgc3RyaW5nJyxcbiAgICAgIFVuZXhwZWN0ZWRJZGVudGlmaWVyOiAgJ1VuZXhwZWN0ZWQgaWRlbnRpZmllcicsXG4gICAgICBVbmV4cGVjdGVkUmVzZXJ2ZWQ6ICAnVW5leHBlY3RlZCByZXNlcnZlZCB3b3JkJyxcbiAgICAgIFVuZXhwZWN0ZWRFT1M6ICAnVW5leHBlY3RlZCBlbmQgb2YgaW5wdXQnLFxuICAgICAgTmV3bGluZUFmdGVyVGhyb3c6ICAnSWxsZWdhbCBuZXdsaW5lIGFmdGVyIHRocm93JyxcbiAgICAgIEludmFsaWRSZWdFeHA6ICdJbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbicsXG4gICAgICBVbnRlcm1pbmF0ZWRSZWdFeHA6ICAnSW52YWxpZCByZWd1bGFyIGV4cHJlc3Npb246IG1pc3NpbmcgLycsXG4gICAgICBJbnZhbGlkTEhTSW5Bc3NpZ25tZW50OiAgJ0ludmFsaWQgbGVmdC1oYW5kIHNpZGUgaW4gYXNzaWdubWVudCcsXG4gICAgICBJbnZhbGlkTEhTSW5Gb3JJbjogICdJbnZhbGlkIGxlZnQtaGFuZCBzaWRlIGluIGZvci1pbicsXG4gICAgICBNdWx0aXBsZURlZmF1bHRzSW5Td2l0Y2g6ICdNb3JlIHRoYW4gb25lIGRlZmF1bHQgY2xhdXNlIGluIHN3aXRjaCBzdGF0ZW1lbnQnLFxuICAgICAgTm9DYXRjaE9yRmluYWxseTogICdNaXNzaW5nIGNhdGNoIG9yIGZpbmFsbHkgYWZ0ZXIgdHJ5JyxcbiAgICAgIFVua25vd25MYWJlbDogJ1VuZGVmaW5lZCBsYWJlbCBcXCclMFxcJycsXG4gICAgICBSZWRlY2xhcmF0aW9uOiAnJTAgXFwnJTFcXCcgaGFzIGFscmVhZHkgYmVlbiBkZWNsYXJlZCcsXG4gICAgICBJbGxlZ2FsQ29udGludWU6ICdJbGxlZ2FsIGNvbnRpbnVlIHN0YXRlbWVudCcsXG4gICAgICBJbGxlZ2FsQnJlYWs6ICdJbGxlZ2FsIGJyZWFrIHN0YXRlbWVudCcsXG4gICAgICBJbGxlZ2FsUmV0dXJuOiAnSWxsZWdhbCByZXR1cm4gc3RhdGVtZW50JyxcbiAgICAgIFN0cmljdE1vZGVXaXRoOiAgJ1N0cmljdCBtb2RlIGNvZGUgbWF5IG5vdCBpbmNsdWRlIGEgd2l0aCBzdGF0ZW1lbnQnLFxuICAgICAgU3RyaWN0Q2F0Y2hWYXJpYWJsZTogICdDYXRjaCB2YXJpYWJsZSBtYXkgbm90IGJlIGV2YWwgb3IgYXJndW1lbnRzIGluIHN0cmljdCBtb2RlJyxcbiAgICAgIFN0cmljdFZhck5hbWU6ICAnVmFyaWFibGUgbmFtZSBtYXkgbm90IGJlIGV2YWwgb3IgYXJndW1lbnRzIGluIHN0cmljdCBtb2RlJyxcbiAgICAgIFN0cmljdFBhcmFtTmFtZTogICdQYXJhbWV0ZXIgbmFtZSBldmFsIG9yIGFyZ3VtZW50cyBpcyBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICBTdHJpY3RQYXJhbUR1cGU6ICdTdHJpY3QgbW9kZSBmdW5jdGlvbiBtYXkgbm90IGhhdmUgZHVwbGljYXRlIHBhcmFtZXRlciBuYW1lcycsXG4gICAgICBTdHJpY3RGdW5jdGlvbk5hbWU6ICAnRnVuY3Rpb24gbmFtZSBtYXkgbm90IGJlIGV2YWwgb3IgYXJndW1lbnRzIGluIHN0cmljdCBtb2RlJyxcbiAgICAgIFN0cmljdE9jdGFsTGl0ZXJhbDogICdPY3RhbCBsaXRlcmFscyBhcmUgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUuJyxcbiAgICAgIFN0cmljdERlbGV0ZTogICdEZWxldGUgb2YgYW4gdW5xdWFsaWZpZWQgaWRlbnRpZmllciBpbiBzdHJpY3QgbW9kZS4nLFxuICAgICAgU3RyaWN0RHVwbGljYXRlUHJvcGVydHk6ICAnRHVwbGljYXRlIGRhdGEgcHJvcGVydHkgaW4gb2JqZWN0IGxpdGVyYWwgbm90IGFsbG93ZWQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgQWNjZXNzb3JEYXRhUHJvcGVydHk6ICAnT2JqZWN0IGxpdGVyYWwgbWF5IG5vdCBoYXZlIGRhdGEgYW5kIGFjY2Vzc29yIHByb3BlcnR5IHdpdGggdGhlIHNhbWUgbmFtZScsXG4gICAgICBBY2Nlc3NvckdldFNldDogICdPYmplY3QgbGl0ZXJhbCBtYXkgbm90IGhhdmUgbXVsdGlwbGUgZ2V0L3NldCBhY2Nlc3NvcnMgd2l0aCB0aGUgc2FtZSBuYW1lJyxcbiAgICAgIFN0cmljdExIU0Fzc2lnbm1lbnQ6ICAnQXNzaWdubWVudCB0byBldmFsIG9yIGFyZ3VtZW50cyBpcyBub3QgYWxsb3dlZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICBTdHJpY3RMSFNQb3N0Zml4OiAgJ1Bvc3RmaXggaW5jcmVtZW50L2RlY3JlbWVudCBtYXkgbm90IGhhdmUgZXZhbCBvciBhcmd1bWVudHMgb3BlcmFuZCBpbiBzdHJpY3QgbW9kZScsXG4gICAgICBTdHJpY3RMSFNQcmVmaXg6ICAnUHJlZml4IGluY3JlbWVudC9kZWNyZW1lbnQgbWF5IG5vdCBoYXZlIGV2YWwgb3IgYXJndW1lbnRzIG9wZXJhbmQgaW4gc3RyaWN0IG1vZGUnLFxuICAgICAgU3RyaWN0UmVzZXJ2ZWRXb3JkOiAgJ1VzZSBvZiBmdXR1cmUgcmVzZXJ2ZWQgd29yZCBpbiBzdHJpY3QgbW9kZSdcbiAgfTtcblxuICAvLyBTZWUgYWxzbyB0b29scy9nZW5lcmF0ZS11bmljb2RlLXJlZ2V4LnB5LlxuICBSZWdleCA9IHtcbiAgICAgIE5vbkFzY2lpSWRlbnRpZmllclN0YXJ0OiBuZXcgUmVnRXhwKCdbXFx4QUFcXHhCNVxceEJBXFx4QzAtXFx4RDZcXHhEOC1cXHhGNlxceEY4LVxcdTAyQzFcXHUwMkM2LVxcdTAyRDFcXHUwMkUwLVxcdTAyRTRcXHUwMkVDXFx1MDJFRVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3QS1cXHUwMzdEXFx1MDM3RlxcdTAzODZcXHUwMzg4LVxcdTAzOEFcXHUwMzhDXFx1MDM4RS1cXHUwM0ExXFx1MDNBMy1cXHUwM0Y1XFx1MDNGNy1cXHUwNDgxXFx1MDQ4QS1cXHUwNTJGXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjEtXFx1MDU4N1xcdTA1RDAtXFx1MDVFQVxcdTA1RjAtXFx1MDVGMlxcdTA2MjAtXFx1MDY0QVxcdTA2NkVcXHUwNjZGXFx1MDY3MS1cXHUwNkQzXFx1MDZENVxcdTA2RTVcXHUwNkU2XFx1MDZFRVxcdTA2RUZcXHUwNkZBLVxcdTA2RkNcXHUwNkZGXFx1MDcxMFxcdTA3MTItXFx1MDcyRlxcdTA3NEQtXFx1MDdBNVxcdTA3QjFcXHUwN0NBLVxcdTA3RUFcXHUwN0Y0XFx1MDdGNVxcdTA3RkFcXHUwODAwLVxcdTA4MTVcXHUwODFBXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwOEEwLVxcdTA4QjJcXHUwOTA0LVxcdTA5MzlcXHUwOTNEXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Q1xcdTA5OEZcXHUwOTkwXFx1MDk5My1cXHUwOUE4XFx1MDlBQS1cXHUwOUIwXFx1MDlCMlxcdTA5QjYtXFx1MDlCOVxcdTA5QkRcXHUwOUNFXFx1MDlEQ1xcdTA5RERcXHUwOURGLVxcdTA5RTFcXHUwOUYwXFx1MDlGMVxcdTBBMDUtXFx1MEEwQVxcdTBBMEZcXHUwQTEwXFx1MEExMy1cXHUwQTI4XFx1MEEyQS1cXHUwQTMwXFx1MEEzMlxcdTBBMzNcXHUwQTM1XFx1MEEzNlxcdTBBMzhcXHUwQTM5XFx1MEE1OS1cXHUwQTVDXFx1MEE1RVxcdTBBNzItXFx1MEE3NFxcdTBBODUtXFx1MEE4RFxcdTBBOEYtXFx1MEE5MVxcdTBBOTMtXFx1MEFBOFxcdTBBQUEtXFx1MEFCMFxcdTBBQjJcXHUwQUIzXFx1MEFCNS1cXHUwQUI5XFx1MEFCRFxcdTBBRDBcXHUwQUUwXFx1MEFFMVxcdTBCMDUtXFx1MEIwQ1xcdTBCMEZcXHUwQjEwXFx1MEIxMy1cXHUwQjI4XFx1MEIyQS1cXHUwQjMwXFx1MEIzMlxcdTBCMzNcXHUwQjM1LVxcdTBCMzlcXHUwQjNEXFx1MEI1Q1xcdTBCNURcXHUwQjVGLVxcdTBCNjFcXHUwQjcxXFx1MEI4M1xcdTBCODUtXFx1MEI4QVxcdTBCOEUtXFx1MEI5MFxcdTBCOTItXFx1MEI5NVxcdTBCOTlcXHUwQjlBXFx1MEI5Q1xcdTBCOUVcXHUwQjlGXFx1MEJBM1xcdTBCQTRcXHUwQkE4LVxcdTBCQUFcXHUwQkFFLVxcdTBCQjlcXHUwQkQwXFx1MEMwNS1cXHUwQzBDXFx1MEMwRS1cXHUwQzEwXFx1MEMxMi1cXHUwQzI4XFx1MEMyQS1cXHUwQzM5XFx1MEMzRFxcdTBDNThcXHUwQzU5XFx1MEM2MFxcdTBDNjFcXHUwQzg1LVxcdTBDOENcXHUwQzhFLVxcdTBDOTBcXHUwQzkyLVxcdTBDQThcXHUwQ0FBLVxcdTBDQjNcXHUwQ0I1LVxcdTBDQjlcXHUwQ0JEXFx1MENERVxcdTBDRTBcXHUwQ0UxXFx1MENGMVxcdTBDRjJcXHUwRDA1LVxcdTBEMENcXHUwRDBFLVxcdTBEMTBcXHUwRDEyLVxcdTBEM0FcXHUwRDNEXFx1MEQ0RVxcdTBENjBcXHUwRDYxXFx1MEQ3QS1cXHUwRDdGXFx1MEQ4NS1cXHUwRDk2XFx1MEQ5QS1cXHUwREIxXFx1MERCMy1cXHUwREJCXFx1MERCRFxcdTBEQzAtXFx1MERDNlxcdTBFMDEtXFx1MEUzMFxcdTBFMzJcXHUwRTMzXFx1MEU0MC1cXHUwRTQ2XFx1MEU4MVxcdTBFODJcXHUwRTg0XFx1MEU4N1xcdTBFODhcXHUwRThBXFx1MEU4RFxcdTBFOTQtXFx1MEU5N1xcdTBFOTktXFx1MEU5RlxcdTBFQTEtXFx1MEVBM1xcdTBFQTVcXHUwRUE3XFx1MEVBQVxcdTBFQUJcXHUwRUFELVxcdTBFQjBcXHUwRUIyXFx1MEVCM1xcdTBFQkRcXHUwRUMwLVxcdTBFQzRcXHUwRUM2XFx1MEVEQy1cXHUwRURGXFx1MEYwMFxcdTBGNDAtXFx1MEY0N1xcdTBGNDktXFx1MEY2Q1xcdTBGODgtXFx1MEY4Q1xcdTEwMDAtXFx1MTAyQVxcdTEwM0ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVBLVxcdTEwNURcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZFLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhFXFx1MTBBMC1cXHUxMEM1XFx1MTBDN1xcdTEwQ0RcXHUxMEQwLVxcdTEwRkFcXHUxMEZDLVxcdTEyNDhcXHUxMjRBLVxcdTEyNERcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1QS1cXHUxMjVEXFx1MTI2MC1cXHUxMjg4XFx1MTI4QS1cXHUxMjhEXFx1MTI5MC1cXHUxMkIwXFx1MTJCMi1cXHUxMkI1XFx1MTJCOC1cXHUxMkJFXFx1MTJDMFxcdTEyQzItXFx1MTJDNVxcdTEyQzgtXFx1MTJENlxcdTEyRDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1QVxcdTEzODAtXFx1MTM4RlxcdTEzQTAtXFx1MTNGNFxcdTE0MDEtXFx1MTY2Q1xcdTE2NkYtXFx1MTY3RlxcdTE2ODEtXFx1MTY5QVxcdTE2QTAtXFx1MTZFQVxcdTE2RUUtXFx1MTZGOFxcdTE3MDAtXFx1MTcwQ1xcdTE3MEUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Q1xcdTE3NkUtXFx1MTc3MFxcdTE3ODAtXFx1MTdCM1xcdTE3RDdcXHUxN0RDXFx1MTgyMC1cXHUxODc3XFx1MTg4MC1cXHUxOEE4XFx1MThBQVxcdTE4QjAtXFx1MThGNVxcdTE5MDAtXFx1MTkxRVxcdTE5NTAtXFx1MTk2RFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlBQlxcdTE5QzEtXFx1MTlDN1xcdTFBMDAtXFx1MUExNlxcdTFBMjAtXFx1MUE1NFxcdTFBQTdcXHUxQjA1LVxcdTFCMzNcXHUxQjQ1LVxcdTFCNEJcXHUxQjgzLVxcdTFCQTBcXHUxQkFFXFx1MUJBRlxcdTFCQkEtXFx1MUJFNVxcdTFDMDAtXFx1MUMyM1xcdTFDNEQtXFx1MUM0RlxcdTFDNUEtXFx1MUM3RFxcdTFDRTktXFx1MUNFQ1xcdTFDRUUtXFx1MUNGMVxcdTFDRjVcXHUxQ0Y2XFx1MUQwMC1cXHUxREJGXFx1MUUwMC1cXHUxRjE1XFx1MUYxOC1cXHUxRjFEXFx1MUYyMC1cXHUxRjQ1XFx1MUY0OC1cXHUxRjREXFx1MUY1MC1cXHUxRjU3XFx1MUY1OVxcdTFGNUJcXHUxRjVEXFx1MUY1Ri1cXHUxRjdEXFx1MUY4MC1cXHUxRkI0XFx1MUZCNi1cXHUxRkJDXFx1MUZCRVxcdTFGQzItXFx1MUZDNFxcdTFGQzYtXFx1MUZDQ1xcdTFGRDAtXFx1MUZEM1xcdTFGRDYtXFx1MUZEQlxcdTFGRTAtXFx1MUZFQ1xcdTFGRjItXFx1MUZGNFxcdTFGRjYtXFx1MUZGQ1xcdTIwNzFcXHUyMDdGXFx1MjA5MC1cXHUyMDlDXFx1MjEwMlxcdTIxMDdcXHUyMTBBLVxcdTIxMTNcXHUyMTE1XFx1MjExOS1cXHUyMTFEXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyQS1cXHUyMTJEXFx1MjEyRi1cXHUyMTM5XFx1MjEzQy1cXHUyMTNGXFx1MjE0NS1cXHUyMTQ5XFx1MjE0RVxcdTIxNjAtXFx1MjE4OFxcdTJDMDAtXFx1MkMyRVxcdTJDMzAtXFx1MkM1RVxcdTJDNjAtXFx1MkNFNFxcdTJDRUItXFx1MkNFRVxcdTJDRjJcXHUyQ0YzXFx1MkQwMC1cXHUyRDI1XFx1MkQyN1xcdTJEMkRcXHUyRDMwLVxcdTJENjdcXHUyRDZGXFx1MkQ4MC1cXHUyRDk2XFx1MkRBMC1cXHUyREE2XFx1MkRBOC1cXHUyREFFXFx1MkRCMC1cXHUyREI2XFx1MkRCOC1cXHUyREJFXFx1MkRDMC1cXHUyREM2XFx1MkRDOC1cXHUyRENFXFx1MkREMC1cXHUyREQ2XFx1MkREOC1cXHUyRERFXFx1MkUyRlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzQ1xcdTMwNDEtXFx1MzA5NlxcdTMwOUQtXFx1MzA5RlxcdTMwQTEtXFx1MzBGQVxcdTMwRkMtXFx1MzBGRlxcdTMxMDUtXFx1MzEyRFxcdTMxMzEtXFx1MzE4RVxcdTMxQTAtXFx1MzFCQVxcdTMxRjAtXFx1MzFGRlxcdTM0MDAtXFx1NERCNVxcdTRFMDAtXFx1OUZDQ1xcdUEwMDAtXFx1QTQ4Q1xcdUE0RDAtXFx1QTRGRFxcdUE1MDAtXFx1QTYwQ1xcdUE2MTAtXFx1QTYxRlxcdUE2MkFcXHVBNjJCXFx1QTY0MC1cXHVBNjZFXFx1QTY3Ri1cXHVBNjlEXFx1QTZBMC1cXHVBNkVGXFx1QTcxNy1cXHVBNzFGXFx1QTcyMi1cXHVBNzg4XFx1QTc4Qi1cXHVBNzhFXFx1QTc5MC1cXHVBN0FEXFx1QTdCMFxcdUE3QjFcXHVBN0Y3LVxcdUE4MDFcXHVBODAzLVxcdUE4MDVcXHVBODA3LVxcdUE4MEFcXHVBODBDLVxcdUE4MjJcXHVBODQwLVxcdUE4NzNcXHVBODgyLVxcdUE4QjNcXHVBOEYyLVxcdUE4RjdcXHVBOEZCXFx1QTkwQS1cXHVBOTI1XFx1QTkzMC1cXHVBOTQ2XFx1QTk2MC1cXHVBOTdDXFx1QTk4NC1cXHVBOUIyXFx1QTlDRlxcdUE5RTAtXFx1QTlFNFxcdUE5RTYtXFx1QTlFRlxcdUE5RkEtXFx1QTlGRVxcdUFBMDAtXFx1QUEyOFxcdUFBNDAtXFx1QUE0MlxcdUFBNDQtXFx1QUE0QlxcdUFBNjAtXFx1QUE3NlxcdUFBN0FcXHVBQTdFLVxcdUFBQUZcXHVBQUIxXFx1QUFCNVxcdUFBQjZcXHVBQUI5LVxcdUFBQkRcXHVBQUMwXFx1QUFDMlxcdUFBREItXFx1QUFERFxcdUFBRTAtXFx1QUFFQVxcdUFBRjItXFx1QUFGNFxcdUFCMDEtXFx1QUIwNlxcdUFCMDktXFx1QUIwRVxcdUFCMTEtXFx1QUIxNlxcdUFCMjAtXFx1QUIyNlxcdUFCMjgtXFx1QUIyRVxcdUFCMzAtXFx1QUI1QVxcdUFCNUMtXFx1QUI1RlxcdUFCNjRcXHVBQjY1XFx1QUJDMC1cXHVBQkUyXFx1QUMwMC1cXHVEN0EzXFx1RDdCMC1cXHVEN0M2XFx1RDdDQi1cXHVEN0ZCXFx1RjkwMC1cXHVGQTZEXFx1RkE3MC1cXHVGQUQ5XFx1RkIwMC1cXHVGQjA2XFx1RkIxMy1cXHVGQjE3XFx1RkIxRFxcdUZCMUYtXFx1RkIyOFxcdUZCMkEtXFx1RkIzNlxcdUZCMzgtXFx1RkIzQ1xcdUZCM0VcXHVGQjQwXFx1RkI0MVxcdUZCNDNcXHVGQjQ0XFx1RkI0Ni1cXHVGQkIxXFx1RkJEMy1cXHVGRDNEXFx1RkQ1MC1cXHVGRDhGXFx1RkQ5Mi1cXHVGREM3XFx1RkRGMC1cXHVGREZCXFx1RkU3MC1cXHVGRTc0XFx1RkU3Ni1cXHVGRUZDXFx1RkYyMS1cXHVGRjNBXFx1RkY0MS1cXHVGRjVBXFx1RkY2Ni1cXHVGRkJFXFx1RkZDMi1cXHVGRkM3XFx1RkZDQS1cXHVGRkNGXFx1RkZEMi1cXHVGRkQ3XFx1RkZEQS1cXHVGRkRDXScpLFxuICAgICAgTm9uQXNjaWlJZGVudGlmaWVyUGFydDogbmV3IFJlZ0V4cCgnW1xceEFBXFx4QjVcXHhCQVxceEMwLVxceEQ2XFx4RDgtXFx4RjZcXHhGOC1cXHUwMkMxXFx1MDJDNi1cXHUwMkQxXFx1MDJFMC1cXHUwMkU0XFx1MDJFQ1xcdTAyRUVcXHUwMzAwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN0EtXFx1MDM3RFxcdTAzN0ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhBXFx1MDM4Q1xcdTAzOEUtXFx1MDNBMVxcdTAzQTMtXFx1MDNGNVxcdTAzRjctXFx1MDQ4MVxcdTA0ODMtXFx1MDQ4N1xcdTA0OEEtXFx1MDUyRlxcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYxLVxcdTA1ODdcXHUwNTkxLVxcdTA1QkRcXHUwNUJGXFx1MDVDMVxcdTA1QzJcXHUwNUM0XFx1MDVDNVxcdTA1QzdcXHUwNUQwLVxcdTA1RUFcXHUwNUYwLVxcdTA1RjJcXHUwNjEwLVxcdTA2MUFcXHUwNjIwLVxcdTA2NjlcXHUwNjZFLVxcdTA2RDNcXHUwNkQ1LVxcdTA2RENcXHUwNkRGLVxcdTA2RThcXHUwNkVBLVxcdTA2RkNcXHUwNkZGXFx1MDcxMC1cXHUwNzRBXFx1MDc0RC1cXHUwN0IxXFx1MDdDMC1cXHUwN0Y1XFx1MDdGQVxcdTA4MDAtXFx1MDgyRFxcdTA4NDAtXFx1MDg1QlxcdTA4QTAtXFx1MDhCMlxcdTA4RTQtXFx1MDk2M1xcdTA5NjYtXFx1MDk2RlxcdTA5NzEtXFx1MDk4M1xcdTA5ODUtXFx1MDk4Q1xcdTA5OEZcXHUwOTkwXFx1MDk5My1cXHUwOUE4XFx1MDlBQS1cXHUwOUIwXFx1MDlCMlxcdTA5QjYtXFx1MDlCOVxcdTA5QkMtXFx1MDlDNFxcdTA5QzdcXHUwOUM4XFx1MDlDQi1cXHUwOUNFXFx1MDlEN1xcdTA5RENcXHUwOUREXFx1MDlERi1cXHUwOUUzXFx1MDlFNi1cXHUwOUYxXFx1MEEwMS1cXHUwQTAzXFx1MEEwNS1cXHUwQTBBXFx1MEEwRlxcdTBBMTBcXHUwQTEzLVxcdTBBMjhcXHUwQTJBLVxcdTBBMzBcXHUwQTMyXFx1MEEzM1xcdTBBMzVcXHUwQTM2XFx1MEEzOFxcdTBBMzlcXHUwQTNDXFx1MEEzRS1cXHUwQTQyXFx1MEE0N1xcdTBBNDhcXHUwQTRCLVxcdTBBNERcXHUwQTUxXFx1MEE1OS1cXHUwQTVDXFx1MEE1RVxcdTBBNjYtXFx1MEE3NVxcdTBBODEtXFx1MEE4M1xcdTBBODUtXFx1MEE4RFxcdTBBOEYtXFx1MEE5MVxcdTBBOTMtXFx1MEFBOFxcdTBBQUEtXFx1MEFCMFxcdTBBQjJcXHUwQUIzXFx1MEFCNS1cXHUwQUI5XFx1MEFCQy1cXHUwQUM1XFx1MEFDNy1cXHUwQUM5XFx1MEFDQi1cXHUwQUNEXFx1MEFEMFxcdTBBRTAtXFx1MEFFM1xcdTBBRTYtXFx1MEFFRlxcdTBCMDEtXFx1MEIwM1xcdTBCMDUtXFx1MEIwQ1xcdTBCMEZcXHUwQjEwXFx1MEIxMy1cXHUwQjI4XFx1MEIyQS1cXHUwQjMwXFx1MEIzMlxcdTBCMzNcXHUwQjM1LVxcdTBCMzlcXHUwQjNDLVxcdTBCNDRcXHUwQjQ3XFx1MEI0OFxcdTBCNEItXFx1MEI0RFxcdTBCNTZcXHUwQjU3XFx1MEI1Q1xcdTBCNURcXHUwQjVGLVxcdTBCNjNcXHUwQjY2LVxcdTBCNkZcXHUwQjcxXFx1MEI4MlxcdTBCODNcXHUwQjg1LVxcdTBCOEFcXHUwQjhFLVxcdTBCOTBcXHUwQjkyLVxcdTBCOTVcXHUwQjk5XFx1MEI5QVxcdTBCOUNcXHUwQjlFXFx1MEI5RlxcdTBCQTNcXHUwQkE0XFx1MEJBOC1cXHUwQkFBXFx1MEJBRS1cXHUwQkI5XFx1MEJCRS1cXHUwQkMyXFx1MEJDNi1cXHUwQkM4XFx1MEJDQS1cXHUwQkNEXFx1MEJEMFxcdTBCRDdcXHUwQkU2LVxcdTBCRUZcXHUwQzAwLVxcdTBDMDNcXHUwQzA1LVxcdTBDMENcXHUwQzBFLVxcdTBDMTBcXHUwQzEyLVxcdTBDMjhcXHUwQzJBLVxcdTBDMzlcXHUwQzNELVxcdTBDNDRcXHUwQzQ2LVxcdTBDNDhcXHUwQzRBLVxcdTBDNERcXHUwQzU1XFx1MEM1NlxcdTBDNThcXHUwQzU5XFx1MEM2MC1cXHUwQzYzXFx1MEM2Ni1cXHUwQzZGXFx1MEM4MS1cXHUwQzgzXFx1MEM4NS1cXHUwQzhDXFx1MEM4RS1cXHUwQzkwXFx1MEM5Mi1cXHUwQ0E4XFx1MENBQS1cXHUwQ0IzXFx1MENCNS1cXHUwQ0I5XFx1MENCQy1cXHUwQ0M0XFx1MENDNi1cXHUwQ0M4XFx1MENDQS1cXHUwQ0NEXFx1MENENVxcdTBDRDZcXHUwQ0RFXFx1MENFMC1cXHUwQ0UzXFx1MENFNi1cXHUwQ0VGXFx1MENGMVxcdTBDRjJcXHUwRDAxLVxcdTBEMDNcXHUwRDA1LVxcdTBEMENcXHUwRDBFLVxcdTBEMTBcXHUwRDEyLVxcdTBEM0FcXHUwRDNELVxcdTBENDRcXHUwRDQ2LVxcdTBENDhcXHUwRDRBLVxcdTBENEVcXHUwRDU3XFx1MEQ2MC1cXHUwRDYzXFx1MEQ2Ni1cXHUwRDZGXFx1MEQ3QS1cXHUwRDdGXFx1MEQ4MlxcdTBEODNcXHUwRDg1LVxcdTBEOTZcXHUwRDlBLVxcdTBEQjFcXHUwREIzLVxcdTBEQkJcXHUwREJEXFx1MERDMC1cXHUwREM2XFx1MERDQVxcdTBEQ0YtXFx1MERENFxcdTBERDZcXHUwREQ4LVxcdTBEREZcXHUwREU2LVxcdTBERUZcXHUwREYyXFx1MERGM1xcdTBFMDEtXFx1MEUzQVxcdTBFNDAtXFx1MEU0RVxcdTBFNTAtXFx1MEU1OVxcdTBFODFcXHUwRTgyXFx1MEU4NFxcdTBFODdcXHUwRTg4XFx1MEU4QVxcdTBFOERcXHUwRTk0LVxcdTBFOTdcXHUwRTk5LVxcdTBFOUZcXHUwRUExLVxcdTBFQTNcXHUwRUE1XFx1MEVBN1xcdTBFQUFcXHUwRUFCXFx1MEVBRC1cXHUwRUI5XFx1MEVCQi1cXHUwRUJEXFx1MEVDMC1cXHUwRUM0XFx1MEVDNlxcdTBFQzgtXFx1MEVDRFxcdTBFRDAtXFx1MEVEOVxcdTBFREMtXFx1MEVERlxcdTBGMDBcXHUwRjE4XFx1MEYxOVxcdTBGMjAtXFx1MEYyOVxcdTBGMzVcXHUwRjM3XFx1MEYzOVxcdTBGM0UtXFx1MEY0N1xcdTBGNDktXFx1MEY2Q1xcdTBGNzEtXFx1MEY4NFxcdTBGODYtXFx1MEY5N1xcdTBGOTktXFx1MEZCQ1xcdTBGQzZcXHUxMDAwLVxcdTEwNDlcXHUxMDUwLVxcdTEwOURcXHUxMEEwLVxcdTEwQzVcXHUxMEM3XFx1MTBDRFxcdTEwRDAtXFx1MTBGQVxcdTEwRkMtXFx1MTI0OFxcdTEyNEEtXFx1MTI0RFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVBLVxcdTEyNURcXHUxMjYwLVxcdTEyODhcXHUxMjhBLVxcdTEyOERcXHUxMjkwLVxcdTEyQjBcXHUxMkIyLVxcdTEyQjVcXHUxMkI4LVxcdTEyQkVcXHUxMkMwXFx1MTJDMi1cXHUxMkM1XFx1MTJDOC1cXHUxMkQ2XFx1MTJEOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVBXFx1MTM1RC1cXHUxMzVGXFx1MTM4MC1cXHUxMzhGXFx1MTNBMC1cXHUxM0Y0XFx1MTQwMS1cXHUxNjZDXFx1MTY2Ri1cXHUxNjdGXFx1MTY4MS1cXHUxNjlBXFx1MTZBMC1cXHUxNkVBXFx1MTZFRS1cXHUxNkY4XFx1MTcwMC1cXHUxNzBDXFx1MTcwRS1cXHUxNzE0XFx1MTcyMC1cXHUxNzM0XFx1MTc0MC1cXHUxNzUzXFx1MTc2MC1cXHUxNzZDXFx1MTc2RS1cXHUxNzcwXFx1MTc3MlxcdTE3NzNcXHUxNzgwLVxcdTE3RDNcXHUxN0Q3XFx1MTdEQ1xcdTE3RERcXHUxN0UwLVxcdTE3RTlcXHUxODBCLVxcdTE4MERcXHUxODEwLVxcdTE4MTlcXHUxODIwLVxcdTE4NzdcXHUxODgwLVxcdTE4QUFcXHUxOEIwLVxcdTE4RjVcXHUxOTAwLVxcdTE5MUVcXHUxOTIwLVxcdTE5MkJcXHUxOTMwLVxcdTE5M0JcXHUxOTQ2LVxcdTE5NkRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5QUJcXHUxOUIwLVxcdTE5QzlcXHUxOUQwLVxcdTE5RDlcXHUxQTAwLVxcdTFBMUJcXHUxQTIwLVxcdTFBNUVcXHUxQTYwLVxcdTFBN0NcXHUxQTdGLVxcdTFBODlcXHUxQTkwLVxcdTFBOTlcXHUxQUE3XFx1MUFCMC1cXHUxQUJEXFx1MUIwMC1cXHUxQjRCXFx1MUI1MC1cXHUxQjU5XFx1MUI2Qi1cXHUxQjczXFx1MUI4MC1cXHUxQkYzXFx1MUMwMC1cXHUxQzM3XFx1MUM0MC1cXHUxQzQ5XFx1MUM0RC1cXHUxQzdEXFx1MUNEMC1cXHUxQ0QyXFx1MUNENC1cXHUxQ0Y2XFx1MUNGOFxcdTFDRjlcXHUxRDAwLVxcdTFERjVcXHUxREZDLVxcdTFGMTVcXHUxRjE4LVxcdTFGMURcXHUxRjIwLVxcdTFGNDVcXHUxRjQ4LVxcdTFGNERcXHUxRjUwLVxcdTFGNTdcXHUxRjU5XFx1MUY1QlxcdTFGNURcXHUxRjVGLVxcdTFGN0RcXHUxRjgwLVxcdTFGQjRcXHUxRkI2LVxcdTFGQkNcXHUxRkJFXFx1MUZDMi1cXHUxRkM0XFx1MUZDNi1cXHUxRkNDXFx1MUZEMC1cXHUxRkQzXFx1MUZENi1cXHUxRkRCXFx1MUZFMC1cXHUxRkVDXFx1MUZGMi1cXHUxRkY0XFx1MUZGNi1cXHUxRkZDXFx1MjAwQ1xcdTIwMERcXHUyMDNGXFx1MjA0MFxcdTIwNTRcXHUyMDcxXFx1MjA3RlxcdTIwOTAtXFx1MjA5Q1xcdTIwRDAtXFx1MjBEQ1xcdTIwRTFcXHUyMEU1LVxcdTIwRjBcXHUyMTAyXFx1MjEwN1xcdTIxMEEtXFx1MjExM1xcdTIxMTVcXHUyMTE5LVxcdTIxMURcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJBLVxcdTIxMkRcXHUyMTJGLVxcdTIxMzlcXHUyMTNDLVxcdTIxM0ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRFXFx1MjE2MC1cXHUyMTg4XFx1MkMwMC1cXHUyQzJFXFx1MkMzMC1cXHUyQzVFXFx1MkM2MC1cXHUyQ0U0XFx1MkNFQi1cXHUyQ0YzXFx1MkQwMC1cXHUyRDI1XFx1MkQyN1xcdTJEMkRcXHUyRDMwLVxcdTJENjdcXHUyRDZGXFx1MkQ3Ri1cXHUyRDk2XFx1MkRBMC1cXHUyREE2XFx1MkRBOC1cXHUyREFFXFx1MkRCMC1cXHUyREI2XFx1MkRCOC1cXHUyREJFXFx1MkRDMC1cXHUyREM2XFx1MkRDOC1cXHUyRENFXFx1MkREMC1cXHUyREQ2XFx1MkREOC1cXHUyRERFXFx1MkRFMC1cXHUyREZGXFx1MkUyRlxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyRlxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzQ1xcdTMwNDEtXFx1MzA5NlxcdTMwOTlcXHUzMDlBXFx1MzA5RC1cXHUzMDlGXFx1MzBBMS1cXHUzMEZBXFx1MzBGQy1cXHUzMEZGXFx1MzEwNS1cXHUzMTJEXFx1MzEzMS1cXHUzMThFXFx1MzFBMC1cXHUzMUJBXFx1MzFGMC1cXHUzMUZGXFx1MzQwMC1cXHU0REI1XFx1NEUwMC1cXHU5RkNDXFx1QTAwMC1cXHVBNDhDXFx1QTREMC1cXHVBNEZEXFx1QTUwMC1cXHVBNjBDXFx1QTYxMC1cXHVBNjJCXFx1QTY0MC1cXHVBNjZGXFx1QTY3NC1cXHVBNjdEXFx1QTY3Ri1cXHVBNjlEXFx1QTY5Ri1cXHVBNkYxXFx1QTcxNy1cXHVBNzFGXFx1QTcyMi1cXHVBNzg4XFx1QTc4Qi1cXHVBNzhFXFx1QTc5MC1cXHVBN0FEXFx1QTdCMFxcdUE3QjFcXHVBN0Y3LVxcdUE4MjdcXHVBODQwLVxcdUE4NzNcXHVBODgwLVxcdUE4QzRcXHVBOEQwLVxcdUE4RDlcXHVBOEUwLVxcdUE4RjdcXHVBOEZCXFx1QTkwMC1cXHVBOTJEXFx1QTkzMC1cXHVBOTUzXFx1QTk2MC1cXHVBOTdDXFx1QTk4MC1cXHVBOUMwXFx1QTlDRi1cXHVBOUQ5XFx1QTlFMC1cXHVBOUZFXFx1QUEwMC1cXHVBQTM2XFx1QUE0MC1cXHVBQTREXFx1QUE1MC1cXHVBQTU5XFx1QUE2MC1cXHVBQTc2XFx1QUE3QS1cXHVBQUMyXFx1QUFEQi1cXHVBQUREXFx1QUFFMC1cXHVBQUVGXFx1QUFGMi1cXHVBQUY2XFx1QUIwMS1cXHVBQjA2XFx1QUIwOS1cXHVBQjBFXFx1QUIxMS1cXHVBQjE2XFx1QUIyMC1cXHVBQjI2XFx1QUIyOC1cXHVBQjJFXFx1QUIzMC1cXHVBQjVBXFx1QUI1Qy1cXHVBQjVGXFx1QUI2NFxcdUFCNjVcXHVBQkMwLVxcdUFCRUFcXHVBQkVDXFx1QUJFRFxcdUFCRjAtXFx1QUJGOVxcdUFDMDAtXFx1RDdBM1xcdUQ3QjAtXFx1RDdDNlxcdUQ3Q0ItXFx1RDdGQlxcdUY5MDAtXFx1RkE2RFxcdUZBNzAtXFx1RkFEOVxcdUZCMDAtXFx1RkIwNlxcdUZCMTMtXFx1RkIxN1xcdUZCMUQtXFx1RkIyOFxcdUZCMkEtXFx1RkIzNlxcdUZCMzgtXFx1RkIzQ1xcdUZCM0VcXHVGQjQwXFx1RkI0MVxcdUZCNDNcXHVGQjQ0XFx1RkI0Ni1cXHVGQkIxXFx1RkJEMy1cXHVGRDNEXFx1RkQ1MC1cXHVGRDhGXFx1RkQ5Mi1cXHVGREM3XFx1RkRGMC1cXHVGREZCXFx1RkUwMC1cXHVGRTBGXFx1RkUyMC1cXHVGRTJEXFx1RkUzM1xcdUZFMzRcXHVGRTRELVxcdUZFNEZcXHVGRTcwLVxcdUZFNzRcXHVGRTc2LVxcdUZFRkNcXHVGRjEwLVxcdUZGMTlcXHVGRjIxLVxcdUZGM0FcXHVGRjNGXFx1RkY0MS1cXHVGRjVBXFx1RkY2Ni1cXHVGRkJFXFx1RkZDMi1cXHVGRkM3XFx1RkZDQS1cXHVGRkNGXFx1RkZEMi1cXHVGRkQ3XFx1RkZEQS1cXHVGRkRDXScpXG4gIH07XG5cbiAgLy8gRW5zdXJlIHRoZSBjb25kaXRpb24gaXMgdHJ1ZSwgb3RoZXJ3aXNlIHRocm93IGFuIGVycm9yLlxuICAvLyBUaGlzIGlzIG9ubHkgdG8gaGF2ZSBhIGJldHRlciBjb250cmFjdCBzZW1hbnRpYywgaS5lLiBhbm90aGVyIHNhZmV0eSBuZXRcbiAgLy8gdG8gY2F0Y2ggYSBsb2dpYyBlcnJvci4gVGhlIGNvbmRpdGlvbiBzaGFsbCBiZSBmdWxmaWxsZWQgaW4gbm9ybWFsIGNhc2UuXG4gIC8vIERvIE5PVCB1c2UgdGhpcyB0byBlbmZvcmNlIGEgY2VydGFpbiBjb25kaXRpb24gb24gYW55IHVzZXIgaW5wdXQuXG5cbiAgZnVuY3Rpb24gYXNzZXJ0KGNvbmRpdGlvbiwgbWVzc2FnZSkge1xuICAgICAgaWYgKCFjb25kaXRpb24pIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FTU0VSVDogJyArIG1lc3NhZ2UpO1xuICAgICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaXNEZWNpbWFsRGlnaXQoY2gpIHtcbiAgICAgIHJldHVybiAoY2ggPj0gMHgzMCAmJiBjaCA8PSAweDM5KTsgICAvLyAwLi45XG4gIH1cblxuICBmdW5jdGlvbiBpc0hleERpZ2l0KGNoKSB7XG4gICAgICByZXR1cm4gJzAxMjM0NTY3ODlhYmNkZWZBQkNERUYnLmluZGV4T2YoY2gpID49IDA7XG4gIH1cblxuICBmdW5jdGlvbiBpc09jdGFsRGlnaXQoY2gpIHtcbiAgICAgIHJldHVybiAnMDEyMzQ1NjcnLmluZGV4T2YoY2gpID49IDA7XG4gIH1cblxuICAvLyA3LjIgV2hpdGUgU3BhY2VcblxuICBmdW5jdGlvbiBpc1doaXRlU3BhY2UoY2gpIHtcbiAgICAgIHJldHVybiAoY2ggPT09IDB4MjApIHx8IChjaCA9PT0gMHgwOSkgfHwgKGNoID09PSAweDBCKSB8fCAoY2ggPT09IDB4MEMpIHx8IChjaCA9PT0gMHhBMCkgfHxcbiAgICAgICAgICAoY2ggPj0gMHgxNjgwICYmIFsweDE2ODAsIDB4MTgwRSwgMHgyMDAwLCAweDIwMDEsIDB4MjAwMiwgMHgyMDAzLCAweDIwMDQsIDB4MjAwNSwgMHgyMDA2LCAweDIwMDcsIDB4MjAwOCwgMHgyMDA5LCAweDIwMEEsIDB4MjAyRiwgMHgyMDVGLCAweDMwMDAsIDB4RkVGRl0uaW5kZXhPZihjaCkgPj0gMCk7XG4gIH1cblxuICAvLyA3LjMgTGluZSBUZXJtaW5hdG9yc1xuXG4gIGZ1bmN0aW9uIGlzTGluZVRlcm1pbmF0b3IoY2gpIHtcbiAgICAgIHJldHVybiAoY2ggPT09IDB4MEEpIHx8IChjaCA9PT0gMHgwRCkgfHwgKGNoID09PSAweDIwMjgpIHx8IChjaCA9PT0gMHgyMDI5KTtcbiAgfVxuXG4gIC8vIDcuNiBJZGVudGlmaWVyIE5hbWVzIGFuZCBJZGVudGlmaWVyc1xuXG4gIGZ1bmN0aW9uIGlzSWRlbnRpZmllclN0YXJ0KGNoKSB7XG4gICAgICByZXR1cm4gKGNoID09PSAweDI0KSB8fCAoY2ggPT09IDB4NUYpIHx8ICAvLyAkIChkb2xsYXIpIGFuZCBfICh1bmRlcnNjb3JlKVxuICAgICAgICAgIChjaCA+PSAweDQxICYmIGNoIDw9IDB4NUEpIHx8ICAgICAgICAgLy8gQS4uWlxuICAgICAgICAgIChjaCA+PSAweDYxICYmIGNoIDw9IDB4N0EpIHx8ICAgICAgICAgLy8gYS4uelxuICAgICAgICAgIChjaCA9PT0gMHg1QykgfHwgICAgICAgICAgICAgICAgICAgICAgLy8gXFwgKGJhY2tzbGFzaClcbiAgICAgICAgICAoKGNoID49IDB4ODApICYmIFJlZ2V4Lk5vbkFzY2lpSWRlbnRpZmllclN0YXJ0LnRlc3QoU3RyaW5nLmZyb21DaGFyQ29kZShjaCkpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzSWRlbnRpZmllclBhcnQoY2gpIHtcbiAgICAgIHJldHVybiAoY2ggPT09IDB4MjQpIHx8IChjaCA9PT0gMHg1RikgfHwgIC8vICQgKGRvbGxhcikgYW5kIF8gKHVuZGVyc2NvcmUpXG4gICAgICAgICAgKGNoID49IDB4NDEgJiYgY2ggPD0gMHg1QSkgfHwgICAgICAgICAvLyBBLi5aXG4gICAgICAgICAgKGNoID49IDB4NjEgJiYgY2ggPD0gMHg3QSkgfHwgICAgICAgICAvLyBhLi56XG4gICAgICAgICAgKGNoID49IDB4MzAgJiYgY2ggPD0gMHgzOSkgfHwgICAgICAgICAvLyAwLi45XG4gICAgICAgICAgKGNoID09PSAweDVDKSB8fCAgICAgICAgICAgICAgICAgICAgICAvLyBcXCAoYmFja3NsYXNoKVxuICAgICAgICAgICgoY2ggPj0gMHg4MCkgJiYgUmVnZXguTm9uQXNjaWlJZGVudGlmaWVyUGFydC50ZXN0KFN0cmluZy5mcm9tQ2hhckNvZGUoY2gpKSk7XG4gIH1cblxuICAvLyA3LjYuMS4yIEZ1dHVyZSBSZXNlcnZlZCBXb3Jkc1xuXG4gIGZ1bmN0aW9uIGlzRnV0dXJlUmVzZXJ2ZWRXb3JkKGlkKSB7XG4gICAgICBzd2l0Y2ggKGlkKSB7XG4gICAgICBjYXNlICdjbGFzcyc6XG4gICAgICBjYXNlICdlbnVtJzpcbiAgICAgIGNhc2UgJ2V4cG9ydCc6XG4gICAgICBjYXNlICdleHRlbmRzJzpcbiAgICAgIGNhc2UgJ2ltcG9ydCc6XG4gICAgICBjYXNlICdzdXBlcic6XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZChpZCkge1xuICAgICAgc3dpdGNoIChpZCkge1xuICAgICAgY2FzZSAnaW1wbGVtZW50cyc6XG4gICAgICBjYXNlICdpbnRlcmZhY2UnOlxuICAgICAgY2FzZSAncGFja2FnZSc6XG4gICAgICBjYXNlICdwcml2YXRlJzpcbiAgICAgIGNhc2UgJ3Byb3RlY3RlZCc6XG4gICAgICBjYXNlICdwdWJsaWMnOlxuICAgICAgY2FzZSAnc3RhdGljJzpcbiAgICAgIGNhc2UgJ3lpZWxkJzpcbiAgICAgIGNhc2UgJ2xldCc6XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgfVxuXG4gIC8vIDcuNi4xLjEgS2V5d29yZHNcblxuICBmdW5jdGlvbiBpc0tleXdvcmQoaWQpIHtcbiAgICAgIGlmIChzdHJpY3QgJiYgaXNTdHJpY3RNb2RlUmVzZXJ2ZWRXb3JkKGlkKSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuXG4gICAgICAvLyAnY29uc3QnIGlzIHNwZWNpYWxpemVkIGFzIEtleXdvcmQgaW4gVjguXG4gICAgICAvLyAneWllbGQnIGFuZCAnbGV0JyBhcmUgZm9yIGNvbXBhdGlibGl0eSB3aXRoIFNwaWRlck1vbmtleSBhbmQgRVMubmV4dC5cbiAgICAgIC8vIFNvbWUgb3RoZXJzIGFyZSBmcm9tIGZ1dHVyZSByZXNlcnZlZCB3b3Jkcy5cblxuICAgICAgc3dpdGNoIChpZC5sZW5ndGgpIHtcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgICByZXR1cm4gKGlkID09PSAnaWYnKSB8fCAoaWQgPT09ICdpbicpIHx8IChpZCA9PT0gJ2RvJyk7XG4gICAgICBjYXNlIDM6XG4gICAgICAgICAgcmV0dXJuIChpZCA9PT0gJ3ZhcicpIHx8IChpZCA9PT0gJ2ZvcicpIHx8IChpZCA9PT0gJ25ldycpIHx8XG4gICAgICAgICAgICAgIChpZCA9PT0gJ3RyeScpIHx8IChpZCA9PT0gJ2xldCcpO1xuICAgICAgY2FzZSA0OlxuICAgICAgICAgIHJldHVybiAoaWQgPT09ICd0aGlzJykgfHwgKGlkID09PSAnZWxzZScpIHx8IChpZCA9PT0gJ2Nhc2UnKSB8fFxuICAgICAgICAgICAgICAoaWQgPT09ICd2b2lkJykgfHwgKGlkID09PSAnd2l0aCcpIHx8IChpZCA9PT0gJ2VudW0nKTtcbiAgICAgIGNhc2UgNTpcbiAgICAgICAgICByZXR1cm4gKGlkID09PSAnd2hpbGUnKSB8fCAoaWQgPT09ICdicmVhaycpIHx8IChpZCA9PT0gJ2NhdGNoJykgfHxcbiAgICAgICAgICAgICAgKGlkID09PSAndGhyb3cnKSB8fCAoaWQgPT09ICdjb25zdCcpIHx8IChpZCA9PT0gJ3lpZWxkJykgfHxcbiAgICAgICAgICAgICAgKGlkID09PSAnY2xhc3MnKSB8fCAoaWQgPT09ICdzdXBlcicpO1xuICAgICAgY2FzZSA2OlxuICAgICAgICAgIHJldHVybiAoaWQgPT09ICdyZXR1cm4nKSB8fCAoaWQgPT09ICd0eXBlb2YnKSB8fCAoaWQgPT09ICdkZWxldGUnKSB8fFxuICAgICAgICAgICAgICAoaWQgPT09ICdzd2l0Y2gnKSB8fCAoaWQgPT09ICdleHBvcnQnKSB8fCAoaWQgPT09ICdpbXBvcnQnKTtcbiAgICAgIGNhc2UgNzpcbiAgICAgICAgICByZXR1cm4gKGlkID09PSAnZGVmYXVsdCcpIHx8IChpZCA9PT0gJ2ZpbmFsbHknKSB8fCAoaWQgPT09ICdleHRlbmRzJyk7XG4gICAgICBjYXNlIDg6XG4gICAgICAgICAgcmV0dXJuIChpZCA9PT0gJ2Z1bmN0aW9uJykgfHwgKGlkID09PSAnY29udGludWUnKSB8fCAoaWQgPT09ICdkZWJ1Z2dlcicpO1xuICAgICAgY2FzZSAxMDpcbiAgICAgICAgICByZXR1cm4gKGlkID09PSAnaW5zdGFuY2VvZicpO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBza2lwQ29tbWVudCgpIHtcbiAgICAgIHZhciBjaCwgc3RhcnQ7XG5cbiAgICAgIHN0YXJ0ID0gKGluZGV4ID09PSAwKTtcbiAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIGNoID0gc291cmNlLmNoYXJDb2RlQXQoaW5kZXgpO1xuXG4gICAgICAgICAgaWYgKGlzV2hpdGVTcGFjZShjaCkpIHtcbiAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICB9IGVsc2UgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2gpKSB7XG4gICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgIGlmIChjaCA9PT0gMHgwRCAmJiBzb3VyY2UuY2hhckNvZGVBdChpbmRleCkgPT09IDB4MEEpIHtcbiAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICBsaW5lU3RhcnQgPSBpbmRleDtcbiAgICAgICAgICAgICAgc3RhcnQgPSB0cnVlO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNjYW5IZXhFc2NhcGUocHJlZml4KSB7XG4gICAgICB2YXIgaSwgbGVuLCBjaCwgY29kZSA9IDA7XG5cbiAgICAgIGxlbiA9IChwcmVmaXggPT09ICd1JykgPyA0IDogMjtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgIGlmIChpbmRleCA8IGxlbmd0aCAmJiBpc0hleERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICBjb2RlID0gY29kZSAqIDE2ICsgJzAxMjM0NTY3ODlhYmNkZWYnLmluZGV4T2YoY2gudG9Mb3dlckNhc2UoKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gc2NhblVuaWNvZGVDb2RlUG9pbnRFc2NhcGUoKSB7XG4gICAgICB2YXIgY2gsIGNvZGUsIGN1MSwgY3UyO1xuXG4gICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICBjb2RlID0gMDtcblxuICAgICAgLy8gQXQgbGVhc3QsIG9uZSBoZXggZGlnaXQgaXMgcmVxdWlyZWQuXG4gICAgICBpZiAoY2ggPT09ICd9Jykge1xuICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgIH1cblxuICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgaWYgKCFpc0hleERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgY29kZSA9IGNvZGUgKiAxNiArICcwMTIzNDU2Nzg5YWJjZGVmJy5pbmRleE9mKGNoLnRvTG93ZXJDYXNlKCkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoY29kZSA+IDB4MTBGRkZGIHx8IGNoICE9PSAnfScpIHtcbiAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIFVURi0xNiBFbmNvZGluZ1xuICAgICAgaWYgKGNvZGUgPD0gMHhGRkZGKSB7XG4gICAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSk7XG4gICAgICB9XG4gICAgICBjdTEgPSAoKGNvZGUgLSAweDEwMDAwKSA+PiAxMCkgKyAweEQ4MDA7XG4gICAgICBjdTIgPSAoKGNvZGUgLSAweDEwMDAwKSAmIDEwMjMpICsgMHhEQzAwO1xuICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoY3UxLCBjdTIpO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0RXNjYXBlZElkZW50aWZpZXIoKSB7XG4gICAgICB2YXIgY2gsIGlkO1xuXG4gICAgICBjaCA9IHNvdXJjZS5jaGFyQ29kZUF0KGluZGV4KyspO1xuICAgICAgaWQgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGNoKTtcblxuICAgICAgLy8gJ1xcdScgKFUrMDA1QywgVSswMDc1KSBkZW5vdGVzIGFuIGVzY2FwZWQgY2hhcmFjdGVyLlxuICAgICAgaWYgKGNoID09PSAweDVDKSB7XG4gICAgICAgICAgaWYgKHNvdXJjZS5jaGFyQ29kZUF0KGluZGV4KSAhPT0gMHg3NSkge1xuICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgY2ggPSBzY2FuSGV4RXNjYXBlKCd1Jyk7XG4gICAgICAgICAgaWYgKCFjaCB8fCBjaCA9PT0gJ1xcXFwnIHx8ICFpc0lkZW50aWZpZXJTdGFydChjaC5jaGFyQ29kZUF0KDApKSkge1xuICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlkID0gY2g7XG4gICAgICB9XG5cbiAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIGNoID0gc291cmNlLmNoYXJDb2RlQXQoaW5kZXgpO1xuICAgICAgICAgIGlmICghaXNJZGVudGlmaWVyUGFydChjaCkpIHtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgaWQgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjaCk7XG5cbiAgICAgICAgICAvLyAnXFx1JyAoVSswMDVDLCBVKzAwNzUpIGRlbm90ZXMgYW4gZXNjYXBlZCBjaGFyYWN0ZXIuXG4gICAgICAgICAgaWYgKGNoID09PSAweDVDKSB7XG4gICAgICAgICAgICAgIGlkID0gaWQuc3Vic3RyKDAsIGlkLmxlbmd0aCAtIDEpO1xuICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoaW5kZXgpICE9PSAweDc1KSB7XG4gICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgY2ggPSBzY2FuSGV4RXNjYXBlKCd1Jyk7XG4gICAgICAgICAgICAgIGlmICghY2ggfHwgY2ggPT09ICdcXFxcJyB8fCAhaXNJZGVudGlmaWVyUGFydChjaC5jaGFyQ29kZUF0KDApKSkge1xuICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlkICs9IGNoO1xuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGlkO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0SWRlbnRpZmllcigpIHtcbiAgICAgIHZhciBzdGFydCwgY2g7XG5cbiAgICAgIHN0YXJ0ID0gaW5kZXgrKztcbiAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIGNoID0gc291cmNlLmNoYXJDb2RlQXQoaW5kZXgpO1xuICAgICAgICAgIGlmIChjaCA9PT0gMHg1Qykge1xuICAgICAgICAgICAgICAvLyBCbGFja3NsYXNoIChVKzAwNUMpIG1hcmtzIFVuaWNvZGUgZXNjYXBlIHNlcXVlbmNlLlxuICAgICAgICAgICAgICBpbmRleCA9IHN0YXJ0O1xuICAgICAgICAgICAgICByZXR1cm4gZ2V0RXNjYXBlZElkZW50aWZpZXIoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlzSWRlbnRpZmllclBhcnQoY2gpKSB7XG4gICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gc291cmNlLnNsaWNlKHN0YXJ0LCBpbmRleCk7XG4gIH1cblxuICBmdW5jdGlvbiBzY2FuSWRlbnRpZmllcigpIHtcbiAgICAgIHZhciBzdGFydCwgaWQsIHR5cGU7XG5cbiAgICAgIHN0YXJ0ID0gaW5kZXg7XG5cbiAgICAgIC8vIEJhY2tzbGFzaCAoVSswMDVDKSBzdGFydHMgYW4gZXNjYXBlZCBjaGFyYWN0ZXIuXG4gICAgICBpZCA9IChzb3VyY2UuY2hhckNvZGVBdChpbmRleCkgPT09IDB4NUMpID8gZ2V0RXNjYXBlZElkZW50aWZpZXIoKSA6IGdldElkZW50aWZpZXIoKTtcblxuICAgICAgLy8gVGhlcmUgaXMgbm8ga2V5d29yZCBvciBsaXRlcmFsIHdpdGggb25seSBvbmUgY2hhcmFjdGVyLlxuICAgICAgLy8gVGh1cywgaXQgbXVzdCBiZSBhbiBpZGVudGlmaWVyLlxuICAgICAgaWYgKGlkLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIHR5cGUgPSBUb2tlbi5JZGVudGlmaWVyO1xuICAgICAgfSBlbHNlIGlmIChpc0tleXdvcmQoaWQpKSB7XG4gICAgICAgICAgdHlwZSA9IFRva2VuLktleXdvcmQ7XG4gICAgICB9IGVsc2UgaWYgKGlkID09PSAnbnVsbCcpIHtcbiAgICAgICAgICB0eXBlID0gVG9rZW4uTnVsbExpdGVyYWw7XG4gICAgICB9IGVsc2UgaWYgKGlkID09PSAndHJ1ZScgfHwgaWQgPT09ICdmYWxzZScpIHtcbiAgICAgICAgICB0eXBlID0gVG9rZW4uQm9vbGVhbkxpdGVyYWw7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHR5cGUgPSBUb2tlbi5JZGVudGlmaWVyO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIHR5cGU6IHR5cGUsXG4gICAgICAgICAgdmFsdWU6IGlkLFxuICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgIGVuZDogaW5kZXhcbiAgICAgIH07XG4gIH1cblxuICAvLyA3LjcgUHVuY3R1YXRvcnNcblxuICBmdW5jdGlvbiBzY2FuUHVuY3R1YXRvcigpIHtcbiAgICAgIHZhciBzdGFydCA9IGluZGV4LFxuICAgICAgICAgIGNvZGUgPSBzb3VyY2UuY2hhckNvZGVBdChpbmRleCksXG4gICAgICAgICAgY29kZTIsXG4gICAgICAgICAgY2gxID0gc291cmNlW2luZGV4XSxcbiAgICAgICAgICBjaDIsXG4gICAgICAgICAgY2gzLFxuICAgICAgICAgIGNoNDtcblxuICAgICAgc3dpdGNoIChjb2RlKSB7XG5cbiAgICAgIC8vIENoZWNrIGZvciBtb3N0IGNvbW1vbiBzaW5nbGUtY2hhcmFjdGVyIHB1bmN0dWF0b3JzLlxuICAgICAgY2FzZSAweDJFOiAgLy8gLiBkb3RcbiAgICAgIGNhc2UgMHgyODogIC8vICggb3BlbiBicmFja2V0XG4gICAgICBjYXNlIDB4Mjk6ICAvLyApIGNsb3NlIGJyYWNrZXRcbiAgICAgIGNhc2UgMHgzQjogIC8vIDsgc2VtaWNvbG9uXG4gICAgICBjYXNlIDB4MkM6ICAvLyAsIGNvbW1hXG4gICAgICBjYXNlIDB4N0I6ICAvLyB7IG9wZW4gY3VybHkgYnJhY2VcbiAgICAgIGNhc2UgMHg3RDogIC8vIH0gY2xvc2UgY3VybHkgYnJhY2VcbiAgICAgIGNhc2UgMHg1QjogIC8vIFtcbiAgICAgIGNhc2UgMHg1RDogIC8vIF1cbiAgICAgIGNhc2UgMHgzQTogIC8vIDpcbiAgICAgIGNhc2UgMHgzRjogIC8vID9cbiAgICAgIGNhc2UgMHg3RTogIC8vIH5cbiAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgIGlmIChleHRyYS50b2tlbml6ZSkge1xuICAgICAgICAgICAgICBpZiAoY29kZSA9PT0gMHgyOCkge1xuICAgICAgICAgICAgICAgICAgZXh0cmEub3BlblBhcmVuVG9rZW4gPSBleHRyYS50b2tlbnMubGVuZ3RoO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNvZGUgPT09IDB4N0IpIHtcbiAgICAgICAgICAgICAgICAgIGV4dHJhLm9wZW5DdXJseVRva2VuID0gZXh0cmEudG9rZW5zLmxlbmd0aDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICB2YWx1ZTogU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKSxcbiAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgZW5kOiBpbmRleFxuICAgICAgICAgIH07XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgY29kZTIgPSBzb3VyY2UuY2hhckNvZGVBdChpbmRleCArIDEpO1xuXG4gICAgICAgICAgLy8gJz0nIChVKzAwM0QpIG1hcmtzIGFuIGFzc2lnbm1lbnQgb3IgY29tcGFyaXNvbiBvcGVyYXRvci5cbiAgICAgICAgICBpZiAoY29kZTIgPT09IDB4M0QpIHtcbiAgICAgICAgICAgICAgc3dpdGNoIChjb2RlKSB7XG4gICAgICAgICAgICAgIGNhc2UgMHgyQjogIC8vICtcbiAgICAgICAgICAgICAgY2FzZSAweDJEOiAgLy8gLVxuICAgICAgICAgICAgICBjYXNlIDB4MkY6ICAvLyAvXG4gICAgICAgICAgICAgIGNhc2UgMHgzQzogIC8vIDxcbiAgICAgICAgICAgICAgY2FzZSAweDNFOiAgLy8gPlxuICAgICAgICAgICAgICBjYXNlIDB4NUU6ICAvLyBeXG4gICAgICAgICAgICAgIGNhc2UgMHg3QzogIC8vIHxcbiAgICAgICAgICAgICAgY2FzZSAweDI1OiAgLy8gJVxuICAgICAgICAgICAgICBjYXNlIDB4MjY6ICAvLyAmXG4gICAgICAgICAgICAgIGNhc2UgMHgyQTogIC8vICpcbiAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IFN0cmluZy5mcm9tQ2hhckNvZGUoY29kZSkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKGNvZGUyKSxcbiAgICAgICAgICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICBlbmQ6IGluZGV4XG4gICAgICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGNhc2UgMHgyMTogLy8gIVxuICAgICAgICAgICAgICBjYXNlIDB4M0Q6IC8vID1cbiAgICAgICAgICAgICAgICAgIGluZGV4ICs9IDI7XG5cbiAgICAgICAgICAgICAgICAgIC8vICE9PSBhbmQgPT09XG4gICAgICAgICAgICAgICAgICBpZiAoc291cmNlLmNoYXJDb2RlQXQoaW5kZXgpID09PSAweDNEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogc291cmNlLnNsaWNlKHN0YXJ0LCBpbmRleCksXG4gICAgICAgICAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgZW5kOiBpbmRleFxuICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gNC1jaGFyYWN0ZXIgcHVuY3R1YXRvcjogPj4+PVxuXG4gICAgICBjaDQgPSBzb3VyY2Uuc3Vic3RyKGluZGV4LCA0KTtcblxuICAgICAgaWYgKGNoNCA9PT0gJz4+Pj0nKSB7XG4gICAgICAgICAgaW5kZXggKz0gNDtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICB2YWx1ZTogY2g0LFxuICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICBlbmQ6IGluZGV4XG4gICAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gMy1jaGFyYWN0ZXIgcHVuY3R1YXRvcnM6ID09PSAhPT0gPj4+IDw8PSA+Pj1cblxuICAgICAgY2gzID0gY2g0LnN1YnN0cigwLCAzKTtcblxuICAgICAgaWYgKGNoMyA9PT0gJz4+PicgfHwgY2gzID09PSAnPDw9JyB8fCBjaDMgPT09ICc+Pj0nKSB7XG4gICAgICAgICAgaW5kZXggKz0gMztcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICB0eXBlOiBUb2tlbi5QdW5jdHVhdG9yLFxuICAgICAgICAgICAgICB2YWx1ZTogY2gzLFxuICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgICAgICBlbmQ6IGluZGV4XG4gICAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgLy8gT3RoZXIgMi1jaGFyYWN0ZXIgcHVuY3R1YXRvcnM6ICsrIC0tIDw8ID4+ICYmIHx8XG4gICAgICBjaDIgPSBjaDMuc3Vic3RyKDAsIDIpO1xuXG4gICAgICBpZiAoKGNoMSA9PT0gY2gyWzFdICYmICgnKy08PiZ8Jy5pbmRleE9mKGNoMSkgPj0gMCkpIHx8IGNoMiA9PT0gJz0+Jykge1xuICAgICAgICAgIGluZGV4ICs9IDI7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgdmFsdWU6IGNoMixcbiAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgZW5kOiBpbmRleFxuICAgICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIC8vIDEtY2hhcmFjdGVyIHB1bmN0dWF0b3JzOiA8ID4gPSAhICsgLSAqICUgJiB8IF4gL1xuXG4gICAgICBpZiAoJzw+PSErLSolJnxeLycuaW5kZXhPZihjaDEpID49IDApIHtcbiAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgIHR5cGU6IFRva2VuLlB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgIHZhbHVlOiBjaDEsXG4gICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgICAgIGVuZDogaW5kZXhcbiAgICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gIH1cblxuICAvLyA3LjguMyBOdW1lcmljIExpdGVyYWxzXG5cbiAgZnVuY3Rpb24gc2NhbkhleExpdGVyYWwoc3RhcnQpIHtcbiAgICAgIHZhciBudW1iZXIgPSAnJztcblxuICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgaWYgKCFpc0hleERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgfVxuXG4gICAgICBpZiAobnVtYmVyLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzSWRlbnRpZmllclN0YXJ0KHNvdXJjZS5jaGFyQ29kZUF0KGluZGV4KSkpIHtcbiAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgdHlwZTogVG9rZW4uTnVtZXJpY0xpdGVyYWwsXG4gICAgICAgICAgdmFsdWU6IHBhcnNlSW50KCcweCcgKyBudW1iZXIsIDE2KSxcbiAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICBlbmQ6IGluZGV4XG4gICAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2Nhbk9jdGFsTGl0ZXJhbChzdGFydCkge1xuICAgICAgdmFyIG51bWJlciA9ICcwJyArIHNvdXJjZVtpbmRleCsrXTtcbiAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIGlmICghaXNPY3RhbERpZ2l0KHNvdXJjZVtpbmRleF0pKSB7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoc291cmNlLmNoYXJDb2RlQXQoaW5kZXgpKSB8fCBpc0RlY2ltYWxEaWdpdChzb3VyY2UuY2hhckNvZGVBdChpbmRleCkpKSB7XG4gICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCAnSUxMRUdBTCcpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIHR5cGU6IFRva2VuLk51bWVyaWNMaXRlcmFsLFxuICAgICAgICAgIHZhbHVlOiBwYXJzZUludChudW1iZXIsIDgpLFxuICAgICAgICAgIG9jdGFsOiB0cnVlLFxuICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgIGVuZDogaW5kZXhcbiAgICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBzY2FuTnVtZXJpY0xpdGVyYWwoKSB7XG4gICAgICB2YXIgbnVtYmVyLCBzdGFydCwgY2g7XG5cbiAgICAgIGNoID0gc291cmNlW2luZGV4XTtcbiAgICAgIGFzc2VydChpc0RlY2ltYWxEaWdpdChjaC5jaGFyQ29kZUF0KDApKSB8fCAoY2ggPT09ICcuJyksXG4gICAgICAgICAgJ051bWVyaWMgbGl0ZXJhbCBtdXN0IHN0YXJ0IHdpdGggYSBkZWNpbWFsIGRpZ2l0IG9yIGEgZGVjaW1hbCBwb2ludCcpO1xuXG4gICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgbnVtYmVyID0gJyc7XG4gICAgICBpZiAoY2ggIT09ICcuJykge1xuICAgICAgICAgIG51bWJlciA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG5cbiAgICAgICAgICAvLyBIZXggbnVtYmVyIHN0YXJ0cyB3aXRoICcweCcuXG4gICAgICAgICAgLy8gT2N0YWwgbnVtYmVyIHN0YXJ0cyB3aXRoICcwJy5cbiAgICAgICAgICBpZiAobnVtYmVyID09PSAnMCcpIHtcbiAgICAgICAgICAgICAgaWYgKGNoID09PSAneCcgfHwgY2ggPT09ICdYJykge1xuICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBzY2FuSGV4TGl0ZXJhbChzdGFydCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGlzT2N0YWxEaWdpdChjaCkpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBzY2FuT2N0YWxMaXRlcmFsKHN0YXJ0KTtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIGRlY2ltYWwgbnVtYmVyIHN0YXJ0cyB3aXRoICcwJyBzdWNoIGFzICcwOScgaXMgaWxsZWdhbC5cbiAgICAgICAgICAgICAgaWYgKGNoICYmIGlzRGVjaW1hbERpZ2l0KGNoLmNoYXJDb2RlQXQoMCkpKSB7XG4gICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICB3aGlsZSAoaXNEZWNpbWFsRGlnaXQoc291cmNlLmNoYXJDb2RlQXQoaW5kZXgpKSkge1xuICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICB9XG5cbiAgICAgIGlmIChjaCA9PT0gJy4nKSB7XG4gICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICB3aGlsZSAoaXNEZWNpbWFsRGlnaXQoc291cmNlLmNoYXJDb2RlQXQoaW5kZXgpKSkge1xuICAgICAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICB9XG5cbiAgICAgIGlmIChjaCA9PT0gJ2UnIHx8IGNoID09PSAnRScpIHtcbiAgICAgICAgICBudW1iZXIgKz0gc291cmNlW2luZGV4KytdO1xuXG4gICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgIGlmIChjaCA9PT0gJysnIHx8IGNoID09PSAnLScpIHtcbiAgICAgICAgICAgICAgbnVtYmVyICs9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGlzRGVjaW1hbERpZ2l0KHNvdXJjZS5jaGFyQ29kZUF0KGluZGV4KSkpIHtcbiAgICAgICAgICAgICAgd2hpbGUgKGlzRGVjaW1hbERpZ2l0KHNvdXJjZS5jaGFyQ29kZUF0KGluZGV4KSkpIHtcbiAgICAgICAgICAgICAgICAgIG51bWJlciArPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sICdJTExFR0FMJyk7XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoaXNJZGVudGlmaWVyU3RhcnQoc291cmNlLmNoYXJDb2RlQXQoaW5kZXgpKSkge1xuICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB0eXBlOiBUb2tlbi5OdW1lcmljTGl0ZXJhbCxcbiAgICAgICAgICB2YWx1ZTogcGFyc2VGbG9hdChudW1iZXIpLFxuICAgICAgICAgIGxpbmVOdW1iZXI6IGxpbmVOdW1iZXIsXG4gICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgc3RhcnQ6IHN0YXJ0LFxuICAgICAgICAgIGVuZDogaW5kZXhcbiAgICAgIH07XG4gIH1cblxuICAvLyA3LjguNCBTdHJpbmcgTGl0ZXJhbHNcblxuICBmdW5jdGlvbiBzY2FuU3RyaW5nTGl0ZXJhbCgpIHtcbiAgICAgIHZhciBzdHIgPSAnJywgcXVvdGUsIHN0YXJ0LCBjaCwgY29kZSwgdW5lc2NhcGVkLCByZXN0b3JlLCBvY3RhbCA9IGZhbHNlLCBzdGFydExpbmVOdW1iZXIsIHN0YXJ0TGluZVN0YXJ0O1xuICAgICAgc3RhcnRMaW5lTnVtYmVyID0gbGluZU51bWJlcjtcbiAgICAgIHN0YXJ0TGluZVN0YXJ0ID0gbGluZVN0YXJ0O1xuXG4gICAgICBxdW90ZSA9IHNvdXJjZVtpbmRleF07XG4gICAgICBhc3NlcnQoKHF1b3RlID09PSAnXFwnJyB8fCBxdW90ZSA9PT0gJ1wiJyksXG4gICAgICAgICAgJ1N0cmluZyBsaXRlcmFsIG11c3Qgc3RhcnRzIHdpdGggYSBxdW90ZScpO1xuXG4gICAgICBzdGFydCA9IGluZGV4O1xuICAgICAgKytpbmRleDtcblxuICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG5cbiAgICAgICAgICBpZiAoY2ggPT09IHF1b3RlKSB7XG4gICAgICAgICAgICAgIHF1b3RlID0gJyc7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH0gZWxzZSBpZiAoY2ggPT09ICdcXFxcJykge1xuICAgICAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleCsrXTtcbiAgICAgICAgICAgICAgaWYgKCFjaCB8fCAhaXNMaW5lVGVybWluYXRvcihjaC5jaGFyQ29kZUF0KDApKSkge1xuICAgICAgICAgICAgICAgICAgc3dpdGNoIChjaCkge1xuICAgICAgICAgICAgICAgICAgY2FzZSAndSc6XG4gICAgICAgICAgICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoc291cmNlW2luZGV4XSA9PT0gJ3snKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSBzY2FuVW5pY29kZUNvZGVQb2ludEVzY2FwZSgpO1xuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdW5lc2NhcGVkID0gc2NhbkhleEVzY2FwZShjaCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh1bmVzY2FwZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ciArPSB1bmVzY2FwZWQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA9IHJlc3RvcmU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICBjYXNlICduJzpcbiAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICBjYXNlICdyJzpcbiAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xccic7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICBjYXNlICd0JzpcbiAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcdCc7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICBjYXNlICdiJzpcbiAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcYic7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICBjYXNlICdmJzpcbiAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xcZic7XG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICBjYXNlICd2JzpcbiAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gJ1xceDBCJztcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNPY3RhbERpZ2l0KGNoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlID0gJzAxMjM0NTY3Jy5pbmRleE9mKGNoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBcXDAgaXMgbm90IG9jdGFsIGVzY2FwZSBzZXF1ZW5jZVxuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2N0YWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZGV4IDwgbGVuZ3RoICYmIGlzT2N0YWxEaWdpdChzb3VyY2VbaW5kZXhdKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2N0YWwgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29kZSA9IGNvZGUgKiA4ICsgJzAxMjM0NTY3Jy5pbmRleE9mKHNvdXJjZVtpbmRleCsrXSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIDMgZGlnaXRzIGFyZSBvbmx5IGFsbG93ZWQgd2hlbiBzdHJpbmcgc3RhcnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyB3aXRoIDAsIDEsIDIsIDNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgnMDEyMycuaW5kZXhPZihjaCkgPj0gMCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbmRleCA8IGxlbmd0aCAmJlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc09jdGFsRGlnaXQoc291cmNlW2luZGV4XSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb2RlID0gY29kZSAqIDggKyAnMDEyMzQ1NjcnLmluZGV4T2Yoc291cmNlW2luZGV4KytdKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShjb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgKytsaW5lTnVtYmVyO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoID09PSAgJ1xccicgJiYgc291cmNlW2luZGV4XSA9PT0gJ1xcbicpIHtcbiAgICAgICAgICAgICAgICAgICAgICArK2luZGV4O1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgbGluZVN0YXJ0ID0gaW5kZXg7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2UgaWYgKGlzTGluZVRlcm1pbmF0b3IoY2guY2hhckNvZGVBdCgwKSkpIHtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHF1b3RlICE9PSAnJykge1xuICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB0eXBlOiBUb2tlbi5TdHJpbmdMaXRlcmFsLFxuICAgICAgICAgIHZhbHVlOiBzdHIsXG4gICAgICAgICAgb2N0YWw6IG9jdGFsLFxuICAgICAgICAgIHN0YXJ0TGluZU51bWJlcjogc3RhcnRMaW5lTnVtYmVyLFxuICAgICAgICAgIHN0YXJ0TGluZVN0YXJ0OiBzdGFydExpbmVTdGFydCxcbiAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgIGxpbmVTdGFydDogbGluZVN0YXJ0LFxuICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICBlbmQ6IGluZGV4XG4gICAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gdGVzdFJlZ0V4cChwYXR0ZXJuLCBmbGFncykge1xuICAgICAgdmFyIHRtcCA9IHBhdHRlcm4sXG4gICAgICAgICAgdmFsdWU7XG5cbiAgICAgIGlmIChmbGFncy5pbmRleE9mKCd1JykgPj0gMCkge1xuICAgICAgICAgIC8vIFJlcGxhY2UgZWFjaCBhc3RyYWwgc3ltYm9sIGFuZCBldmVyeSBVbmljb2RlIGNvZGUgcG9pbnRcbiAgICAgICAgICAvLyBlc2NhcGUgc2VxdWVuY2Ugd2l0aCBhIHNpbmdsZSBBU0NJSSBzeW1ib2wgdG8gYXZvaWQgdGhyb3dpbmcgb25cbiAgICAgICAgICAvLyByZWd1bGFyIGV4cHJlc3Npb25zIHRoYXQgYXJlIG9ubHkgdmFsaWQgaW4gY29tYmluYXRpb24gd2l0aCB0aGVcbiAgICAgICAgICAvLyBgL3VgIGZsYWcuXG4gICAgICAgICAgLy8gTm90ZTogcmVwbGFjaW5nIHdpdGggdGhlIEFTQ0lJIHN5bWJvbCBgeGAgbWlnaHQgY2F1c2UgZmFsc2VcbiAgICAgICAgICAvLyBuZWdhdGl2ZXMgaW4gdW5saWtlbHkgc2NlbmFyaW9zLiBGb3IgZXhhbXBsZSwgYFtcXHV7NjF9LWJdYCBpcyBhXG4gICAgICAgICAgLy8gcGVyZmVjdGx5IHZhbGlkIHBhdHRlcm4gdGhhdCBpcyBlcXVpdmFsZW50IHRvIGBbYS1iXWAsIGJ1dCBpdFxuICAgICAgICAgIC8vIHdvdWxkIGJlIHJlcGxhY2VkIGJ5IGBbeC1iXWAgd2hpY2ggdGhyb3dzIGFuIGVycm9yLlxuICAgICAgICAgIHRtcCA9IHRtcFxuICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXHVcXHsoWzAtOWEtZkEtRl0rKVxcfS9nLCBmdW5jdGlvbiAoJDAsICQxKSB7XG4gICAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQoJDEsIDE2KSA8PSAweDEwRkZGRikge1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiAneCc7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yKHt9LCBNZXNzYWdlcy5JbnZhbGlkUmVnRXhwKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLnJlcGxhY2UoL1tcXHVEODAwLVxcdURCRkZdW1xcdURDMDAtXFx1REZGRl0vZywgJ3gnKTtcbiAgICAgIH1cblxuICAgICAgLy8gRmlyc3QsIGRldGVjdCBpbnZhbGlkIHJlZ3VsYXIgZXhwcmVzc2lvbnMuXG4gICAgICB0cnkge1xuICAgICAgICAgIHZhbHVlID0gbmV3IFJlZ0V4cCh0bXApO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLkludmFsaWRSZWdFeHApO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXR1cm4gYSByZWd1bGFyIGV4cHJlc3Npb24gb2JqZWN0IGZvciB0aGlzIHBhdHRlcm4tZmxhZyBwYWlyLCBvclxuICAgICAgLy8gYG51bGxgIGluIGNhc2UgdGhlIGN1cnJlbnQgZW52aXJvbm1lbnQgZG9lc24ndCBzdXBwb3J0IHRoZSBmbGFncyBpdFxuICAgICAgLy8gdXNlcy5cbiAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAocGF0dGVybiwgZmxhZ3MpO1xuICAgICAgfSBjYXRjaCAoZXhjZXB0aW9uKSB7XG4gICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzY2FuUmVnRXhwQm9keSgpIHtcbiAgICAgIHZhciBjaCwgc3RyLCBjbGFzc01hcmtlciwgdGVybWluYXRlZCwgYm9keTtcblxuICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgYXNzZXJ0KGNoID09PSAnLycsICdSZWd1bGFyIGV4cHJlc3Npb24gbGl0ZXJhbCBtdXN0IHN0YXJ0IHdpdGggYSBzbGFzaCcpO1xuICAgICAgc3RyID0gc291cmNlW2luZGV4KytdO1xuXG4gICAgICBjbGFzc01hcmtlciA9IGZhbHNlO1xuICAgICAgdGVybWluYXRlZCA9IGZhbHNlO1xuICAgICAgd2hpbGUgKGluZGV4IDwgbGVuZ3RoKSB7XG4gICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXgrK107XG4gICAgICAgICAgc3RyICs9IGNoO1xuICAgICAgICAgIGlmIChjaCA9PT0gJ1xcXFwnKSB7XG4gICAgICAgICAgICAgIGNoID0gc291cmNlW2luZGV4KytdO1xuICAgICAgICAgICAgICAvLyBFQ01BLTI2MiA3LjguNVxuICAgICAgICAgICAgICBpZiAoaXNMaW5lVGVybWluYXRvcihjaC5jaGFyQ29kZUF0KDApKSkge1xuICAgICAgICAgICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW50ZXJtaW5hdGVkUmVnRXhwKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgfSBlbHNlIGlmIChpc0xpbmVUZXJtaW5hdG9yKGNoLmNoYXJDb2RlQXQoMCkpKSB7XG4gICAgICAgICAgICAgIHRocm93RXJyb3Ioe30sIE1lc3NhZ2VzLlVudGVybWluYXRlZFJlZ0V4cCk7XG4gICAgICAgICAgfSBlbHNlIGlmIChjbGFzc01hcmtlcikge1xuICAgICAgICAgICAgICBpZiAoY2ggPT09ICddJykge1xuICAgICAgICAgICAgICAgICAgY2xhc3NNYXJrZXIgPSBmYWxzZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGlmIChjaCA9PT0gJy8nKSB7XG4gICAgICAgICAgICAgICAgICB0ZXJtaW5hdGVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKGNoID09PSAnWycpIHtcbiAgICAgICAgICAgICAgICAgIGNsYXNzTWFya2VyID0gdHJ1ZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCF0ZXJtaW5hdGVkKSB7XG4gICAgICAgICAgdGhyb3dFcnJvcih7fSwgTWVzc2FnZXMuVW50ZXJtaW5hdGVkUmVnRXhwKTtcbiAgICAgIH1cblxuICAgICAgLy8gRXhjbHVkZSBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaC5cbiAgICAgIGJvZHkgPSBzdHIuc3Vic3RyKDEsIHN0ci5sZW5ndGggLSAyKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgdmFsdWU6IGJvZHksXG4gICAgICAgICAgbGl0ZXJhbDogc3RyXG4gICAgICB9O1xuICB9XG5cbiAgZnVuY3Rpb24gc2NhblJlZ0V4cEZsYWdzKCkge1xuICAgICAgdmFyIGNoLCBzdHIsIGZsYWdzLCByZXN0b3JlO1xuXG4gICAgICBzdHIgPSAnJztcbiAgICAgIGZsYWdzID0gJyc7XG4gICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICBjaCA9IHNvdXJjZVtpbmRleF07XG4gICAgICAgICAgaWYgKCFpc0lkZW50aWZpZXJQYXJ0KGNoLmNoYXJDb2RlQXQoMCkpKSB7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cblxuICAgICAgICAgICsraW5kZXg7XG4gICAgICAgICAgaWYgKGNoID09PSAnXFxcXCcgJiYgaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICAgICAgY2ggPSBzb3VyY2VbaW5kZXhdO1xuICAgICAgICAgICAgICBpZiAoY2ggPT09ICd1Jykge1xuICAgICAgICAgICAgICAgICAgKytpbmRleDtcbiAgICAgICAgICAgICAgICAgIHJlc3RvcmUgPSBpbmRleDtcbiAgICAgICAgICAgICAgICAgIGNoID0gc2NhbkhleEVzY2FwZSgndScpO1xuICAgICAgICAgICAgICAgICAgaWYgKGNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgZmxhZ3MgKz0gY2g7XG4gICAgICAgICAgICAgICAgICAgICAgZm9yIChzdHIgKz0gJ1xcXFx1JzsgcmVzdG9yZSA8IGluZGV4OyArK3Jlc3RvcmUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyICs9IHNvdXJjZVtyZXN0b3JlXTtcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIGluZGV4ID0gcmVzdG9yZTtcbiAgICAgICAgICAgICAgICAgICAgICBmbGFncyArPSAndSc7XG4gICAgICAgICAgICAgICAgICAgICAgc3RyICs9ICdcXFxcdSc7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHN0ciArPSAnXFxcXCc7XG4gICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgJ0lMTEVHQUwnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZsYWdzICs9IGNoO1xuICAgICAgICAgICAgICBzdHIgKz0gY2g7XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICAgIHZhbHVlOiBmbGFncyxcbiAgICAgICAgICBsaXRlcmFsOiBzdHJcbiAgICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBzY2FuUmVnRXhwKCkge1xuICAgICAgdmFyIHN0YXJ0LCBib2R5LCBmbGFncywgdmFsdWU7XG5cbiAgICAgIGxvb2thaGVhZCA9IG51bGw7XG4gICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgc3RhcnQgPSBpbmRleDtcblxuICAgICAgYm9keSA9IHNjYW5SZWdFeHBCb2R5KCk7XG4gICAgICBmbGFncyA9IHNjYW5SZWdFeHBGbGFncygpO1xuICAgICAgdmFsdWUgPSB0ZXN0UmVnRXhwKGJvZHkudmFsdWUsIGZsYWdzLnZhbHVlKTtcblxuICAgICAgaWYgKGV4dHJhLnRva2VuaXplKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdHlwZTogVG9rZW4uUmVndWxhckV4cHJlc3Npb24sXG4gICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAgICAgcmVnZXg6IHtcbiAgICAgICAgICAgICAgICAgIHBhdHRlcm46IGJvZHkudmFsdWUsXG4gICAgICAgICAgICAgICAgICBmbGFnczogZmxhZ3MudmFsdWVcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgbGluZU51bWJlcjogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgbGluZVN0YXJ0OiBsaW5lU3RhcnQsXG4gICAgICAgICAgICAgIHN0YXJ0OiBzdGFydCxcbiAgICAgICAgICAgICAgZW5kOiBpbmRleFxuICAgICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgICAgbGl0ZXJhbDogYm9keS5saXRlcmFsICsgZmxhZ3MubGl0ZXJhbCxcbiAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgcmVnZXg6IHtcbiAgICAgICAgICAgICAgcGF0dGVybjogYm9keS52YWx1ZSxcbiAgICAgICAgICAgICAgZmxhZ3M6IGZsYWdzLnZhbHVlXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGFydDogc3RhcnQsXG4gICAgICAgICAgZW5kOiBpbmRleFxuICAgICAgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbGxlY3RSZWdleCgpIHtcbiAgICAgIHZhciBwb3MsIGxvYywgcmVnZXgsIHRva2VuO1xuXG4gICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICBwb3MgPSBpbmRleDtcbiAgICAgIGxvYyA9IHtcbiAgICAgICAgICBzdGFydDoge1xuICAgICAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgcmVnZXggPSBzY2FuUmVnRXhwKCk7XG5cbiAgICAgIGxvYy5lbmQgPSB7XG4gICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICBjb2x1bW46IGluZGV4IC0gbGluZVN0YXJ0XG4gICAgICB9O1xuXG4gICAgICBpZiAoIWV4dHJhLnRva2VuaXplKSB7XG4gICAgICAgICAgLy8gUG9wIHRoZSBwcmV2aW91cyB0b2tlbiwgd2hpY2ggaXMgbGlrZWx5ICcvJyBvciAnLz0nXG4gICAgICAgICAgaWYgKGV4dHJhLnRva2Vucy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgIHRva2VuID0gZXh0cmEudG9rZW5zW2V4dHJhLnRva2Vucy5sZW5ndGggLSAxXTtcbiAgICAgICAgICAgICAgaWYgKHRva2VuLnJhbmdlWzBdID09PSBwb3MgJiYgdG9rZW4udHlwZSA9PT0gJ1B1bmN0dWF0b3InKSB7XG4gICAgICAgICAgICAgICAgICBpZiAodG9rZW4udmFsdWUgPT09ICcvJyB8fCB0b2tlbi52YWx1ZSA9PT0gJy89Jykge1xuICAgICAgICAgICAgICAgICAgICAgIGV4dHJhLnRva2Vucy5wb3AoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGV4dHJhLnRva2Vucy5wdXNoKHtcbiAgICAgICAgICAgICAgdHlwZTogJ1JlZ3VsYXJFeHByZXNzaW9uJyxcbiAgICAgICAgICAgICAgdmFsdWU6IHJlZ2V4LmxpdGVyYWwsXG4gICAgICAgICAgICAgIHJlZ2V4OiByZWdleC5yZWdleCxcbiAgICAgICAgICAgICAgcmFuZ2U6IFtwb3MsIGluZGV4XSxcbiAgICAgICAgICAgICAgbG9jOiBsb2NcbiAgICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlZ2V4O1xuICB9XG5cbiAgZnVuY3Rpb24gaXNJZGVudGlmaWVyTmFtZSh0b2tlbikge1xuICAgICAgcmV0dXJuIHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIgfHxcbiAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkIHx8XG4gICAgICAgICAgdG9rZW4udHlwZSA9PT0gVG9rZW4uQm9vbGVhbkxpdGVyYWwgfHxcbiAgICAgICAgICB0b2tlbi50eXBlID09PSBUb2tlbi5OdWxsTGl0ZXJhbDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGFkdmFuY2VTbGFzaCgpIHtcbiAgICAgIHZhciBwcmV2VG9rZW4sXG4gICAgICAgICAgY2hlY2tUb2tlbjtcbiAgICAgIC8vIFVzaW5nIHRoZSBmb2xsb3dpbmcgYWxnb3JpdGhtOlxuICAgICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21vemlsbGEvc3dlZXQuanMvd2lraS9kZXNpZ25cbiAgICAgIHByZXZUb2tlbiA9IGV4dHJhLnRva2Vuc1tleHRyYS50b2tlbnMubGVuZ3RoIC0gMV07XG4gICAgICBpZiAoIXByZXZUb2tlbikge1xuICAgICAgICAgIC8vIE5vdGhpbmcgYmVmb3JlIHRoYXQ6IGl0IGNhbm5vdCBiZSBhIGRpdmlzaW9uLlxuICAgICAgICAgIHJldHVybiBjb2xsZWN0UmVnZXgoKTtcbiAgICAgIH1cbiAgICAgIGlmIChwcmV2VG9rZW4udHlwZSA9PT0gJ1B1bmN0dWF0b3InKSB7XG4gICAgICAgICAgaWYgKHByZXZUb2tlbi52YWx1ZSA9PT0gJ10nKSB7XG4gICAgICAgICAgICAgIHJldHVybiBzY2FuUHVuY3R1YXRvcigpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocHJldlRva2VuLnZhbHVlID09PSAnKScpIHtcbiAgICAgICAgICAgICAgY2hlY2tUb2tlbiA9IGV4dHJhLnRva2Vuc1tleHRyYS5vcGVuUGFyZW5Ub2tlbiAtIDFdO1xuICAgICAgICAgICAgICBpZiAoY2hlY2tUb2tlbiAmJlxuICAgICAgICAgICAgICAgICAgICAgIGNoZWNrVG9rZW4udHlwZSA9PT0gJ0tleXdvcmQnICYmXG4gICAgICAgICAgICAgICAgICAgICAgKGNoZWNrVG9rZW4udmFsdWUgPT09ICdpZicgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tUb2tlbi52YWx1ZSA9PT0gJ3doaWxlJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICBjaGVja1Rva2VuLnZhbHVlID09PSAnZm9yJyB8fFxuICAgICAgICAgICAgICAgICAgICAgICBjaGVja1Rva2VuLnZhbHVlID09PSAnd2l0aCcpKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gY29sbGVjdFJlZ2V4KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHNjYW5QdW5jdHVhdG9yKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChwcmV2VG9rZW4udmFsdWUgPT09ICd9Jykge1xuICAgICAgICAgICAgICAvLyBEaXZpZGluZyBhIGZ1bmN0aW9uIGJ5IGFueXRoaW5nIG1ha2VzIGxpdHRsZSBzZW5zZSxcbiAgICAgICAgICAgICAgLy8gYnV0IHdlIGhhdmUgdG8gY2hlY2sgZm9yIHRoYXQuXG4gICAgICAgICAgICAgIGlmIChleHRyYS50b2tlbnNbZXh0cmEub3BlbkN1cmx5VG9rZW4gLSAzXSAmJlxuICAgICAgICAgICAgICAgICAgICAgIGV4dHJhLnRva2Vuc1tleHRyYS5vcGVuQ3VybHlUb2tlbiAtIDNdLnR5cGUgPT09ICdLZXl3b3JkJykge1xuICAgICAgICAgICAgICAgICAgLy8gQW5vbnltb3VzIGZ1bmN0aW9uLlxuICAgICAgICAgICAgICAgICAgY2hlY2tUb2tlbiA9IGV4dHJhLnRva2Vuc1tleHRyYS5vcGVuQ3VybHlUb2tlbiAtIDRdO1xuICAgICAgICAgICAgICAgICAgaWYgKCFjaGVja1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjYW5QdW5jdHVhdG9yKCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXh0cmEudG9rZW5zW2V4dHJhLm9wZW5DdXJseVRva2VuIC0gNF0gJiZcbiAgICAgICAgICAgICAgICAgICAgICBleHRyYS50b2tlbnNbZXh0cmEub3BlbkN1cmx5VG9rZW4gLSA0XS50eXBlID09PSAnS2V5d29yZCcpIHtcbiAgICAgICAgICAgICAgICAgIC8vIE5hbWVkIGZ1bmN0aW9uLlxuICAgICAgICAgICAgICAgICAgY2hlY2tUb2tlbiA9IGV4dHJhLnRva2Vuc1tleHRyYS5vcGVuQ3VybHlUb2tlbiAtIDVdO1xuICAgICAgICAgICAgICAgICAgaWYgKCFjaGVja1Rva2VuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvbGxlY3RSZWdleCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHNjYW5QdW5jdHVhdG9yKCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHNjYW5QdW5jdHVhdG9yKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBjb2xsZWN0UmVnZXgoKTtcbiAgICAgIH1cbiAgICAgIGlmIChwcmV2VG9rZW4udHlwZSA9PT0gJ0tleXdvcmQnICYmIHByZXZUb2tlbi52YWx1ZSAhPT0gJ3RoaXMnKSB7XG4gICAgICAgICAgcmV0dXJuIGNvbGxlY3RSZWdleCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNjYW5QdW5jdHVhdG9yKCk7XG4gIH1cblxuICBmdW5jdGlvbiBhZHZhbmNlKCkge1xuICAgICAgdmFyIGNoO1xuXG4gICAgICBza2lwQ29tbWVudCgpO1xuXG4gICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgdHlwZTogVG9rZW4uRU9GLFxuICAgICAgICAgICAgICBsaW5lTnVtYmVyOiBsaW5lTnVtYmVyLFxuICAgICAgICAgICAgICBsaW5lU3RhcnQ6IGxpbmVTdGFydCxcbiAgICAgICAgICAgICAgc3RhcnQ6IGluZGV4LFxuICAgICAgICAgICAgICBlbmQ6IGluZGV4XG4gICAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgY2ggPSBzb3VyY2UuY2hhckNvZGVBdChpbmRleCk7XG5cbiAgICAgIGlmIChpc0lkZW50aWZpZXJTdGFydChjaCkpIHtcbiAgICAgICAgICByZXR1cm4gc2NhbklkZW50aWZpZXIoKTtcbiAgICAgIH1cblxuICAgICAgLy8gVmVyeSBjb21tb246ICggYW5kICkgYW5kIDtcbiAgICAgIGlmIChjaCA9PT0gMHgyOCB8fCBjaCA9PT0gMHgyOSB8fCBjaCA9PT0gMHgzQikge1xuICAgICAgICAgIHJldHVybiBzY2FuUHVuY3R1YXRvcigpO1xuICAgICAgfVxuXG4gICAgICAvLyBTdHJpbmcgbGl0ZXJhbCBzdGFydHMgd2l0aCBzaW5nbGUgcXVvdGUgKFUrMDAyNykgb3IgZG91YmxlIHF1b3RlIChVKzAwMjIpLlxuICAgICAgaWYgKGNoID09PSAweDI3IHx8IGNoID09PSAweDIyKSB7XG4gICAgICAgICAgcmV0dXJuIHNjYW5TdHJpbmdMaXRlcmFsKCk7XG4gICAgICB9XG5cblxuICAgICAgLy8gRG90ICguKSBVKzAwMkUgY2FuIGFsc28gc3RhcnQgYSBmbG9hdGluZy1wb2ludCBudW1iZXIsIGhlbmNlIHRoZSBuZWVkXG4gICAgICAvLyB0byBjaGVjayB0aGUgbmV4dCBjaGFyYWN0ZXIuXG4gICAgICBpZiAoY2ggPT09IDB4MkUpIHtcbiAgICAgICAgICBpZiAoaXNEZWNpbWFsRGlnaXQoc291cmNlLmNoYXJDb2RlQXQoaW5kZXggKyAxKSkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHNjYW5OdW1lcmljTGl0ZXJhbCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gc2NhblB1bmN0dWF0b3IoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzRGVjaW1hbERpZ2l0KGNoKSkge1xuICAgICAgICAgIHJldHVybiBzY2FuTnVtZXJpY0xpdGVyYWwoKTtcbiAgICAgIH1cblxuICAgICAgLy8gU2xhc2ggKC8pIFUrMDAyRiBjYW4gYWxzbyBzdGFydCBhIHJlZ2V4LlxuICAgICAgaWYgKGV4dHJhLnRva2VuaXplICYmIGNoID09PSAweDJGKSB7XG4gICAgICAgICAgcmV0dXJuIGFkdmFuY2VTbGFzaCgpO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gc2NhblB1bmN0dWF0b3IoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbGxlY3RUb2tlbigpIHtcbiAgICAgIHZhciBsb2MsIHRva2VuLCB2YWx1ZSwgZW50cnk7XG5cbiAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICBsb2MgPSB7XG4gICAgICAgICAgc3RhcnQ6IHtcbiAgICAgICAgICAgICAgbGluZTogbGluZU51bWJlcixcbiAgICAgICAgICAgICAgY29sdW1uOiBpbmRleCAtIGxpbmVTdGFydFxuICAgICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHRva2VuID0gYWR2YW5jZSgpO1xuICAgICAgbG9jLmVuZCA9IHtcbiAgICAgICAgICBsaW5lOiBsaW5lTnVtYmVyLFxuICAgICAgICAgIGNvbHVtbjogaW5kZXggLSBsaW5lU3RhcnRcbiAgICAgIH07XG5cbiAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICB2YWx1ZSA9IHNvdXJjZS5zbGljZSh0b2tlbi5zdGFydCwgdG9rZW4uZW5kKTtcbiAgICAgICAgICBlbnRyeSA9IHtcbiAgICAgICAgICAgICAgdHlwZTogVG9rZW5OYW1lW3Rva2VuLnR5cGVdLFxuICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgICAgIHJhbmdlOiBbdG9rZW4uc3RhcnQsIHRva2VuLmVuZF0sXG4gICAgICAgICAgICAgIGxvYzogbG9jXG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAodG9rZW4ucmVnZXgpIHtcbiAgICAgICAgICAgICAgZW50cnkucmVnZXggPSB7XG4gICAgICAgICAgICAgICAgICBwYXR0ZXJuOiB0b2tlbi5yZWdleC5wYXR0ZXJuLFxuICAgICAgICAgICAgICAgICAgZmxhZ3M6IHRva2VuLnJlZ2V4LmZsYWdzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIGV4dHJhLnRva2Vucy5wdXNoKGVudHJ5KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRva2VuO1xuICB9XG5cbiAgZnVuY3Rpb24gbGV4KCkge1xuICAgICAgdmFyIHRva2VuO1xuXG4gICAgICB0b2tlbiA9IGxvb2thaGVhZDtcbiAgICAgIGluZGV4ID0gdG9rZW4uZW5kO1xuICAgICAgbGluZU51bWJlciA9IHRva2VuLmxpbmVOdW1iZXI7XG4gICAgICBsaW5lU3RhcnQgPSB0b2tlbi5saW5lU3RhcnQ7XG5cbiAgICAgIGxvb2thaGVhZCA9ICh0eXBlb2YgZXh0cmEudG9rZW5zICE9PSAndW5kZWZpbmVkJykgPyBjb2xsZWN0VG9rZW4oKSA6IGFkdmFuY2UoKTtcblxuICAgICAgaW5kZXggPSB0b2tlbi5lbmQ7XG4gICAgICBsaW5lTnVtYmVyID0gdG9rZW4ubGluZU51bWJlcjtcbiAgICAgIGxpbmVTdGFydCA9IHRva2VuLmxpbmVTdGFydDtcblxuICAgICAgcmV0dXJuIHRva2VuO1xuICB9XG5cbiAgZnVuY3Rpb24gcGVlaygpIHtcbiAgICAgIHZhciBwb3MsIGxpbmUsIHN0YXJ0O1xuXG4gICAgICBwb3MgPSBpbmRleDtcbiAgICAgIGxpbmUgPSBsaW5lTnVtYmVyO1xuICAgICAgc3RhcnQgPSBsaW5lU3RhcnQ7XG4gICAgICBsb29rYWhlYWQgPSAodHlwZW9mIGV4dHJhLnRva2VucyAhPT0gJ3VuZGVmaW5lZCcpID8gY29sbGVjdFRva2VuKCkgOiBhZHZhbmNlKCk7XG4gICAgICBpbmRleCA9IHBvcztcbiAgICAgIGxpbmVOdW1iZXIgPSBsaW5lO1xuICAgICAgbGluZVN0YXJ0ID0gc3RhcnQ7XG4gIH1cblxuICBmdW5jdGlvbiBQb3NpdGlvbigpIHtcbiAgICAgIHRoaXMubGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICB0aGlzLmNvbHVtbiA9IGluZGV4IC0gbGluZVN0YXJ0O1xuICB9XG5cbiAgZnVuY3Rpb24gU291cmNlTG9jYXRpb24oKSB7XG4gICAgICB0aGlzLnN0YXJ0ID0gbmV3IFBvc2l0aW9uKCk7XG4gICAgICB0aGlzLmVuZCA9IG51bGw7XG4gIH1cblxuICBmdW5jdGlvbiBXcmFwcGluZ1NvdXJjZUxvY2F0aW9uKHN0YXJ0VG9rZW4pIHtcbiAgICAgIGlmIChzdGFydFRva2VuLnR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICB0aGlzLnN0YXJ0ID0ge1xuICAgICAgICAgICAgICBsaW5lOiBzdGFydFRva2VuLnN0YXJ0TGluZU51bWJlcixcbiAgICAgICAgICAgICAgY29sdW1uOiBzdGFydFRva2VuLnN0YXJ0IC0gc3RhcnRUb2tlbi5zdGFydExpbmVTdGFydFxuICAgICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuc3RhcnQgPSB7XG4gICAgICAgICAgICAgIGxpbmU6IHN0YXJ0VG9rZW4ubGluZU51bWJlcixcbiAgICAgICAgICAgICAgY29sdW1uOiBzdGFydFRva2VuLnN0YXJ0IC0gc3RhcnRUb2tlbi5saW5lU3RhcnRcbiAgICAgICAgICB9O1xuICAgICAgfVxuICAgICAgdGhpcy5lbmQgPSBudWxsO1xuICB9XG5cbiAgZnVuY3Rpb24gTm9kZSgpIHtcbiAgICAgIC8vIFNraXAgY29tbWVudC5cbiAgICAgIGluZGV4ID0gbG9va2FoZWFkLnN0YXJ0O1xuICAgICAgaWYgKGxvb2thaGVhZC50eXBlID09PSBUb2tlbi5TdHJpbmdMaXRlcmFsKSB7XG4gICAgICAgICAgbGluZU51bWJlciA9IGxvb2thaGVhZC5zdGFydExpbmVOdW1iZXI7XG4gICAgICAgICAgbGluZVN0YXJ0ID0gbG9va2FoZWFkLnN0YXJ0TGluZVN0YXJ0O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsaW5lTnVtYmVyID0gbG9va2FoZWFkLmxpbmVOdW1iZXI7XG4gICAgICAgICAgbGluZVN0YXJ0ID0gbG9va2FoZWFkLmxpbmVTdGFydDtcbiAgICAgIH1cbiAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgIHRoaXMucmFuZ2UgPSBbaW5kZXgsIDBdO1xuICAgICAgfVxuICAgICAgaWYgKGV4dHJhLmxvYykge1xuICAgICAgICAgIHRoaXMubG9jID0gbmV3IFNvdXJjZUxvY2F0aW9uKCk7XG4gICAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBXcmFwcGluZ05vZGUoc3RhcnRUb2tlbikge1xuICAgICAgaWYgKGV4dHJhLnJhbmdlKSB7XG4gICAgICAgICAgdGhpcy5yYW5nZSA9IFtzdGFydFRva2VuLnN0YXJ0LCAwXTtcbiAgICAgIH1cbiAgICAgIGlmIChleHRyYS5sb2MpIHtcbiAgICAgICAgICB0aGlzLmxvYyA9IG5ldyBXcmFwcGluZ1NvdXJjZUxvY2F0aW9uKHN0YXJ0VG9rZW4pO1xuICAgICAgfVxuICB9XG5cbiAgV3JhcHBpbmdOb2RlLnByb3RvdHlwZSA9IE5vZGUucHJvdG90eXBlID0ge1xuXG4gICAgICBmaW5pc2g6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBpZiAoZXh0cmEucmFuZ2UpIHtcbiAgICAgICAgICAgICAgdGhpcy5yYW5nZVsxXSA9IGluZGV4O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgIHRoaXMubG9jLmVuZCA9IG5ldyBQb3NpdGlvbigpO1xuICAgICAgICAgICAgICBpZiAoZXh0cmEuc291cmNlKSB7XG4gICAgICAgICAgICAgICAgICB0aGlzLmxvYy5zb3VyY2UgPSBleHRyYS5zb3VyY2U7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9LFxuXG4gICAgICBmaW5pc2hBcnJheUV4cHJlc3Npb246IGZ1bmN0aW9uIChlbGVtZW50cykge1xuICAgICAgICAgIHRoaXMudHlwZSA9IFN5bnRheC5BcnJheUV4cHJlc3Npb247XG4gICAgICAgICAgdGhpcy5lbGVtZW50cyA9IGVsZW1lbnRzO1xuICAgICAgICAgIHRoaXMuZmluaXNoKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LFxuXG4gICAgICBmaW5pc2hBc3NpZ25tZW50RXhwcmVzc2lvbjogZnVuY3Rpb24gKG9wZXJhdG9yLCBsZWZ0LCByaWdodCkge1xuICAgICAgICAgIHRoaXMudHlwZSA9IFN5bnRheC5Bc3NpZ25tZW50RXhwcmVzc2lvbjtcbiAgICAgICAgICB0aGlzLm9wZXJhdG9yID0gb3BlcmF0b3I7XG4gICAgICAgICAgdGhpcy5sZWZ0ID0gbGVmdDtcbiAgICAgICAgICB0aGlzLnJpZ2h0ID0gcmlnaHQ7XG4gICAgICAgICAgdGhpcy5maW5pc2goKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sXG5cbiAgICAgIGZpbmlzaEJpbmFyeUV4cHJlc3Npb246IGZ1bmN0aW9uIChvcGVyYXRvciwgbGVmdCwgcmlnaHQpIHtcbiAgICAgICAgICB0aGlzLnR5cGUgPSAob3BlcmF0b3IgPT09ICd8fCcgfHwgb3BlcmF0b3IgPT09ICcmJicpID8gU3ludGF4LkxvZ2ljYWxFeHByZXNzaW9uIDogU3ludGF4LkJpbmFyeUV4cHJlc3Npb247XG4gICAgICAgICAgdGhpcy5vcGVyYXRvciA9IG9wZXJhdG9yO1xuICAgICAgICAgIHRoaXMubGVmdCA9IGxlZnQ7XG4gICAgICAgICAgdGhpcy5yaWdodCA9IHJpZ2h0O1xuICAgICAgICAgIHRoaXMuZmluaXNoKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LFxuXG4gICAgICBmaW5pc2hDYWxsRXhwcmVzc2lvbjogZnVuY3Rpb24gKGNhbGxlZSwgYXJncykge1xuICAgICAgICAgIHRoaXMudHlwZSA9IFN5bnRheC5DYWxsRXhwcmVzc2lvbjtcbiAgICAgICAgICB0aGlzLmNhbGxlZSA9IGNhbGxlZTtcbiAgICAgICAgICB0aGlzLmFyZ3VtZW50cyA9IGFyZ3M7XG4gICAgICAgICAgdGhpcy5maW5pc2goKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sXG5cbiAgICAgIGZpbmlzaENvbmRpdGlvbmFsRXhwcmVzc2lvbjogZnVuY3Rpb24gKHRlc3QsIGNvbnNlcXVlbnQsIGFsdGVybmF0ZSkge1xuICAgICAgICAgIHRoaXMudHlwZSA9IFN5bnRheC5Db25kaXRpb25hbEV4cHJlc3Npb247XG4gICAgICAgICAgdGhpcy50ZXN0ID0gdGVzdDtcbiAgICAgICAgICB0aGlzLmNvbnNlcXVlbnQgPSBjb25zZXF1ZW50O1xuICAgICAgICAgIHRoaXMuYWx0ZXJuYXRlID0gYWx0ZXJuYXRlO1xuICAgICAgICAgIHRoaXMuZmluaXNoKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LFxuXG4gICAgICBmaW5pc2hFeHByZXNzaW9uU3RhdGVtZW50OiBmdW5jdGlvbiAoZXhwcmVzc2lvbikge1xuICAgICAgICAgIHRoaXMudHlwZSA9IFN5bnRheC5FeHByZXNzaW9uU3RhdGVtZW50O1xuICAgICAgICAgIHRoaXMuZXhwcmVzc2lvbiA9IGV4cHJlc3Npb247XG4gICAgICAgICAgdGhpcy5maW5pc2goKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sXG5cbiAgICAgIGZpbmlzaElkZW50aWZpZXI6IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgICAgICAgdGhpcy50eXBlID0gU3ludGF4LklkZW50aWZpZXI7XG4gICAgICAgICAgdGhpcy5uYW1lID0gbmFtZTtcbiAgICAgICAgICB0aGlzLmZpbmlzaCgpO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfSxcblxuICAgICAgZmluaXNoTGl0ZXJhbDogZnVuY3Rpb24gKHRva2VuKSB7XG4gICAgICAgICAgdGhpcy50eXBlID0gU3ludGF4LkxpdGVyYWw7XG4gICAgICAgICAgdGhpcy52YWx1ZSA9IHRva2VuLnZhbHVlO1xuICAgICAgICAgIHRoaXMucmF3ID0gc291cmNlLnNsaWNlKHRva2VuLnN0YXJ0LCB0b2tlbi5lbmQpO1xuICAgICAgICAgIGlmICh0b2tlbi5yZWdleCkge1xuICAgICAgICAgICAgICBpZiAodGhpcy5yYXcgPT0gJy8vJykge1xuICAgICAgICAgICAgICAgIHRoaXMucmF3ID0gJy8oPzopLyc7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgdGhpcy5yZWdleCA9IHRva2VuLnJlZ2V4O1xuICAgICAgICAgIH1cbiAgICAgICAgICB0aGlzLmZpbmlzaCgpO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfSxcblxuICAgICAgZmluaXNoTWVtYmVyRXhwcmVzc2lvbjogZnVuY3Rpb24gKGFjY2Vzc29yLCBvYmplY3QsIHByb3BlcnR5KSB7XG4gICAgICAgICAgdGhpcy50eXBlID0gU3ludGF4Lk1lbWJlckV4cHJlc3Npb247XG4gICAgICAgICAgdGhpcy5jb21wdXRlZCA9IGFjY2Vzc29yID09PSAnWyc7XG4gICAgICAgICAgdGhpcy5vYmplY3QgPSBvYmplY3Q7XG4gICAgICAgICAgdGhpcy5wcm9wZXJ0eSA9IHByb3BlcnR5O1xuICAgICAgICAgIHRoaXMuZmluaXNoKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LFxuXG4gICAgICBmaW5pc2hPYmplY3RFeHByZXNzaW9uOiBmdW5jdGlvbiAocHJvcGVydGllcykge1xuICAgICAgICAgIHRoaXMudHlwZSA9IFN5bnRheC5PYmplY3RFeHByZXNzaW9uO1xuICAgICAgICAgIHRoaXMucHJvcGVydGllcyA9IHByb3BlcnRpZXM7XG4gICAgICAgICAgdGhpcy5maW5pc2goKTtcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sXG5cbiAgICAgIGZpbmlzaFByb2dyYW06IGZ1bmN0aW9uIChib2R5KSB7XG4gICAgICAgICAgdGhpcy50eXBlID0gU3ludGF4LlByb2dyYW07XG4gICAgICAgICAgdGhpcy5ib2R5ID0gYm9keTtcbiAgICAgICAgICB0aGlzLmZpbmlzaCgpO1xuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfSxcblxuICAgICAgZmluaXNoUHJvcGVydHk6IGZ1bmN0aW9uIChraW5kLCBrZXksIHZhbHVlKSB7XG4gICAgICAgICAgdGhpcy50eXBlID0gU3ludGF4LlByb3BlcnR5O1xuICAgICAgICAgIHRoaXMua2V5ID0ga2V5O1xuICAgICAgICAgIHRoaXMudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgICB0aGlzLmtpbmQgPSBraW5kO1xuICAgICAgICAgIHRoaXMuZmluaXNoKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LFxuXG4gICAgICBmaW5pc2hVbmFyeUV4cHJlc3Npb246IGZ1bmN0aW9uIChvcGVyYXRvciwgYXJndW1lbnQpIHtcbiAgICAgICAgICB0aGlzLnR5cGUgPSAob3BlcmF0b3IgPT09ICcrKycgfHwgb3BlcmF0b3IgPT09ICctLScpID8gU3ludGF4LlVwZGF0ZUV4cHJlc3Npb24gOiBTeW50YXguVW5hcnlFeHByZXNzaW9uO1xuICAgICAgICAgIHRoaXMub3BlcmF0b3IgPSBvcGVyYXRvcjtcbiAgICAgICAgICB0aGlzLmFyZ3VtZW50ID0gYXJndW1lbnQ7XG4gICAgICAgICAgdGhpcy5wcmVmaXggPSB0cnVlO1xuICAgICAgICAgIHRoaXMuZmluaXNoKCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9XG4gIH07XG5cbiAgLy8gUmV0dXJuIHRydWUgaWYgdGhlcmUgaXMgYSBsaW5lIHRlcm1pbmF0b3IgYmVmb3JlIHRoZSBuZXh0IHRva2VuLlxuXG4gIGZ1bmN0aW9uIHBlZWtMaW5lVGVybWluYXRvcigpIHtcbiAgICAgIHZhciBwb3MsIGxpbmUsIHN0YXJ0LCBmb3VuZDtcblxuICAgICAgcG9zID0gaW5kZXg7XG4gICAgICBsaW5lID0gbGluZU51bWJlcjtcbiAgICAgIHN0YXJ0ID0gbGluZVN0YXJ0O1xuICAgICAgc2tpcENvbW1lbnQoKTtcbiAgICAgIGZvdW5kID0gbGluZU51bWJlciAhPT0gbGluZTtcbiAgICAgIGluZGV4ID0gcG9zO1xuICAgICAgbGluZU51bWJlciA9IGxpbmU7XG4gICAgICBsaW5lU3RhcnQgPSBzdGFydDtcblxuICAgICAgcmV0dXJuIGZvdW5kO1xuICB9XG5cbiAgLy8gVGhyb3cgYW4gZXhjZXB0aW9uXG5cbiAgZnVuY3Rpb24gdGhyb3dFcnJvcih0b2tlbiwgbWVzc2FnZUZvcm1hdCkge1xuICAgICAgdmFyIGVycm9yLFxuICAgICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpLFxuICAgICAgICAgIG1zZyA9IG1lc3NhZ2VGb3JtYXQucmVwbGFjZShcbiAgICAgICAgICAgICAgLyUoXFxkKS9nLFxuICAgICAgICAgICAgICBmdW5jdGlvbiAod2hvbGUsIGluZGV4KSB7XG4gICAgICAgICAgICAgICAgICBhc3NlcnQoaW5kZXggPCBhcmdzLmxlbmd0aCwgJ01lc3NhZ2UgcmVmZXJlbmNlIG11c3QgYmUgaW4gcmFuZ2UnKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBhcmdzW2luZGV4XTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICk7XG5cbiAgICAgIGlmICh0eXBlb2YgdG9rZW4ubGluZU51bWJlciA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcignTGluZSAnICsgdG9rZW4ubGluZU51bWJlciArICc6ICcgKyBtc2cpO1xuICAgICAgICAgIGVycm9yLmluZGV4ID0gdG9rZW4uc3RhcnQ7XG4gICAgICAgICAgZXJyb3IubGluZU51bWJlciA9IHRva2VuLmxpbmVOdW1iZXI7XG4gICAgICAgICAgZXJyb3IuY29sdW1uID0gdG9rZW4uc3RhcnQgLSBsaW5lU3RhcnQgKyAxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcignTGluZSAnICsgbGluZU51bWJlciArICc6ICcgKyBtc2cpO1xuICAgICAgICAgIGVycm9yLmluZGV4ID0gaW5kZXg7XG4gICAgICAgICAgZXJyb3IubGluZU51bWJlciA9IGxpbmVOdW1iZXI7XG4gICAgICAgICAgZXJyb3IuY29sdW1uID0gaW5kZXggLSBsaW5lU3RhcnQgKyAxO1xuICAgICAgfVxuXG4gICAgICBlcnJvci5kZXNjcmlwdGlvbiA9IG1zZztcbiAgICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgZnVuY3Rpb24gdGhyb3dFcnJvclRvbGVyYW50KCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgICB0aHJvd0Vycm9yLmFwcGx5KG51bGwsIGFyZ3VtZW50cyk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaWYgKGV4dHJhLmVycm9ycykge1xuICAgICAgICAgICAgICBleHRyYS5lcnJvcnMucHVzaChlKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgIH1cbiAgICAgIH1cbiAgfVxuXG5cbiAgLy8gVGhyb3cgYW4gZXhjZXB0aW9uIGJlY2F1c2Ugb2YgdGhlIHRva2VuLlxuXG4gIGZ1bmN0aW9uIHRocm93VW5leHBlY3RlZCh0b2tlbikge1xuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLkVPRikge1xuICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRFT1MpO1xuICAgICAgfVxuXG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uTnVtZXJpY0xpdGVyYWwpIHtcbiAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkTnVtYmVyKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLlN0cmluZ0xpdGVyYWwpIHtcbiAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkU3RyaW5nKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRva2VuLnR5cGUgPT09IFRva2VuLklkZW50aWZpZXIpIHtcbiAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkSWRlbnRpZmllcik7XG4gICAgICB9XG5cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgaWYgKGlzRnV0dXJlUmVzZXJ2ZWRXb3JkKHRva2VuLnZhbHVlKSkge1xuICAgICAgICAgICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkUmVzZXJ2ZWQpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoc3RyaWN0ICYmIGlzU3RyaWN0TW9kZVJlc2VydmVkV29yZCh0b2tlbi52YWx1ZSkpIHtcbiAgICAgICAgICAgICAgdGhyb3dFcnJvclRvbGVyYW50KHRva2VuLCBNZXNzYWdlcy5TdHJpY3RSZXNlcnZlZFdvcmQpO1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIHRocm93RXJyb3IodG9rZW4sIE1lc3NhZ2VzLlVuZXhwZWN0ZWRUb2tlbiwgdG9rZW4udmFsdWUpO1xuICAgICAgfVxuXG4gICAgICAvLyBCb29sZWFuTGl0ZXJhbCwgTnVsbExpdGVyYWwsIG9yIFB1bmN0dWF0b3IuXG4gICAgICB0aHJvd0Vycm9yKHRva2VuLCBNZXNzYWdlcy5VbmV4cGVjdGVkVG9rZW4sIHRva2VuLnZhbHVlKTtcbiAgfVxuXG4gIC8vIEV4cGVjdCB0aGUgbmV4dCB0b2tlbiB0byBtYXRjaCB0aGUgc3BlY2lmaWVkIHB1bmN0dWF0b3IuXG4gIC8vIElmIG5vdCwgYW4gZXhjZXB0aW9uIHdpbGwgYmUgdGhyb3duLlxuXG4gIGZ1bmN0aW9uIGV4cGVjdCh2YWx1ZSkge1xuICAgICAgdmFyIHRva2VuID0gbGV4KCk7XG4gICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvciB8fCB0b2tlbi52YWx1ZSAhPT0gdmFsdWUpIHtcbiAgICAgICAgICB0aHJvd1VuZXhwZWN0ZWQodG9rZW4pO1xuICAgICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBuYW1lIGV4cGVjdFRvbGVyYW50XG4gICAqIEBkZXNjcmlwdGlvbiBRdWlldGx5IGV4cGVjdCB0aGUgZ2l2ZW4gdG9rZW4gdmFsdWUgd2hlbiBpbiB0b2xlcmFudCBtb2RlLCBvdGhlcndpc2UgZGVsZWdhdGVzXG4gICAqIHRvIDxjb2RlPmV4cGVjdCh2YWx1ZSk8L2NvZGU+XG4gICAqIEBwYXJhbSB7U3RyaW5nfSB2YWx1ZSBUaGUgdmFsdWUgd2UgYXJlIGV4cGVjdGluZyB0aGUgbG9va2FoZWFkIHRva2VuIHRvIGhhdmVcbiAgICogQHNpbmNlIDIuMFxuICAgKi9cbiAgZnVuY3Rpb24gZXhwZWN0VG9sZXJhbnQodmFsdWUpIHtcbiAgICAgIGlmIChleHRyYS5lcnJvcnMpIHtcbiAgICAgICAgICB2YXIgdG9rZW4gPSBsb29rYWhlYWQ7XG4gICAgICAgICAgaWYgKHRva2VuLnR5cGUgIT09IFRva2VuLlB1bmN0dWF0b3IgJiYgdG9rZW4udmFsdWUgIT09IHZhbHVlKSB7XG4gICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh0b2tlbiwgTWVzc2FnZXMuVW5leHBlY3RlZFRva2VuLCB0b2tlbi52YWx1ZSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBleHBlY3QodmFsdWUpO1xuICAgICAgfVxuICB9XG5cbiAgLy8gRXhwZWN0IHRoZSBuZXh0IHRva2VuIHRvIG1hdGNoIHRoZSBzcGVjaWZpZWQga2V5d29yZC5cbiAgLy8gSWYgbm90LCBhbiBleGNlcHRpb24gd2lsbCBiZSB0aHJvd24uXG5cbiAgZnVuY3Rpb24gZXhwZWN0S2V5d29yZChrZXl3b3JkKSB7XG4gICAgICB2YXIgdG9rZW4gPSBsZXgoKTtcbiAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5LZXl3b3JkIHx8IHRva2VuLnZhbHVlICE9PSBrZXl3b3JkKSB7XG4gICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgIH1cbiAgfVxuXG4gIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIG1hdGNoZXMgdGhlIHNwZWNpZmllZCBwdW5jdHVhdG9yLlxuXG4gIGZ1bmN0aW9uIG1hdGNoKHZhbHVlKSB7XG4gICAgICByZXR1cm4gbG9va2FoZWFkLnR5cGUgPT09IFRva2VuLlB1bmN0dWF0b3IgJiYgbG9va2FoZWFkLnZhbHVlID09PSB2YWx1ZTtcbiAgfVxuXG4gIC8vIFJldHVybiB0cnVlIGlmIHRoZSBuZXh0IHRva2VuIG1hdGNoZXMgdGhlIHNwZWNpZmllZCBrZXl3b3JkXG5cbiAgZnVuY3Rpb24gbWF0Y2hLZXl3b3JkKGtleXdvcmQpIHtcbiAgICAgIHJldHVybiBsb29rYWhlYWQudHlwZSA9PT0gVG9rZW4uS2V5d29yZCAmJiBsb29rYWhlYWQudmFsdWUgPT09IGtleXdvcmQ7XG4gIH1cblxuICBmdW5jdGlvbiBjb25zdW1lU2VtaWNvbG9uKCkge1xuICAgICAgdmFyIGxpbmU7XG5cbiAgICAgIC8vIENhdGNoIHRoZSB2ZXJ5IGNvbW1vbiBjYXNlIGZpcnN0OiBpbW1lZGlhdGVseSBhIHNlbWljb2xvbiAoVSswMDNCKS5cbiAgICAgIGlmIChzb3VyY2UuY2hhckNvZGVBdChpbmRleCkgPT09IDB4M0IgfHwgbWF0Y2goJzsnKSkge1xuICAgICAgICAgIGxleCgpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgbGluZSA9IGxpbmVOdW1iZXI7XG4gICAgICBza2lwQ29tbWVudCgpO1xuICAgICAgaWYgKGxpbmVOdW1iZXIgIT09IGxpbmUpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChsb29rYWhlYWQudHlwZSAhPT0gVG9rZW4uRU9GICYmICFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKGxvb2thaGVhZCk7XG4gICAgICB9XG4gIH1cblxuICAvLyBSZXR1cm4gdHJ1ZSBpZiBwcm92aWRlZCBleHByZXNzaW9uIGlzIExlZnRIYW5kU2lkZUV4cHJlc3Npb25cblxuICBmdW5jdGlvbiBpc0xlZnRIYW5kU2lkZShleHByKSB7XG4gICAgICByZXR1cm4gZXhwci50eXBlID09PSBTeW50YXguSWRlbnRpZmllciB8fCBleHByLnR5cGUgPT09IFN5bnRheC5NZW1iZXJFeHByZXNzaW9uO1xuICB9XG5cbiAgLy8gMTEuMS40IEFycmF5IEluaXRpYWxpc2VyXG5cbiAgZnVuY3Rpb24gcGFyc2VBcnJheUluaXRpYWxpc2VyKCkge1xuICAgICAgdmFyIGVsZW1lbnRzID0gW10sIG5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgICBleHBlY3QoJ1snKTtcblxuICAgICAgd2hpbGUgKCFtYXRjaCgnXScpKSB7XG4gICAgICAgICAgaWYgKG1hdGNoKCcsJykpIHtcbiAgICAgICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgICAgIGVsZW1lbnRzLnB1c2gobnVsbCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZWxlbWVudHMucHVzaChwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCkpO1xuXG4gICAgICAgICAgICAgIGlmICghbWF0Y2goJ10nKSkge1xuICAgICAgICAgICAgICAgICAgZXhwZWN0KCcsJyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxleCgpO1xuXG4gICAgICByZXR1cm4gbm9kZS5maW5pc2hBcnJheUV4cHJlc3Npb24oZWxlbWVudHMpO1xuICB9XG5cbiAgLy8gMTEuMS41IE9iamVjdCBJbml0aWFsaXNlclxuXG4gIGZ1bmN0aW9uIHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKSB7XG4gICAgICB2YXIgdG9rZW4sIG5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgICB0b2tlbiA9IGxleCgpO1xuXG4gICAgICAvLyBOb3RlOiBUaGlzIGZ1bmN0aW9uIGlzIGNhbGxlZCBvbmx5IGZyb20gcGFyc2VPYmplY3RQcm9wZXJ0eSgpLCB3aGVyZVxuICAgICAgLy8gRU9GIGFuZCBQdW5jdHVhdG9yIHRva2VucyBhcmUgYWxyZWFkeSBmaWx0ZXJlZCBvdXQuXG5cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5TdHJpbmdMaXRlcmFsIHx8IHRva2VuLnR5cGUgPT09IFRva2VuLk51bWVyaWNMaXRlcmFsKSB7XG4gICAgICAgICAgaWYgKHN0cmljdCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQodG9rZW4sIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBub2RlLmZpbmlzaExpdGVyYWwodG9rZW4pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbm9kZS5maW5pc2hJZGVudGlmaWVyKHRva2VuLnZhbHVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlT2JqZWN0UHJvcGVydHkoKSB7XG4gICAgICB2YXIgdG9rZW4sIGtleSwgaWQsIHZhbHVlLCBwYXJhbSwgbm9kZSA9IG5ldyBOb2RlKCk7XG5cbiAgICAgIHRva2VuID0gbG9va2FoZWFkO1xuXG4gICAgICBpZiAodG9rZW4udHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllcikge1xuICAgICAgICAgIGlkID0gcGFyc2VPYmplY3RQcm9wZXJ0eUtleSgpO1xuICAgICAgICAgIGV4cGVjdCgnOicpO1xuICAgICAgICAgIHZhbHVlID0gcGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpO1xuICAgICAgICAgIHJldHVybiBub2RlLmZpbmlzaFByb3BlcnR5KCdpbml0JywgaWQsIHZhbHVlKTtcbiAgICAgIH1cbiAgICAgIGlmICh0b2tlbi50eXBlID09PSBUb2tlbi5FT0YgfHwgdG9rZW4udHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgIHRocm93VW5leHBlY3RlZCh0b2tlbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIGtleSA9IHBhcnNlT2JqZWN0UHJvcGVydHlLZXkoKTtcbiAgICAgICAgICBleHBlY3QoJzonKTtcbiAgICAgICAgICB2YWx1ZSA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcbiAgICAgICAgICByZXR1cm4gbm9kZS5maW5pc2hQcm9wZXJ0eSgnaW5pdCcsIGtleSwgdmFsdWUpO1xuICAgICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VPYmplY3RJbml0aWFsaXNlcigpIHtcbiAgICAgIHZhciBwcm9wZXJ0aWVzID0gW10sIHRva2VuLCBwcm9wZXJ0eSwgbmFtZSwga2V5LCBraW5kLCBtYXAgPSB7fSwgdG9TdHJpbmcgPSBTdHJpbmcsIG5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgICBleHBlY3QoJ3snKTtcblxuICAgICAgd2hpbGUgKCFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgcHJvcGVydHkgPSBwYXJzZU9iamVjdFByb3BlcnR5KCk7XG5cbiAgICAgICAgICBpZiAocHJvcGVydHkua2V5LnR5cGUgPT09IFN5bnRheC5JZGVudGlmaWVyKSB7XG4gICAgICAgICAgICAgIG5hbWUgPSBwcm9wZXJ0eS5rZXkubmFtZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBuYW1lID0gdG9TdHJpbmcocHJvcGVydHkua2V5LnZhbHVlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAga2luZCA9IChwcm9wZXJ0eS5raW5kID09PSAnaW5pdCcpID8gUHJvcGVydHlLaW5kLkRhdGEgOiAocHJvcGVydHkua2luZCA9PT0gJ2dldCcpID8gUHJvcGVydHlLaW5kLkdldCA6IFByb3BlcnR5S2luZC5TZXQ7XG5cbiAgICAgICAgICBrZXkgPSAnJCcgKyBuYW1lO1xuICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobWFwLCBrZXkpKSB7XG4gICAgICAgICAgICAgIGlmIChtYXBba2V5XSA9PT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgIGlmIChzdHJpY3QgJiYga2luZCA9PT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLlN0cmljdER1cGxpY2F0ZVByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoa2luZCAhPT0gUHJvcGVydHlLaW5kLkRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLkFjY2Vzc29yRGF0YVByb3BlcnR5KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIGlmIChraW5kID09PSBQcm9wZXJ0eUtpbmQuRGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudCh7fSwgTWVzc2FnZXMuQWNjZXNzb3JEYXRhUHJvcGVydHkpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtYXBba2V5XSAmIGtpbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aHJvd0Vycm9yVG9sZXJhbnQoe30sIE1lc3NhZ2VzLkFjY2Vzc29yR2V0U2V0KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBtYXBba2V5XSB8PSBraW5kO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIG1hcFtrZXldID0ga2luZDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwcm9wZXJ0aWVzLnB1c2gocHJvcGVydHkpO1xuXG4gICAgICAgICAgaWYgKCFtYXRjaCgnfScpKSB7XG4gICAgICAgICAgICAgIGV4cGVjdFRvbGVyYW50KCcsJyk7XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBleHBlY3QoJ30nKTtcblxuICAgICAgcmV0dXJuIG5vZGUuZmluaXNoT2JqZWN0RXhwcmVzc2lvbihwcm9wZXJ0aWVzKTtcbiAgfVxuXG4gIC8vIDExLjEuNiBUaGUgR3JvdXBpbmcgT3BlcmF0b3JcblxuICBmdW5jdGlvbiBwYXJzZUdyb3VwRXhwcmVzc2lvbigpIHtcbiAgICAgIHZhciBleHByO1xuXG4gICAgICBleHBlY3QoJygnKTtcblxuICAgICAgKytzdGF0ZS5wYXJlbnRoZXNpc0NvdW50O1xuXG4gICAgICBleHByID0gcGFyc2VFeHByZXNzaW9uKCk7XG5cbiAgICAgIGV4cGVjdCgnKScpO1xuXG4gICAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG5cbiAgLy8gMTEuMSBQcmltYXJ5IEV4cHJlc3Npb25zXG5cbiAgdmFyIGxlZ2FsS2V5d29yZHMgPSB7XCJpZlwiOjEsIFwidGhpc1wiOjF9O1xuXG4gIGZ1bmN0aW9uIHBhcnNlUHJpbWFyeUV4cHJlc3Npb24oKSB7XG4gICAgICB2YXIgdHlwZSwgdG9rZW4sIGV4cHIsIG5vZGU7XG5cbiAgICAgIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlR3JvdXBFeHByZXNzaW9uKCk7XG4gICAgICB9XG5cbiAgICAgIGlmIChtYXRjaCgnWycpKSB7XG4gICAgICAgICAgcmV0dXJuIHBhcnNlQXJyYXlJbml0aWFsaXNlcigpO1xuICAgICAgfVxuXG4gICAgICBpZiAobWF0Y2goJ3snKSkge1xuICAgICAgICAgIHJldHVybiBwYXJzZU9iamVjdEluaXRpYWxpc2VyKCk7XG4gICAgICB9XG5cbiAgICAgIHR5cGUgPSBsb29rYWhlYWQudHlwZTtcbiAgICAgIG5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgICBpZiAodHlwZSA9PT0gVG9rZW4uSWRlbnRpZmllciB8fCBsZWdhbEtleXdvcmRzW2xvb2thaGVhZC52YWx1ZV0pIHtcbiAgICAgICAgICBleHByID0gbm9kZS5maW5pc2hJZGVudGlmaWVyKGxleCgpLnZhbHVlKTtcbiAgICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCB8fCB0eXBlID09PSBUb2tlbi5OdW1lcmljTGl0ZXJhbCkge1xuICAgICAgICAgIGlmIChzdHJpY3QgJiYgbG9va2FoZWFkLm9jdGFsKSB7XG4gICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChsb29rYWhlYWQsIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGV4cHIgPSBub2RlLmZpbmlzaExpdGVyYWwobGV4KCkpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzYWJsZWQuXCIpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBUb2tlbi5Cb29sZWFuTGl0ZXJhbCkge1xuICAgICAgICAgIHRva2VuID0gbGV4KCk7XG4gICAgICAgICAgdG9rZW4udmFsdWUgPSAodG9rZW4udmFsdWUgPT09ICd0cnVlJyk7XG4gICAgICAgICAgZXhwciA9IG5vZGUuZmluaXNoTGl0ZXJhbCh0b2tlbik7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09IFRva2VuLk51bGxMaXRlcmFsKSB7XG4gICAgICAgICAgdG9rZW4gPSBsZXgoKTtcbiAgICAgICAgICB0b2tlbi52YWx1ZSA9IG51bGw7XG4gICAgICAgICAgZXhwciA9IG5vZGUuZmluaXNoTGl0ZXJhbCh0b2tlbik7XG4gICAgICB9IGVsc2UgaWYgKG1hdGNoKCcvJykgfHwgbWF0Y2goJy89JykpIHtcbiAgICAgICAgICBpZiAodHlwZW9mIGV4dHJhLnRva2VucyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgZXhwciA9IG5vZGUuZmluaXNoTGl0ZXJhbChjb2xsZWN0UmVnZXgoKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZXhwciA9IG5vZGUuZmluaXNoTGl0ZXJhbChzY2FuUmVnRXhwKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBwZWVrKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93VW5leHBlY3RlZChsZXgoKSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBleHByO1xuICB9XG5cbiAgLy8gMTEuMiBMZWZ0LUhhbmQtU2lkZSBFeHByZXNzaW9uc1xuXG4gIGZ1bmN0aW9uIHBhcnNlQXJndW1lbnRzKCkge1xuICAgICAgdmFyIGFyZ3MgPSBbXTtcblxuICAgICAgZXhwZWN0KCcoJyk7XG5cbiAgICAgIGlmICghbWF0Y2goJyknKSkge1xuICAgICAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgICAgICBhcmdzLnB1c2gocGFyc2VBc3NpZ25tZW50RXhwcmVzc2lvbigpKTtcbiAgICAgICAgICAgICAgaWYgKG1hdGNoKCcpJykpIHtcbiAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGV4cGVjdFRvbGVyYW50KCcsJyk7XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBleHBlY3QoJyknKTtcblxuICAgICAgcmV0dXJuIGFyZ3M7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkoKSB7XG4gICAgICB2YXIgdG9rZW4sIG5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgICB0b2tlbiA9IGxleCgpO1xuXG4gICAgICBpZiAoIWlzSWRlbnRpZmllck5hbWUodG9rZW4pKSB7XG4gICAgICAgICAgdGhyb3dVbmV4cGVjdGVkKHRva2VuKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIG5vZGUuZmluaXNoSWRlbnRpZmllcih0b2tlbi52YWx1ZSk7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKCkge1xuICAgICAgZXhwZWN0KCcuJyk7XG5cbiAgICAgIHJldHVybiBwYXJzZU5vbkNvbXB1dGVkUHJvcGVydHkoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlQ29tcHV0ZWRNZW1iZXIoKSB7XG4gICAgICB2YXIgZXhwcjtcblxuICAgICAgZXhwZWN0KCdbJyk7XG5cbiAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcblxuICAgICAgZXhwZWN0KCddJyk7XG5cbiAgICAgIHJldHVybiBleHByO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCkge1xuICAgICAgdmFyIGV4cHIsIGFyZ3MsIHByb3BlcnR5LCBzdGFydFRva2VuLCBwcmV2aW91c0FsbG93SW4gPSBzdGF0ZS5hbGxvd0luO1xuXG4gICAgICBzdGFydFRva2VuID0gbG9va2FoZWFkO1xuICAgICAgc3RhdGUuYWxsb3dJbiA9IHRydWU7XG4gICAgICBleHByID0gcGFyc2VQcmltYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICBmb3IgKDs7KSB7XG4gICAgICAgICAgaWYgKG1hdGNoKCcuJykpIHtcbiAgICAgICAgICAgICAgcHJvcGVydHkgPSBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKCk7XG4gICAgICAgICAgICAgIGV4cHIgPSBuZXcgV3JhcHBpbmdOb2RlKHN0YXJ0VG9rZW4pLmZpbmlzaE1lbWJlckV4cHJlc3Npb24oJy4nLCBleHByLCBwcm9wZXJ0eSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChtYXRjaCgnKCcpKSB7XG4gICAgICAgICAgICAgIGFyZ3MgPSBwYXJzZUFyZ3VtZW50cygpO1xuICAgICAgICAgICAgICBleHByID0gbmV3IFdyYXBwaW5nTm9kZShzdGFydFRva2VuKS5maW5pc2hDYWxsRXhwcmVzc2lvbihleHByLCBhcmdzKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCdbJykpIHtcbiAgICAgICAgICAgICAgcHJvcGVydHkgPSBwYXJzZUNvbXB1dGVkTWVtYmVyKCk7XG4gICAgICAgICAgICAgIGV4cHIgPSBuZXcgV3JhcHBpbmdOb2RlKHN0YXJ0VG9rZW4pLmZpbmlzaE1lbWJlckV4cHJlc3Npb24oJ1snLCBleHByLCBwcm9wZXJ0eSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgc3RhdGUuYWxsb3dJbiA9IHByZXZpb3VzQWxsb3dJbjtcblxuICAgICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUxlZnRIYW5kU2lkZUV4cHJlc3Npb24oKSB7XG4gICAgICB2YXIgZXhwciwgcHJvcGVydHksIHN0YXJ0VG9rZW47XG4gICAgICBhc3NlcnQoc3RhdGUuYWxsb3dJbiwgJ2NhbGxlZSBvZiBuZXcgZXhwcmVzc2lvbiBhbHdheXMgYWxsb3cgaW4ga2V5d29yZC4nKTtcblxuICAgICAgc3RhcnRUb2tlbiA9IGxvb2thaGVhZDtcbiAgICAgIGV4cHIgPSBwYXJzZVByaW1hcnlFeHByZXNzaW9uKCk7XG5cbiAgICAgIGZvciAoOzspIHtcbiAgICAgICAgICBpZiAobWF0Y2goJ1snKSkge1xuICAgICAgICAgICAgICBwcm9wZXJ0eSA9IHBhcnNlQ29tcHV0ZWRNZW1iZXIoKTtcbiAgICAgICAgICAgICAgZXhwciA9IG5ldyBXcmFwcGluZ05vZGUoc3RhcnRUb2tlbikuZmluaXNoTWVtYmVyRXhwcmVzc2lvbignWycsIGV4cHIsIHByb3BlcnR5KTtcbiAgICAgICAgICB9IGVsc2UgaWYgKG1hdGNoKCcuJykpIHtcbiAgICAgICAgICAgICAgcHJvcGVydHkgPSBwYXJzZU5vbkNvbXB1dGVkTWVtYmVyKCk7XG4gICAgICAgICAgICAgIGV4cHIgPSBuZXcgV3JhcHBpbmdOb2RlKHN0YXJ0VG9rZW4pLmZpbmlzaE1lbWJlckV4cHJlc3Npb24oJy4nLCBleHByLCBwcm9wZXJ0eSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICAvLyAxMS4zIFBvc3RmaXggRXhwcmVzc2lvbnNcblxuICBmdW5jdGlvbiBwYXJzZVBvc3RmaXhFeHByZXNzaW9uKCkge1xuICAgICAgdmFyIGV4cHIsIHRva2VuLCBzdGFydFRva2VuID0gbG9va2FoZWFkO1xuXG4gICAgICBleHByID0gcGFyc2VMZWZ0SGFuZFNpZGVFeHByZXNzaW9uQWxsb3dDYWxsKCk7XG5cbiAgICAgIGlmIChsb29rYWhlYWQudHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgIGlmICgobWF0Y2goJysrJykgfHwgbWF0Y2goJy0tJykpICYmICFwZWVrTGluZVRlcm1pbmF0b3IoKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXNhYmxlZC5cIik7XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIC8vIDExLjQgVW5hcnkgT3BlcmF0b3JzXG5cbiAgZnVuY3Rpb24gcGFyc2VVbmFyeUV4cHJlc3Npb24oKSB7XG4gICAgICB2YXIgdG9rZW4sIGV4cHIsIHN0YXJ0VG9rZW47XG5cbiAgICAgIGlmIChsb29rYWhlYWQudHlwZSAhPT0gVG9rZW4uUHVuY3R1YXRvciAmJiBsb29rYWhlYWQudHlwZSAhPT0gVG9rZW4uS2V5d29yZCkge1xuICAgICAgICAgIGV4cHIgPSBwYXJzZVBvc3RmaXhFeHByZXNzaW9uKCk7XG4gICAgICB9IGVsc2UgaWYgKG1hdGNoKCcrKycpIHx8IG1hdGNoKCctLScpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzYWJsZWQuXCIpO1xuICAgICAgfSBlbHNlIGlmIChtYXRjaCgnKycpIHx8IG1hdGNoKCctJykgfHwgbWF0Y2goJ34nKSB8fCBtYXRjaCgnIScpKSB7XG4gICAgICAgICAgc3RhcnRUb2tlbiA9IGxvb2thaGVhZDtcbiAgICAgICAgICB0b2tlbiA9IGxleCgpO1xuICAgICAgICAgIGV4cHIgPSBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpO1xuICAgICAgICAgIGV4cHIgPSBuZXcgV3JhcHBpbmdOb2RlKHN0YXJ0VG9rZW4pLmZpbmlzaFVuYXJ5RXhwcmVzc2lvbih0b2tlbi52YWx1ZSwgZXhwcik7XG4gICAgICB9IGVsc2UgaWYgKG1hdGNoS2V5d29yZCgnZGVsZXRlJykgfHwgbWF0Y2hLZXl3b3JkKCd2b2lkJykgfHwgbWF0Y2hLZXl3b3JkKCd0eXBlb2YnKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2FibGVkLlwiKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZXhwciA9IHBhcnNlUG9zdGZpeEV4cHJlc3Npb24oKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICBmdW5jdGlvbiBiaW5hcnlQcmVjZWRlbmNlKHRva2VuLCBhbGxvd0luKSB7XG4gICAgICB2YXIgcHJlYyA9IDA7XG5cbiAgICAgIGlmICh0b2tlbi50eXBlICE9PSBUb2tlbi5QdW5jdHVhdG9yICYmIHRva2VuLnR5cGUgIT09IFRva2VuLktleXdvcmQpIHtcbiAgICAgICAgICByZXR1cm4gMDtcbiAgICAgIH1cblxuICAgICAgc3dpdGNoICh0b2tlbi52YWx1ZSkge1xuICAgICAgY2FzZSAnfHwnOlxuICAgICAgICAgIHByZWMgPSAxO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICcmJic6XG4gICAgICAgICAgcHJlYyA9IDI7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3wnOlxuICAgICAgICAgIHByZWMgPSAzO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdeJzpcbiAgICAgICAgICBwcmVjID0gNDtcbiAgICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnJic6XG4gICAgICAgICAgcHJlYyA9IDU7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJz09JzpcbiAgICAgIGNhc2UgJyE9JzpcbiAgICAgIGNhc2UgJz09PSc6XG4gICAgICBjYXNlICchPT0nOlxuICAgICAgICAgIHByZWMgPSA2O1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICc8JzpcbiAgICAgIGNhc2UgJz4nOlxuICAgICAgY2FzZSAnPD0nOlxuICAgICAgY2FzZSAnPj0nOlxuICAgICAgY2FzZSAnaW5zdGFuY2VvZic6XG4gICAgICAgICAgcHJlYyA9IDc7XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2luJzpcbiAgICAgICAgICBwcmVjID0gYWxsb3dJbiA/IDcgOiAwO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICc8PCc6XG4gICAgICBjYXNlICc+Pic6XG4gICAgICBjYXNlICc+Pj4nOlxuICAgICAgICAgIHByZWMgPSA4O1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICcrJzpcbiAgICAgIGNhc2UgJy0nOlxuICAgICAgICAgIHByZWMgPSA5O1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICcqJzpcbiAgICAgIGNhc2UgJy8nOlxuICAgICAgY2FzZSAnJSc6XG4gICAgICAgICAgcHJlYyA9IDExO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gcHJlYztcbiAgfVxuXG4gIC8vIDExLjUgTXVsdGlwbGljYXRpdmUgT3BlcmF0b3JzXG4gIC8vIDExLjYgQWRkaXRpdmUgT3BlcmF0b3JzXG4gIC8vIDExLjcgQml0d2lzZSBTaGlmdCBPcGVyYXRvcnNcbiAgLy8gMTEuOCBSZWxhdGlvbmFsIE9wZXJhdG9yc1xuICAvLyAxMS45IEVxdWFsaXR5IE9wZXJhdG9yc1xuICAvLyAxMS4xMCBCaW5hcnkgQml0d2lzZSBPcGVyYXRvcnNcbiAgLy8gMTEuMTEgQmluYXJ5IExvZ2ljYWwgT3BlcmF0b3JzXG5cbiAgZnVuY3Rpb24gcGFyc2VCaW5hcnlFeHByZXNzaW9uKCkge1xuICAgICAgdmFyIG1hcmtlciwgbWFya2VycywgZXhwciwgdG9rZW4sIHByZWMsIHN0YWNrLCByaWdodCwgb3BlcmF0b3IsIGxlZnQsIGk7XG5cbiAgICAgIG1hcmtlciA9IGxvb2thaGVhZDtcbiAgICAgIGxlZnQgPSBwYXJzZVVuYXJ5RXhwcmVzc2lvbigpO1xuXG4gICAgICB0b2tlbiA9IGxvb2thaGVhZDtcbiAgICAgIHByZWMgPSBiaW5hcnlQcmVjZWRlbmNlKHRva2VuLCBzdGF0ZS5hbGxvd0luKTtcbiAgICAgIGlmIChwcmVjID09PSAwKSB7XG4gICAgICAgICAgcmV0dXJuIGxlZnQ7XG4gICAgICB9XG4gICAgICB0b2tlbi5wcmVjID0gcHJlYztcbiAgICAgIGxleCgpO1xuXG4gICAgICBtYXJrZXJzID0gW21hcmtlciwgbG9va2FoZWFkXTtcbiAgICAgIHJpZ2h0ID0gcGFyc2VVbmFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgc3RhY2sgPSBbbGVmdCwgdG9rZW4sIHJpZ2h0XTtcblxuICAgICAgd2hpbGUgKChwcmVjID0gYmluYXJ5UHJlY2VkZW5jZShsb29rYWhlYWQsIHN0YXRlLmFsbG93SW4pKSA+IDApIHtcblxuICAgICAgICAgIC8vIFJlZHVjZTogbWFrZSBhIGJpbmFyeSBleHByZXNzaW9uIGZyb20gdGhlIHRocmVlIHRvcG1vc3QgZW50cmllcy5cbiAgICAgICAgICB3aGlsZSAoKHN0YWNrLmxlbmd0aCA+IDIpICYmIChwcmVjIDw9IHN0YWNrW3N0YWNrLmxlbmd0aCAtIDJdLnByZWMpKSB7XG4gICAgICAgICAgICAgIHJpZ2h0ID0gc3RhY2sucG9wKCk7XG4gICAgICAgICAgICAgIG9wZXJhdG9yID0gc3RhY2sucG9wKCkudmFsdWU7XG4gICAgICAgICAgICAgIGxlZnQgPSBzdGFjay5wb3AoKTtcbiAgICAgICAgICAgICAgbWFya2Vycy5wb3AoKTtcbiAgICAgICAgICAgICAgZXhwciA9IG5ldyBXcmFwcGluZ05vZGUobWFya2Vyc1ttYXJrZXJzLmxlbmd0aCAtIDFdKS5maW5pc2hCaW5hcnlFeHByZXNzaW9uKG9wZXJhdG9yLCBsZWZ0LCByaWdodCk7XG4gICAgICAgICAgICAgIHN0YWNrLnB1c2goZXhwcik7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gU2hpZnQuXG4gICAgICAgICAgdG9rZW4gPSBsZXgoKTtcbiAgICAgICAgICB0b2tlbi5wcmVjID0gcHJlYztcbiAgICAgICAgICBzdGFjay5wdXNoKHRva2VuKTtcbiAgICAgICAgICBtYXJrZXJzLnB1c2gobG9va2FoZWFkKTtcbiAgICAgICAgICBleHByID0gcGFyc2VVbmFyeUV4cHJlc3Npb24oKTtcbiAgICAgICAgICBzdGFjay5wdXNoKGV4cHIpO1xuICAgICAgfVxuXG4gICAgICAvLyBGaW5hbCByZWR1Y2UgdG8gY2xlYW4tdXAgdGhlIHN0YWNrLlxuICAgICAgaSA9IHN0YWNrLmxlbmd0aCAtIDE7XG4gICAgICBleHByID0gc3RhY2tbaV07XG4gICAgICBtYXJrZXJzLnBvcCgpO1xuICAgICAgd2hpbGUgKGkgPiAxKSB7XG4gICAgICAgICAgZXhwciA9IG5ldyBXcmFwcGluZ05vZGUobWFya2Vycy5wb3AoKSkuZmluaXNoQmluYXJ5RXhwcmVzc2lvbihzdGFja1tpIC0gMV0udmFsdWUsIHN0YWNrW2kgLSAyXSwgZXhwcik7XG4gICAgICAgICAgaSAtPSAyO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZXhwcjtcbiAgfVxuXG4gIC8vIDExLjEyIENvbmRpdGlvbmFsIE9wZXJhdG9yXG5cbiAgZnVuY3Rpb24gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24oKSB7XG4gICAgICB2YXIgZXhwciwgcHJldmlvdXNBbGxvd0luLCBjb25zZXF1ZW50LCBhbHRlcm5hdGUsIHN0YXJ0VG9rZW47XG5cbiAgICAgIHN0YXJ0VG9rZW4gPSBsb29rYWhlYWQ7XG5cbiAgICAgIGV4cHIgPSBwYXJzZUJpbmFyeUV4cHJlc3Npb24oKTtcblxuICAgICAgaWYgKG1hdGNoKCc/JykpIHtcbiAgICAgICAgICBsZXgoKTtcbiAgICAgICAgICBwcmV2aW91c0FsbG93SW4gPSBzdGF0ZS5hbGxvd0luO1xuICAgICAgICAgIHN0YXRlLmFsbG93SW4gPSB0cnVlO1xuICAgICAgICAgIGNvbnNlcXVlbnQgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG4gICAgICAgICAgc3RhdGUuYWxsb3dJbiA9IHByZXZpb3VzQWxsb3dJbjtcbiAgICAgICAgICBleHBlY3QoJzonKTtcbiAgICAgICAgICBhbHRlcm5hdGUgPSBwYXJzZUFzc2lnbm1lbnRFeHByZXNzaW9uKCk7XG5cbiAgICAgICAgICBleHByID0gbmV3IFdyYXBwaW5nTm9kZShzdGFydFRva2VuKS5maW5pc2hDb25kaXRpb25hbEV4cHJlc3Npb24oZXhwciwgY29uc2VxdWVudCwgYWx0ZXJuYXRlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICAvLyAxMS4xMyBBc3NpZ25tZW50IE9wZXJhdG9yc1xuXG4gIGZ1bmN0aW9uIHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKSB7XG4gICAgICB2YXIgb2xkUGFyZW50aGVzaXNDb3VudCwgdG9rZW4sIGV4cHIsIHJpZ2h0LCBsaXN0LCBzdGFydFRva2VuO1xuXG4gICAgICBvbGRQYXJlbnRoZXNpc0NvdW50ID0gc3RhdGUucGFyZW50aGVzaXNDb3VudDtcblxuICAgICAgc3RhcnRUb2tlbiA9IGxvb2thaGVhZDtcbiAgICAgIHRva2VuID0gbG9va2FoZWFkO1xuXG4gICAgICBleHByID0gcGFyc2VDb25kaXRpb25hbEV4cHJlc3Npb24oKTtcblxuICAgICAgcmV0dXJuIGV4cHI7XG4gIH1cblxuICAvLyAxMS4xNCBDb21tYSBPcGVyYXRvclxuXG4gIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvbigpIHtcbiAgICAgIHZhciBleHByLCBzdGFydFRva2VuID0gbG9va2FoZWFkLCBleHByZXNzaW9ucztcblxuICAgICAgZXhwciA9IHBhcnNlQXNzaWdubWVudEV4cHJlc3Npb24oKTtcblxuICAgICAgaWYgKG1hdGNoKCcsJykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXNhYmxlZC5cIik7IC8vIG5vIHNlcXVlbmNlIGV4cHJlc3Npb25zXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBleHByO1xuICB9XG5cbiAgLy8gMTIuNCBFeHByZXNzaW9uIFN0YXRlbWVudFxuXG4gIGZ1bmN0aW9uIHBhcnNlRXhwcmVzc2lvblN0YXRlbWVudChub2RlKSB7XG4gICAgICB2YXIgZXhwciA9IHBhcnNlRXhwcmVzc2lvbigpO1xuICAgICAgY29uc3VtZVNlbWljb2xvbigpO1xuICAgICAgcmV0dXJuIG5vZGUuZmluaXNoRXhwcmVzc2lvblN0YXRlbWVudChleHByKTtcbiAgfVxuXG4gIC8vIDEyIFN0YXRlbWVudHNcblxuICBmdW5jdGlvbiBwYXJzZVN0YXRlbWVudCgpIHtcbiAgICAgIHZhciB0eXBlID0gbG9va2FoZWFkLnR5cGUsXG4gICAgICAgICAgZXhwcixcbiAgICAgICAgICBsYWJlbGVkQm9keSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgbm9kZTtcblxuICAgICAgaWYgKHR5cGUgPT09IFRva2VuLkVPRikge1xuICAgICAgICAgIHRocm93VW5leHBlY3RlZChsb29rYWhlYWQpO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvciAmJiBsb29rYWhlYWQudmFsdWUgPT09ICd7Jykge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2FibGVkLlwiKTsgLy8gYmxvY2sgc3RhdGVtZW50XG4gICAgICB9XG5cbiAgICAgIG5vZGUgPSBuZXcgTm9kZSgpO1xuXG4gICAgICBpZiAodHlwZSA9PT0gVG9rZW4uUHVuY3R1YXRvcikge1xuICAgICAgICAgIHN3aXRjaCAobG9va2FoZWFkLnZhbHVlKSB7XG4gICAgICAgICAgY2FzZSAnOyc6XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcIkRpc2FibGVkLlwiKTsgLy8gZW1wdHkgc3RhdGVtZW50XG4gICAgICAgICAgY2FzZSAnKCc6XG4gICAgICAgICAgICAgIHJldHVybiBwYXJzZUV4cHJlc3Npb25TdGF0ZW1lbnQobm9kZSk7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzYWJsZWQuXCIpOyAvLyBrZXl3b3JkXG4gICAgICB9XG5cbiAgICAgIGV4cHIgPSBwYXJzZUV4cHJlc3Npb24oKTtcbiAgICAgIGNvbnN1bWVTZW1pY29sb24oKTtcbiAgICAgIHJldHVybiBub2RlLmZpbmlzaEV4cHJlc3Npb25TdGF0ZW1lbnQoZXhwcik7XG4gIH1cblxuICAvLyAxNCBQcm9ncmFtXG5cbiAgZnVuY3Rpb24gcGFyc2VTb3VyY2VFbGVtZW50KCkge1xuICAgICAgaWYgKGxvb2thaGVhZC50eXBlID09PSBUb2tlbi5LZXl3b3JkKSB7XG4gICAgICAgICAgc3dpdGNoIChsb29rYWhlYWQudmFsdWUpIHtcbiAgICAgICAgICBjYXNlICdjb25zdCc6XG4gICAgICAgICAgY2FzZSAnbGV0JzpcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzYWJsZWQuXCIpO1xuICAgICAgICAgIGNhc2UgJ2Z1bmN0aW9uJzpcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRGlzYWJsZWQuXCIpO1xuICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiBwYXJzZVN0YXRlbWVudCgpO1xuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGxvb2thaGVhZC50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICByZXR1cm4gcGFyc2VTdGF0ZW1lbnQoKTtcbiAgICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHBhcnNlU291cmNlRWxlbWVudHMoKSB7XG4gICAgICB2YXIgc291cmNlRWxlbWVudCwgc291cmNlRWxlbWVudHMgPSBbXSwgdG9rZW4sIGRpcmVjdGl2ZSwgZmlyc3RSZXN0cmljdGVkO1xuXG4gICAgICB3aGlsZSAoaW5kZXggPCBsZW5ndGgpIHtcbiAgICAgICAgICB0b2tlbiA9IGxvb2thaGVhZDtcbiAgICAgICAgICBpZiAodG9rZW4udHlwZSAhPT0gVG9rZW4uU3RyaW5nTGl0ZXJhbCkge1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBzb3VyY2VFbGVtZW50ID0gcGFyc2VTb3VyY2VFbGVtZW50KCk7XG4gICAgICAgICAgc291cmNlRWxlbWVudHMucHVzaChzb3VyY2VFbGVtZW50KTtcbiAgICAgICAgICBpZiAoc291cmNlRWxlbWVudC5leHByZXNzaW9uLnR5cGUgIT09IFN5bnRheC5MaXRlcmFsKSB7XG4gICAgICAgICAgICAgIC8vIHRoaXMgaXMgbm90IGRpcmVjdGl2ZVxuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgICAgZGlyZWN0aXZlID0gc291cmNlLnNsaWNlKHRva2VuLnN0YXJ0ICsgMSwgdG9rZW4uZW5kIC0gMSk7XG4gICAgICAgICAgaWYgKGRpcmVjdGl2ZSA9PT0gJ3VzZSBzdHJpY3QnKSB7XG4gICAgICAgICAgICAgIHN0cmljdCA9IHRydWU7XG4gICAgICAgICAgICAgIGlmIChmaXJzdFJlc3RyaWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgIHRocm93RXJyb3JUb2xlcmFudChmaXJzdFJlc3RyaWN0ZWQsIE1lc3NhZ2VzLlN0cmljdE9jdGFsTGl0ZXJhbCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBpZiAoIWZpcnN0UmVzdHJpY3RlZCAmJiB0b2tlbi5vY3RhbCkge1xuICAgICAgICAgICAgICAgICAgZmlyc3RSZXN0cmljdGVkID0gdG9rZW47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHdoaWxlIChpbmRleCA8IGxlbmd0aCkge1xuICAgICAgICAgIHNvdXJjZUVsZW1lbnQgPSBwYXJzZVNvdXJjZUVsZW1lbnQoKTtcbiAgICAgICAgICBpZiAodHlwZW9mIHNvdXJjZUVsZW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBzb3VyY2VFbGVtZW50cy5wdXNoKHNvdXJjZUVsZW1lbnQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHNvdXJjZUVsZW1lbnRzO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VQcm9ncmFtKCkge1xuICAgICAgdmFyIGJvZHksIG5vZGU7XG5cbiAgICAgIHNraXBDb21tZW50KCk7XG4gICAgICBwZWVrKCk7XG4gICAgICBub2RlID0gbmV3IE5vZGUoKTtcbiAgICAgIHN0cmljdCA9IHRydWU7IC8vIGFzc3VtZSBzdHJpY3RcblxuICAgICAgYm9keSA9IHBhcnNlU291cmNlRWxlbWVudHMoKTtcbiAgICAgIHJldHVybiBub2RlLmZpbmlzaFByb2dyYW0oYm9keSk7XG4gIH1cblxuICBmdW5jdGlvbiBmaWx0ZXJUb2tlbkxvY2F0aW9uKCkge1xuICAgICAgdmFyIGksIGVudHJ5LCB0b2tlbiwgdG9rZW5zID0gW107XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBleHRyYS50b2tlbnMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICBlbnRyeSA9IGV4dHJhLnRva2Vuc1tpXTtcbiAgICAgICAgICB0b2tlbiA9IHtcbiAgICAgICAgICAgICAgdHlwZTogZW50cnkudHlwZSxcbiAgICAgICAgICAgICAgdmFsdWU6IGVudHJ5LnZhbHVlXG4gICAgICAgICAgfTtcbiAgICAgICAgICBpZiAoZW50cnkucmVnZXgpIHtcbiAgICAgICAgICAgICAgdG9rZW4ucmVnZXggPSB7XG4gICAgICAgICAgICAgICAgICBwYXR0ZXJuOiBlbnRyeS5yZWdleC5wYXR0ZXJuLFxuICAgICAgICAgICAgICAgICAgZmxhZ3M6IGVudHJ5LnJlZ2V4LmZsYWdzXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChleHRyYS5yYW5nZSkge1xuICAgICAgICAgICAgICB0b2tlbi5yYW5nZSA9IGVudHJ5LnJhbmdlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXh0cmEubG9jKSB7XG4gICAgICAgICAgICAgIHRva2VuLmxvYyA9IGVudHJ5LmxvYztcbiAgICAgICAgICB9XG4gICAgICAgICAgdG9rZW5zLnB1c2godG9rZW4pO1xuICAgICAgfVxuXG4gICAgICBleHRyYS50b2tlbnMgPSB0b2tlbnM7XG4gIH1cblxuICBmdW5jdGlvbiB0b2tlbml6ZShjb2RlLCBvcHRpb25zKSB7XG4gICAgICB2YXIgdG9TdHJpbmcsXG4gICAgICAgICAgdG9rZW5zO1xuXG4gICAgICB0b1N0cmluZyA9IFN0cmluZztcbiAgICAgIGlmICh0eXBlb2YgY29kZSAhPT0gJ3N0cmluZycgJiYgIShjb2RlIGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgICAgICAgIGNvZGUgPSB0b1N0cmluZyhjb2RlKTtcbiAgICAgIH1cblxuICAgICAgc291cmNlID0gY29kZTtcbiAgICAgIGluZGV4ID0gMDtcbiAgICAgIGxpbmVOdW1iZXIgPSAoc291cmNlLmxlbmd0aCA+IDApID8gMSA6IDA7XG4gICAgICBsaW5lU3RhcnQgPSAwO1xuICAgICAgbGVuZ3RoID0gc291cmNlLmxlbmd0aDtcbiAgICAgIGxvb2thaGVhZCA9IG51bGw7XG4gICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICBhbGxvd0luOiB0cnVlLFxuICAgICAgICAgIGxhYmVsU2V0OiB7fSxcbiAgICAgICAgICBpbkZ1bmN0aW9uQm9keTogZmFsc2UsXG4gICAgICAgICAgaW5JdGVyYXRpb246IGZhbHNlLFxuICAgICAgICAgIGluU3dpdGNoOiBmYWxzZSxcbiAgICAgICAgICBsYXN0Q29tbWVudFN0YXJ0OiAtMVxuICAgICAgfTtcblxuICAgICAgZXh0cmEgPSB7fTtcblxuICAgICAgLy8gT3B0aW9ucyBtYXRjaGluZy5cbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICAvLyBPZiBjb3Vyc2Ugd2UgY29sbGVjdCB0b2tlbnMgaGVyZS5cbiAgICAgIG9wdGlvbnMudG9rZW5zID0gdHJ1ZTtcbiAgICAgIGV4dHJhLnRva2VucyA9IFtdO1xuICAgICAgZXh0cmEudG9rZW5pemUgPSB0cnVlO1xuICAgICAgLy8gVGhlIGZvbGxvd2luZyB0d28gZmllbGRzIGFyZSBuZWNlc3NhcnkgdG8gY29tcHV0ZSB0aGUgUmVnZXggdG9rZW5zLlxuICAgICAgZXh0cmEub3BlblBhcmVuVG9rZW4gPSAtMTtcbiAgICAgIGV4dHJhLm9wZW5DdXJseVRva2VuID0gLTE7XG5cbiAgICAgIGV4dHJhLnJhbmdlID0gKHR5cGVvZiBvcHRpb25zLnJhbmdlID09PSAnYm9vbGVhbicpICYmIG9wdGlvbnMucmFuZ2U7XG4gICAgICBleHRyYS5sb2MgPSAodHlwZW9mIG9wdGlvbnMubG9jID09PSAnYm9vbGVhbicpICYmIG9wdGlvbnMubG9jO1xuXG4gICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9sZXJhbnQgPT09ICdib29sZWFuJyAmJiBvcHRpb25zLnRvbGVyYW50KSB7XG4gICAgICAgICAgZXh0cmEuZXJyb3JzID0gW107XG4gICAgICB9XG5cbiAgICAgIHRyeSB7XG4gICAgICAgICAgcGVlaygpO1xuICAgICAgICAgIGlmIChsb29rYWhlYWQudHlwZSA9PT0gVG9rZW4uRU9GKSB7XG4gICAgICAgICAgICAgIHJldHVybiBleHRyYS50b2tlbnM7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV4KCk7XG4gICAgICAgICAgd2hpbGUgKGxvb2thaGVhZC50eXBlICE9PSBUb2tlbi5FT0YpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGxleCgpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChsZXhFcnJvcikge1xuICAgICAgICAgICAgICAgICAgaWYgKGV4dHJhLmVycm9ycykge1xuICAgICAgICAgICAgICAgICAgICAgIGV4dHJhLmVycm9ycy5wdXNoKGxleEVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgICAvLyBXZSBoYXZlIHRvIGJyZWFrIG9uIHRoZSBmaXJzdCBlcnJvclxuICAgICAgICAgICAgICAgICAgICAgIC8vIHRvIGF2b2lkIGluZmluaXRlIGxvb3BzLlxuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBsZXhFcnJvcjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGZpbHRlclRva2VuTG9jYXRpb24oKTtcbiAgICAgICAgICB0b2tlbnMgPSBleHRyYS50b2tlbnM7XG4gICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS5lcnJvcnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIHRva2Vucy5lcnJvcnMgPSBleHRyYS5lcnJvcnM7XG4gICAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgIGV4dHJhID0ge307XG4gICAgICB9XG4gICAgICByZXR1cm4gdG9rZW5zO1xuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2UoY29kZSwgb3B0aW9ucykge1xuICAgICAgdmFyIHByb2dyYW0sIHRvU3RyaW5nO1xuXG4gICAgICB0b1N0cmluZyA9IFN0cmluZztcbiAgICAgIGlmICh0eXBlb2YgY29kZSAhPT0gJ3N0cmluZycgJiYgIShjb2RlIGluc3RhbmNlb2YgU3RyaW5nKSkge1xuICAgICAgICAgIGNvZGUgPSB0b1N0cmluZyhjb2RlKTtcbiAgICAgIH1cblxuICAgICAgc291cmNlID0gY29kZTtcbiAgICAgIGluZGV4ID0gMDtcbiAgICAgIGxpbmVOdW1iZXIgPSAoc291cmNlLmxlbmd0aCA+IDApID8gMSA6IDA7XG4gICAgICBsaW5lU3RhcnQgPSAwO1xuICAgICAgbGVuZ3RoID0gc291cmNlLmxlbmd0aDtcbiAgICAgIGxvb2thaGVhZCA9IG51bGw7XG4gICAgICBzdGF0ZSA9IHtcbiAgICAgICAgICBhbGxvd0luOiB0cnVlLFxuICAgICAgICAgIGxhYmVsU2V0OiB7fSxcbiAgICAgICAgICBwYXJlbnRoZXNpc0NvdW50OiAwLFxuICAgICAgICAgIGluRnVuY3Rpb25Cb2R5OiBmYWxzZSxcbiAgICAgICAgICBpbkl0ZXJhdGlvbjogZmFsc2UsXG4gICAgICAgICAgaW5Td2l0Y2g6IGZhbHNlLFxuICAgICAgICAgIGxhc3RDb21tZW50U3RhcnQ6IC0xXG4gICAgICB9O1xuXG4gICAgICBleHRyYSA9IHt9O1xuICAgICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgIGV4dHJhLnJhbmdlID0gKHR5cGVvZiBvcHRpb25zLnJhbmdlID09PSAnYm9vbGVhbicpICYmIG9wdGlvbnMucmFuZ2U7XG4gICAgICAgICAgZXh0cmEubG9jID0gKHR5cGVvZiBvcHRpb25zLmxvYyA9PT0gJ2Jvb2xlYW4nKSAmJiBvcHRpb25zLmxvYztcblxuICAgICAgICAgIGlmIChleHRyYS5sb2MgJiYgb3B0aW9ucy5zb3VyY2UgIT09IG51bGwgJiYgb3B0aW9ucy5zb3VyY2UgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICBleHRyYS5zb3VyY2UgPSB0b1N0cmluZyhvcHRpb25zLnNvdXJjZSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHR5cGVvZiBvcHRpb25zLnRva2VucyA9PT0gJ2Jvb2xlYW4nICYmIG9wdGlvbnMudG9rZW5zKSB7XG4gICAgICAgICAgICAgIGV4dHJhLnRva2VucyA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAodHlwZW9mIG9wdGlvbnMudG9sZXJhbnQgPT09ICdib29sZWFuJyAmJiBvcHRpb25zLnRvbGVyYW50KSB7XG4gICAgICAgICAgICAgIGV4dHJhLmVycm9ycyA9IFtdO1xuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgdHJ5IHtcbiAgICAgICAgICBwcm9ncmFtID0gcGFyc2VQcm9ncmFtKCk7XG4gICAgICAgICAgaWYgKHR5cGVvZiBleHRyYS50b2tlbnMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgIGZpbHRlclRva2VuTG9jYXRpb24oKTtcbiAgICAgICAgICAgICAgcHJvZ3JhbS50b2tlbnMgPSBleHRyYS50b2tlbnM7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh0eXBlb2YgZXh0cmEuZXJyb3JzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICBwcm9ncmFtLmVycm9ycyA9IGV4dHJhLmVycm9ycztcbiAgICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgZXh0cmEgPSB7fTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByb2dyYW07XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHRva2VuaXplOiB0b2tlbml6ZSxcbiAgICBwYXJzZTogcGFyc2VcbiAgfTtcblxufSkoKTsiLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgYXhzID0gcmVxdWlyZSgnLi4vc2NlbmUvYXhpcycpLFxuICAgIGNvbmZpZyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uZmlnJyk7XG5cbnZhciBPUklFTlQgPSB7XG4gIFwieFwiOiAgICAgIFwiYm90dG9tXCIsXG4gIFwieVwiOiAgICAgIFwibGVmdFwiLFxuICBcInRvcFwiOiAgICBcInRvcFwiLFxuICBcImJvdHRvbVwiOiBcImJvdHRvbVwiLFxuICBcImxlZnRcIjogICBcImxlZnRcIixcbiAgXCJyaWdodFwiOiAgXCJyaWdodFwiXG59O1xuXG5mdW5jdGlvbiBheGVzKG1vZGVsLCBzcGVjLCBheGVzLCBncm91cCkge1xuICAoc3BlYyB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbihkZWYsIGluZGV4KSB7XG4gICAgYXhlc1tpbmRleF0gPSBheGVzW2luZGV4XSB8fCBheHMobW9kZWwpO1xuICAgIGF4aXMoZGVmLCBpbmRleCwgYXhlc1tpbmRleF0sIGdyb3VwKTtcbiAgfSk7XG59O1xuXG5mdW5jdGlvbiBheGlzKGRlZiwgaW5kZXgsIGF4aXMsIGdyb3VwKSB7XG4gIC8vIGF4aXMgc2NhbGVcbiAgaWYgKGRlZi5zY2FsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgYXhpcy5zY2FsZShncm91cC5zY2FsZShkZWYuc2NhbGUpKTtcbiAgfVxuXG4gIC8vIGF4aXMgb3JpZW50YXRpb25cbiAgYXhpcy5vcmllbnQoZGVmLm9yaWVudCB8fCBPUklFTlRbZGVmLnR5cGVdKTtcbiAgLy8gYXhpcyBvZmZzZXRcbiAgYXhpcy5vZmZzZXQoZGVmLm9mZnNldCB8fCAwKTtcbiAgLy8gYXhpcyBsYXllclxuICBheGlzLmxheWVyKGRlZi5sYXllciB8fCBcImZyb250XCIpO1xuICAvLyBheGlzIGdyaWQgbGluZXNcbiAgYXhpcy5ncmlkKGRlZi5ncmlkIHx8IGZhbHNlKTtcbiAgLy8gYXhpcyB0aXRsZVxuICBheGlzLnRpdGxlKGRlZi50aXRsZSB8fCBudWxsKTtcbiAgLy8gYXhpcyB0aXRsZSBvZmZzZXRcbiAgYXhpcy50aXRsZU9mZnNldChkZWYudGl0bGVPZmZzZXQgIT0gbnVsbFxuICAgID8gZGVmLnRpdGxlT2Zmc2V0IDogY29uZmlnLmF4aXMudGl0bGVPZmZzZXQpO1xuICAvLyBheGlzIHZhbHVlc1xuICBheGlzLnRpY2tWYWx1ZXMoZGVmLnZhbHVlcyB8fCBudWxsKTtcbiAgLy8gYXhpcyBsYWJlbCBmb3JtYXR0aW5nXG4gIGF4aXMudGlja0Zvcm1hdChkZWYuZm9ybWF0IHx8IG51bGwpO1xuICAvLyBheGlzIHRpY2sgc3ViZGl2aXNpb25cbiAgYXhpcy50aWNrU3ViZGl2aWRlKGRlZi5zdWJkaXZpZGUgfHwgMCk7XG4gIC8vIGF4aXMgdGljayBwYWRkaW5nXG4gIGF4aXMudGlja1BhZGRpbmcoZGVmLnRpY2tQYWRkaW5nIHx8IGNvbmZpZy5heGlzLnBhZGRpbmcpO1xuXG4gIC8vIGF4aXMgdGljayBzaXplKHMpXG4gIHZhciBzaXplID0gW107XG4gIGlmIChkZWYudGlja1NpemUgIT09IHVuZGVmaW5lZCkge1xuICAgIGZvciAodmFyIGk9MDsgaTwzOyArK2kpIHNpemUucHVzaChkZWYudGlja1NpemUpO1xuICB9IGVsc2Uge1xuICAgIHZhciB0cyA9IGNvbmZpZy5heGlzLnRpY2tTaXplO1xuICAgIHNpemUgPSBbdHMsIHRzLCB0c107XG4gIH1cbiAgaWYgKGRlZi50aWNrU2l6ZU1ham9yICE9IG51bGwpIHNpemVbMF0gPSBkZWYudGlja1NpemVNYWpvcjtcbiAgaWYgKGRlZi50aWNrU2l6ZU1pbm9yICE9IG51bGwpIHNpemVbMV0gPSBkZWYudGlja1NpemVNaW5vcjtcbiAgaWYgKGRlZi50aWNrU2l6ZUVuZCAgICE9IG51bGwpIHNpemVbMl0gPSBkZWYudGlja1NpemVFbmQ7XG4gIGlmIChzaXplLmxlbmd0aCkge1xuICAgIGF4aXMudGlja1NpemUuYXBwbHkoYXhpcywgc2l6ZSk7XG4gIH1cblxuICAvLyB0aWNrIGFyZ3VtZW50c1xuICBpZiAoZGVmLnRpY2tzICE9IG51bGwpIHtcbiAgICB2YXIgdGlja3MgPSBkbC5pc0FycmF5KGRlZi50aWNrcykgPyBkZWYudGlja3MgOiBbZGVmLnRpY2tzXTtcbiAgICBheGlzLnRpY2tzLmFwcGx5KGF4aXMsIHRpY2tzKTtcbiAgfSBlbHNlIHtcbiAgICBheGlzLnRpY2tzKGNvbmZpZy5heGlzLnRpY2tzKTtcbiAgfVxuXG4gIC8vIHN0eWxlIHByb3BlcnRpZXNcbiAgdmFyIHAgPSBkZWYucHJvcGVydGllcztcbiAgaWYgKHAgJiYgcC50aWNrcykge1xuICAgIGF4aXMubWFqb3JUaWNrUHJvcGVydGllcyhwLm1ham9yVGlja3NcbiAgICAgID8gZGwuZXh0ZW5kKHt9LCBwLnRpY2tzLCBwLm1ham9yVGlja3MpIDogcC50aWNrcyk7XG4gICAgYXhpcy5taW5vclRpY2tQcm9wZXJ0aWVzKHAubWlub3JUaWNrc1xuICAgICAgPyBkbC5leHRlbmQoe30sIHAudGlja3MsIHAubWlub3JUaWNrcykgOiBwLnRpY2tzKTtcbiAgfSBlbHNlIHtcbiAgICBheGlzLm1ham9yVGlja1Byb3BlcnRpZXMocCAmJiBwLm1ham9yVGlja3MgfHwge30pO1xuICAgIGF4aXMubWlub3JUaWNrUHJvcGVydGllcyhwICYmIHAubWlub3JUaWNrcyB8fCB7fSk7XG4gIH1cbiAgYXhpcy50aWNrTGFiZWxQcm9wZXJ0aWVzKHAgJiYgcC5sYWJlbHMgfHwge30pO1xuICBheGlzLnRpdGxlUHJvcGVydGllcyhwICYmIHAudGl0bGUgfHwge30pO1xuICBheGlzLmdyaWRMaW5lUHJvcGVydGllcyhwICYmIHAuZ3JpZCB8fCB7fSk7XG4gIGF4aXMuZG9tYWluUHJvcGVydGllcyhwICYmIHAuYXhpcyB8fCB7fSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gYXhlczsiLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgY29uZmlnID0gcmVxdWlyZSgnLi4vdXRpbC9jb25maWcnKSxcbiAgICBwYXJzZVRyYW5zZm9ybXMgPSByZXF1aXJlKCcuL3RyYW5zZm9ybXMnKSxcbiAgICBwYXJzZU1vZGlmeSA9IHJlcXVpcmUoJy4vbW9kaWZ5Jyk7XG5cbnZhciBwYXJzZURhdGEgPSBmdW5jdGlvbihtb2RlbCwgc3BlYywgY2FsbGJhY2spIHtcbiAgdmFyIGNvdW50ID0gMDtcblxuICBmdW5jdGlvbiBsb2FkZWQoZCkge1xuICAgIHJldHVybiBmdW5jdGlvbihlcnJvciwgZGF0YSkge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGRsLmVycm9yKFwiTE9BRElORyBGQUlMRUQ6IFwiICsgZC51cmwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbW9kZWwuZGF0YShkLm5hbWUpLnZhbHVlcyhkbC5yZWFkKGRhdGEsIGQuZm9ybWF0KSk7XG4gICAgICB9XG4gICAgICBpZiAoLS1jb3VudCA9PT0gMCkgY2FsbGJhY2soKTtcbiAgICB9XG4gIH1cblxuICAvLyBwcm9jZXNzIGVhY2ggZGF0YSBzZXQgZGVmaW5pdGlvblxuICAoc3BlYyB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbihkKSB7XG4gICAgaWYgKGQudXJsKSB7XG4gICAgICBjb3VudCArPSAxO1xuICAgICAgZGwubG9hZChkbC5leHRlbmQoe3VybDogZC51cmx9LCBjb25maWcubG9hZCksIGxvYWRlZChkKSk7XG4gICAgfVxuICAgIHBhcnNlRGF0YS5kYXRhc291cmNlKG1vZGVsLCBkKTtcbiAgfSk7XG5cbiAgaWYgKGNvdW50ID09PSAwKSBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxKTtcbiAgcmV0dXJuIHNwZWM7XG59O1xuXG5wYXJzZURhdGEuZGF0YXNvdXJjZSA9IGZ1bmN0aW9uKG1vZGVsLCBkKSB7XG4gIHZhciB0cmFuc2Zvcm0gPSAoZC50cmFuc2Zvcm18fFtdKS5tYXAoZnVuY3Rpb24odCkgeyByZXR1cm4gcGFyc2VUcmFuc2Zvcm1zKG1vZGVsLCB0KSB9KSxcbiAgICAgIG1vZCA9IChkLm1vZGlmeXx8W10pLm1hcChmdW5jdGlvbihtKSB7IHJldHVybiBwYXJzZU1vZGlmeShtb2RlbCwgbSwgZCkgfSksXG4gICAgICBkcyA9IG1vZGVsLmRhdGEoZC5uYW1lLCBtb2QuY29uY2F0KHRyYW5zZm9ybSkpO1xuXG4gIGlmIChkLnZhbHVlcykge1xuICAgIGRzLnZhbHVlcyhkbC5yZWFkKGQudmFsdWVzLCBkLmZvcm1hdCkpO1xuICB9IGVsc2UgaWYgKGQuc291cmNlKSB7XG4gICAgZHMuc291cmNlKGQuc291cmNlKVxuICAgICAgLnJldmlzZXMoZHMucmV2aXNlcygpKSAvLyBJZiBuZXcgZHMgcmV2aXNlcywgdGhlbiBpdCdzIG9yaWdpbiBtdXN0IHJldmlzZSB0b28uXG4gICAgICAuYWRkTGlzdGVuZXIoZHMpOyAgLy8gRGVyaXZlZCBkcyB3aWxsIGJlIHB1bHNlZCBieSBpdHMgc3JjIHJhdGhlciB0aGFuIHRoZSBtb2RlbC5cbiAgICBtb2RlbC5yZW1vdmVMaXN0ZW5lcihkcy5waXBlbGluZSgpWzBdKTsgXG4gIH1cblxuICByZXR1cm4gZHM7ICAgIFxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZURhdGE7IiwiLypcbiAqIEdlbmVyYXRlZCBieSBQRUcuanMgMC44LjAuXG4gKlxuICogaHR0cDovL3BlZ2pzLm1hamRhLmN6L1xuICovXG5cbmZ1bmN0aW9uIHBlZyRzdWJjbGFzcyhjaGlsZCwgcGFyZW50KSB7XG4gIGZ1bmN0aW9uIGN0b3IoKSB7IHRoaXMuY29uc3RydWN0b3IgPSBjaGlsZDsgfVxuICBjdG9yLnByb3RvdHlwZSA9IHBhcmVudC5wcm90b3R5cGU7XG4gIGNoaWxkLnByb3RvdHlwZSA9IG5ldyBjdG9yKCk7XG59XG5cbmZ1bmN0aW9uIFN5bnRheEVycm9yKG1lc3NhZ2UsIGV4cGVjdGVkLCBmb3VuZCwgb2Zmc2V0LCBsaW5lLCBjb2x1bW4pIHtcbiAgdGhpcy5tZXNzYWdlICA9IG1lc3NhZ2U7XG4gIHRoaXMuZXhwZWN0ZWQgPSBleHBlY3RlZDtcbiAgdGhpcy5mb3VuZCAgICA9IGZvdW5kO1xuICB0aGlzLm9mZnNldCAgID0gb2Zmc2V0O1xuICB0aGlzLmxpbmUgICAgID0gbGluZTtcbiAgdGhpcy5jb2x1bW4gICA9IGNvbHVtbjtcblxuICB0aGlzLm5hbWUgICAgID0gXCJTeW50YXhFcnJvclwiO1xufVxuXG5wZWckc3ViY2xhc3MoU3ludGF4RXJyb3IsIEVycm9yKTtcblxuZnVuY3Rpb24gcGFyc2UoaW5wdXQpIHtcbiAgdmFyIG9wdGlvbnMgPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHt9LFxuXG4gICAgICBwZWckRkFJTEVEID0ge30sXG5cbiAgICAgIHBlZyRzdGFydFJ1bGVGdW5jdGlvbnMgPSB7IHN0YXJ0OiBwZWckcGFyc2VzdGFydCB9LFxuICAgICAgcGVnJHN0YXJ0UnVsZUZ1bmN0aW9uICA9IHBlZyRwYXJzZXN0YXJ0LFxuXG4gICAgICBwZWckYzAgPSBwZWckRkFJTEVELFxuICAgICAgcGVnJGMxID0gXCIsXCIsXG4gICAgICBwZWckYzIgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCIsXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCIsXFxcIlwiIH0sXG4gICAgICBwZWckYzMgPSBmdW5jdGlvbihvLCBtKSB7IHJldHVybiBbb10uY29uY2F0KG0pIH0sXG4gICAgICBwZWckYzQgPSBmdW5jdGlvbihvKSB7IHJldHVybiBbb10gfSxcbiAgICAgIHBlZyRjNSA9IFwiW1wiLFxuICAgICAgcGVnJGM2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiW1wiLCBkZXNjcmlwdGlvbjogXCJcXFwiW1xcXCJcIiB9LFxuICAgICAgcGVnJGM3ID0gXCJdXCIsXG4gICAgICBwZWckYzggPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJdXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJdXFxcIlwiIH0sXG4gICAgICBwZWckYzkgPSBcIj5cIixcbiAgICAgIHBlZyRjMTAgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCI+XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCI+XFxcIlwiIH0sXG4gICAgICBwZWckYzExID0gZnVuY3Rpb24oZjEsIGYyLCBvKSB7IHJldHVybiB7c3RhcnQ6IGYxLCBlbmQ6IGYyLCBtaWRkbGU6IG99fSxcbiAgICAgIHBlZyRjMTIgPSBbXSxcbiAgICAgIHBlZyRjMTMgPSBmdW5jdGlvbihzLCBmKSB7IHJldHVybiAocy5maWx0ZXJzID0gZiksIHMgfSxcbiAgICAgIHBlZyRjMTQgPSBmdW5jdGlvbihzKSB7IHJldHVybiBzIH0sXG4gICAgICBwZWckYzE1ID0gbnVsbCxcbiAgICAgIHBlZyRjMTYgPSBmdW5jdGlvbih0LCBlKSB7IHJldHVybiB7IGV2ZW50OiBlLCB0YXJnZXQ6IHQgfSB9LFxuICAgICAgcGVnJGMxNyA9IC9eWzphLXpBLXowLTlfXFwtXS8sXG4gICAgICBwZWckYzE4ID0geyB0eXBlOiBcImNsYXNzXCIsIHZhbHVlOiBcIls6YS16QS16MC05X1xcXFwtXVwiLCBkZXNjcmlwdGlvbjogXCJbOmEtekEtejAtOV9cXFxcLV1cIiB9LFxuICAgICAgcGVnJGMxOSA9IGZ1bmN0aW9uKHMpIHsgcmV0dXJuIHsgc2lnbmFsOiBzLmpvaW4oXCJcIikgfX0sXG4gICAgICBwZWckYzIwID0gXCIoXCIsXG4gICAgICBwZWckYzIxID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiKFwiLCBkZXNjcmlwdGlvbjogXCJcXFwiKFxcXCJcIiB9LFxuICAgICAgcGVnJGMyMiA9IFwiKVwiLFxuICAgICAgcGVnJGMyMyA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIilcIiwgZGVzY3JpcHRpb246IFwiXFxcIilcXFwiXCIgfSxcbiAgICAgIHBlZyRjMjQgPSBmdW5jdGlvbihtKSB7IHJldHVybiB7IHN0cmVhbTogbSB9fSxcbiAgICAgIHBlZyRjMjUgPSBcIi5cIixcbiAgICAgIHBlZyRjMjYgPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCIuXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCIuXFxcIlwiIH0sXG4gICAgICBwZWckYzI3ID0gXCI6XCIsXG4gICAgICBwZWckYzI4ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiOlwiLCBkZXNjcmlwdGlvbjogXCJcXFwiOlxcXCJcIiB9LFxuICAgICAgcGVnJGMyOSA9IGZ1bmN0aW9uKGMpIHsgcmV0dXJuIHsgdHlwZTonY2xhc3MnLCB2YWx1ZTogYyB9IH0sXG4gICAgICBwZWckYzMwID0gXCIjXCIsXG4gICAgICBwZWckYzMxID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiI1wiLCBkZXNjcmlwdGlvbjogXCJcXFwiI1xcXCJcIiB9LFxuICAgICAgcGVnJGMzMiA9IGZ1bmN0aW9uKGlkKSB7IHJldHVybiB7IHR5cGU6J2lkJywgdmFsdWU6IGlkIH0gfSxcbiAgICAgIHBlZyRjMzMgPSBcIm1vdXNlZG93blwiLFxuICAgICAgcGVnJGMzNCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIm1vdXNlZG93blwiLCBkZXNjcmlwdGlvbjogXCJcXFwibW91c2Vkb3duXFxcIlwiIH0sXG4gICAgICBwZWckYzM1ID0gXCJtb3VzZXVwXCIsXG4gICAgICBwZWckYzM2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwibW91c2V1cFwiLCBkZXNjcmlwdGlvbjogXCJcXFwibW91c2V1cFxcXCJcIiB9LFxuICAgICAgcGVnJGMzNyA9IFwiY2xpY2tcIixcbiAgICAgIHBlZyRjMzggPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJjbGlja1wiLCBkZXNjcmlwdGlvbjogXCJcXFwiY2xpY2tcXFwiXCIgfSxcbiAgICAgIHBlZyRjMzkgPSBcImRibGNsaWNrXCIsXG4gICAgICBwZWckYzQwID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwiZGJsY2xpY2tcIiwgZGVzY3JpcHRpb246IFwiXFxcImRibGNsaWNrXFxcIlwiIH0sXG4gICAgICBwZWckYzQxID0gXCJ3aGVlbFwiLFxuICAgICAgcGVnJGM0MiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIndoZWVsXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJ3aGVlbFxcXCJcIiB9LFxuICAgICAgcGVnJGM0MyA9IFwia2V5ZG93blwiLFxuICAgICAgcGVnJGM0NCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImtleWRvd25cIiwgZGVzY3JpcHRpb246IFwiXFxcImtleWRvd25cXFwiXCIgfSxcbiAgICAgIHBlZyRjNDUgPSBcImtleXByZXNzXCIsXG4gICAgICBwZWckYzQ2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwia2V5cHJlc3NcIiwgZGVzY3JpcHRpb246IFwiXFxcImtleXByZXNzXFxcIlwiIH0sXG4gICAgICBwZWckYzQ3ID0gXCJrZXl1cFwiLFxuICAgICAgcGVnJGM0OCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcImtleXVwXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJrZXl1cFxcXCJcIiB9LFxuICAgICAgcGVnJGM0OSA9IFwibW91c2V3aGVlbFwiLFxuICAgICAgcGVnJGM1MCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIm1vdXNld2hlZWxcIiwgZGVzY3JpcHRpb246IFwiXFxcIm1vdXNld2hlZWxcXFwiXCIgfSxcbiAgICAgIHBlZyRjNTEgPSBcIm1vdXNlbW92ZVwiLFxuICAgICAgcGVnJGM1MiA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIm1vdXNlbW92ZVwiLCBkZXNjcmlwdGlvbjogXCJcXFwibW91c2Vtb3ZlXFxcIlwiIH0sXG4gICAgICBwZWckYzUzID0gXCJtb3VzZW91dFwiLFxuICAgICAgcGVnJGM1NCA9IHsgdHlwZTogXCJsaXRlcmFsXCIsIHZhbHVlOiBcIm1vdXNlb3V0XCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJtb3VzZW91dFxcXCJcIiB9LFxuICAgICAgcGVnJGM1NSA9IFwibW91c2VvdmVyXCIsXG4gICAgICBwZWckYzU2ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwibW91c2VvdmVyXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJtb3VzZW92ZXJcXFwiXCIgfSxcbiAgICAgIHBlZyRjNTcgPSBcIm1vdXNlZW50ZXJcIixcbiAgICAgIHBlZyRjNTggPSB7IHR5cGU6IFwibGl0ZXJhbFwiLCB2YWx1ZTogXCJtb3VzZWVudGVyXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJtb3VzZWVudGVyXFxcIlwiIH0sXG4gICAgICBwZWckYzU5ID0gXCJ0b3VjaHN0YXJ0XCIsXG4gICAgICBwZWckYzYwID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidG91Y2hzdGFydFwiLCBkZXNjcmlwdGlvbjogXCJcXFwidG91Y2hzdGFydFxcXCJcIiB9LFxuICAgICAgcGVnJGM2MSA9IFwidG91Y2htb3ZlXCIsXG4gICAgICBwZWckYzYyID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidG91Y2htb3ZlXCIsIGRlc2NyaXB0aW9uOiBcIlxcXCJ0b3VjaG1vdmVcXFwiXCIgfSxcbiAgICAgIHBlZyRjNjMgPSBcInRvdWNoZW5kXCIsXG4gICAgICBwZWckYzY0ID0geyB0eXBlOiBcImxpdGVyYWxcIiwgdmFsdWU6IFwidG91Y2hlbmRcIiwgZGVzY3JpcHRpb246IFwiXFxcInRvdWNoZW5kXFxcIlwiIH0sXG4gICAgICBwZWckYzY1ID0gZnVuY3Rpb24oZmllbGQpIHsgcmV0dXJuIGZpZWxkICB9LFxuICAgICAgcGVnJGM2NiA9IC9eWydcImEtekEtWjAtOV8uPjw9ISBcXHRcXC1dLyxcbiAgICAgIHBlZyRjNjcgPSB7IHR5cGU6IFwiY2xhc3NcIiwgdmFsdWU6IFwiWydcXFwiYS16QS1aMC05Xy4+PD0hIFxcXFx0XFxcXC1dXCIsIGRlc2NyaXB0aW9uOiBcIlsnXFxcImEtekEtWjAtOV8uPjw9ISBcXFxcdFxcXFwtXVwiIH0sXG4gICAgICBwZWckYzY4ID0gZnVuY3Rpb24odikgeyByZXR1cm4gdi5qb2luKFwiXCIpIH0sXG4gICAgICBwZWckYzY5ID0gL15bIFxcdFxcclxcbl0vLFxuICAgICAgcGVnJGM3MCA9IHsgdHlwZTogXCJjbGFzc1wiLCB2YWx1ZTogXCJbIFxcXFx0XFxcXHJcXFxcbl1cIiwgZGVzY3JpcHRpb246IFwiWyBcXFxcdFxcXFxyXFxcXG5dXCIgfSxcblxuICAgICAgcGVnJGN1cnJQb3MgICAgICAgICAgPSAwLFxuICAgICAgcGVnJHJlcG9ydGVkUG9zICAgICAgPSAwLFxuICAgICAgcGVnJGNhY2hlZFBvcyAgICAgICAgPSAwLFxuICAgICAgcGVnJGNhY2hlZFBvc0RldGFpbHMgPSB7IGxpbmU6IDEsIGNvbHVtbjogMSwgc2VlbkNSOiBmYWxzZSB9LFxuICAgICAgcGVnJG1heEZhaWxQb3MgICAgICAgPSAwLFxuICAgICAgcGVnJG1heEZhaWxFeHBlY3RlZCAgPSBbXSxcbiAgICAgIHBlZyRzaWxlbnRGYWlscyAgICAgID0gMCxcblxuICAgICAgcGVnJHJlc3VsdDtcblxuICBpZiAoXCJzdGFydFJ1bGVcIiBpbiBvcHRpb25zKSB7XG4gICAgaWYgKCEob3B0aW9ucy5zdGFydFJ1bGUgaW4gcGVnJHN0YXJ0UnVsZUZ1bmN0aW9ucykpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbid0IHN0YXJ0IHBhcnNpbmcgZnJvbSBydWxlIFxcXCJcIiArIG9wdGlvbnMuc3RhcnRSdWxlICsgXCJcXFwiLlwiKTtcbiAgICB9XG5cbiAgICBwZWckc3RhcnRSdWxlRnVuY3Rpb24gPSBwZWckc3RhcnRSdWxlRnVuY3Rpb25zW29wdGlvbnMuc3RhcnRSdWxlXTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHRleHQoKSB7XG4gICAgcmV0dXJuIGlucHV0LnN1YnN0cmluZyhwZWckcmVwb3J0ZWRQb3MsIHBlZyRjdXJyUG9zKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG9mZnNldCgpIHtcbiAgICByZXR1cm4gcGVnJHJlcG9ydGVkUG9zO1xuICB9XG5cbiAgZnVuY3Rpb24gbGluZSgpIHtcbiAgICByZXR1cm4gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBlZyRyZXBvcnRlZFBvcykubGluZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvbHVtbigpIHtcbiAgICByZXR1cm4gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBlZyRyZXBvcnRlZFBvcykuY29sdW1uO1xuICB9XG5cbiAgZnVuY3Rpb24gZXhwZWN0ZWQoZGVzY3JpcHRpb24pIHtcbiAgICB0aHJvdyBwZWckYnVpbGRFeGNlcHRpb24oXG4gICAgICBudWxsLFxuICAgICAgW3sgdHlwZTogXCJvdGhlclwiLCBkZXNjcmlwdGlvbjogZGVzY3JpcHRpb24gfV0sXG4gICAgICBwZWckcmVwb3J0ZWRQb3NcbiAgICApO1xuICB9XG5cbiAgZnVuY3Rpb24gZXJyb3IobWVzc2FnZSkge1xuICAgIHRocm93IHBlZyRidWlsZEV4Y2VwdGlvbihtZXNzYWdlLCBudWxsLCBwZWckcmVwb3J0ZWRQb3MpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBvcykge1xuICAgIGZ1bmN0aW9uIGFkdmFuY2UoZGV0YWlscywgc3RhcnRQb3MsIGVuZFBvcykge1xuICAgICAgdmFyIHAsIGNoO1xuXG4gICAgICBmb3IgKHAgPSBzdGFydFBvczsgcCA8IGVuZFBvczsgcCsrKSB7XG4gICAgICAgIGNoID0gaW5wdXQuY2hhckF0KHApO1xuICAgICAgICBpZiAoY2ggPT09IFwiXFxuXCIpIHtcbiAgICAgICAgICBpZiAoIWRldGFpbHMuc2VlbkNSKSB7IGRldGFpbHMubGluZSsrOyB9XG4gICAgICAgICAgZGV0YWlscy5jb2x1bW4gPSAxO1xuICAgICAgICAgIGRldGFpbHMuc2VlbkNSID0gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAoY2ggPT09IFwiXFxyXCIgfHwgY2ggPT09IFwiXFx1MjAyOFwiIHx8IGNoID09PSBcIlxcdTIwMjlcIikge1xuICAgICAgICAgIGRldGFpbHMubGluZSsrO1xuICAgICAgICAgIGRldGFpbHMuY29sdW1uID0gMTtcbiAgICAgICAgICBkZXRhaWxzLnNlZW5DUiA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGV0YWlscy5jb2x1bW4rKztcbiAgICAgICAgICBkZXRhaWxzLnNlZW5DUiA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBlZyRjYWNoZWRQb3MgIT09IHBvcykge1xuICAgICAgaWYgKHBlZyRjYWNoZWRQb3MgPiBwb3MpIHtcbiAgICAgICAgcGVnJGNhY2hlZFBvcyA9IDA7XG4gICAgICAgIHBlZyRjYWNoZWRQb3NEZXRhaWxzID0geyBsaW5lOiAxLCBjb2x1bW46IDEsIHNlZW5DUjogZmFsc2UgfTtcbiAgICAgIH1cbiAgICAgIGFkdmFuY2UocGVnJGNhY2hlZFBvc0RldGFpbHMsIHBlZyRjYWNoZWRQb3MsIHBvcyk7XG4gICAgICBwZWckY2FjaGVkUG9zID0gcG9zO1xuICAgIH1cblxuICAgIHJldHVybiBwZWckY2FjaGVkUG9zRGV0YWlscztcbiAgfVxuXG4gIGZ1bmN0aW9uIHBlZyRmYWlsKGV4cGVjdGVkKSB7XG4gICAgaWYgKHBlZyRjdXJyUG9zIDwgcGVnJG1heEZhaWxQb3MpIHsgcmV0dXJuOyB9XG5cbiAgICBpZiAocGVnJGN1cnJQb3MgPiBwZWckbWF4RmFpbFBvcykge1xuICAgICAgcGVnJG1heEZhaWxQb3MgPSBwZWckY3VyclBvcztcbiAgICAgIHBlZyRtYXhGYWlsRXhwZWN0ZWQgPSBbXTtcbiAgICB9XG5cbiAgICBwZWckbWF4RmFpbEV4cGVjdGVkLnB1c2goZXhwZWN0ZWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gcGVnJGJ1aWxkRXhjZXB0aW9uKG1lc3NhZ2UsIGV4cGVjdGVkLCBwb3MpIHtcbiAgICBmdW5jdGlvbiBjbGVhbnVwRXhwZWN0ZWQoZXhwZWN0ZWQpIHtcbiAgICAgIHZhciBpID0gMTtcblxuICAgICAgZXhwZWN0ZWQuc29ydChmdW5jdGlvbihhLCBiKSB7XG4gICAgICAgIGlmIChhLmRlc2NyaXB0aW9uIDwgYi5kZXNjcmlwdGlvbikge1xuICAgICAgICAgIHJldHVybiAtMTtcbiAgICAgICAgfSBlbHNlIGlmIChhLmRlc2NyaXB0aW9uID4gYi5kZXNjcmlwdGlvbikge1xuICAgICAgICAgIHJldHVybiAxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgd2hpbGUgKGkgPCBleHBlY3RlZC5sZW5ndGgpIHtcbiAgICAgICAgaWYgKGV4cGVjdGVkW2kgLSAxXSA9PT0gZXhwZWN0ZWRbaV0pIHtcbiAgICAgICAgICBleHBlY3RlZC5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gYnVpbGRNZXNzYWdlKGV4cGVjdGVkLCBmb3VuZCkge1xuICAgICAgZnVuY3Rpb24gc3RyaW5nRXNjYXBlKHMpIHtcbiAgICAgICAgZnVuY3Rpb24gaGV4KGNoKSB7IHJldHVybiBjaC5jaGFyQ29kZUF0KDApLnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpOyB9XG5cbiAgICAgICAgcmV0dXJuIHNcbiAgICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCAgICdcXFxcXFxcXCcpXG4gICAgICAgICAgLnJlcGxhY2UoL1wiL2csICAgICdcXFxcXCInKVxuICAgICAgICAgIC5yZXBsYWNlKC9cXHgwOC9nLCAnXFxcXGInKVxuICAgICAgICAgIC5yZXBsYWNlKC9cXHQvZywgICAnXFxcXHQnKVxuICAgICAgICAgIC5yZXBsYWNlKC9cXG4vZywgICAnXFxcXG4nKVxuICAgICAgICAgIC5yZXBsYWNlKC9cXGYvZywgICAnXFxcXGYnKVxuICAgICAgICAgIC5yZXBsYWNlKC9cXHIvZywgICAnXFxcXHInKVxuICAgICAgICAgIC5yZXBsYWNlKC9bXFx4MDAtXFx4MDdcXHgwQlxceDBFXFx4MEZdL2csIGZ1bmN0aW9uKGNoKSB7IHJldHVybiAnXFxcXHgwJyArIGhleChjaCk7IH0pXG4gICAgICAgICAgLnJlcGxhY2UoL1tcXHgxMC1cXHgxRlxceDgwLVxceEZGXS9nLCAgICBmdW5jdGlvbihjaCkgeyByZXR1cm4gJ1xcXFx4JyAgKyBoZXgoY2gpOyB9KVxuICAgICAgICAgIC5yZXBsYWNlKC9bXFx1MDE4MC1cXHUwRkZGXS9nLCAgICAgICAgIGZ1bmN0aW9uKGNoKSB7IHJldHVybiAnXFxcXHUwJyArIGhleChjaCk7IH0pXG4gICAgICAgICAgLnJlcGxhY2UoL1tcXHUxMDgwLVxcdUZGRkZdL2csICAgICAgICAgZnVuY3Rpb24oY2gpIHsgcmV0dXJuICdcXFxcdScgICsgaGV4KGNoKTsgfSk7XG4gICAgICB9XG5cbiAgICAgIHZhciBleHBlY3RlZERlc2NzID0gbmV3IEFycmF5KGV4cGVjdGVkLmxlbmd0aCksXG4gICAgICAgICAgZXhwZWN0ZWREZXNjLCBmb3VuZERlc2MsIGk7XG5cbiAgICAgIGZvciAoaSA9IDA7IGkgPCBleHBlY3RlZC5sZW5ndGg7IGkrKykge1xuICAgICAgICBleHBlY3RlZERlc2NzW2ldID0gZXhwZWN0ZWRbaV0uZGVzY3JpcHRpb247XG4gICAgICB9XG5cbiAgICAgIGV4cGVjdGVkRGVzYyA9IGV4cGVjdGVkLmxlbmd0aCA+IDFcbiAgICAgICAgPyBleHBlY3RlZERlc2NzLnNsaWNlKDAsIC0xKS5qb2luKFwiLCBcIilcbiAgICAgICAgICAgICsgXCIgb3IgXCJcbiAgICAgICAgICAgICsgZXhwZWN0ZWREZXNjc1tleHBlY3RlZC5sZW5ndGggLSAxXVxuICAgICAgICA6IGV4cGVjdGVkRGVzY3NbMF07XG5cbiAgICAgIGZvdW5kRGVzYyA9IGZvdW5kID8gXCJcXFwiXCIgKyBzdHJpbmdFc2NhcGUoZm91bmQpICsgXCJcXFwiXCIgOiBcImVuZCBvZiBpbnB1dFwiO1xuXG4gICAgICByZXR1cm4gXCJFeHBlY3RlZCBcIiArIGV4cGVjdGVkRGVzYyArIFwiIGJ1dCBcIiArIGZvdW5kRGVzYyArIFwiIGZvdW5kLlwiO1xuICAgIH1cblxuICAgIHZhciBwb3NEZXRhaWxzID0gcGVnJGNvbXB1dGVQb3NEZXRhaWxzKHBvcyksXG4gICAgICAgIGZvdW5kICAgICAgPSBwb3MgPCBpbnB1dC5sZW5ndGggPyBpbnB1dC5jaGFyQXQocG9zKSA6IG51bGw7XG5cbiAgICBpZiAoZXhwZWN0ZWQgIT09IG51bGwpIHtcbiAgICAgIGNsZWFudXBFeHBlY3RlZChleHBlY3RlZCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyBTeW50YXhFcnJvcihcbiAgICAgIG1lc3NhZ2UgIT09IG51bGwgPyBtZXNzYWdlIDogYnVpbGRNZXNzYWdlKGV4cGVjdGVkLCBmb3VuZCksXG4gICAgICBleHBlY3RlZCxcbiAgICAgIGZvdW5kLFxuICAgICAgcG9zLFxuICAgICAgcG9zRGV0YWlscy5saW5lLFxuICAgICAgcG9zRGV0YWlscy5jb2x1bW5cbiAgICApO1xuICB9XG5cbiAgZnVuY3Rpb24gcGVnJHBhcnNlc3RhcnQoKSB7XG4gICAgdmFyIHMwO1xuXG4gICAgczAgPSBwZWckcGFyc2VtZXJnZWQoKTtcblxuICAgIHJldHVybiBzMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBlZyRwYXJzZW1lcmdlZCgpIHtcbiAgICB2YXIgczAsIHMxLCBzMiwgczMsIHM0LCBzNTtcblxuICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgczEgPSBwZWckcGFyc2VvcmRlcmVkKCk7XG4gICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICBzMiA9IHBlZyRwYXJzZXNlcCgpO1xuICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDQpIHtcbiAgICAgICAgICBzMyA9IHBlZyRjMTtcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMzID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMik7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzNCA9IHBlZyRwYXJzZXNlcCgpO1xuICAgICAgICAgIGlmIChzNCAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgczUgPSBwZWckcGFyc2VtZXJnZWQoKTtcbiAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczEgPSBwZWckYzMoczEsIHM1KTtcbiAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgczAgPSBwZWckYzA7XG4gICAgfVxuICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgczAgPSBwZWckY3VyclBvcztcbiAgICAgIHMxID0gcGVnJHBhcnNlb3JkZXJlZCgpO1xuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICBzMSA9IHBlZyRjNChzMSk7XG4gICAgICB9XG4gICAgICBzMCA9IHMxO1xuICAgIH1cblxuICAgIHJldHVybiBzMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBlZyRwYXJzZW9yZGVyZWQoKSB7XG4gICAgdmFyIHMwLCBzMSwgczIsIHMzLCBzNCwgczUsIHM2LCBzNywgczgsIHM5LCBzMTAsIHMxMSwgczEyLCBzMTM7XG5cbiAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gOTEpIHtcbiAgICAgIHMxID0gcGVnJGM1O1xuICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICB9IGVsc2Uge1xuICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzYpOyB9XG4gICAgfVxuICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgczIgPSBwZWckcGFyc2VzZXAoKTtcbiAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBzMyA9IHBlZyRwYXJzZWZpbHRlcmVkKCk7XG4gICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHM0ID0gcGVnJHBhcnNlc2VwKCk7XG4gICAgICAgICAgaWYgKHM0ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQ0KSB7XG4gICAgICAgICAgICAgIHM1ID0gcGVnJGMxO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczUgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMik7IH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChzNSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICBzNiA9IHBlZyRwYXJzZXNlcCgpO1xuICAgICAgICAgICAgICBpZiAoczYgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICBzNyA9IHBlZyRwYXJzZWZpbHRlcmVkKCk7XG4gICAgICAgICAgICAgICAgaWYgKHM3ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICBzOCA9IHBlZyRwYXJzZXNlcCgpO1xuICAgICAgICAgICAgICAgICAgaWYgKHM4ICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gOTMpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzOSA9IHBlZyRjNztcbiAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHM5ID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjOCk7IH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoczkgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBzMTAgPSBwZWckcGFyc2VzZXAoKTtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoczEwICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDYyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHMxMSA9IHBlZyRjOTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHMxMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMxMCk7IH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMTEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgczEyID0gcGVnJHBhcnNlc2VwKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMTIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMTMgPSBwZWckcGFyc2VvcmRlcmVkKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMxMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMSA9IHBlZyRjMTEoczMsIHM3LCBzMTMpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgIHMwID0gcGVnJGMwO1xuICAgIH1cbiAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgIHMwID0gcGVnJHBhcnNlZmlsdGVyZWQoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gczA7XG4gIH1cblxuICBmdW5jdGlvbiBwZWckcGFyc2VmaWx0ZXJlZCgpIHtcbiAgICB2YXIgczAsIHMxLCBzMiwgczM7XG5cbiAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgIHMxID0gcGVnJHBhcnNlc3RyZWFtKCk7XG4gICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICBzMiA9IFtdO1xuICAgICAgczMgPSBwZWckcGFyc2VmaWx0ZXIoKTtcbiAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICB3aGlsZSAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBzMi5wdXNoKHMzKTtcbiAgICAgICAgICBzMyA9IHBlZyRwYXJzZWZpbHRlcigpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBzMiA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgczEgPSBwZWckYzEzKHMxLCBzMik7XG4gICAgICAgIHMwID0gczE7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgIHMwID0gcGVnJGMwO1xuICAgIH1cbiAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICBzMSA9IHBlZyRwYXJzZXN0cmVhbSgpO1xuICAgICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICBzMSA9IHBlZyRjMTQoczEpO1xuICAgICAgfVxuICAgICAgczAgPSBzMTtcbiAgICB9XG5cbiAgICByZXR1cm4gczA7XG4gIH1cblxuICBmdW5jdGlvbiBwZWckcGFyc2VzdHJlYW0oKSB7XG4gICAgdmFyIHMwLCBzMSwgczIsIHMzO1xuXG4gICAgczAgPSBwZWckY3VyclBvcztcbiAgICBzMSA9IHBlZyRwYXJzZWNsYXNzKCk7XG4gICAgaWYgKHMxID09PSBwZWckRkFJTEVEKSB7XG4gICAgICBzMSA9IHBlZyRwYXJzZWlkKCk7XG4gICAgfVxuICAgIGlmIChzMSA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgczEgPSBwZWckYzE1O1xuICAgIH1cbiAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgIHMyID0gcGVnJHBhcnNlZXZlbnRUeXBlKCk7XG4gICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgIHMxID0gcGVnJGMxNihzMSwgczIpO1xuICAgICAgICBzMCA9IHMxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICBzMCA9IHBlZyRjMDtcbiAgICB9XG4gICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgICAgczEgPSBbXTtcbiAgICAgIGlmIChwZWckYzE3LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMTgpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgd2hpbGUgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgczEucHVzaChzMik7XG4gICAgICAgICAgaWYgKHBlZyRjMTcudGVzdChpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpKSkge1xuICAgICAgICAgICAgczIgPSBpbnB1dC5jaGFyQXQocGVnJGN1cnJQb3MpO1xuICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczIgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzE4KTsgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczEgPSBwZWckYzA7XG4gICAgICB9XG4gICAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgIHMxID0gcGVnJGMxOShzMSk7XG4gICAgICB9XG4gICAgICBzMCA9IHMxO1xuICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gNDApIHtcbiAgICAgICAgICBzMSA9IHBlZyRjMjA7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzIxKTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHMyID0gcGVnJHBhcnNlbWVyZ2VkKCk7XG4gICAgICAgICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDQxKSB7XG4gICAgICAgICAgICAgIHMzID0gcGVnJGMyMjtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHMzID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzIzKTsgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgICAgICBzMSA9IHBlZyRjMjQoczIpO1xuICAgICAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBlZyRwYXJzZWNsYXNzKCkge1xuICAgIHZhciBzMCwgczEsIHMyLCBzMztcblxuICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA0Nikge1xuICAgICAgczEgPSBwZWckYzI1O1xuICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICB9IGVsc2Uge1xuICAgICAgczEgPSBwZWckRkFJTEVEO1xuICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzI2KTsgfVxuICAgIH1cbiAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgIHMyID0gcGVnJHBhcnNldmFsdWUoKTtcbiAgICAgIGlmIChzMiAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICBpZiAoaW5wdXQuY2hhckNvZGVBdChwZWckY3VyclBvcykgPT09IDU4KSB7XG4gICAgICAgICAgczMgPSBwZWckYzI3O1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMyOCk7IH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoczMgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICBwZWckcmVwb3J0ZWRQb3MgPSBzMDtcbiAgICAgICAgICBzMSA9IHBlZyRjMjkoczIpO1xuICAgICAgICAgIHMwID0gczE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICBzMCA9IHBlZyRjMDtcbiAgICB9XG5cbiAgICByZXR1cm4gczA7XG4gIH1cblxuICBmdW5jdGlvbiBwZWckcGFyc2VpZCgpIHtcbiAgICB2YXIgczAsIHMxLCBzMiwgczM7XG5cbiAgICBzMCA9IHBlZyRjdXJyUG9zO1xuICAgIGlmIChpbnB1dC5jaGFyQ29kZUF0KHBlZyRjdXJyUG9zKSA9PT0gMzUpIHtcbiAgICAgIHMxID0gcGVnJGMzMDtcbiAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgfSBlbHNlIHtcbiAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGMzMSk7IH1cbiAgICB9XG4gICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICBzMiA9IHBlZyRwYXJzZXZhbHVlKCk7XG4gICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA1OCkge1xuICAgICAgICAgIHMzID0gcGVnJGMyNztcbiAgICAgICAgICBwZWckY3VyclBvcysrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHMzID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMjgpOyB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHMzICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgcGVnJHJlcG9ydGVkUG9zID0gczA7XG4gICAgICAgICAgczEgPSBwZWckYzMyKHMyKTtcbiAgICAgICAgICBzMCA9IHMxO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgICAgczAgPSBwZWckYzA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBlZyRjdXJyUG9zID0gczA7XG4gICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgczAgPSBwZWckYzA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHMwO1xuICB9XG5cbiAgZnVuY3Rpb24gcGVnJHBhcnNlZXZlbnRUeXBlKCkge1xuICAgIHZhciBzMDtcblxuICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDkpID09PSBwZWckYzMzKSB7XG4gICAgICBzMCA9IHBlZyRjMzM7XG4gICAgICBwZWckY3VyclBvcyArPSA5O1xuICAgIH0gZWxzZSB7XG4gICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzQpOyB9XG4gICAgfVxuICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNykgPT09IHBlZyRjMzUpIHtcbiAgICAgICAgczAgPSBwZWckYzM1O1xuICAgICAgICBwZWckY3VyclBvcyArPSA3O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjMzYpOyB9XG4gICAgICB9XG4gICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSkgPT09IHBlZyRjMzcpIHtcbiAgICAgICAgICBzMCA9IHBlZyRjMzc7XG4gICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzM4KTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDgpID09PSBwZWckYzM5KSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRjMzk7XG4gICAgICAgICAgICBwZWckY3VyclBvcyArPSA4O1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDApOyB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSkgPT09IHBlZyRjNDEpIHtcbiAgICAgICAgICAgICAgczAgPSBwZWckYzQxO1xuICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSA1O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDIpOyB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNykgPT09IHBlZyRjNDMpIHtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRjNDM7XG4gICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gNztcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzQ0KTsgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDgpID09PSBwZWckYzQ1KSB7XG4gICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjNDU7XG4gICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSA4O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDYpOyB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgNSkgPT09IHBlZyRjNDcpIHtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzQ3O1xuICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSA1O1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNDgpOyB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTApID09PSBwZWckYzQ5KSB7XG4gICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckYzQ5O1xuICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDEwO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNTApOyB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgOSkgPT09IHBlZyRjNTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGM1MTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDk7XG4gICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM1Mik7IH1cbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA4KSA9PT0gcGVnJGM1Mykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjNTM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDg7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM1NCk7IH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5wdXQuc3Vic3RyKHBlZyRjdXJyUG9zLCA5KSA9PT0gcGVnJGM1NSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJGM1NTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSA5O1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHMwID0gcGVnJEZBSUxFRDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNTYpOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHMwID09PSBwZWckRkFJTEVEKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgMTApID09PSBwZWckYzU3KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjNTc7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSAxMDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzU4KTsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDEwKSA9PT0gcGVnJGM1OSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjNTk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBlZyRjdXJyUG9zICs9IDEwO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgczAgPSBwZWckRkFJTEVEO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNjApOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoczAgPT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGlucHV0LnN1YnN0cihwZWckY3VyclBvcywgOSkgPT09IHBlZyRjNjEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjNjE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGVnJGN1cnJQb3MgKz0gOTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzYyKTsgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChzMCA9PT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbnB1dC5zdWJzdHIocGVnJGN1cnJQb3MsIDgpID09PSBwZWckYzYzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRjNjM7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZWckY3VyclBvcyArPSA4O1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzMCA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNjQpOyB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHMwO1xuICB9XG5cbiAgZnVuY3Rpb24gcGVnJHBhcnNlZmlsdGVyKCkge1xuICAgIHZhciBzMCwgczEsIHMyLCBzMztcblxuICAgIHMwID0gcGVnJGN1cnJQb3M7XG4gICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA5MSkge1xuICAgICAgczEgPSBwZWckYzU7XG4gICAgICBwZWckY3VyclBvcysrO1xuICAgIH0gZWxzZSB7XG4gICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNik7IH1cbiAgICB9XG4gICAgaWYgKHMxICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICBzMiA9IHBlZyRwYXJzZXZhbHVlKCk7XG4gICAgICBpZiAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgaWYgKGlucHV0LmNoYXJDb2RlQXQocGVnJGN1cnJQb3MpID09PSA5Mykge1xuICAgICAgICAgIHMzID0gcGVnJGM3O1xuICAgICAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgczMgPSBwZWckRkFJTEVEO1xuICAgICAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM4KTsgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChzMyAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgICAgIHMxID0gcGVnJGM2NShzMik7XG4gICAgICAgICAgczAgPSBzMTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICAgIHMwID0gcGVnJGMwO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZWckY3VyclBvcyA9IHMwO1xuICAgICAgICBzMCA9IHBlZyRjMDtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcGVnJGN1cnJQb3MgPSBzMDtcbiAgICAgIHMwID0gcGVnJGMwO1xuICAgIH1cblxuICAgIHJldHVybiBzMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBlZyRwYXJzZXZhbHVlKCkge1xuICAgIHZhciBzMCwgczEsIHMyO1xuXG4gICAgczAgPSBwZWckY3VyclBvcztcbiAgICBzMSA9IFtdO1xuICAgIGlmIChwZWckYzY2LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgIHMyID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgIHBlZyRjdXJyUG9zKys7XG4gICAgfSBlbHNlIHtcbiAgICAgIHMyID0gcGVnJEZBSUxFRDtcbiAgICAgIGlmIChwZWckc2lsZW50RmFpbHMgPT09IDApIHsgcGVnJGZhaWwocGVnJGM2Nyk7IH1cbiAgICB9XG4gICAgaWYgKHMyICE9PSBwZWckRkFJTEVEKSB7XG4gICAgICB3aGlsZSAoczIgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgICAgczEucHVzaChzMik7XG4gICAgICAgIGlmIChwZWckYzY2LnRlc3QoaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKSkpIHtcbiAgICAgICAgICBzMiA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzMiA9IHBlZyRGQUlMRUQ7XG4gICAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzY3KTsgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHMxID0gcGVnJGMwO1xuICAgIH1cbiAgICBpZiAoczEgIT09IHBlZyRGQUlMRUQpIHtcbiAgICAgIHBlZyRyZXBvcnRlZFBvcyA9IHMwO1xuICAgICAgczEgPSBwZWckYzY4KHMxKTtcbiAgICB9XG4gICAgczAgPSBzMTtcblxuICAgIHJldHVybiBzMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHBlZyRwYXJzZXNlcCgpIHtcbiAgICB2YXIgczAsIHMxO1xuXG4gICAgczAgPSBbXTtcbiAgICBpZiAocGVnJGM2OS50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICBzMSA9IGlucHV0LmNoYXJBdChwZWckY3VyclBvcyk7XG4gICAgICBwZWckY3VyclBvcysrO1xuICAgIH0gZWxzZSB7XG4gICAgICBzMSA9IHBlZyRGQUlMRUQ7XG4gICAgICBpZiAocGVnJHNpbGVudEZhaWxzID09PSAwKSB7IHBlZyRmYWlsKHBlZyRjNzApOyB9XG4gICAgfVxuICAgIHdoaWxlIChzMSAhPT0gcGVnJEZBSUxFRCkge1xuICAgICAgczAucHVzaChzMSk7XG4gICAgICBpZiAocGVnJGM2OS50ZXN0KGlucHV0LmNoYXJBdChwZWckY3VyclBvcykpKSB7XG4gICAgICAgIHMxID0gaW5wdXQuY2hhckF0KHBlZyRjdXJyUG9zKTtcbiAgICAgICAgcGVnJGN1cnJQb3MrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHMxID0gcGVnJEZBSUxFRDtcbiAgICAgICAgaWYgKHBlZyRzaWxlbnRGYWlscyA9PT0gMCkgeyBwZWckZmFpbChwZWckYzcwKTsgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzMDtcbiAgfVxuXG4gIHBlZyRyZXN1bHQgPSBwZWckc3RhcnRSdWxlRnVuY3Rpb24oKTtcblxuICBpZiAocGVnJHJlc3VsdCAhPT0gcGVnJEZBSUxFRCAmJiBwZWckY3VyclBvcyA9PT0gaW5wdXQubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHBlZyRyZXN1bHQ7XG4gIH0gZWxzZSB7XG4gICAgaWYgKHBlZyRyZXN1bHQgIT09IHBlZyRGQUlMRUQgJiYgcGVnJGN1cnJQb3MgPCBpbnB1dC5sZW5ndGgpIHtcbiAgICAgIHBlZyRmYWlsKHsgdHlwZTogXCJlbmRcIiwgZGVzY3JpcHRpb246IFwiZW5kIG9mIGlucHV0XCIgfSk7XG4gICAgfVxuXG4gICAgdGhyb3cgcGVnJGJ1aWxkRXhjZXB0aW9uKG51bGwsIHBlZyRtYXhGYWlsRXhwZWN0ZWQsIHBlZyRtYXhGYWlsUG9zKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgU3ludGF4RXJyb3I6IFN5bnRheEVycm9yLFxuICBwYXJzZTogICAgICAgcGFyc2Vcbn07IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIGV4cHJlc3Npb24gPSByZXF1aXJlKCcuLi9leHByZXNzaW9uJyk7XG5cbnZhciBleHByID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgcGFyc2UgPSBleHByZXNzaW9uLnBhcnNlO1xuICB2YXIgY29kZWdlbiA9IGV4cHJlc3Npb24uY29kZSh7XG4gICAgaWRXaGl0ZUxpc3Q6IFsnZCcsICdlJywgJ2knLCAncCcsICdzZyddXG4gIH0pO1xuXG4gIHJldHVybiBmdW5jdGlvbihleHByKSB7ICAgIFxuICAgIHZhciB2YWx1ZSA9IGNvZGVnZW4ocGFyc2UoZXhwcikpO1xuICAgIHZhbHVlLmZuID0gRnVuY3Rpb24oJ2QnLCAnZScsICdpJywgJ3AnLCAnc2cnLFxuICAgICAgJ1widXNlIHN0cmljdFwiOyByZXR1cm4gKCcgKyB2YWx1ZS5mbiArICcpOycpO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfTtcbn0pKCk7XG5cbmV4cHIuZXZhbCA9IGZ1bmN0aW9uKGdyYXBoLCBmbiwgZCwgZSwgaSwgcCwgc2cpIHtcbiAgc2cgPSBncmFwaC5zaWduYWxWYWx1ZXMoZGwuYXJyYXkoc2cpKTtcbiAgcmV0dXJuIGZuLmNhbGwobnVsbCwgZCwgZSwgaSwgcCwgc2cpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBleHByOyIsInZhciBkbCA9IHJlcXVpcmUoJ2RhdGFsaWInKSxcbiAgICBjb25maWcgPSByZXF1aXJlKCcuLi91dGlsL2NvbmZpZycpLFxuICAgIEMgPSByZXF1aXJlKCcuLi91dGlsL2NvbnN0YW50cycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlSW50ZXJhY3RvcnMobW9kZWwsIHNwZWMsIGRlZkZhY3RvcnkpIHtcbiAgdmFyIGNvdW50ID0gMCxcbiAgICAgIHNnID0ge30sIHBkID0ge30sIG1rID0ge30sXG4gICAgICBzaWduYWxzID0gW10sIHByZWRpY2F0ZXMgPSBbXTtcblxuICBmdW5jdGlvbiBsb2FkZWQoaSkge1xuICAgIHJldHVybiBmdW5jdGlvbihlcnJvciwgZGF0YSkge1xuICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgIGRsLmVycm9yKFwiTE9BRElORyBGQUlMRUQ6IFwiICsgaS51cmwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGRlZiA9IGRsLmlzT2JqZWN0KGRhdGEpID8gZGF0YSA6IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICAgIGludGVyYWN0b3IoaS5uYW1lLCBkZWYpO1xuICAgICAgfVxuICAgICAgaWYgKC0tY291bnQgPT0gMCkgaW5qZWN0KCk7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gaW50ZXJhY3RvcihuYW1lLCBkZWYpIHtcbiAgICBzZyA9IHt9LCBwZCA9IHt9O1xuICAgIGlmIChkZWYuc2lnbmFscykgICAgc2lnbmFscy5wdXNoLmFwcGx5KHNpZ25hbHMsIG5zU2lnbmFscyhuYW1lLCBkZWYuc2lnbmFscykpO1xuICAgIGlmIChkZWYucHJlZGljYXRlcykgcHJlZGljYXRlcy5wdXNoLmFwcGx5KHByZWRpY2F0ZXMsIG5zUHJlZGljYXRlcyhuYW1lLCBkZWYucHJlZGljYXRlcykpO1xuICAgIG5zTWFya3MobmFtZSwgZGVmLm1hcmtzKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGluamVjdCgpIHtcbiAgICBpZiAoZGwua2V5cyhtaykubGVuZ3RoID4gMCkgaW5qZWN0TWFya3Moc3BlYy5tYXJrcyk7XG4gICAgc3BlYy5zaWduYWxzID0gZGwuYXJyYXkoc3BlYy5zaWduYWxzKTtcbiAgICBzcGVjLnByZWRpY2F0ZXMgPSBkbC5hcnJheShzcGVjLnByZWRpY2F0ZXMpO1xuICAgIHNwZWMuc2lnbmFscy51bnNoaWZ0LmFwcGx5KHNwZWMuc2lnbmFscywgc2lnbmFscyk7XG4gICAgc3BlYy5wcmVkaWNhdGVzLnVuc2hpZnQuYXBwbHkoc3BlYy5wcmVkaWNhdGVzLCBwcmVkaWNhdGVzKTtcbiAgICBkZWZGYWN0b3J5KCk7XG4gIH1cblxuICBmdW5jdGlvbiBpbmplY3RNYXJrcyhtYXJrcykge1xuICAgIHZhciBtLCByLCBpLCBsZW47XG4gICAgbWFya3MgPSBkbC5hcnJheShtYXJrcyk7XG5cbiAgICBmb3IoaSA9IDAsIGxlbiA9IG1hcmtzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBtID0gbWFya3NbaV07XG4gICAgICBpZiAociA9IG1rW20udHlwZV0pIHtcbiAgICAgICAgbWFya3NbaV0gPSBkbC5kdXBsaWNhdGUocik7XG4gICAgICAgIGlmIChtLmZyb20pIG1hcmtzW2ldLmZyb20gPSBtLmZyb207XG4gICAgICAgIGlmIChtLnByb3BlcnRpZXMpIHtcbiAgICAgICAgICBbQy5FTlRFUiwgQy5VUERBVEUsIEMuRVhJVF0uZm9yRWFjaChmdW5jdGlvbihwKSB7XG4gICAgICAgICAgICBtYXJrc1tpXS5wcm9wZXJ0aWVzW3BdID0gZGwuZXh0ZW5kKHIucHJvcGVydGllc1twXSwgbS5wcm9wZXJ0aWVzW3BdKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChtLm1hcmtzKSB7ICAvLyBUT0RPIGhvdyB0byBvdmVycmlkZSBwcm9wZXJ0aWVzIG9mIG5lc3RlZCBtYXJrcz9cbiAgICAgICAgaW5qZWN0TWFya3MobS5tYXJrcyk7XG4gICAgICB9XG4gICAgfSAgICBcbiAgfVxuXG4gIGZ1bmN0aW9uIG5zKG4sIHMpIHsgXG4gICAgaWYgKGRsLmlzU3RyaW5nKHMpKSB7XG4gICAgICByZXR1cm4gcyArIFwiX1wiICsgbjtcbiAgICB9IGVsc2Uge1xuICAgICAgZGwua2V5cyhzKS5mb3JFYWNoKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIHZhciByZWdleCA9IG5ldyBSZWdFeHAoJ1xcXFxiJyt4KydcXFxcYicsIFwiZ1wiKTtcbiAgICAgICAgbiA9IG4ucmVwbGFjZShyZWdleCwgc1t4XSkgXG4gICAgICB9KTtcbiAgICAgIHJldHVybiBuO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIG5zU2lnbmFscyhuYW1lLCBzaWduYWxzKSB7XG4gICAgc2lnbmFscyA9IGRsLmFycmF5KHNpZ25hbHMpO1xuICAgIC8vIFR3byBwYXNzZXMgdG8gbnMgYWxsIHNpZ25hbHMsIGFuZCB0aGVuIG92ZXJ3cml0ZSB0aGVpciBkZWZpbml0aW9uc1xuICAgIC8vIGluIGNhc2Ugc2lnbmFsIG9yZGVyIGlzIGltcG9ydGFudC5cbiAgICBzaWduYWxzLmZvckVhY2goZnVuY3Rpb24ocykgeyBzLm5hbWUgPSBzZ1tzLm5hbWVdID0gbnMocy5uYW1lLCBuYW1lKTsgfSk7XG4gICAgc2lnbmFscy5mb3JFYWNoKGZ1bmN0aW9uKHMpIHtcbiAgICAgIChzLnN0cmVhbXMgfHwgW10pLmZvckVhY2goZnVuY3Rpb24odCkge1xuICAgICAgICB0LnR5cGUgPSBucyh0LnR5cGUsIHNnKTtcbiAgICAgICAgdC5leHByID0gbnModC5leHByLCBzZyk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gc2lnbmFscztcbiAgfVxuXG4gIGZ1bmN0aW9uIG5zUHJlZGljYXRlcyhuYW1lLCBwcmVkaWNhdGVzKSB7XG4gICAgcHJlZGljYXRlcyA9IGRsLmFycmF5KHByZWRpY2F0ZXMpO1xuICAgIHByZWRpY2F0ZXMuZm9yRWFjaChmdW5jdGlvbihwKSB7XG4gICAgICBwLm5hbWUgPSBwZFtwLm5hbWVdID0gbnMocC5uYW1lLCBuYW1lKTtcblxuICAgICAgW3Aub3BlcmFuZHMsIHAucmFuZ2VdLmZvckVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICAoeCB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbihvKSB7XG4gICAgICAgICAgaWYgKG8uc2lnbmFsKSBvLnNpZ25hbCA9IG5zKG8uc2lnbmFsLCBzZyk7XG4gICAgICAgICAgZWxzZSBpZiAoby5wcmVkaWNhdGUpIG5zT3BlcmFuZChvKTtcbiAgICAgICAgfSlcbiAgICAgIH0pO1xuXG4gICAgfSk7ICBcbiAgICByZXR1cm4gcHJlZGljYXRlczsgXG4gIH1cblxuICBmdW5jdGlvbiBuc09wZXJhbmQobykge1xuICAgIG8ucHJlZGljYXRlID0gcGRbby5wcmVkaWNhdGVdO1xuICAgIGRsLmtleXMoby5pbnB1dCkuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgICB2YXIgaSA9IG8uaW5wdXRba107XG4gICAgICBpZiAoaS5zaWduYWwpIGkuc2lnbmFsID0gbnMoaS5zaWduYWwsIHNnKTtcbiAgICB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIG5zTWFya3MobmFtZSwgbWFya3MpIHtcbiAgICAobWFya3MgfHwgW10pLmZvckVhY2goZnVuY3Rpb24obSkgeyBcbiAgICAgIG5zUHJvcGVydGllcyhtLnByb3BlcnRpZXMuZW50ZXIpO1xuICAgICAgbnNQcm9wZXJ0aWVzKG0ucHJvcGVydGllcy51cGRhdGUpO1xuICAgICAgbnNQcm9wZXJ0aWVzKG0ucHJvcGVydGllcy5leGl0KTtcbiAgICAgIG1rW25zKG0ubmFtZSwgbmFtZSldID0gbTsgXG4gICAgfSk7XG4gIH1cblxuICBmdW5jdGlvbiBuc1Byb3BlcnRpZXMocHJvcHNldCkge1xuICAgIGRsLmtleXMocHJvcHNldCkuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgICB2YXIgcCA9IHByb3BzZXRba107XG4gICAgICBpZiAocC5zaWduYWwpIHAuc2lnbmFsID0gbnMocC5zaWduYWwsIHNnKTtcbiAgICAgIGVsc2UgaWYgKHAucnVsZSkge1xuICAgICAgICBwLnJ1bGUuZm9yRWFjaChmdW5jdGlvbihyKSB7IFxuICAgICAgICAgIGlmIChyLnNpZ25hbCkgci5zaWduYWwgPSBucyhyLnNpZ25hbCwgc2cpO1xuICAgICAgICAgIGlmIChyLnByZWRpY2F0ZSkgbnNPcGVyYW5kKHIpOyBcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAoc3BlYy5pbnRlcmFjdG9ycyB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbihpKSB7XG4gICAgaWYgKGkudXJsKSB7XG4gICAgICBjb3VudCArPSAxO1xuICAgICAgZGwubG9hZChkbC5leHRlbmQoe3VybDogaS51cmx9LCBjb25maWcubG9hZCksIGxvYWRlZChpKSk7XG4gICAgfVxuICB9KTtcblxuICBpZiAoY291bnQgPT09IDApIHNldFRpbWVvdXQoaW5qZWN0LCAxKTtcbiAgcmV0dXJuIHNwZWM7XG59IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIHBhcnNlUHJvcGVydGllcyA9IHJlcXVpcmUoJy4vcHJvcGVydGllcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlTWFyayhtb2RlbCwgbWFyaykge1xuICB2YXIgcHJvcHMgPSBtYXJrLnByb3BlcnRpZXMsXG4gICAgICBncm91cCA9IG1hcmsubWFya3M7XG5cbiAgLy8gcGFyc2UgbWFyayBwcm9wZXJ0eSBkZWZpbml0aW9uc1xuICBkbC5rZXlzKHByb3BzKS5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICBwcm9wc1trXSA9IHBhcnNlUHJvcGVydGllcyhtb2RlbCwgbWFyay50eXBlLCBwcm9wc1trXSk7XG4gIH0pO1xuXG4gIC8vIHBhcnNlIGRlbGF5IGZ1bmN0aW9uXG4gIGlmIChtYXJrLmRlbGF5KSB7XG4gICAgbWFyay5kZWxheSA9IHBhcnNlUHJvcGVydGllcyhtb2RlbCwgbWFyay50eXBlLCB7ZGVsYXk6IG1hcmsuZGVsYXl9KTtcbiAgfVxuXG4gIC8vIHJlY3Vyc2UgaWYgZ3JvdXAgdHlwZVxuICBpZiAoZ3JvdXApIHtcbiAgICBtYXJrLm1hcmtzID0gZ3JvdXAubWFwKGZ1bmN0aW9uKGcpIHsgcmV0dXJuIHBhcnNlTWFyayhtb2RlbCwgZyk7IH0pO1xuICB9XG4gICAgXG4gIHJldHVybiBtYXJrO1xufTsiLCJ2YXIgcGFyc2VNYXJrID0gcmVxdWlyZSgnLi9tYXJrJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obW9kZWwsIHNwZWMsIHdpZHRoLCBoZWlnaHQpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBcImdyb3VwXCIsXG4gICAgd2lkdGg6IHdpZHRoLFxuICAgIGhlaWdodDogaGVpZ2h0LFxuICAgIHNjYWxlczogc3BlYy5zY2FsZXMgfHwgW10sXG4gICAgYXhlczogc3BlYy5heGVzIHx8IFtdLFxuICAgIC8vIGxlZ2VuZHM6IHNwZWMubGVnZW5kcyB8fCBbXSxcbiAgICBtYXJrczogKHNwZWMubWFya3MgfHwgW10pLm1hcChmdW5jdGlvbihtKSB7IHJldHVybiBwYXJzZU1hcmsobW9kZWwsIG0pOyB9KVxuICB9O1xufTsiLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgTm9kZSA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L05vZGUnKSxcbiAgICB0dXBsZSA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L3R1cGxlJyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyksXG4gICAgQyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uc3RhbnRzJyk7XG5cbnZhciBmaWx0ZXIgPSBmdW5jdGlvbihmaWVsZCwgdmFsdWUsIHNyYywgZGVzdCkge1xuICBmb3IodmFyIGkgPSBzcmMubGVuZ3RoLTE7IGkgPj0gMDsgLS1pKSB7XG4gICAgaWYoc3JjW2ldW2ZpZWxkXSA9PSB2YWx1ZSlcbiAgICAgIGRlc3QucHVzaC5hcHBseShkZXN0LCBzcmMuc3BsaWNlKGksIDEpKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZU1vZGlmeShtb2RlbCwgZGVmLCBkcykge1xuICB2YXIgZ3JhcGggPSBtb2RlbC5ncmFwaCxcbiAgICAgIHNpZ25hbCA9IGRlZi5zaWduYWwgPyBkbC5maWVsZChkZWYuc2lnbmFsKSA6IG51bGwsIFxuICAgICAgc2lnbmFsTmFtZSA9IHNpZ25hbCA/IHNpZ25hbFswXSA6IG51bGwsXG4gICAgICBwcmVkaWNhdGUgPSBkZWYucHJlZGljYXRlID8gbW9kZWwucHJlZGljYXRlKGRlZi5wcmVkaWNhdGUpIDogbnVsbCxcbiAgICAgIHJlZXZhbCA9IChwcmVkaWNhdGUgPT09IG51bGwpLFxuICAgICAgbm9kZSA9IG5ldyBOb2RlKGdyYXBoKTtcblxuICBub2RlLmV2YWx1YXRlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICBpZihwcmVkaWNhdGUgIT09IG51bGwpIHtcbiAgICAgIHZhciBkYiA9IHt9O1xuICAgICAgKHByZWRpY2F0ZS5kYXRhfHxbXSkuZm9yRWFjaChmdW5jdGlvbihkKSB7IGRiW2RdID0gbW9kZWwuZGF0YShkKS52YWx1ZXMoKTsgfSk7XG5cbiAgICAgIC8vIFRPRE86IGlucHV0XG4gICAgICByZWV2YWwgPSBwcmVkaWNhdGUoe30sIGRiLCBncmFwaC5zaWduYWxWYWx1ZXMocHJlZGljYXRlLnNpZ25hbHN8fFtdKSwgbW9kZWwuX3ByZWRpY2F0ZXMpO1xuICAgIH1cblxuICAgIGRlYnVnKGlucHV0LCBbZGVmLnR5cGUrXCJpbmdcIiwgcmVldmFsXSk7XG4gICAgaWYoIXJlZXZhbCkgcmV0dXJuIGlucHV0O1xuXG4gICAgdmFyIGRhdHVtID0ge30sIFxuICAgICAgICB2YWx1ZSA9IHNpZ25hbCA/IGdyYXBoLnNpZ25hbFJlZihkZWYuc2lnbmFsKSA6IG51bGwsXG4gICAgICAgIGQgPSBtb2RlbC5kYXRhKGRzLm5hbWUpLFxuICAgICAgICBwcmV2ID0gZC5yZXZpc2VzKCkgPyBudWxsIDogdW5kZWZpbmVkLFxuICAgICAgICB0ID0gbnVsbDtcblxuICAgIGRhdHVtW2RlZi5maWVsZF0gPSB2YWx1ZTtcblxuICAgIC8vIFdlIGhhdmUgdG8gbW9kaWZ5IGRzLl9kYXRhIHNvIHRoYXQgc3Vic2VxdWVudCBwdWxzZXMgY29udGFpblxuICAgIC8vIG91ciBkeW5hbWljIGRhdGEuIFcvbyBtb2RpZnlpbmcgZHMuX2RhdGEsIG9ubHkgdGhlIG91dHB1dFxuICAgIC8vIGNvbGxlY3RvciB3aWxsIGNvbnRhaW4gZHluYW1pYyB0dXBsZXMuIFxuICAgIGlmKGRlZi50eXBlID09IEMuQUREKSB7XG4gICAgICB0ID0gdHVwbGUuaW5nZXN0KGRhdHVtLCBwcmV2KTtcbiAgICAgIGlucHV0LmFkZC5wdXNoKHQpO1xuICAgICAgZC5fZGF0YS5wdXNoKHQpO1xuICAgIH0gZWxzZSBpZihkZWYudHlwZSA9PSBDLlJFTU9WRSkge1xuICAgICAgZmlsdGVyKGRlZi5maWVsZCwgdmFsdWUsIGlucHV0LmFkZCwgaW5wdXQucmVtKTtcbiAgICAgIGZpbHRlcihkZWYuZmllbGQsIHZhbHVlLCBpbnB1dC5tb2QsIGlucHV0LnJlbSk7XG4gICAgICBkLl9kYXRhID0gZC5fZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4geFtkZWYuZmllbGRdICE9PSB2YWx1ZSB9KTtcbiAgICB9IGVsc2UgaWYoZGVmLnR5cGUgPT0gQy5UT0dHTEUpIHtcbiAgICAgIHZhciBhZGQgPSBbXSwgcmVtID0gW107XG4gICAgICBmaWx0ZXIoZGVmLmZpZWxkLCB2YWx1ZSwgaW5wdXQucmVtLCBhZGQpO1xuICAgICAgZmlsdGVyKGRlZi5maWVsZCwgdmFsdWUsIGlucHV0LmFkZCwgcmVtKTtcbiAgICAgIGZpbHRlcihkZWYuZmllbGQsIHZhbHVlLCBpbnB1dC5tb2QsIHJlbSk7XG4gICAgICBpZihhZGQubGVuZ3RoID09IDAgJiYgcmVtLmxlbmd0aCA9PSAwKSBhZGQucHVzaCh0dXBsZS5pbmdlc3QoZGF0dW0pKTtcblxuICAgICAgaW5wdXQuYWRkLnB1c2guYXBwbHkoaW5wdXQuYWRkLCBhZGQpO1xuICAgICAgZC5fZGF0YS5wdXNoLmFwcGx5KGQuX2RhdGEsIGFkZCk7XG4gICAgICBpbnB1dC5yZW0ucHVzaC5hcHBseShpbnB1dC5yZW0sIHJlbSk7XG4gICAgICBkLl9kYXRhID0gZC5fZGF0YS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4gcmVtLmluZGV4T2YoeCkgPT09IC0xIH0pO1xuICAgIH0gZWxzZSBpZihkZWYudHlwZSA9PSBDLkNMRUFSKSB7XG4gICAgICBpbnB1dC5yZW0ucHVzaC5hcHBseShpbnB1dC5yZW0sIGlucHV0LmFkZCk7XG4gICAgICBpbnB1dC5yZW0ucHVzaC5hcHBseShpbnB1dC5yZW0sIGlucHV0Lm1vZCk7XG4gICAgICBpbnB1dC5hZGQgPSBbXTtcbiAgICAgIGlucHV0Lm1vZCA9IFtdO1xuICAgICAgZC5fZGF0YSAgPSBbXTtcbiAgICB9IFxuXG4gICAgaW5wdXQuZmllbGRzW2RlZi5maWVsZF0gPSAxO1xuICAgIHJldHVybiBpbnB1dDtcbiAgfTtcblxuICBpZihzaWduYWxOYW1lKSBub2RlLmRlcGVuZGVuY3koQy5TSUdOQUxTLCBzaWduYWxOYW1lKTtcbiAgaWYocHJlZGljYXRlKSAgbm9kZS5kZXBlbmRlbmN5KEMuU0lHTkFMUywgcHJlZGljYXRlLnNpZ25hbHMpO1xuICBcbiAgcmV0dXJuIG5vZGU7XG59IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlUGFkZGluZyhwYWQpIHtcbiAgaWYgKHBhZCA9PSBudWxsKSByZXR1cm4gXCJhdXRvXCI7XG4gIGVsc2UgaWYgKGRsLmlzU3RyaW5nKHBhZCkpIHJldHVybiBwYWQ9PT1cInN0cmljdFwiID8gXCJzdHJpY3RcIiA6IFwiYXV0b1wiO1xuICBlbHNlIGlmIChkbC5pc09iamVjdChwYWQpKSByZXR1cm4gcGFkO1xuICB2YXIgcCA9IGRsLmlzTnVtYmVyKHBhZCkgPyBwYWQgOiAyMDtcbiAgcmV0dXJuIHt0b3A6cCwgbGVmdDpwLCByaWdodDpwLCBib3R0b206cH07XG59IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHBhcnNlUHJlZGljYXRlKG1vZGVsLCBzcGVjKSB7XG4gIHZhciB0eXBlcyA9IHtcbiAgICAnPSc6ICBwYXJzZUNvbXBhcmF0b3IsXG4gICAgJz09JzogcGFyc2VDb21wYXJhdG9yLFxuICAgICchPSc6IHBhcnNlQ29tcGFyYXRvcixcbiAgICAnPic6ICBwYXJzZUNvbXBhcmF0b3IsXG4gICAgJz49JzogcGFyc2VDb21wYXJhdG9yLFxuICAgICc8JzogIHBhcnNlQ29tcGFyYXRvcixcbiAgICAnPD0nOiBwYXJzZUNvbXBhcmF0b3IsXG4gICAgJ2FuZCc6IHBhcnNlTG9naWNhbCxcbiAgICAnJiYnOiAgcGFyc2VMb2dpY2FsLFxuICAgICdvcic6ICBwYXJzZUxvZ2ljYWwsXG4gICAgJ3x8JzogIHBhcnNlTG9naWNhbCxcbiAgICAnaW4nOiBwYXJzZUluXG4gIH07XG5cbiAgZnVuY3Rpb24gcGFyc2VTaWduYWwoc2lnbmFsLCBzaWduYWxzKSB7XG4gICAgdmFyIHMgPSBkbC5maWVsZChzaWduYWwpLFxuICAgICAgICBjb2RlID0gXCJzaWduYWxzW1wiK3MubWFwKGRsLnN0cikuam9pbihcIl1bXCIpK1wiXVwiO1xuICAgIHNpZ25hbHNbcy5zaGlmdCgpXSA9IDE7XG4gICAgcmV0dXJuIGNvZGU7XG4gIH07XG5cbiAgZnVuY3Rpb24gcGFyc2VPcGVyYW5kcyhvcGVyYW5kcykge1xuICAgIHZhciBkZWNsID0gW10sIGRlZnMgPSBbXSxcbiAgICAgICAgc2lnbmFscyA9IHt9LCBkYiA9IHt9O1xuXG4gICAgZGwuYXJyYXkob3BlcmFuZHMpLmZvckVhY2goZnVuY3Rpb24obywgaSkge1xuICAgICAgdmFyIHNpZ25hbCwgbmFtZSA9IFwib1wiK2ksIGRlZiA9IFwiXCI7XG4gICAgICBcbiAgICAgIGlmKG8udmFsdWUgIT09IHVuZGVmaW5lZCkgZGVmID0gZGwuc3RyKG8udmFsdWUpO1xuICAgICAgZWxzZSBpZihvLmFyZykgICAgZGVmID0gXCJhcmdzW1wiK2RsLnN0cihvLmFyZykrXCJdXCI7XG4gICAgICBlbHNlIGlmKG8uc2lnbmFsKSBkZWYgPSBwYXJzZVNpZ25hbChvLnNpZ25hbCwgc2lnbmFscyk7XG4gICAgICBlbHNlIGlmKG8ucHJlZGljYXRlKSB7XG4gICAgICAgIHZhciBwcmVkID0gbW9kZWwucHJlZGljYXRlKG8ucHJlZGljYXRlKTtcbiAgICAgICAgcHJlZC5zaWduYWxzLmZvckVhY2goZnVuY3Rpb24ocykgeyBzaWduYWxzW3NdID0gMTsgfSk7XG4gICAgICAgIHByZWQuZGF0YS5mb3JFYWNoKGZ1bmN0aW9uKGQpIHsgZGJbZF0gPSAxIH0pO1xuXG4gICAgICAgIGRsLmtleXMoby5pbnB1dCkuZm9yRWFjaChmdW5jdGlvbihrKSB7XG4gICAgICAgICAgdmFyIGkgPSBvLmlucHV0W2tdLCBzaWduYWw7XG4gICAgICAgICAgZGVmICs9IFwiYXJnc1tcIitkbC5zdHIoaykrXCJdID0gXCI7XG4gICAgICAgICAgaWYoaS5zaWduYWwpICAgZGVmICs9IHBhcnNlU2lnbmFsKGkuc2lnbmFsLCBzaWduYWxzKTtcbiAgICAgICAgICBlbHNlIGlmKGkuYXJnKSBkZWYgKz0gXCJhcmdzW1wiK2RsLnN0cihpLmFyZykrXCJdXCI7XG4gICAgICAgICAgZGVmKz1cIiwgXCI7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRlZis9IFwicHJlZGljYXRlc1tcIitkbC5zdHIoby5wcmVkaWNhdGUpK1wiXShhcmdzLCBkYiwgc2lnbmFscywgcHJlZGljYXRlcylcIjtcbiAgICAgIH1cblxuICAgICAgZGVjbC5wdXNoKG5hbWUpO1xuICAgICAgZGVmcy5wdXNoKG5hbWUrXCI9KFwiK2RlZitcIilcIik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgY29kZTogXCJ2YXIgXCIgKyBkZWNsLmpvaW4oXCIsIFwiKSArIFwiO1xcblwiICsgZGVmcy5qb2luKFwiO1xcblwiKSArIFwiO1xcblwiLFxuICAgICAgc2lnbmFsczogZGwua2V5cyhzaWduYWxzKSxcbiAgICAgIGRhdGE6IGRsLmtleXMoZGIpXG4gICAgfVxuICB9O1xuXG4gIGZ1bmN0aW9uIHBhcnNlQ29tcGFyYXRvcihzcGVjKSB7XG4gICAgdmFyIG9wcyA9IHBhcnNlT3BlcmFuZHMoc3BlYy5vcGVyYW5kcyk7XG4gICAgaWYoc3BlYy50eXBlID09ICc9Jykgc3BlYy50eXBlID0gJz09JztcblxuICAgIHJldHVybiB7XG4gICAgICBjb2RlOiBvcHMuY29kZSArIFwicmV0dXJuIFwiICsgW1wibzBcIiwgXCJvMVwiXS5qb2luKHNwZWMudHlwZSkgKyBcIjtcIixcbiAgICAgIHNpZ25hbHM6IG9wcy5zaWduYWxzLFxuICAgICAgZGF0YTogb3BzLmRhdGFcbiAgICB9O1xuICB9O1xuXG4gIGZ1bmN0aW9uIHBhcnNlTG9naWNhbChzcGVjKSB7XG4gICAgdmFyIG9wcyA9IHBhcnNlT3BlcmFuZHMoc3BlYy5vcGVyYW5kcyksXG4gICAgICAgIG8gPSBbXSwgaSA9IDAsIGxlbiA9IHNwZWMub3BlcmFuZHMubGVuZ3RoO1xuXG4gICAgd2hpbGUoby5wdXNoKFwib1wiK2krKyk8bGVuKTtcbiAgICBpZihzcGVjLnR5cGUgPT0gJ2FuZCcpIHNwZWMudHlwZSA9ICcmJic7XG4gICAgZWxzZSBpZihzcGVjLnR5cGUgPT0gJ29yJykgc3BlYy50eXBlID0gJ3x8JztcblxuICAgIHJldHVybiB7XG4gICAgICBjb2RlOiBvcHMuY29kZSArIFwicmV0dXJuIFwiICsgby5qb2luKHNwZWMudHlwZSkgKyBcIjtcIixcbiAgICAgIHNpZ25hbHM6IG9wcy5zaWduYWxzLFxuICAgICAgZGF0YTogb3BzLmRhdGFcbiAgICB9O1xuICB9O1xuXG4gIGZ1bmN0aW9uIHBhcnNlSW4oc3BlYykge1xuICAgIHZhciBvID0gW3NwZWMuaXRlbV07XG4gICAgaWYoc3BlYy5yYW5nZSkgby5wdXNoLmFwcGx5KG8sIHNwZWMucmFuZ2UpO1xuICAgIGlmKHNwZWMuc2NhbGUpIG8ucHVzaChzcGVjLnNjYWxlKTtcblxuICAgIHZhciBvcHMgPSBwYXJzZU9wZXJhbmRzKG8pLFxuICAgICAgICBjb2RlID0gb3BzLmNvZGU7XG5cbiAgICBpZihzcGVjLmRhdGEpIHtcbiAgICAgIHZhciBmaWVsZCA9IGRsLmZpZWxkKHNwZWMuZmllbGQpLm1hcChkbC5zdHIpO1xuICAgICAgY29kZSArPSBcInZhciB3aGVyZSA9IGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGRbXCIrZmllbGQuam9pbihcIl1bXCIpK1wiXSA9PSBvMCB9O1xcblwiO1xuICAgICAgY29kZSArPSBcInJldHVybiBkYltcIitkbC5zdHIoc3BlYy5kYXRhKStcIl0uZmlsdGVyKHdoZXJlKS5sZW5ndGggPiAwO1wiO1xuICAgIH0gZWxzZSBpZihzcGVjLnJhbmdlKSB7XG4gICAgICAvLyBUT0RPOiBpbmNsdXNpdmUvZXhjbHVzaXZlIHJhbmdlP1xuICAgICAgLy8gVE9ETzogaW52ZXJ0aW5nIG9yZGluYWwgc2NhbGVzXG4gICAgICBpZihzcGVjLnNjYWxlKSBjb2RlICs9IFwibzEgPSBvMyhvMSk7XFxubzIgPSBvMyhvMik7XFxuXCI7XG4gICAgICBjb2RlICs9IFwicmV0dXJuIG8xIDwgbzIgPyBvMSA8PSBvMCAmJiBvMCA8PSBvMiA6IG8yIDw9IG8wICYmIG8wIDw9IG8xXCI7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGNvZGU6IGNvZGUsIFxuICAgICAgc2lnbmFsczogb3BzLnNpZ25hbHMsIFxuICAgICAgZGF0YTogb3BzLmRhdGEuY29uY2F0KHNwZWMuZGF0YSA/IFtzcGVjLmRhdGFdIDogW10pXG4gICAgfTtcbiAgfTtcblxuICAoc3BlYyB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbihzKSB7XG4gICAgdmFyIHBhcnNlID0gdHlwZXNbcy50eXBlXShzKTtcbiAgICB2YXIgcHJlZCA9IEZ1bmN0aW9uKFwiYXJnc1wiLCBcImRiXCIsIFwic2lnbmFsc1wiLCBcInByZWRpY2F0ZXNcIiwgcGFyc2UuY29kZSk7XG4gICAgcHJlZC5zaWduYWxzID0gcGFyc2Uuc2lnbmFscztcbiAgICBwcmVkLmRhdGEgPSBwYXJzZS5kYXRhO1xuICAgIG1vZGVsLnByZWRpY2F0ZShzLm5hbWUsIHByZWQpO1xuICB9KTtcblxuICByZXR1cm4gc3BlYztcbn0iLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgZDMgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5kMyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuZDMgOiBudWxsKSxcbiAgICB0dXBsZSA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L3R1cGxlJyksXG4gICAgY29uZmlnID0gcmVxdWlyZSgnLi4vdXRpbC9jb25maWcnKTtcblxuZnVuY3Rpb24gY29tcGlsZShtb2RlbCwgbWFyaywgc3BlYykge1xuICB2YXIgY29kZSA9IFwiXCIsXG4gICAgICBuYW1lcyA9IGRsLmtleXMoc3BlYyksXG4gICAgICBpLCBsZW4sIG5hbWUsIHJlZiwgdmFycyA9IHt9LCBcbiAgICAgIGRlcHMgPSB7XG4gICAgICAgIHNpZ25hbHM6IHt9LFxuICAgICAgICBzY2FsZXM6IHt9LFxuICAgICAgICBkYXRhOiB7fVxuICAgICAgfTtcbiAgICAgIFxuICBjb2RlICs9IFwidmFyIG8gPSB0cmFucyA/IHt9IDogaXRlbTtcXG5cIlxuICBcbiAgZm9yIChpPTAsIGxlbj1uYW1lcy5sZW5ndGg7IGk8bGVuOyArK2kpIHtcbiAgICByZWYgPSBzcGVjW25hbWUgPSBuYW1lc1tpXV07XG4gICAgY29kZSArPSAoaSA+IDApID8gXCJcXG4gIFwiIDogXCIgIFwiO1xuICAgIGlmKHJlZi5ydWxlKSB7XG4gICAgICByZWYgPSBydWxlKG1vZGVsLCBuYW1lLCByZWYucnVsZSk7XG4gICAgICBjb2RlICs9IFwiXFxuICBcIiArIHJlZi5jb2RlXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlZiA9IHZhbHVlUmVmKG5hbWUsIHJlZik7XG4gICAgICBjb2RlICs9IFwidGhpcy50cGwuc2V0KG8sIFwiK2RsLnN0cihuYW1lKStcIiwgXCIrcmVmLnZhbCtcIik7XCI7XG4gICAgfVxuXG4gICAgdmFyc1tuYW1lXSA9IHRydWU7XG4gICAgWydzaWduYWxzJywgJ3NjYWxlcycsICdkYXRhJ10uZm9yRWFjaChmdW5jdGlvbihwKSB7XG4gICAgICBpZihyZWZbcF0gIT0gbnVsbCkgZGwuYXJyYXkocmVmW3BdKS5mb3JFYWNoKGZ1bmN0aW9uKGspIHsgZGVwc1twXVtrXSA9IDEgfSk7XG4gICAgfSk7XG4gIH1cblxuICBpZiAodmFycy54Mikge1xuICAgIGlmICh2YXJzLngpIHtcbiAgICAgIGNvZGUgKz0gXCJcXG4gIGlmIChvLnggPiBvLngyKSB7IFwiXG4gICAgICAgICAgICArIFwidmFyIHQgPSBvLng7XCJcbiAgICAgICAgICAgICsgXCJ0aGlzLnRwbC5zZXQobywgJ3gnLCBvLngyKTtcIlxuICAgICAgICAgICAgKyBcInRoaXMudHBsLnNldChvLCAneDInLCB0KTsgXCJcbiAgICAgICAgICAgICsgXCJ9O1wiO1xuICAgICAgY29kZSArPSBcIlxcbiAgdGhpcy50cGwuc2V0KG8sICd3aWR0aCcsIChvLngyIC0gby54KSk7XCI7XG4gICAgfSBlbHNlIGlmICh2YXJzLndpZHRoKSB7XG4gICAgICBjb2RlICs9IFwiXFxuICB0aGlzLnRwbC5zZXQobywgJ3gnLCAoby54MiAtIG8ud2lkdGgpKTtcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29kZSArPSBcIlxcbiAgdGhpcy50cGwuc2V0KG8sICd4Jywgby54Mik7XCJcbiAgICB9XG4gIH1cblxuICBpZiAodmFycy55Mikge1xuICAgIGlmICh2YXJzLnkpIHtcbiAgICAgIGNvZGUgKz0gXCJcXG4gIGlmIChvLnkgPiBvLnkyKSB7IFwiXG4gICAgICAgICAgICArIFwidmFyIHQgPSBvLnk7XCJcbiAgICAgICAgICAgICsgXCJ0aGlzLnRwbC5zZXQobywgJ3knLCBvLnkyKTtcIlxuICAgICAgICAgICAgKyBcInRoaXMudHBsLnNldChvLCAneTInLCB0KTtcIlxuICAgICAgICAgICAgKyBcIn07XCI7XG4gICAgICBjb2RlICs9IFwiXFxuICB0aGlzLnRwbC5zZXQobywgJ2hlaWdodCcsIChvLnkyIC0gby55KSk7XCI7XG4gICAgfSBlbHNlIGlmICh2YXJzLmhlaWdodCkge1xuICAgICAgY29kZSArPSBcIlxcbiAgdGhpcy50cGwuc2V0KG8sICd5JywgKG8ueTIgLSBvLmhlaWdodCkpO1wiO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb2RlICs9IFwiXFxuICB0aGlzLnRwbC5zZXQobywgJ3knLCBvLnkyKTtcIlxuICAgIH1cbiAgfVxuICBcbiAgaWYgKGhhc1BhdGgobWFyaywgdmFycykpIGNvZGUgKz0gXCJcXG4gIGl0ZW0udG91Y2goKTtcIjtcbiAgY29kZSArPSBcIlxcbiAgaWYgKHRyYW5zKSB0cmFucy5pbnRlcnBvbGF0ZShpdGVtLCBvKTtcIjtcblxuICB0cnkge1xuICAgIHZhciBlbmNvZGVyID0gRnVuY3Rpb24oXCJpdGVtXCIsIFwiZ3JvdXBcIiwgXCJ0cmFuc1wiLCBcImRiXCIsIFxuICAgICAgXCJzaWduYWxzXCIsIFwicHJlZGljYXRlc1wiLCBjb2RlKTtcbiAgICBlbmNvZGVyLnRwbCAgPSB0dXBsZTtcbiAgICBlbmNvZGVyLnV0aWwgPSBkbDtcbiAgICBlbmNvZGVyLmQzICAgPSBkMzsgLy8gRm9yIGNvbG9yIHNwYWNlc1xuICAgIHJldHVybiB7XG4gICAgICBlbmNvZGU6IGVuY29kZXIsXG4gICAgICBzaWduYWxzOiBkbC5rZXlzKGRlcHMuc2lnbmFscyksXG4gICAgICBzY2FsZXM6IGRsLmtleXMoZGVwcy5zY2FsZXMpLFxuICAgICAgZGF0YTogZGwua2V5cyhkZXBzLmRhdGEpXG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgZGwuZXJyb3IoZSk7XG4gICAgZGwubG9nKGNvZGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGhhc1BhdGgobWFyaywgdmFycykge1xuICByZXR1cm4gdmFycy5wYXRoIHx8XG4gICAgKChtYXJrPT09XCJhcmVhXCIgfHwgbWFyaz09PVwibGluZVwiKSAmJlxuICAgICAgKHZhcnMueCB8fCB2YXJzLngyIHx8IHZhcnMud2lkdGggfHxcbiAgICAgICB2YXJzLnkgfHwgdmFycy55MiB8fCB2YXJzLmhlaWdodCB8fFxuICAgICAgIHZhcnMudGVuc2lvbiB8fCB2YXJzLmludGVycG9sYXRlKSk7XG59XG5cbnZhciBHUk9VUF9WQVJTID0ge1xuICBcIndpZHRoXCI6IDEsXG4gIFwiaGVpZ2h0XCI6IDEsXG4gIFwibWFyay5ncm91cC53aWR0aFwiOiAxLFxuICBcIm1hcmsuZ3JvdXAuaGVpZ2h0XCI6IDFcbn07XG5cbmZ1bmN0aW9uIHJ1bGUobW9kZWwsIG5hbWUsIHJ1bGVzKSB7XG4gIHZhciBzaWduYWxzID0gW10sIHNjYWxlcyA9IFtdLCBkYiA9IFtdLFxuICAgICAgaW5wdXRzID0gW10sIGNvZGUgPSBcIlwiO1xuXG4gIChydWxlc3x8W10pLmZvckVhY2goZnVuY3Rpb24ociwgaSkge1xuICAgIHZhciBwcmVkTmFtZSA9IHIucHJlZGljYXRlLFxuICAgICAgICBwcmVkID0gbW9kZWwucHJlZGljYXRlKHByZWROYW1lKSxcbiAgICAgICAgaW5wdXQgPSBbXSwgYXJncyA9IG5hbWUrXCJfYXJnXCIraSxcbiAgICAgICAgcmVmO1xuXG4gICAgZGwua2V5cyhyLmlucHV0KS5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciByZWYgPSB2YWx1ZVJlZihpLCByLmlucHV0W2tdKTtcbiAgICAgIGlucHV0LnB1c2goZGwuc3RyKGspK1wiOiBcIityZWYudmFsKTtcbiAgICAgIGlmKHJlZi5zaWduYWxzKSBzaWduYWxzLnB1c2guYXBwbHkoc2lnbmFscywgZGwuYXJyYXkocmVmLnNpZ25hbHMpKTtcbiAgICAgIGlmKHJlZi5zY2FsZXMpICBzY2FsZXMucHVzaC5hcHBseShzY2FsZXMsIGRsLmFycmF5KHJlZi5zY2FsZXMpKTtcbiAgICB9KTtcblxuICAgIHJlZiA9IHZhbHVlUmVmKG5hbWUsIHIpO1xuICAgIGlmKHJlZi5zaWduYWxzKSBzaWduYWxzLnB1c2guYXBwbHkoc2lnbmFscywgZGwuYXJyYXkocmVmLnNpZ25hbHMpKTtcbiAgICBpZihyZWYuc2NhbGVzKSAgc2NhbGVzLnB1c2guYXBwbHkoc2NhbGVzLCBkbC5hcnJheShyZWYuc2NhbGVzKSk7XG5cbiAgICBpZihwcmVkTmFtZSkge1xuICAgICAgc2lnbmFscy5wdXNoLmFwcGx5KHNpZ25hbHMsIHByZWQuc2lnbmFscyk7XG4gICAgICBkYi5wdXNoLmFwcGx5KGRiLCBwcmVkLmRhdGEpO1xuICAgICAgaW5wdXRzLnB1c2goYXJncytcIiA9IHtcIitpbnB1dC5qb2luKCcsICcpK1wifVwiKTtcbiAgICAgIGNvZGUgKz0gXCJpZihwcmVkaWNhdGVzW1wiK2RsLnN0cihwcmVkTmFtZSkrXCJdKFwiK2FyZ3MrXCIsIGRiLCBzaWduYWxzLCBwcmVkaWNhdGVzKSkge1xcblwiICtcbiAgICAgICAgXCIgICAgdGhpcy50cGwuc2V0KG8sIFwiK2RsLnN0cihuYW1lKStcIiwgXCIrcmVmLnZhbCtcIik7XFxuXCI7XG4gICAgICBjb2RlICs9IHJ1bGVzW2krMV0gPyBcIiAgfSBlbHNlIFwiIDogXCIgIH1cIjtcbiAgICB9IGVsc2Uge1xuICAgICAgY29kZSArPSBcIntcXG5cIiArIFxuICAgICAgICBcIiAgICB0aGlzLnRwbC5zZXQobywgXCIrZGwuc3RyKG5hbWUpK1wiLCBcIityZWYudmFsK1wiKTtcXG5cIitcbiAgICAgICAgXCIgIH1cIjtcbiAgICB9XG4gIH0pO1xuXG4gIGNvZGUgPSBcInZhciBcIiArIGlucHV0cy5qb2luKFwiLFxcbiAgICAgIFwiKSArIFwiO1xcbiAgXCIgKyBjb2RlO1xuICByZXR1cm4ge2NvZGU6IGNvZGUsIHNpZ25hbHM6IHNpZ25hbHMsIHNjYWxlczogc2NhbGVzLCBkYXRhOiBkYn07XG59XG5cbmZ1bmN0aW9uIHZhbHVlUmVmKG5hbWUsIHJlZikge1xuICBpZiAocmVmID09IG51bGwpIHJldHVybiBudWxsO1xuICB2YXIgaXNDb2xvciA9IG5hbWU9PT1cImZpbGxcIiB8fCBuYW1lPT09XCJzdHJva2VcIjtcbiAgdmFyIHNpZ25hbHMgPSBbXTtcblxuICBpZiAoaXNDb2xvcikge1xuICAgIGlmIChyZWYuYykge1xuICAgICAgcmV0dXJuIGNvbG9yUmVmKFwiaGNsXCIsIHJlZi5oLCByZWYuYywgcmVmLmwpO1xuICAgIH0gZWxzZSBpZiAocmVmLmggfHwgcmVmLnMpIHtcbiAgICAgIHJldHVybiBjb2xvclJlZihcImhzbFwiLCByZWYuaCwgcmVmLnMsIHJlZi5sKTtcbiAgICB9IGVsc2UgaWYgKHJlZi5sIHx8IHJlZi5hKSB7XG4gICAgICByZXR1cm4gY29sb3JSZWYoXCJsYWJcIiwgcmVmLmwsIHJlZi5hLCByZWYuYik7XG4gICAgfSBlbHNlIGlmIChyZWYuciB8fCByZWYuZyB8fCByZWYuYikge1xuICAgICAgcmV0dXJuIGNvbG9yUmVmKFwicmdiXCIsIHJlZi5yLCByZWYuZywgcmVmLmIpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGluaXRpYWxpemUgdmFsdWVcbiAgdmFyIHZhbCA9IG51bGwsIHNpZ25hbFJlZiA9IG51bGw7XG4gIGlmIChyZWYudmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhbCA9IGRsLnN0cihyZWYudmFsdWUpO1xuICB9XG5cbiAgaWYgKHJlZi5zaWduYWwgIT09IHVuZGVmaW5lZCkge1xuICAgIHNpZ25hbFJlZiA9IGRsLmZpZWxkKHJlZi5zaWduYWwpO1xuICAgIHZhbCA9IFwic2lnbmFsc1tcIitzaWduYWxSZWYubWFwKGRsLnN0cikuam9pbihcIl1bXCIpK1wiXVwiOyBcbiAgICBzaWduYWxzLnB1c2goc2lnbmFsUmVmLnNoaWZ0KCkpO1xuICB9XG5cbiAgLy8gZ2V0IGZpZWxkIHJlZmVyZW5jZSBmb3IgZW5jbG9zaW5nIGdyb3VwXG4gIGlmIChyZWYuZ3JvdXAgIT0gbnVsbCkge1xuICAgIHZhciBncnAgPSBcImdyb3VwLmRhdHVtXCI7XG4gICAgaWYgKGRsLmlzU3RyaW5nKHJlZi5ncm91cCkpIHtcbiAgICAgIGdycCA9IEdST1VQX1ZBUlNbcmVmLmdyb3VwXVxuICAgICAgICA/IFwiZ3JvdXAuXCIgKyByZWYuZ3JvdXBcbiAgICAgICAgOiBcImdyb3VwLmRhdHVtW1wiK2RsLmZpZWxkKHJlZi5ncm91cCkubWFwKGRsLnN0cikuam9pbihcIl1bXCIpK1wiXVwiO1xuICAgIH1cbiAgfVxuXG4gIC8vIGdldCBkYXRhIGZpZWxkIHZhbHVlXG4gIGlmIChyZWYuZmllbGQgIT0gbnVsbCkge1xuICAgIGlmIChkbC5pc1N0cmluZyhyZWYuZmllbGQpKSB7XG4gICAgICB2YWwgPSBcIml0ZW0uZGF0dW1bXCIrZGwuZmllbGQocmVmLmZpZWxkKS5tYXAoZGwuc3RyKS5qb2luKFwiXVtcIikrXCJdXCI7XG4gICAgICBpZiAocmVmLmdyb3VwICE9IG51bGwpIHsgdmFsID0gXCJ0aGlzLnV0aWwuYWNjZXNzb3IoXCIrdmFsK1wiKShcIitncnArXCIpXCI7IH1cbiAgICB9IGVsc2UgaWYocmVmLmZpZWxkLnNpZ25hbCkge1xuICAgICAgc2lnbmFsUmVmID0gZGwuZmllbGQocmVmLmZpZWxkLnNpZ25hbCk7XG4gICAgICB2YWwgPSBcIml0ZW0uZGF0dW1bc2lnbmFsc1tcIitzaWduYWxSZWYubWFwKGRsLnN0cikuam9pbihcIl1bXCIpK1wiXV1cIjtcbiAgICAgIGlmIChyZWYuZ3JvdXAgIT0gbnVsbCkgeyB2YWwgPSBcInRoaXMudXRpbC5hY2Nlc3NvcihcIit2YWwrXCIpKFwiK2dycCtcIilcIjsgfVxuICAgICAgc2lnbmFscy5wdXNoKHNpZ25hbFJlZi5zaGlmdCgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFsID0gXCJ0aGlzLnV0aWwuYWNjZXNzb3IoZ3JvdXAuZGF0dW1bXCJcbiAgICAgICAgICArIGRsLmZpZWxkKHJlZi5maWVsZC5ncm91cCkubWFwKGRsLnN0cikuam9pbihcIl1bXCIpXG4gICAgICAgICAgKyBcIl0pKGl0ZW0uZGF0dW0pXCI7XG4gICAgfVxuICB9IGVsc2UgaWYgKHJlZi5ncm91cCAhPSBudWxsKSB7XG4gICAgdmFsID0gZ3JwO1xuICB9XG5cbiAgaWYgKHJlZi5zY2FsZSAhPSBudWxsKSB7XG4gICAgdmFyIHNjYWxlID0gbnVsbDtcbiAgICBpZihkbC5pc1N0cmluZyhyZWYuc2NhbGUpKSB7XG4gICAgICBzY2FsZSA9IGRsLnN0cihyZWYuc2NhbGUpO1xuICAgIH0gZWxzZSBpZihyZWYuc2NhbGUuc2lnbmFsKSB7XG4gICAgICBzaWduYWxSZWYgPSBkbC5maWVsZChyZWYuc2NhbGUuc2lnbmFsKTtcbiAgICAgIHNjYWxlID0gXCJzaWduYWxzW1wiK3NpZ25hbFJlZi5tYXAoZGwuc3RyKS5qb2luKFwiXVtcIikrXCJdXCI7XG4gICAgICBzaWduYWxzLnB1c2goc2lnbmFsUmVmLnNoaWZ0KCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2FsZSA9IChyZWYuc2NhbGUuZ3JvdXAgPyBcImdyb3VwXCIgOiBcIml0ZW1cIilcbiAgICAgICAgKyBcIi5kYXR1bVtcIiArIGRsLnN0cihyZWYuc2NhbGUuZ3JvdXAgfHwgcmVmLnNjYWxlLmZpZWxkKSArIFwiXVwiO1xuICAgIH1cblxuICAgIHNjYWxlID0gXCJncm91cC5zY2FsZShcIiArIHNjYWxlICsgXCIpXCI7XG4gICAgaWYocmVmLmludmVydCkgc2NhbGUgKz0gXCIuaW52ZXJ0XCI7ICAvLyBUT0RPOiBvcmRpbmFsIHNjYWxlc1xuXG4gICAgLy8gcnVuIHRocm91Z2ggc2NhbGUgZnVuY3Rpb24gaWYgdmFsIHNwZWNpZmllZC5cbiAgICAvLyBpZiBubyB2YWwsIHNjYWxlIGZ1bmN0aW9uIGlzIHByZWRpY2F0ZSBhcmcuXG4gICAgaWYodmFsICE9PSBudWxsIHx8IHJlZi5iYW5kIHx8IHJlZi5tdWx0IHx8IHJlZi5vZmZzZXQpIHtcbiAgICAgIHZhbCA9IHNjYWxlICsgKHJlZi5iYW5kID8gXCIucmFuZ2VCYW5kKClcIiA6IFxuICAgICAgICBcIihcIisodmFsICE9PSBudWxsID8gdmFsIDogXCJpdGVtLmRhdHVtLmRhdGFcIikrXCIpXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWwgPSBzY2FsZTtcbiAgICB9XG4gIH1cbiAgXG4gIC8vIG11bHRpcGx5LCBvZmZzZXQsIHJldHVybiB2YWx1ZVxuICB2YWwgPSBcIihcIiArIChyZWYubXVsdD8oZGwubnVtYmVyKHJlZi5tdWx0KStcIiAqIFwiKTpcIlwiKSArIHZhbCArIFwiKVwiXG4gICAgKyAocmVmLm9mZnNldCA/IFwiICsgXCIgKyBkbC5udW1iZXIocmVmLm9mZnNldCkgOiBcIlwiKTtcbiAgcmV0dXJuIHt2YWw6IHZhbCwgc2lnbmFsczogc2lnbmFscywgc2NhbGVzOiByZWYuc2NhbGV9O1xufVxuXG5mdW5jdGlvbiBjb2xvclJlZih0eXBlLCB4LCB5LCB6KSB7XG4gIHZhciB4eCA9IHggPyB2YWx1ZVJlZihcIlwiLCB4KSA6IGNvbmZpZy5jb2xvclt0eXBlXVswXSxcbiAgICAgIHl5ID0geSA/IHZhbHVlUmVmKFwiXCIsIHkpIDogY29uZmlnLmNvbG9yW3R5cGVdWzFdLFxuICAgICAgenogPSB6ID8gdmFsdWVSZWYoXCJcIiwgeikgOiBjb25maWcuY29sb3JbdHlwZV1bMl1cbiAgICAgIHNpZ25hbHMgPSBbXSwgc2NhbGVzID0gW107XG5cbiAgW3h4LCB5eSwgenpdLmZvckVhY2goZnVuY3Rpb24odikge1xuICAgIGlmKHYuc2lnbmFscykgc2lnbmFscy5wdXNoLmFwcGx5KHNpZ25hbHMsIHYuc2lnbmFscyk7XG4gICAgaWYodi5zY2FsZXMpICBzY2FsZXMucHVzaCh2LnNjYWxlcyk7XG4gIH0pO1xuXG4gIHJldHVybiB7XG4gICAgdmFsOiBcIih0aGlzLmQzLlwiICsgdHlwZSArIFwiKFwiICsgW3h4LnZhbCwgeXkudmFsLCB6ei52YWxdLmpvaW4oXCIsXCIpICsgJykgKyBcIlwiKScsXG4gICAgc2lnbmFsczogc2lnbmFscyxcbiAgICBzY2FsZXM6IHNjYWxlc1xuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNvbXBpbGU7IiwidmFyIGV4cHIgPSByZXF1aXJlKCcuL2V4cHInKSxcbiAgICBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZVNpZ25hbHMobW9kZWwsIHNwZWMpIHtcbiAgdmFyIGdyYXBoID0gbW9kZWwuZ3JhcGg7XG5cbiAgLy8gcHJvY2VzcyBlYWNoIHNpZ25hbCBkZWZpbml0aW9uXG4gIChzcGVjIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uKHMpIHtcbiAgICB2YXIgc2lnbmFsID0gZ3JhcGguc2lnbmFsKHMubmFtZSwgcy5pbml0KSxcbiAgICAgICAgZXhwO1xuXG4gICAgaWYocy5leHByKSB7XG4gICAgICBleHAgPSBleHByKHMuZXhwcik7XG4gICAgICBzaWduYWwuZXZhbHVhdGUgPSBmdW5jdGlvbihpbnB1dCkge1xuICAgICAgICB2YXIgdmFsdWUgPSBleHByLmV2YWwoZ3JhcGgsIGV4cC5mbiwgbnVsbCwgbnVsbCwgbnVsbCwgbnVsbCwgZXhwLnNpZ25hbHMpO1xuICAgICAgICBpZihzcGVjLnNjYWxlKSB2YWx1ZSA9IG1vZGVsLnNjYWxlKHNwZWMsIHZhbHVlKTtcbiAgICAgICAgc2lnbmFsLnZhbHVlKHZhbHVlKTtcbiAgICAgICAgaW5wdXQuc2lnbmFsc1tzLm5hbWVdID0gMTtcbiAgICAgICAgcmV0dXJuIGlucHV0O1xuICAgICAgfTtcbiAgICAgIHNpZ25hbC5kZXBlbmRlbmN5KEMuU0lHTkFMUywgZXhwLnNpZ25hbHMpO1xuICAgICAgZXhwLnNpZ25hbHMuZm9yRWFjaChmdW5jdGlvbihkZXApIHsgZ3JhcGguc2lnbmFsKGRlcCkuYWRkTGlzdGVuZXIoc2lnbmFsKTsgfSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gc3BlYztcbn07IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIE1vZGVsID0gcmVxdWlyZSgnLi4vY29yZS9Nb2RlbCcpLCBcbiAgICBWaWV3ID0gcmVxdWlyZSgnLi4vY29yZS9WaWV3JyksIFxuICAgIHBhcnNlUGFkZGluZyA9IHJlcXVpcmUoJy4uL3BhcnNlL3BhZGRpbmcnKSxcbiAgICBwYXJzZU1hcmtzID0gcmVxdWlyZSgnLi4vcGFyc2UvbWFya3MnKSxcbiAgICBwYXJzZVNpZ25hbHMgPSByZXF1aXJlKCcuLi9wYXJzZS9zaWduYWxzJyksXG4gICAgcGFyc2VQcmVkaWNhdGVzID0gcmVxdWlyZSgnLi4vcGFyc2UvcHJlZGljYXRlcycpLFxuICAgIHBhcnNlRGF0YSA9IHJlcXVpcmUoJy4uL3BhcnNlL2RhdGEnKSxcbiAgICBwYXJzZUludGVyYWN0b3JzID0gcmVxdWlyZSgnLi4vcGFyc2UvaW50ZXJhY3RvcnMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZVNwZWMoc3BlYywgY2FsbGJhY2ssIHZpZXdGYWN0b3J5KSB7XG4gIC8vIHByb3RlY3QgYWdhaW5zdCBzdWJzZXF1ZW50IHNwZWMgbW9kaWZpY2F0aW9uXG4gIHNwZWMgPSBkbC5kdXBsaWNhdGUoc3BlYyk7XG5cbiAgdmlld0ZhY3RvcnkgPSB2aWV3RmFjdG9yeSB8fCBWaWV3LmZhY3Rvcnk7XG5cbiAgdmFyIHdpZHRoID0gc3BlYy53aWR0aCB8fCA1MDAsXG4gICAgICBoZWlnaHQgPSBzcGVjLmhlaWdodCB8fCA1MDAsXG4gICAgICB2aWV3cG9ydCA9IHNwZWMudmlld3BvcnQgfHwgbnVsbCxcbiAgICAgIG1vZGVsID0gbmV3IE1vZGVsKCk7XG5cbiAgcGFyc2VJbnRlcmFjdG9ycyhtb2RlbCwgc3BlYywgZnVuY3Rpb24oKSB7XG4gICAgbW9kZWwuZGVmcyh7XG4gICAgICB3aWR0aDogd2lkdGgsXG4gICAgICBoZWlnaHQ6IGhlaWdodCxcbiAgICAgIHZpZXdwb3J0OiB2aWV3cG9ydCxcbiAgICAgIHBhZGRpbmc6IHBhcnNlUGFkZGluZyhzcGVjLnBhZGRpbmcpLFxuICAgICAgc2lnbmFsczogcGFyc2VTaWduYWxzKG1vZGVsLCBzcGVjLnNpZ25hbHMpLFxuICAgICAgcHJlZGljYXRlczogcGFyc2VQcmVkaWNhdGVzKG1vZGVsLCBzcGVjLnByZWRpY2F0ZXMpLFxuICAgICAgbWFya3M6IHBhcnNlTWFya3MobW9kZWwsIHNwZWMsIHdpZHRoLCBoZWlnaHQpLFxuICAgICAgZGF0YTogcGFyc2VEYXRhKG1vZGVsLCBzcGVjLmRhdGEsIGZ1bmN0aW9uKCkgeyBjYWxsYmFjayh2aWV3RmFjdG9yeShtb2RlbCkpOyB9KVxuICAgIH0pO1xuICB9KTtcbn0iLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgZDMgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5kMyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuZDMgOiBudWxsKSxcbiAgICBOb2RlID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvTm9kZScpLFxuICAgIGNoYW5nc2V0ID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvY2hhbmdlc2V0JyksXG4gICAgc2VsZWN0b3IgPSByZXF1aXJlKCcuL2V2ZW50cycpLFxuICAgIGV4cHIgPSByZXF1aXJlKCcuL2V4cHInKSxcbiAgICBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKTtcblxudmFyIFNUQVJUID0gXCJzdGFydFwiLCBNSURETEUgPSBcIm1pZGRsZVwiLCBFTkQgPSBcImVuZFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZpZXcpIHtcbiAgdmFyIG1vZGVsID0gdmlldy5tb2RlbCgpLFxuICAgICAgZ3JhcGggPSBtb2RlbC5ncmFwaCxcbiAgICAgIHNwZWMgID0gbW9kZWwuZGVmcygpLnNpZ25hbHMsXG4gICAgICByZWdpc3RlciA9IHt9LCBub2RlcyA9IHt9O1xuXG4gIGZ1bmN0aW9uIHNjYWxlKGRlZiwgdmFsdWUsIGl0ZW0pIHtcbiAgICBpZighaXRlbSB8fCAhaXRlbS5zY2FsZSkge1xuICAgICAgaXRlbSA9IChpdGVtICYmIGl0ZW0ubWFyaykgPyBpdGVtLm1hcmsuZ3JvdXAgOiBtb2RlbC5zY2VuZSgpLml0ZW1zWzBdO1xuICAgIH1cblxuICAgIHZhciBzY2FsZSA9IGl0ZW0uc2NhbGUoZGVmLnNjYWxlLnNpZ25hbCB8fCBkZWYuc2NhbGUpO1xuICAgIGlmKCFzY2FsZSkgcmV0dXJuIHZhbHVlO1xuICAgIHJldHVybiBkZWYuaW52ZXJ0ID8gc2NhbGUuaW52ZXJ0KHZhbHVlKSA6IHNjYWxlKHZhbHVlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNpZ25hbChzaWcsIHNlbGVjdG9yLCBleHAsIHNwZWMpIHtcbiAgICB2YXIgbiA9IG5ldyBOb2RlKGdyYXBoKSxcbiAgICAgICAgaXRlbSA9IHNwZWMuaXRlbSA/IGdyYXBoLnNpZ25hbChzcGVjLml0ZW0uc2lnbmFsKSA6IG51bGw7XG4gICAgbi5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gICAgICBpZighaW5wdXQuc2lnbmFsc1tzZWxlY3Rvci5zaWduYWxdKSByZXR1cm4gZ3JhcGguZG9Ob3RQcm9wYWdhdGU7XG4gICAgICB2YXIgdmFsID0gZXhwci5ldmFsKGdyYXBoLCBleHAuZm4sIG51bGwsIG51bGwsIG51bGwsIG51bGwsIGV4cC5zaWduYWxzKTtcbiAgICAgIGlmKHNwZWMuc2NhbGUpIHZhbCA9IHNjYWxlKHNwZWMsIHZhbCwgaXRlbSA/IGl0ZW0udmFsdWUoKSA6IG51bGwpO1xuICAgICAgc2lnLnZhbHVlKHZhbCk7XG4gICAgICBpbnB1dC5zaWduYWxzW3NpZy5uYW1lKCldID0gMTtcbiAgICAgIGlucHV0LnJlZmxvdyA9IHRydWU7XG4gICAgICByZXR1cm4gaW5wdXQ7ICBcbiAgICB9O1xuICAgIG4uZGVwZW5kZW5jeShDLlNJR05BTFMsIHNlbGVjdG9yLnNpZ25hbCk7XG4gICAgbi5hZGRMaXN0ZW5lcihzaWcpO1xuICAgIGdyYXBoLnNpZ25hbChzZWxlY3Rvci5zaWduYWwpLmFkZExpc3RlbmVyKG4pO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGV2ZW50KHNpZywgc2VsZWN0b3IsIGV4cCwgc3BlYykge1xuICAgIHZhciBmaWx0ZXJzID0gc2VsZWN0b3IuZmlsdGVycyB8fCBbXSxcbiAgICAgICAgdGFyZ2V0ID0gc2VsZWN0b3IudGFyZ2V0O1xuXG4gICAgaWYodGFyZ2V0KSBmaWx0ZXJzLnB1c2goXCJpLlwiK3RhcmdldC50eXBlK1wiPT1cIitkbC5zdHIodGFyZ2V0LnZhbHVlKSk7XG5cbiAgICByZWdpc3RlcltzZWxlY3Rvci5ldmVudF0gPSByZWdpc3RlcltzZWxlY3Rvci5ldmVudF0gfHwgW107XG4gICAgcmVnaXN0ZXJbc2VsZWN0b3IuZXZlbnRdLnB1c2goe1xuICAgICAgc2lnbmFsOiBzaWcsXG4gICAgICBleHA6IGV4cCxcbiAgICAgIGZpbHRlcnM6IGZpbHRlcnMubWFwKGZ1bmN0aW9uKGYpIHsgcmV0dXJuIGV4cHIoZik7IH0pLFxuICAgICAgc3BlYzogc3BlY1xuICAgIH0pO1xuXG4gICAgbm9kZXNbc2VsZWN0b3IuZXZlbnRdID0gbm9kZXNbc2VsZWN0b3IuZXZlbnRdIHx8IG5ldyBOb2RlKGdyYXBoKTtcbiAgICBub2Rlc1tzZWxlY3Rvci5ldmVudF0uYWRkTGlzdGVuZXIoc2lnKTtcbiAgfTtcblxuICBmdW5jdGlvbiBvcmRlcmVkU3RyZWFtKHNpZywgc2VsZWN0b3IsIGV4cCwgc3BlYykge1xuICAgIHZhciBuYW1lID0gc2lnLm5hbWUoKSwgXG4gICAgICAgIHRydWVGbiA9IGV4cHIoXCJ0cnVlXCIpLFxuICAgICAgICBzID0ge307XG5cbiAgICBzW1NUQVJUXSAgPSBncmFwaC5zaWduYWwobmFtZSArIFNUQVJULCAgZmFsc2UpO1xuICAgIHNbTUlERExFXSA9IGdyYXBoLnNpZ25hbChuYW1lICsgTUlERExFLCBmYWxzZSk7XG4gICAgc1tFTkRdICAgID0gZ3JhcGguc2lnbmFsKG5hbWUgKyBFTkQsICAgIGZhbHNlKTtcblxuICAgIHZhciByb3V0ZXIgPSBuZXcgTm9kZShncmFwaCk7XG4gICAgcm91dGVyLmV2YWx1YXRlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgICAgIGlmKHNbU1RBUlRdLnZhbHVlKCkgPT09IHRydWUgJiYgc1tFTkRdLnZhbHVlKCkgPT09IGZhbHNlKSB7XG4gICAgICAgIC8vIFRPRE86IEV4cGFuZCBzZWxlY3RvciBzeW50YXggdG8gYWxsb3cgc3RhcnQvZW5kIHNpZ25hbHMgaW50byBzdHJlYW0uXG4gICAgICAgIC8vIFVudGlsIHRoZW4sIHByZXZlbnQgb2xkIG1pZGRsZXMgZW50ZXJpbmcgc3RyZWFtIG9uIG5ldyBzdGFydC5cbiAgICAgICAgaWYoaW5wdXQuc2lnbmFsc1tuYW1lK1NUQVJUXSkgcmV0dXJuIGdyYXBoLmRvTm90UHJvcGFnYXRlO1xuXG4gICAgICAgIHNpZy52YWx1ZShzW01JRERMRV0udmFsdWUoKSk7XG4gICAgICAgIGlucHV0LnNpZ25hbHNbbmFtZV0gPSAxO1xuICAgICAgICByZXR1cm4gaW5wdXQ7XG4gICAgICB9XG5cbiAgICAgIGlmKHNbRU5EXS52YWx1ZSgpID09PSB0cnVlKSB7XG4gICAgICAgIHNbU1RBUlRdLnZhbHVlKGZhbHNlKTtcbiAgICAgICAgc1tFTkRdLnZhbHVlKGZhbHNlKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGdyYXBoLmRvTm90UHJvcGFnYXRlO1xuICAgIH07XG4gICAgcm91dGVyLmFkZExpc3RlbmVyKHNpZyk7XG5cbiAgICBbU1RBUlQsIE1JRERMRSwgRU5EXS5mb3JFYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgIHZhciB2YWwgPSAoeCA9PSBNSURETEUpID8gZXhwIDogdHJ1ZUZuLFxuICAgICAgICAgIHNwID0gKHggPT0gTUlERExFKSA/IHNwZWMgOiB7fTtcblxuICAgICAgaWYoc2VsZWN0b3JbeF0uZXZlbnQpIGV2ZW50KHNbeF0sIHNlbGVjdG9yW3hdLCB2YWwsIHNwKTtcbiAgICAgIGVsc2UgaWYoc2VsZWN0b3JbeF0uc2lnbmFsKSBzaWduYWwoc1t4XSwgc2VsZWN0b3JbeF0sIHZhbCwgc3ApO1xuICAgICAgZWxzZSBpZihzZWxlY3Rvclt4XS5zdHJlYW0pIG1lcmdlZFN0cmVhbShzW3hdLCBzZWxlY3Rvclt4XS5zdHJlYW0sIHZhbCwgc3ApO1xuICAgICAgc1t4XS5hZGRMaXN0ZW5lcihyb3V0ZXIpO1xuICAgIH0pO1xuICB9O1xuXG4gIGZ1bmN0aW9uIG1lcmdlZFN0cmVhbShzaWcsIHNlbGVjdG9yLCBleHAsIHNwZWMpIHtcbiAgICBzZWxlY3Rvci5mb3JFYWNoKGZ1bmN0aW9uKHMpIHtcbiAgICAgIGlmKHMuZXZlbnQpICAgICAgIGV2ZW50KHNpZywgcywgZXhwLCBzcGVjKTtcbiAgICAgIGVsc2UgaWYocy5zaWduYWwpIHNpZ25hbChzaWcsIHMsIGV4cCwgc3BlYyk7XG4gICAgICBlbHNlIGlmKHMuc3RhcnQpICBvcmRlcmVkU3RyZWFtKHNpZywgcywgZXhwLCBzcGVjKTtcbiAgICAgIGVsc2UgaWYocy5zdHJlYW0pIG1lcmdlZFN0cmVhbShzaWcsIHMuc3RyZWFtLCBleHAsIHNwZWMpO1xuICAgIH0pO1xuICB9O1xuXG4gIChzcGVjIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uKHNpZykge1xuICAgIHZhciBzaWduYWwgPSBncmFwaC5zaWduYWwoc2lnLm5hbWUpO1xuICAgIGlmKHNpZy5leHByKSByZXR1cm47ICAvLyBDYW5ub3QgaGF2ZSBhbiBleHByIGFuZCBzdHJlYW0gZGVmaW5pdGlvbi5cblxuICAgIChzaWcuc3RyZWFtcyB8fCBbXSkuZm9yRWFjaChmdW5jdGlvbihzdHJlYW0pIHtcbiAgICAgIHZhciBzZWwgPSBzZWxlY3Rvci5wYXJzZShzdHJlYW0udHlwZSksXG4gICAgICAgICAgZXhwID0gZXhwcihzdHJlYW0uZXhwcik7XG4gICAgICBtZXJnZWRTdHJlYW0oc2lnbmFsLCBzZWwsIGV4cCwgc3RyZWFtKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgLy8gV2UgcmVnaXN0ZXIgdGhlIGV2ZW50IGxpc3RlbmVycyBhbGwgdG9nZXRoZXIgc28gdGhhdCBpZiBtdWx0aXBsZVxuICAvLyBzaWduYWxzIGFyZSByZWdpc3RlcmVkIG9uIHRoZSBzYW1lIGV2ZW50LCB0aGV5IHdpbGwgcmVjZWl2ZSB0aGVcbiAgLy8gbmV3IHZhbHVlIG9uIHRoZSBzYW1lIHB1bHNlLiBcblxuICAvLyBUT0RPOiBGaWx0ZXJzLCB0aW1lIGludGVydmFscywgdGFyZ2V0IHNlbGVjdG9yc1xuICBkbC5rZXlzKHJlZ2lzdGVyKS5mb3JFYWNoKGZ1bmN0aW9uKHIpIHtcbiAgICB2YXIgaGFuZGxlcnMgPSByZWdpc3RlcltyXSwgXG4gICAgICAgIG5vZGUgPSBub2Rlc1tyXTtcblxuICAgIHZpZXcub24ociwgZnVuY3Rpb24oZXZ0LCBpdGVtKSB7XG4gICAgICB2YXIgY3MgPSBjaGFuZ3NldC5jcmVhdGUobnVsbCwgdHJ1ZSksXG4gICAgICAgICAgcGFkID0gdmlldy5wYWRkaW5nKCksXG4gICAgICAgICAgZmlsdGVyZWQgPSBmYWxzZSxcbiAgICAgICAgICB2YWwsIGgsIGksIG0sIGQ7XG5cbiAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpOyAvLyBTdG9wIHRleHQgc2VsZWN0aW9uXG4gICAgICBtID0gZDMubW91c2UoKGQzLmV2ZW50PWV2dCwgdmlldy5fZWwpKTsgLy8gUmVsYXRpdmUgcG9zaXRpb24gd2l0aGluIGNvbnRhaW5lclxuICAgICAgaXRlbSA9IGl0ZW18fHt9O1xuICAgICAgZCA9IGl0ZW0uZGF0dW18fHt9O1xuICAgICAgdmFyIHAgPSB7eDogbVswXSAtIHBhZC5sZWZ0LCB5OiBtWzFdIC0gcGFkLnRvcH07XG5cbiAgICAgIGZvcihpID0gMDsgaSA8IGhhbmRsZXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGggPSBoYW5kbGVyc1tpXTtcbiAgICAgICAgZmlsdGVyZWQgPSBoLmZpbHRlcnMuc29tZShmdW5jdGlvbihmKSB7XG4gICAgICAgICAgcmV0dXJuICFleHByLmV2YWwoZ3JhcGgsIGYuZm4sIGQsIGV2dCwgaXRlbSwgcCwgZi5zaWduYWxzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmKGZpbHRlcmVkKSBjb250aW51ZTtcbiAgICAgICAgXG4gICAgICAgIHZhbCA9IGV4cHIuZXZhbChncmFwaCwgaC5leHAuZm4sIGQsIGV2dCwgaXRlbSwgcCwgaC5leHAuc2lnbmFscyk7IFxuICAgICAgICBpZihoLnNwZWMuc2NhbGUpIHZhbCA9IHNjYWxlKGguc3BlYywgdmFsLCBpdGVtKTtcbiAgICAgICAgaC5zaWduYWwudmFsdWUodmFsKTtcbiAgICAgICAgY3Muc2lnbmFsc1toLnNpZ25hbC5uYW1lKCldID0gMTtcbiAgICAgIH1cblxuICAgICAgZ3JhcGgucHJvcGFnYXRlKGNzLCBub2RlKTtcbiAgICB9KTtcbiAgfSlcbn07IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIHRyYW5zZm9ybXMgPSByZXF1aXJlKCcuLi90cmFuc2Zvcm1zL2luZGV4Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcGFyc2VUcmFuc2Zvcm1zKG1vZGVsLCBkZWYpIHtcbiAgdmFyIHR4ID0gbmV3IHRyYW5zZm9ybXNbZGVmLnR5cGVdKG1vZGVsLmdyYXBoKTtcbiAgaWYoZGVmLnR5cGUgPT0gJ2ZhY2V0Jykge1xuICAgIHZhciBwaXBlbGluZSA9IChkZWYudHJhbnNmb3JtfHxbXSlcbiAgICAgIC5tYXAoZnVuY3Rpb24odCkgeyByZXR1cm4gcGFyc2VUcmFuc2Zvcm1zKG1vZGVsLCB0KTsgfSk7XG4gICAgdHgucGlwZWxpbmUocGlwZWxpbmUpO1xuICB9XG5cbiAgLy8gV2Ugd2FudCB0byByZW5hbWUgb3V0cHV0IGZpZWxkcyBiZWZvcmUgc2V0dGluZyBhbnkgb3RoZXIgcHJvcGVydGllcyxcbiAgLy8gYXMgc3Vic2VxdWVudCBwcm9wZXJ0aWVzIG1heSByZXF1aXJlIG91dHB1dCB0byBiZSBzZXQgKGUuZy4gZ3JvdXAgYnkpLlxuICBpZihkZWYub3V0cHV0KSB0eC5vdXRwdXQoZGVmLm91dHB1dCk7XG5cbiAgZGwua2V5cyhkZWYpLmZvckVhY2goZnVuY3Rpb24oaykge1xuICAgIGlmKGsgPT09ICd0eXBlJyB8fCBrID09PSAnb3V0cHV0JykgcmV0dXJuO1xuICAgIGlmKGsgPT09ICd0cmFuc2Zvcm0nICYmIGRlZi50eXBlID09PSAnZmFjZXQnKSByZXR1cm47XG4gICAgKHR4W2tdKS5zZXQodHgsIGRlZltrXSk7XG4gIH0pO1xuXG4gIHJldHVybiB0eDtcbn07IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIGQzID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuZDMgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmQzIDogbnVsbCksXG4gICAgbWFya3MgPSByZXF1aXJlKCcuL21hcmtzJyk7XG5cbnZhciBoYW5kbGVyID0gZnVuY3Rpb24oZWwsIG1vZGVsKSB7XG4gIHRoaXMuX2FjdGl2ZSA9IG51bGw7XG4gIHRoaXMuX2hhbmRsZXJzID0ge307XG4gIGlmIChlbCkgdGhpcy5pbml0aWFsaXplKGVsKTtcbiAgaWYgKG1vZGVsKSB0aGlzLm1vZGVsKG1vZGVsKTtcbn07XG5cbnZhciBwcm90b3R5cGUgPSBoYW5kbGVyLnByb3RvdHlwZTtcblxucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbihlbCwgcGFkLCBvYmopIHtcbiAgdGhpcy5fZWwgPSBkMy5zZWxlY3QoZWwpLm5vZGUoKTtcbiAgdGhpcy5fY2FudmFzID0gZDMuc2VsZWN0KGVsKS5zZWxlY3QoXCJjYW52YXMubWFya3NcIikubm9kZSgpO1xuICB0aGlzLl9wYWRkaW5nID0gcGFkO1xuICB0aGlzLl9vYmogPSBvYmogfHwgbnVsbDtcbiAgXG4gIC8vIGFkZCBldmVudCBsaXN0ZW5lcnNcbiAgdmFyIGNhbnZhcyA9IHRoaXMuX2NhbnZhcywgdGhhdCA9IHRoaXM7XG4gIGV2ZW50cy5mb3JFYWNoKGZ1bmN0aW9uKHR5cGUpIHtcbiAgICBjYW52YXMuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBmdW5jdGlvbihldnQpIHtcbiAgICAgIHByb3RvdHlwZVt0eXBlXS5jYWxsKHRoYXQsIGV2dCk7XG4gICAgfSk7XG4gIH0pO1xuICBcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90b3R5cGUucGFkZGluZyA9IGZ1bmN0aW9uKHBhZCkge1xuICB0aGlzLl9wYWRkaW5nID0gcGFkO1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvdHlwZS5tb2RlbCA9IGZ1bmN0aW9uKG1vZGVsKSB7XG4gIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX21vZGVsO1xuICB0aGlzLl9tb2RlbCA9IG1vZGVsO1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvdHlwZS5oYW5kbGVycyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaCA9IHRoaXMuX2hhbmRsZXJzO1xuICByZXR1cm4gZGwua2V5cyhoKS5yZWR1Y2UoZnVuY3Rpb24oYSwgaykge1xuICAgIHJldHVybiBoW2tdLnJlZHVjZShmdW5jdGlvbihhLCB4KSB7IHJldHVybiAoYS5wdXNoKHgpLCBhKTsgfSwgYSk7XG4gIH0sIFtdKTtcbn07XG5cbi8vIHNldHVwIGV2ZW50c1xudmFyIGV2ZW50cyA9IFtcbiAgXCJtb3VzZWRvd25cIixcbiAgXCJtb3VzZXVwXCIsXG4gIFwiY2xpY2tcIixcbiAgXCJkYmxjbGlja1wiLFxuICBcIndoZWVsXCIsXG4gIFwia2V5ZG93blwiLFxuICBcImtleXByZXNzXCIsXG4gIFwia2V5dXBcIixcbiAgXCJtb3VzZXdoZWVsXCIsXG4gIFwidG91Y2hzdGFydFwiXG5dO1xuZXZlbnRzLmZvckVhY2goZnVuY3Rpb24odHlwZSkge1xuICBwcm90b3R5cGVbdHlwZV0gPSBmdW5jdGlvbihldnQpIHtcbiAgICB0aGlzLmZpcmUodHlwZSwgZXZ0KTtcbiAgfTtcbn0pO1xuZXZlbnRzLnB1c2goXCJtb3VzZW1vdmVcIik7XG5ldmVudHMucHVzaChcIm1vdXNlb3V0XCIpO1xuZXZlbnRzLnB1c2goXCJ0b3VjaG1vdmVcIik7XG5ldmVudHMucHVzaChcInRvdWNoZW5kXCIpO1xuXG5mdW5jdGlvbiBldmVudE5hbWUobmFtZSkge1xuICB2YXIgaSA9IG5hbWUuaW5kZXhPZihcIi5cIik7XG4gIHJldHVybiBpIDwgMCA/IG5hbWUgOiBuYW1lLnNsaWNlKDAsaSk7XG59XG5cbnByb3RvdHlwZS50b3VjaG1vdmUgPSBwcm90b3R5cGUubW91c2Vtb3ZlID0gZnVuY3Rpb24oZXZ0KSB7XG4gIHZhciBwYWQgPSB0aGlzLl9wYWRkaW5nLFxuICAgICAgYiA9IGV2dC50YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG4gICAgICB4ID0gZXZ0LmNsaWVudFggLSBiLmxlZnQsXG4gICAgICB5ID0gZXZ0LmNsaWVudFkgLSBiLnRvcCxcbiAgICAgIGEgPSB0aGlzLl9hY3RpdmUsXG4gICAgICBwID0gdGhpcy5waWNrKHRoaXMuX21vZGVsLnNjZW5lKCksIHgsIHksIHgtcGFkLmxlZnQsIHktcGFkLnRvcCk7XG5cbiAgaWYgKHAgPT09IGEpIHtcbiAgICB0aGlzLmZpcmUoXCJtb3VzZW1vdmVcIiwgZXZ0KTtcbiAgICBpZihldnQudHlwZSA9PSBcInRvdWNobW92ZVwiKSB0aGlzLmZpcmUoXCJ0b3VjaG1vdmVcIiwgZXZ0KTtcbiAgICByZXR1cm47XG4gIH0gZWxzZSBpZiAoYSkge1xuICAgIHRoaXMuZmlyZShcIm1vdXNlb3V0XCIsIGV2dCk7XG4gICAgaWYoZXZ0LnR5cGUgPT0gXCJ0b3VjaGVuZFwiKSB0aGlzLmZpcmUoXCJ0b3VjaGVuZFwiLCBldnQpO1xuICB9XG4gIHRoaXMuX2FjdGl2ZSA9IHA7XG4gIGlmIChwKSB7XG4gICAgdGhpcy5maXJlKFwibW91c2VvdmVyXCIsIGV2dCk7XG4gICAgaWYoZXZ0LnR5cGUgPT0gXCJ0b3VjaHN0YXJ0XCIpIHRoaXMuZmlyZShcInRvdWNoc3RhcnRcIiwgZXZ0KTtcbiAgfVxufTtcblxucHJvdG90eXBlLnRvdWNoZW5kID0gcHJvdG90eXBlLm1vdXNlb3V0ID0gZnVuY3Rpb24oZXZ0KSB7XG4gIGlmICh0aGlzLl9hY3RpdmUpIHtcbiAgICB0aGlzLmZpcmUoXCJtb3VzZW91dFwiLCBldnQpO1xuICAgIHRoaXMuZmlyZShcInRvdWNoZW5kXCIsIGV2dCk7XG4gIH1cbiAgdGhpcy5fYWN0aXZlID0gbnVsbDtcbn07XG5cbi8vIHRvIGtlZXAgZmlyZWZveCBoYXBweVxucHJvdG90eXBlLkRPTU1vdXNlU2Nyb2xsID0gZnVuY3Rpb24oZXZ0KSB7XG4gIHRoaXMuZmlyZShcIm1vdXNld2hlZWxcIiwgZXZ0KTtcbn07XG5cbi8vIGZpcmUgYW4gZXZlbnRcbnByb3RvdHlwZS5maXJlID0gZnVuY3Rpb24odHlwZSwgZXZ0KSB7XG4gIHZhciBhID0gdGhpcy5fYWN0aXZlLFxuICAgICAgaCA9IHRoaXMuX2hhbmRsZXJzW3R5cGVdO1xuICBpZiAoaCkge1xuICAgIGZvciAodmFyIGk9MCwgbGVuPWgubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgICBoW2ldLmhhbmRsZXIuY2FsbCh0aGlzLl9vYmosIGV2dCwgYSk7XG4gICAgfVxuICB9XG59O1xuXG4vLyBhZGQgYW4gZXZlbnQgaGFuZGxlclxucHJvdG90eXBlLm9uID0gZnVuY3Rpb24odHlwZSwgaGFuZGxlcikge1xuICB2YXIgbmFtZSA9IGV2ZW50TmFtZSh0eXBlKSxcbiAgICAgIGggPSB0aGlzLl9oYW5kbGVycztcbiAgaCA9IGhbbmFtZV0gfHwgKGhbbmFtZV0gPSBbXSk7XG4gIGgucHVzaCh7XG4gICAgdHlwZTogdHlwZSxcbiAgICBoYW5kbGVyOiBoYW5kbGVyXG4gIH0pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIHJlbW92ZSBhbiBldmVudCBoYW5kbGVyXG5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgaGFuZGxlcikge1xuICB2YXIgbmFtZSA9IGV2ZW50TmFtZSh0eXBlKSxcbiAgICAgIGggPSB0aGlzLl9oYW5kbGVyc1tuYW1lXTtcbiAgaWYgKCFoKSByZXR1cm47XG4gIGZvciAodmFyIGk9aC5sZW5ndGg7IC0taT49MDspIHtcbiAgICBpZiAoaFtpXS50eXBlICE9PSB0eXBlKSBjb250aW51ZTtcbiAgICBpZiAoIWhhbmRsZXIgfHwgaFtpXS5oYW5kbGVyID09PSBoYW5kbGVyKSBoLnNwbGljZShpLCAxKTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIHJldHJpZXZlIHRoZSBjdXJyZW50IGNhbnZhcyBjb250ZXh0XG5wcm90b3R5cGUuY29udGV4dCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbn07XG5cbi8vIGZpbmQgdGhlIHNjZW5lZ3JhcGggaXRlbSBhdCB0aGUgY3VycmVudCBtb3VzZSBwb3NpdGlvblxuLy8geCwgeSAtLSB0aGUgYWJzb2x1dGUgeCwgeSBtb3VzZSBjb29yZGluYXRlcyBvbiB0aGUgY2FudmFzIGVsZW1lbnRcbi8vIGd4LCBneSAtLSB0aGUgcmVsYXRpdmUgY29vcmRpbmF0ZXMgd2l0aGluIHRoZSBjdXJyZW50IGdyb3VwXG5wcm90b3R5cGUucGljayA9IGZ1bmN0aW9uKHNjZW5lLCB4LCB5LCBneCwgZ3kpIHtcbiAgdmFyIGcgPSB0aGlzLmNvbnRleHQoKSxcbiAgICAgIG1hcmt0eXBlID0gc2NlbmUubWFya3R5cGUsXG4gICAgICBwaWNrZXIgPSBtYXJrcy5waWNrW21hcmt0eXBlXTtcbiAgcmV0dXJuIHBpY2tlci5jYWxsKHRoaXMsIGcsIHNjZW5lLCB4LCB5LCBneCwgZ3kpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBoYW5kbGVyOyIsInZhciBkMyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmQzIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5kMyA6IG51bGwpLFxuICAgIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIEJvdW5kcyA9IHJlcXVpcmUoJy4uLy4uL2NvcmUvQm91bmRzJyksXG4gICAgY29uZmlnID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jb25maWcnKSxcbiAgICBtYXJrcyA9IHJlcXVpcmUoJy4vbWFya3MnKTtcblxudmFyIHJlbmRlcmVyID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMuX2N0eCA9IG51bGw7XG4gIHRoaXMuX2VsID0gbnVsbDtcbiAgdGhpcy5faW1nbG9hZCA9IDA7XG59O1xuXG52YXIgcHJvdG90eXBlID0gcmVuZGVyZXIucHJvdG90eXBlO1xuXG5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGVsLCB3aWR0aCwgaGVpZ2h0LCBwYWQpIHtcbiAgdGhpcy5fZWwgPSBlbDtcbiAgXG4gIGlmICghZWwpIHJldHVybiB0aGlzOyAvLyBlYXJseSBleGl0IGlmIG5vIERPTSBlbGVtZW50XG5cbiAgLy8gc2VsZWN0IGNhbnZhcyBlbGVtZW50XG4gIHZhciBjYW52YXMgPSBkMy5zZWxlY3QoZWwpXG4gICAgLnNlbGVjdEFsbChcImNhbnZhcy5tYXJrc1wiKVxuICAgIC5kYXRhKFsxXSk7XG4gIFxuICAvLyBjcmVhdGUgbmV3IGNhbnZhcyBlbGVtZW50IGlmIG5lZWRlZFxuICBjYW52YXMuZW50ZXIoKVxuICAgIC5hcHBlbmQoXCJjYW52YXNcIilcbiAgICAuYXR0cihcImNsYXNzXCIsIFwibWFya3NcIik7XG4gIFxuICAvLyByZW1vdmUgZXh0cmFuZW91cyBjYW52YXMgaWYgbmVlZGVkXG4gIGNhbnZhcy5leGl0KCkucmVtb3ZlKCk7XG4gIFxuICByZXR1cm4gdGhpcy5yZXNpemUod2lkdGgsIGhlaWdodCwgcGFkKTtcbn07XG5cbnByb3RvdHlwZS5yZXNpemUgPSBmdW5jdGlvbih3aWR0aCwgaGVpZ2h0LCBwYWQpIHtcbiAgdGhpcy5fd2lkdGggPSB3aWR0aDtcbiAgdGhpcy5faGVpZ2h0ID0gaGVpZ2h0O1xuICB0aGlzLl9wYWRkaW5nID0gcGFkO1xuICBcbiAgaWYgKHRoaXMuX2VsKSB7XG4gICAgdmFyIGNhbnZhcyA9IGQzLnNlbGVjdCh0aGlzLl9lbCkuc2VsZWN0KFwiY2FudmFzLm1hcmtzXCIpO1xuXG4gICAgLy8gaW5pdGlhbGl6ZSBjYW52YXMgYXR0cmlidXRlc1xuICAgIGNhbnZhc1xuICAgICAgLmF0dHIoXCJ3aWR0aFwiLCB3aWR0aCArIHBhZC5sZWZ0ICsgcGFkLnJpZ2h0KVxuICAgICAgLmF0dHIoXCJoZWlnaHRcIiwgaGVpZ2h0ICsgcGFkLnRvcCArIHBhZC5ib3R0b20pO1xuXG4gICAgLy8gZ2V0IHRoZSBjYW52YXMgZ3JhcGhpY3MgY29udGV4dFxuICAgIHZhciBzO1xuICAgIHRoaXMuX2N0eCA9IGNhbnZhcy5ub2RlKCkuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIHRoaXMuX2N0eC5fcmF0aW8gPSAocyA9IHNjYWxlQ2FudmFzKGNhbnZhcy5ub2RlKCksIHRoaXMuX2N0eCkgfHwgMSk7XG4gICAgdGhpcy5fY3R4LnNldFRyYW5zZm9ybShzLCAwLCAwLCBzLCBzKnBhZC5sZWZ0LCBzKnBhZC50b3ApO1xuICB9XG4gIFxuICBpbml0aWFsaXplTGluZURhc2godGhpcy5fY3R4KTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5mdW5jdGlvbiBzY2FsZUNhbnZhcyhjYW52YXMsIGN0eCkge1xuICAvLyBnZXQgY2FudmFzIHBpeGVsIGRhdGFcbiAgdmFyIGRldmljZVBpeGVsUmF0aW8gPSB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyB8fCAxLFxuICAgICAgYmFja2luZ1N0b3JlUmF0aW8gPSAoXG4gICAgICAgIGN0eC53ZWJraXRCYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8XG4gICAgICAgIGN0eC5tb3pCYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8XG4gICAgICAgIGN0eC5tc0JhY2tpbmdTdG9yZVBpeGVsUmF0aW8gfHxcbiAgICAgICAgY3R4Lm9CYWNraW5nU3RvcmVQaXhlbFJhdGlvIHx8XG4gICAgICAgIGN0eC5iYWNraW5nU3RvcmVQaXhlbFJhdGlvKSB8fCAxLFxuICAgICAgcmF0aW8gPSBkZXZpY2VQaXhlbFJhdGlvIC8gYmFja2luZ1N0b3JlUmF0aW87XG5cbiAgaWYgKGRldmljZVBpeGVsUmF0aW8gIT09IGJhY2tpbmdTdG9yZVJhdGlvKSB7XG4gICAgdmFyIHcgPSBjYW52YXMud2lkdGgsIGggPSBjYW52YXMuaGVpZ2h0O1xuICAgIC8vIHNldCBhY3R1YWwgYW5kIHZpc2libGUgY2FudmFzIHNpemVcbiAgICBjYW52YXMuc2V0QXR0cmlidXRlKFwid2lkdGhcIiwgdyAqIHJhdGlvKTtcbiAgICBjYW52YXMuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIGggKiByYXRpbyk7XG4gICAgY2FudmFzLnN0eWxlLndpZHRoID0gdyArICdweCc7XG4gICAgY2FudmFzLnN0eWxlLmhlaWdodCA9IGggKyAncHgnO1xuICB9XG4gIHJldHVybiByYXRpbztcbn1cblxuZnVuY3Rpb24gaW5pdGlhbGl6ZUxpbmVEYXNoKGN0eCkge1xuICBpZiAoY3R4LnZnTGluZURhc2gpIHJldHVybjsgLy8gYWxyZWFkeSBzZXRcblxuICB2YXIgTk9EQVNIID0gW107XG4gIGlmIChjdHguc2V0TGluZURhc2gpIHtcbiAgICBjdHgudmdMaW5lRGFzaCA9IGZ1bmN0aW9uKGRhc2gpIHsgdGhpcy5zZXRMaW5lRGFzaChkYXNoIHx8IE5PREFTSCk7IH07XG4gICAgY3R4LnZnTGluZURhc2hPZmZzZXQgPSBmdW5jdGlvbihvZmYpIHsgdGhpcy5saW5lRGFzaE9mZnNldCA9IG9mZjsgfTtcbiAgfSBlbHNlIGlmIChjdHgud2Via2l0TGluZURhc2ggIT09IHVuZGVmaW5lZCkge1xuICBcdGN0eC52Z0xpbmVEYXNoID0gZnVuY3Rpb24oZGFzaCkgeyB0aGlzLndlYmtpdExpbmVEYXNoID0gZGFzaCB8fCBOT0RBU0g7IH07XG4gICAgY3R4LnZnTGluZURhc2hPZmZzZXQgPSBmdW5jdGlvbihvZmYpIHsgdGhpcy53ZWJraXRMaW5lRGFzaE9mZnNldCA9IG9mZjsgfTtcbiAgfSBlbHNlIGlmIChjdHgubW96RGFzaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY3R4LnZnTGluZURhc2ggPSBmdW5jdGlvbihkYXNoKSB7IHRoaXMubW96RGFzaCA9IGRhc2g7IH07XG4gICAgY3R4LnZnTGluZURhc2hPZmZzZXQgPSBmdW5jdGlvbihvZmYpIHsgLyogdW5zdXBwb3J0ZWQgKi8gfTtcbiAgfSBlbHNlIHtcbiAgICBjdHgudmdMaW5lRGFzaCA9IGZ1bmN0aW9uKGRhc2gpIHsgLyogdW5zdXBwb3J0ZWQgKi8gfTtcbiAgICBjdHgudmdMaW5lRGFzaE9mZnNldCA9IGZ1bmN0aW9uKG9mZikgeyAvKiB1bnN1cHBvcnRlZCAqLyB9O1xuICB9XG59XG5cbnByb3RvdHlwZS5jb250ZXh0ID0gZnVuY3Rpb24oY3R4KSB7XG4gIGlmIChjdHgpIHsgdGhpcy5fY3R4ID0gY3R4OyByZXR1cm4gdGhpczsgfVxuICBlbHNlIHJldHVybiB0aGlzLl9jdHg7XG59O1xuXG5wcm90b3R5cGUuZWxlbWVudCA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5fZWw7XG59O1xuXG5wcm90b3R5cGUucGVuZGluZ0ltYWdlcyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5faW1nbG9hZDtcbn07XG5cbmZ1bmN0aW9uIHRyYW5zbGF0ZWRCb3VuZHMoaXRlbSwgYm91bmRzKSB7XG4gIHZhciBiID0gbmV3IEJvdW5kcyhib3VuZHMpO1xuICB3aGlsZSAoKGl0ZW0gPSBpdGVtLm1hcmsuZ3JvdXApICE9IG51bGwpIHtcbiAgICBiLnRyYW5zbGF0ZShpdGVtLnggfHwgMCwgaXRlbS55IHx8IDApO1xuICB9XG4gIHJldHVybiBiO1xufVxuICBcbmZ1bmN0aW9uIGdldEJvdW5kcyhpdGVtcykge1xuICByZXR1cm4gIWl0ZW1zID8gbnVsbCA6XG4gICAgZGwuYXJyYXkoaXRlbXMpLnJlZHVjZShmdW5jdGlvbihiLCBpdGVtKSB7XG4gICAgICByZXR1cm4gYi51bmlvbih0cmFuc2xhdGVkQm91bmRzKGl0ZW0sIGl0ZW0uYm91bmRzKSlcbiAgICAgICAgICAgICAgLnVuaW9uKHRyYW5zbGF0ZWRCb3VuZHMoaXRlbSwgaXRlbVsnYm91bmRzOnByZXYnXSkpO1xuICAgIH0sIG5ldyBCb3VuZHMoKSk7ICBcbn1cblxuZnVuY3Rpb24gc2V0Qm91bmRzKGcsIGJvdW5kcykge1xuICB2YXIgYmJveCA9IG51bGw7XG4gIGlmIChib3VuZHMpIHtcbiAgICBiYm94ID0gKG5ldyBCb3VuZHMoYm91bmRzKSkucm91bmQoKTtcbiAgICBnLmJlZ2luUGF0aCgpO1xuICAgIGcucmVjdChiYm94LngxLCBiYm94LnkxLCBiYm94LndpZHRoKCksIGJib3guaGVpZ2h0KCkpO1xuICAgIGcuY2xpcCgpO1xuICB9XG4gIHJldHVybiBiYm94O1xufVxuXG5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oc2NlbmUsIGl0ZW1zKSB7XG4gIHZhciBnID0gdGhpcy5fY3R4LFxuICAgICAgcGFkID0gdGhpcy5fcGFkZGluZyxcbiAgICAgIHcgPSB0aGlzLl93aWR0aCArIHBhZC5sZWZ0ICsgcGFkLnJpZ2h0LFxuICAgICAgaCA9IHRoaXMuX2hlaWdodCArIHBhZC50b3AgKyBwYWQuYm90dG9tLFxuICAgICAgYmIgPSBudWxsLCBiYjI7XG5cbiAgLy8gc2V0dXBcbiAgdGhpcy5fc2NlbmUgPSBzY2VuZTtcbiAgZy5zYXZlKCk7XG4gIGJiID0gc2V0Qm91bmRzKGcsIGdldEJvdW5kcyhpdGVtcykpO1xuICBnLmNsZWFyUmVjdCgtcGFkLmxlZnQsIC1wYWQudG9wLCB3LCBoKTtcblxuICAvLyByZW5kZXJcbiAgdGhpcy5kcmF3KGcsIHNjZW5lLCBiYik7XG5cbiAgLy8gcmVuZGVyIGFnYWluIHRvIGhhbmRsZSBwb3NzaWJsZSBib3VuZHMgY2hhbmdlXG4gIGlmIChpdGVtcykge1xuICAgIGcucmVzdG9yZSgpO1xuICAgIGcuc2F2ZSgpO1xuICAgIGJiMiA9IHNldEJvdW5kcyhnLCBnZXRCb3VuZHMoaXRlbXMpKTtcbiAgICBpZiAoIWJiLmVuY2xvc2VzKGJiMikpIHtcbiAgICAgIGcuY2xlYXJSZWN0KC1wYWQubGVmdCwgLXBhZC50b3AsIHcsIGgpO1xuICAgICAgdGhpcy5kcmF3KGcsIHNjZW5lLCBiYjIpO1xuICAgIH1cbiAgfVxuICBcbiAgLy8gdGFrZWRvd25cbiAgZy5yZXN0b3JlKCk7XG4gIHRoaXMuX3NjZW5lID0gbnVsbDtcbn07XG5cbnByb3RvdHlwZS5kcmF3ID0gZnVuY3Rpb24oY3R4LCBzY2VuZSwgYm91bmRzKSB7XG4gIHZhciBtYXJrdHlwZSA9IHNjZW5lLm1hcmt0eXBlLFxuICAgICAgcmVuZGVyZXIgPSBtYXJrcy5kcmF3W21hcmt0eXBlXTtcbiAgcmVuZGVyZXIuY2FsbCh0aGlzLCBjdHgsIHNjZW5lLCBib3VuZHMpO1xufTtcblxucHJvdG90eXBlLnJlbmRlckFzeW5jID0gZnVuY3Rpb24oc2NlbmUpIHtcbiAgLy8gVE9ETyBtYWtlIHNhZmUgZm9yIG11bHRpcGxlIHNjZW5lIHJlbmRlcmluZz9cbiAgdmFyIHJlbmRlcmVyID0gdGhpcztcbiAgaWYgKHJlbmRlcmVyLl9hc3luY19pZCkge1xuICAgIGNsZWFyVGltZW91dChyZW5kZXJlci5fYXN5bmNfaWQpO1xuICB9XG4gIHJlbmRlcmVyLl9hc3luY19pZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgcmVuZGVyZXIucmVuZGVyKHNjZW5lKTtcbiAgICBkZWxldGUgcmVuZGVyZXIuX2FzeW5jX2lkO1xuICB9LCA1MCk7XG59O1xuXG5wcm90b3R5cGUubG9hZEltYWdlID0gZnVuY3Rpb24odXJpKSB7XG4gIHZhciByZW5kZXJlciA9IHRoaXMsXG4gICAgICBzY2VuZSA9IHJlbmRlcmVyLl9zY2VuZSxcbiAgICAgIGltYWdlID0gbnVsbCwgdXJsO1xuXG4gIHJlbmRlcmVyLl9pbWdsb2FkICs9IDE7XG4gIGlmIChkbC5pc05vZGUpIHtcbiAgICBpbWFnZSA9IG5ldyAoKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuY2FudmFzIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5jYW52YXMgOiBudWxsKS5JbWFnZSkoKTtcbiAgICBkbC5sb2FkKGRsLmV4dGVuZCh7dXJsOiB1cml9LCBjb25maWcubG9hZCksIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuICAgICAgaWYgKGVycikgeyBkbC5lcnJvcihlcnIpOyByZXR1cm47IH1cbiAgICAgIGltYWdlLnNyYyA9IGRhdGE7XG4gICAgICBpbWFnZS5sb2FkZWQgPSB0cnVlO1xuICAgICAgcmVuZGVyZXIuX2ltZ2xvYWQgLT0gMTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuICAgIHVybCA9IGNvbmZpZy5iYXNlVVJMICsgdXJpO1xuICAgIGltYWdlLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xuICAgICAgaW1hZ2UubG9hZGVkID0gdHJ1ZTtcbiAgICAgIHJlbmRlcmVyLl9pbWdsb2FkIC09IDE7XG4gICAgICByZW5kZXJlci5yZW5kZXJBc3luYyhzY2VuZSk7XG4gICAgfTtcbiAgICBpbWFnZS5zcmMgPSB1cmw7XG4gIH1cblxuICByZXR1cm4gaW1hZ2U7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlbmRlcmVyOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBIYW5kbGVyOiAgcmVxdWlyZSgnLi9IYW5kbGVyJyksXG4gIFJlbmRlcmVyOiByZXF1aXJlKCcuL1JlbmRlcmVyJylcbn07IiwidmFyIEJvdW5kcyA9IHJlcXVpcmUoJy4uLy4uL2NvcmUvQm91bmRzJyksXG4gICAgYm91bmRzQ2FsYyA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvYm91bmRzJyksXG4gICAgY29uZmlnID0gcmVxdWlyZSgnLi4vLi4vdXRpbC9jb25maWcnKSxcbiAgICBwYXRoID0gcmVxdWlyZSgnLi9wYXRoJyk7XG5cbnZhciBwYXJzZVBhdGggPSBwYXRoLnBhcnNlLFxuICAgIHJlbmRlclBhdGggPSBwYXRoLnJlbmRlcixcbiAgICBoYWxmcGkgPSBNYXRoLlBJIC8gMixcbiAgICBzcXJ0MyA9IE1hdGguc3FydCgzKSxcbiAgICB0YW4zMCA9IE1hdGgudGFuKDMwICogTWF0aC5QSSAvIDE4MCksXG4gICAgdG1wQm91bmRzID0gbmV3IEJvdW5kcygpO1xuXG5mdW5jdGlvbiBmb250U3RyaW5nKG8pIHtcbiAgcmV0dXJuIChvLmZvbnRTdHlsZSA/IG8uZm9udFN0eWxlICsgXCIgXCIgOiBcIlwiKVxuICAgICsgKG8uZm9udFZhcmlhbnQgPyBvLmZvbnRWYXJpYW50ICsgXCIgXCIgOiBcIlwiKVxuICAgICsgKG8uZm9udFdlaWdodCA/IG8uZm9udFdlaWdodCArIFwiIFwiIDogXCJcIilcbiAgICArIChvLmZvbnRTaXplICE9IG51bGwgPyBvLmZvbnRTaXplIDogY29uZmlnLnJlbmRlci5mb250U2l6ZSkgKyBcInB4IFwiXG4gICAgKyAoby5mb250IHx8IGNvbmZpZy5yZW5kZXIuZm9udCk7XG59XG5cbi8vIHBhdGggZ2VuZXJhdG9yc1xuXG5mdW5jdGlvbiBhcmNQYXRoKGcsIG8pIHtcbiAgdmFyIHggPSBvLnggfHwgMCxcbiAgICAgIHkgPSBvLnkgfHwgMCxcbiAgICAgIGlyID0gby5pbm5lclJhZGl1cyB8fCAwLFxuICAgICAgb3IgPSBvLm91dGVyUmFkaXVzIHx8IDAsXG4gICAgICBzYSA9IChvLnN0YXJ0QW5nbGUgfHwgMCkgLSBNYXRoLlBJLzIsXG4gICAgICBlYSA9IChvLmVuZEFuZ2xlIHx8IDApIC0gTWF0aC5QSS8yO1xuICBnLmJlZ2luUGF0aCgpO1xuICBpZiAoaXIgPT09IDApIGcubW92ZVRvKHgsIHkpO1xuICBlbHNlIGcuYXJjKHgsIHksIGlyLCBzYSwgZWEsIDApO1xuICBnLmFyYyh4LCB5LCBvciwgZWEsIHNhLCAxKTtcbiAgZy5jbG9zZVBhdGgoKTtcbn1cblxuZnVuY3Rpb24gYXJlYVBhdGgoZywgaXRlbXMpIHtcbiAgdmFyIG8gPSBpdGVtc1swXSxcbiAgICAgIG0gPSBvLm1hcmssXG4gICAgICBwID0gbS5wYXRoQ2FjaGUgfHwgKG0ucGF0aENhY2hlID0gcGFyc2VQYXRoKHBhdGguYXJlYShpdGVtcykpKTtcbiAgcmVuZGVyUGF0aChnLCBwKTtcbn1cblxuZnVuY3Rpb24gbGluZVBhdGgoZywgaXRlbXMpIHtcbiAgdmFyIG8gPSBpdGVtc1swXSxcbiAgICAgIG0gPSBvLm1hcmssXG4gICAgICBwID0gbS5wYXRoQ2FjaGUgfHwgKG0ucGF0aENhY2hlID0gcGFyc2VQYXRoKHBhdGgubGluZShpdGVtcykpKTtcbiAgcmVuZGVyUGF0aChnLCBwKTtcbn1cblxuZnVuY3Rpb24gcGF0aFBhdGgoZywgbykge1xuICBpZiAoby5wYXRoID09IG51bGwpIHJldHVybjtcbiAgdmFyIHAgPSBvLnBhdGhDYWNoZSB8fCAoby5wYXRoQ2FjaGUgPSBwYXJzZVBhdGgoby5wYXRoKSk7XG4gIHJldHVybiByZW5kZXJQYXRoKGcsIHAsIG8ueCwgby55KTtcbn1cblxuZnVuY3Rpb24gc3ltYm9sUGF0aChnLCBvKSB7XG4gIGcuYmVnaW5QYXRoKCk7XG4gIHZhciBzaXplID0gby5zaXplICE9IG51bGwgPyBvLnNpemUgOiAxMDAsXG4gICAgICB4ID0gby54LCB5ID0gby55LCByLCB0LCByeCwgcnk7XG5cbiAgaWYgKG8uc2hhcGUgPT0gbnVsbCB8fCBvLnNoYXBlID09PSBcImNpcmNsZVwiKSB7XG4gICAgciA9IE1hdGguc3FydChzaXplL01hdGguUEkpO1xuICAgIGcuYXJjKHgsIHksIHIsIDAsIDIqTWF0aC5QSSwgMCk7XG4gICAgZy5jbG9zZVBhdGgoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBzd2l0Y2ggKG8uc2hhcGUpIHtcbiAgICBjYXNlIFwiY3Jvc3NcIjpcbiAgICAgIHIgPSBNYXRoLnNxcnQoc2l6ZSAvIDUpIC8gMjtcbiAgICAgIHQgPSAzKnI7XG4gICAgICBnLm1vdmVUbyh4LXQsIHktcik7XG4gICAgICBnLmxpbmVUbyh4LXIsIHktcik7XG4gICAgICBnLmxpbmVUbyh4LXIsIHktdCk7XG4gICAgICBnLmxpbmVUbyh4K3IsIHktdCk7XG4gICAgICBnLmxpbmVUbyh4K3IsIHktcik7XG4gICAgICBnLmxpbmVUbyh4K3QsIHktcik7XG4gICAgICBnLmxpbmVUbyh4K3QsIHkrcik7XG4gICAgICBnLmxpbmVUbyh4K3IsIHkrcik7XG4gICAgICBnLmxpbmVUbyh4K3IsIHkrdCk7XG4gICAgICBnLmxpbmVUbyh4LXIsIHkrdCk7XG4gICAgICBnLmxpbmVUbyh4LXIsIHkrcik7XG4gICAgICBnLmxpbmVUbyh4LXQsIHkrcik7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgXCJkaWFtb25kXCI6XG4gICAgICByeSA9IE1hdGguc3FydChzaXplIC8gKDIgKiB0YW4zMCkpO1xuICAgICAgcnggPSByeSAqIHRhbjMwO1xuICAgICAgZy5tb3ZlVG8oeCwgeS1yeSk7XG4gICAgICBnLmxpbmVUbyh4K3J4LCB5KTtcbiAgICAgIGcubGluZVRvKHgsIHkrcnkpO1xuICAgICAgZy5saW5lVG8oeC1yeCwgeSk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgXCJzcXVhcmVcIjpcbiAgICAgIHQgPSBNYXRoLnNxcnQoc2l6ZSk7XG4gICAgICByID0gdCAvIDI7XG4gICAgICBnLnJlY3QoeC1yLCB5LXIsIHQsIHQpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIFwidHJpYW5nbGUtZG93blwiOlxuICAgICAgcnggPSBNYXRoLnNxcnQoc2l6ZSAvIHNxcnQzKTtcbiAgICAgIHJ5ID0gcnggKiBzcXJ0MyAvIDI7XG4gICAgICBnLm1vdmVUbyh4LCB5K3J5KTtcbiAgICAgIGcubGluZVRvKHgrcngsIHktcnkpO1xuICAgICAgZy5saW5lVG8oeC1yeCwgeS1yeSk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgXCJ0cmlhbmdsZS11cFwiOlxuICAgICAgcnggPSBNYXRoLnNxcnQoc2l6ZSAvIHNxcnQzKTtcbiAgICAgIHJ5ID0gcnggKiBzcXJ0MyAvIDI7XG4gICAgICBnLm1vdmVUbyh4LCB5LXJ5KTtcbiAgICAgIGcubGluZVRvKHgrcngsIHkrcnkpO1xuICAgICAgZy5saW5lVG8oeC1yeCwgeStyeSk7XG4gIH1cbiAgZy5jbG9zZVBhdGgoKTtcbn1cblxuZnVuY3Rpb24gbGluZVN0cm9rZShnLCBpdGVtcykge1xuICB2YXIgbyA9IGl0ZW1zWzBdLFxuICAgICAgbHcgPSBvLnN0cm9rZVdpZHRoLFxuICAgICAgbGMgPSBvLnN0cm9rZUNhcDtcbiAgZy5saW5lV2lkdGggPSBsdyAhPSBudWxsID8gbHcgOiBjb25maWcucmVuZGVyLmxpbmVXaWR0aDtcbiAgZy5saW5lQ2FwICAgPSBsYyAhPSBudWxsID8gbGMgOiBjb25maWcucmVuZGVyLmxpbmVDYXA7XG4gIGxpbmVQYXRoKGcsIGl0ZW1zKTtcbn1cblxuZnVuY3Rpb24gcnVsZVN0cm9rZShnLCBvKSB7XG4gIHZhciB4MSA9IG8ueCB8fCAwLFxuICAgICAgeTEgPSBvLnkgfHwgMCxcbiAgICAgIHgyID0gby54MiAhPSBudWxsID8gby54MiA6IHgxLFxuICAgICAgeTIgPSBvLnkyICE9IG51bGwgPyBvLnkyIDogeTEsXG4gICAgICBsdyA9IG8uc3Ryb2tlV2lkdGgsXG4gICAgICBsYyA9IG8uc3Ryb2tlQ2FwO1xuXG4gIGcubGluZVdpZHRoID0gbHcgIT0gbnVsbCA/IGx3IDogY29uZmlnLnJlbmRlci5saW5lV2lkdGg7XG4gIGcubGluZUNhcCAgID0gbGMgIT0gbnVsbCA/IGxjIDogY29uZmlnLnJlbmRlci5saW5lQ2FwO1xuICBnLmJlZ2luUGF0aCgpO1xuICBnLm1vdmVUbyh4MSwgeTEpO1xuICBnLmxpbmVUbyh4MiwgeTIpO1xufVxuXG4vLyBkcmF3aW5nIGZ1bmN0aW9uc1xuXG5mdW5jdGlvbiBkcmF3UGF0aE9uZShwYXRoLCBnLCBvLCBpdGVtcykge1xuICB2YXIgZmlsbCA9IG8uZmlsbCwgc3Ryb2tlID0gby5zdHJva2UsIG9wYWMsIGxjLCBsdztcblxuICBwYXRoKGcsIGl0ZW1zKTtcblxuICBvcGFjID0gby5vcGFjaXR5ID09IG51bGwgPyAxIDogby5vcGFjaXR5O1xuICBpZiAob3BhYyA9PSAwIHx8ICFmaWxsICYmICFzdHJva2UpIHJldHVybjtcblxuICBpZiAoZmlsbCkge1xuICAgIGcuZ2xvYmFsQWxwaGEgPSBvcGFjICogKG8uZmlsbE9wYWNpdHk9PW51bGwgPyAxIDogby5maWxsT3BhY2l0eSk7XG4gICAgZy5maWxsU3R5bGUgPSBjb2xvcihnLCBvLCBmaWxsKTtcbiAgICBnLmZpbGwoKTtcbiAgfVxuXG4gIGlmIChzdHJva2UpIHtcbiAgICBsdyA9IChsdyA9IG8uc3Ryb2tlV2lkdGgpICE9IG51bGwgPyBsdyA6IGNvbmZpZy5yZW5kZXIubGluZVdpZHRoO1xuICAgIGlmIChsdyA+IDApIHtcbiAgICAgIGcuZ2xvYmFsQWxwaGEgPSBvcGFjICogKG8uc3Ryb2tlT3BhY2l0eT09bnVsbCA/IDEgOiBvLnN0cm9rZU9wYWNpdHkpO1xuICAgICAgZy5zdHJva2VTdHlsZSA9IGNvbG9yKGcsIG8sIHN0cm9rZSk7XG4gICAgICBnLmxpbmVXaWR0aCA9IGx3O1xuICAgICAgZy5saW5lQ2FwID0gKGxjID0gby5zdHJva2VDYXApICE9IG51bGwgPyBsYyA6IGNvbmZpZy5yZW5kZXIubGluZUNhcDtcbiAgICAgIGcudmdMaW5lRGFzaChvLnN0cm9rZURhc2ggfHwgbnVsbCk7XG4gICAgICBnLnZnTGluZURhc2hPZmZzZXQoby5zdHJva2VEYXNoT2Zmc2V0IHx8IDApO1xuICAgICAgZy5zdHJva2UoKTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gZHJhd1BhdGhBbGwocGF0aCwgZywgc2NlbmUsIGJvdW5kcykge1xuICB2YXIgaSwgbGVuLCBpdGVtO1xuICBmb3IgKGk9MCwgbGVuPXNjZW5lLml0ZW1zLmxlbmd0aDsgaTxsZW47ICsraSkge1xuICAgIGl0ZW0gPSBzY2VuZS5pdGVtc1tpXTtcbiAgICBpZiAoYm91bmRzICYmICFib3VuZHMuaW50ZXJzZWN0cyhpdGVtLmJvdW5kcykpXG4gICAgICBjb250aW51ZTsgLy8gYm91bmRzIGNoZWNrXG4gICAgZHJhd1BhdGhPbmUocGF0aCwgZywgaXRlbSwgaXRlbSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZHJhd1JlY3QoZywgc2NlbmUsIGJvdW5kcykge1xuICBpZiAoIXNjZW5lLml0ZW1zLmxlbmd0aCkgcmV0dXJuO1xuICB2YXIgaXRlbXMgPSBzY2VuZS5pdGVtcyxcbiAgICAgIG8sIGZpbGwsIHN0cm9rZSwgb3BhYywgbGMsIGx3LCB4LCB5LCB3LCBoO1xuXG4gIGZvciAodmFyIGk9MCwgbGVuPWl0ZW1zLmxlbmd0aDsgaTxsZW47ICsraSkge1xuICAgIG8gPSBpdGVtc1tpXTtcbiAgICBpZiAoYm91bmRzICYmICFib3VuZHMuaW50ZXJzZWN0cyhvLmJvdW5kcykpXG4gICAgICBjb250aW51ZTsgLy8gYm91bmRzIGNoZWNrXG5cbiAgICB4ID0gby54IHx8IDA7XG4gICAgeSA9IG8ueSB8fCAwO1xuICAgIHcgPSBvLndpZHRoIHx8IDA7XG4gICAgaCA9IG8uaGVpZ2h0IHx8IDA7XG5cbiAgICBvcGFjID0gby5vcGFjaXR5ID09IG51bGwgPyAxIDogby5vcGFjaXR5O1xuICAgIGlmIChvcGFjID09IDApIGNvbnRpbnVlO1xuXG4gICAgaWYgKGZpbGwgPSBvLmZpbGwpIHtcbiAgICAgIGcuZ2xvYmFsQWxwaGEgPSBvcGFjICogKG8uZmlsbE9wYWNpdHk9PW51bGwgPyAxIDogby5maWxsT3BhY2l0eSk7XG4gICAgICBnLmZpbGxTdHlsZSA9IGNvbG9yKGcsIG8sIGZpbGwpO1xuICAgICAgZy5maWxsUmVjdCh4LCB5LCB3LCBoKTtcbiAgICB9XG5cbiAgICBpZiAoc3Ryb2tlID0gby5zdHJva2UpIHtcbiAgICAgIGx3ID0gKGx3ID0gby5zdHJva2VXaWR0aCkgIT0gbnVsbCA/IGx3IDogY29uZmlnLnJlbmRlci5saW5lV2lkdGg7XG4gICAgICBpZiAobHcgPiAwKSB7XG4gICAgICAgIGcuZ2xvYmFsQWxwaGEgPSBvcGFjICogKG8uc3Ryb2tlT3BhY2l0eT09bnVsbCA/IDEgOiBvLnN0cm9rZU9wYWNpdHkpO1xuICAgICAgICBnLnN0cm9rZVN0eWxlID0gY29sb3IoZywgbywgc3Ryb2tlKTtcbiAgICAgICAgZy5saW5lV2lkdGggPSBsdztcbiAgICAgICAgZy5saW5lQ2FwID0gKGxjID0gby5zdHJva2VDYXApICE9IG51bGwgPyBsYyA6IGNvbmZpZy5yZW5kZXIubGluZUNhcDtcbiAgICAgICAgZy52Z0xpbmVEYXNoKG8uc3Ryb2tlRGFzaCB8fCBudWxsKTtcbiAgICAgICAgZy52Z0xpbmVEYXNoT2Zmc2V0KG8uc3Ryb2tlRGFzaE9mZnNldCB8fCAwKTtcbiAgICAgICAgZy5zdHJva2VSZWN0KHgsIHksIHcsIGgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBkcmF3UnVsZShnLCBzY2VuZSwgYm91bmRzKSB7XG4gIGlmICghc2NlbmUuaXRlbXMubGVuZ3RoKSByZXR1cm47XG4gIHZhciBpdGVtcyA9IHNjZW5lLml0ZW1zLFxuICAgICAgbywgc3Ryb2tlLCBvcGFjLCBsYywgbHcsIHgxLCB5MSwgeDIsIHkyO1xuXG4gIGZvciAodmFyIGk9MCwgbGVuPWl0ZW1zLmxlbmd0aDsgaTxsZW47ICsraSkge1xuICAgIG8gPSBpdGVtc1tpXTtcbiAgICBpZiAoYm91bmRzICYmICFib3VuZHMuaW50ZXJzZWN0cyhvLmJvdW5kcykpXG4gICAgICBjb250aW51ZTsgLy8gYm91bmRzIGNoZWNrXG5cbiAgICB4MSA9IG8ueCB8fCAwO1xuICAgIHkxID0gby55IHx8IDA7XG4gICAgeDIgPSBvLngyICE9IG51bGwgPyBvLngyIDogeDE7XG4gICAgeTIgPSBvLnkyICE9IG51bGwgPyBvLnkyIDogeTE7XG5cbiAgICBvcGFjID0gby5vcGFjaXR5ID09IG51bGwgPyAxIDogby5vcGFjaXR5O1xuICAgIGlmIChvcGFjID09IDApIGNvbnRpbnVlO1xuICAgIFxuICAgIGlmIChzdHJva2UgPSBvLnN0cm9rZSkge1xuICAgICAgbHcgPSAobHcgPSBvLnN0cm9rZVdpZHRoKSAhPSBudWxsID8gbHcgOiBjb25maWcucmVuZGVyLmxpbmVXaWR0aDtcbiAgICAgIGlmIChsdyA+IDApIHtcbiAgICAgICAgZy5nbG9iYWxBbHBoYSA9IG9wYWMgKiAoby5zdHJva2VPcGFjaXR5PT1udWxsID8gMSA6IG8uc3Ryb2tlT3BhY2l0eSk7XG4gICAgICAgIGcuc3Ryb2tlU3R5bGUgPSBjb2xvcihnLCBvLCBzdHJva2UpO1xuICAgICAgICBnLmxpbmVXaWR0aCA9IGx3O1xuICAgICAgICBnLmxpbmVDYXAgPSAobGMgPSBvLnN0cm9rZUNhcCkgIT0gbnVsbCA/IGxjIDogY29uZmlnLnJlbmRlci5saW5lQ2FwO1xuICAgICAgICBnLnZnTGluZURhc2goby5zdHJva2VEYXNoIHx8IG51bGwpO1xuICAgICAgICBnLnZnTGluZURhc2hPZmZzZXQoby5zdHJva2VEYXNoT2Zmc2V0IHx8IDApO1xuICAgICAgICBnLmJlZ2luUGF0aCgpO1xuICAgICAgICBnLm1vdmVUbyh4MSwgeTEpO1xuICAgICAgICBnLmxpbmVUbyh4MiwgeTIpO1xuICAgICAgICBnLnN0cm9rZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBkcmF3SW1hZ2UoZywgc2NlbmUsIGJvdW5kcykge1xuICBpZiAoIXNjZW5lLml0ZW1zLmxlbmd0aCkgcmV0dXJuO1xuICB2YXIgcmVuZGVyZXIgPSB0aGlzLFxuICAgICAgaXRlbXMgPSBzY2VuZS5pdGVtcywgbztcblxuICBmb3IgKHZhciBpPTAsIGxlbj1pdGVtcy5sZW5ndGg7IGk8bGVuOyArK2kpIHtcbiAgICBvID0gaXRlbXNbaV07XG4gICAgaWYgKGJvdW5kcyAmJiAhYm91bmRzLmludGVyc2VjdHMoby5ib3VuZHMpKVxuICAgICAgY29udGludWU7IC8vIGJvdW5kcyBjaGVja1xuXG4gICAgaWYgKCEoby5pbWFnZSAmJiBvLmltYWdlLnVybCA9PT0gby51cmwpKSB7XG4gICAgICBvLmltYWdlID0gcmVuZGVyZXIubG9hZEltYWdlKG8udXJsKTtcbiAgICAgIG8uaW1hZ2UudXJsID0gby51cmw7XG4gICAgfVxuXG4gICAgdmFyIHgsIHksIHcsIGgsIG9wYWM7XG4gICAgdyA9IG8ud2lkdGggfHwgKG8uaW1hZ2UgJiYgby5pbWFnZS53aWR0aCkgfHwgMDtcbiAgICBoID0gby5oZWlnaHQgfHwgKG8uaW1hZ2UgJiYgby5pbWFnZS5oZWlnaHQpIHx8IDA7XG4gICAgeCA9IChvLnh8fDApIC0gKG8uYWxpZ24gPT09IFwiY2VudGVyXCJcbiAgICAgID8gdy8yIDogKG8uYWxpZ24gPT09IFwicmlnaHRcIiA/IHcgOiAwKSk7XG4gICAgeSA9IChvLnl8fDApIC0gKG8uYmFzZWxpbmUgPT09IFwibWlkZGxlXCJcbiAgICAgID8gaC8yIDogKG8uYmFzZWxpbmUgPT09IFwiYm90dG9tXCIgPyBoIDogMCkpO1xuXG4gICAgaWYgKG8uaW1hZ2UubG9hZGVkKSB7XG4gICAgICBnLmdsb2JhbEFscGhhID0gKG9wYWMgPSBvLm9wYWNpdHkpICE9IG51bGwgPyBvcGFjIDogMTtcbiAgICAgIGcuZHJhd0ltYWdlKG8uaW1hZ2UsIHgsIHksIHcsIGgpO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBkcmF3VGV4dChnLCBzY2VuZSwgYm91bmRzKSB7XG4gIGlmICghc2NlbmUuaXRlbXMubGVuZ3RoKSByZXR1cm47XG4gIHZhciBpdGVtcyA9IHNjZW5lLml0ZW1zLFxuICAgICAgbywgZmlsbCwgc3Ryb2tlLCBvcGFjLCBsdywgeCwgeSwgciwgdDtcblxuICBmb3IgKHZhciBpPTAsIGxlbj1pdGVtcy5sZW5ndGg7IGk8bGVuOyArK2kpIHtcbiAgICBvID0gaXRlbXNbaV07XG4gICAgaWYgKGJvdW5kcyAmJiAhYm91bmRzLmludGVyc2VjdHMoby5ib3VuZHMpKVxuICAgICAgY29udGludWU7IC8vIGJvdW5kcyBjaGVja1xuXG4gICAgZy5mb250ID0gZm9udFN0cmluZyhvKTtcbiAgICBnLnRleHRBbGlnbiA9IG8uYWxpZ24gfHwgXCJsZWZ0XCI7XG4gICAgZy50ZXh0QmFzZWxpbmUgPSBvLmJhc2VsaW5lIHx8IFwiYWxwaGFiZXRpY1wiO1xuXG4gICAgb3BhYyA9IG8ub3BhY2l0eSA9PSBudWxsID8gMSA6IG8ub3BhY2l0eTtcbiAgICBpZiAob3BhYyA9PSAwKSBjb250aW51ZTtcblxuICAgIHggPSBvLnggfHwgMDtcbiAgICB5ID0gby55IHx8IDA7XG4gICAgaWYgKHIgPSBvLnJhZGl1cykge1xuICAgICAgdCA9IChvLnRoZXRhIHx8IDApIC0gTWF0aC5QSS8yO1xuICAgICAgeCArPSByICogTWF0aC5jb3ModCk7XG4gICAgICB5ICs9IHIgKiBNYXRoLnNpbih0KTtcbiAgICB9XG5cbiAgICBpZiAoby5hbmdsZSkge1xuICAgICAgZy5zYXZlKCk7XG4gICAgICBnLnRyYW5zbGF0ZSh4LCB5KTtcbiAgICAgIGcucm90YXRlKG8uYW5nbGUgKiBNYXRoLlBJLzE4MCk7XG4gICAgICB4ID0gby5keCB8fCAwO1xuICAgICAgeSA9IG8uZHkgfHwgMDtcbiAgICB9IGVsc2Uge1xuICAgICAgeCArPSAoby5keCB8fCAwKTtcbiAgICAgIHkgKz0gKG8uZHkgfHwgMCk7XG4gICAgfVxuXG4gICAgaWYgKGZpbGwgPSBvLmZpbGwpIHtcbiAgICAgIGcuZ2xvYmFsQWxwaGEgPSBvcGFjICogKG8uZmlsbE9wYWNpdHk9PW51bGwgPyAxIDogby5maWxsT3BhY2l0eSk7XG4gICAgICBnLmZpbGxTdHlsZSA9IGNvbG9yKGcsIG8sIGZpbGwpO1xuICAgICAgZy5maWxsVGV4dChvLnRleHQsIHgsIHkpO1xuICAgIH1cblxuICAgIGlmIChzdHJva2UgPSBvLnN0cm9rZSkge1xuICAgICAgbHcgPSAobHcgPSBvLnN0cm9rZVdpZHRoKSAhPSBudWxsID8gbHcgOiAxO1xuICAgICAgaWYgKGx3ID4gMCkge1xuICAgICAgICBnLmdsb2JhbEFscGhhID0gb3BhYyAqIChvLnN0cm9rZU9wYWNpdHk9PW51bGwgPyAxIDogby5zdHJva2VPcGFjaXR5KTtcbiAgICAgICAgZy5zdHJva2VTdHlsZSA9IGNvbG9yKG8sIHN0cm9rZSk7XG4gICAgICAgIGcubGluZVdpZHRoID0gbHc7XG4gICAgICAgIGcuc3Ryb2tlVGV4dChvLnRleHQsIHgsIHkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChvLmFuZ2xlKSBnLnJlc3RvcmUoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBkcmF3QWxsKHBhdGhGdW5jKSB7XG4gIHJldHVybiBmdW5jdGlvbihnLCBzY2VuZSwgYm91bmRzKSB7XG4gICAgZHJhd1BhdGhBbGwocGF0aEZ1bmMsIGcsIHNjZW5lLCBib3VuZHMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRyYXdPbmUocGF0aEZ1bmMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKGcsIHNjZW5lLCBib3VuZHMpIHtcbiAgICBpZiAoIXNjZW5lLml0ZW1zLmxlbmd0aCkgcmV0dXJuO1xuICAgIGlmIChib3VuZHMgJiYgIWJvdW5kcy5pbnRlcnNlY3RzKHNjZW5lLml0ZW1zWzBdLmJvdW5kcykpXG4gICAgICByZXR1cm47IC8vIGJvdW5kcyBjaGVja1xuICAgIGRyYXdQYXRoT25lKHBhdGhGdW5jLCBnLCBzY2VuZS5pdGVtc1swXSwgc2NlbmUuaXRlbXMpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRyYXdHcm91cChnLCBzY2VuZSwgYm91bmRzKSB7XG4gIGlmICghc2NlbmUuaXRlbXMubGVuZ3RoKSByZXR1cm47XG4gIHZhciBpdGVtcyA9IHNjZW5lLml0ZW1zLCBncm91cCwgYXhlcywgbGVnZW5kcyxcbiAgICAgIHJlbmRlcmVyID0gdGhpcywgZ3gsIGd5LCBnYiwgaSwgbiwgaiwgbTtcblxuICBkcmF3UmVjdChnLCBzY2VuZSwgYm91bmRzKTtcblxuICBmb3IgKGk9MCwgbj1pdGVtcy5sZW5ndGg7IGk8bjsgKytpKSB7XG4gICAgZ3JvdXAgPSBpdGVtc1tpXTtcbiAgICBheGVzID0gZ3JvdXAuYXhpc0l0ZW1zIHx8IFtdO1xuICAgIGxlZ2VuZHMgPSBncm91cC5sZWdlbmRJdGVtcyB8fCBbXTtcbiAgICBneCA9IGdyb3VwLnggfHwgMDtcbiAgICBneSA9IGdyb3VwLnkgfHwgMDtcblxuICAgIC8vIHJlbmRlciBncm91cCBjb250ZW50c1xuICAgIGcuc2F2ZSgpO1xuICAgIGcudHJhbnNsYXRlKGd4LCBneSk7XG4gICAgaWYgKGdyb3VwLmNsaXApIHtcbiAgICAgIGcuYmVnaW5QYXRoKCk7XG4gICAgICBnLnJlY3QoMCwgMCwgZ3JvdXAud2lkdGggfHwgMCwgZ3JvdXAuaGVpZ2h0IHx8IDApO1xuICAgICAgZy5jbGlwKCk7XG4gICAgfVxuICAgIFxuICAgIGlmIChib3VuZHMpIGJvdW5kcy50cmFuc2xhdGUoLWd4LCAtZ3kpO1xuICAgIFxuICAgIGZvciAoaj0wLCBtPWF4ZXMubGVuZ3RoOyBqPG07ICsraikge1xuICAgICAgaWYgKGF4ZXNbal0uZGVmLmxheWVyID09PSBcImJhY2tcIikge1xuICAgICAgICByZW5kZXJlci5kcmF3KGcsIGF4ZXNbal0sIGJvdW5kcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoaj0wLCBtPWdyb3VwLml0ZW1zLmxlbmd0aDsgajxtOyArK2opIHtcbiAgICAgIHJlbmRlcmVyLmRyYXcoZywgZ3JvdXAuaXRlbXNbal0sIGJvdW5kcyk7XG4gICAgfVxuICAgIGZvciAoaj0wLCBtPWF4ZXMubGVuZ3RoOyBqPG07ICsraikge1xuICAgICAgaWYgKGF4ZXNbal0uZGVmLmxheWVyICE9PSBcImJhY2tcIikge1xuICAgICAgICByZW5kZXJlci5kcmF3KGcsIGF4ZXNbal0sIGJvdW5kcyk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoaj0wLCBtPWxlZ2VuZHMubGVuZ3RoOyBqPG07ICsraikge1xuICAgICAgcmVuZGVyZXIuZHJhdyhnLCBsZWdlbmRzW2pdLCBib3VuZHMpO1xuICAgIH1cbiAgICBcbiAgICBpZiAoYm91bmRzKSBib3VuZHMudHJhbnNsYXRlKGd4LCBneSk7XG4gICAgZy5yZXN0b3JlKCk7XG4gIH0gICAgXG59XG5cbmZ1bmN0aW9uIGNvbG9yKGcsIG8sIHZhbHVlKSB7XG4gIHJldHVybiAodmFsdWUuaWQpXG4gICAgPyBncmFkaWVudChnLCB2YWx1ZSwgby5ib3VuZHMpXG4gICAgOiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZ3JhZGllbnQoZywgcCwgYikge1xuICB2YXIgdyA9IGIud2lkdGgoKSxcbiAgICAgIGggPSBiLmhlaWdodCgpLFxuICAgICAgeDEgPSBiLngxICsgcC54MSAqIHcsXG4gICAgICB5MSA9IGIueTEgKyBwLnkxICogaCxcbiAgICAgIHgyID0gYi54MSArIHAueDIgKiB3LFxuICAgICAgeTIgPSBiLnkxICsgcC55MiAqIGgsXG4gICAgICBncmFkID0gZy5jcmVhdGVMaW5lYXJHcmFkaWVudCh4MSwgeTEsIHgyLCB5MiksXG4gICAgICBzdG9wID0gcC5zdG9wcyxcbiAgICAgIGksIG47XG5cbiAgZm9yIChpPTAsIG49c3RvcC5sZW5ndGg7IGk8bjsgKytpKSB7XG4gICAgZ3JhZC5hZGRDb2xvclN0b3Aoc3RvcFtpXS5vZmZzZXQsIHN0b3BbaV0uY29sb3IpO1xuICB9XG4gIHJldHVybiBncmFkO1xufVxuXG4vLyBoaXQgdGVzdGluZ1xuXG5mdW5jdGlvbiBwaWNrR3JvdXAoZywgc2NlbmUsIHgsIHksIGd4LCBneSkge1xuICBpZiAoc2NlbmUuaXRlbXMubGVuZ3RoID09PSAwIHx8XG4gICAgICBzY2VuZS5ib3VuZHMgJiYgIXNjZW5lLmJvdW5kcy5jb250YWlucyhneCwgZ3kpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHZhciBpdGVtcyA9IHNjZW5lLml0ZW1zLCBzdWJzY2VuZSwgZ3JvdXAsIGhpdCwgZHgsIGR5LFxuICAgICAgaGFuZGxlciA9IHRoaXMsIGksIGo7XG5cbiAgZm9yIChpPWl0ZW1zLmxlbmd0aDsgLS1pPj0wOykge1xuICAgIGdyb3VwID0gaXRlbXNbaV07XG4gICAgZHggPSBncm91cC54IHx8IDA7XG4gICAgZHkgPSBncm91cC55IHx8IDA7XG5cbiAgICBnLnNhdmUoKTtcbiAgICBnLnRyYW5zbGF0ZShkeCwgZHkpO1xuICAgIGZvciAoaj1ncm91cC5pdGVtcy5sZW5ndGg7IC0taiA+PSAwOykge1xuICAgICAgc3Vic2NlbmUgPSBncm91cC5pdGVtc1tqXTtcbiAgICAgIGlmIChzdWJzY2VuZS5pbnRlcmFjdGl2ZSA9PT0gZmFsc2UpIGNvbnRpbnVlO1xuICAgICAgaGl0ID0gaGFuZGxlci5waWNrKHN1YnNjZW5lLCB4LCB5LCBneC1keCwgZ3ktZHkpO1xuICAgICAgaWYgKGhpdCkge1xuICAgICAgICBnLnJlc3RvcmUoKTtcbiAgICAgICAgcmV0dXJuIGhpdDtcbiAgICAgIH1cbiAgICB9XG4gICAgZy5yZXN0b3JlKCk7XG4gIH1cblxuICByZXR1cm4gc2NlbmUuaW50ZXJhY3RpdmVcbiAgICA/IHBpY2tBbGwoaGl0VGVzdHMuZ3JvdXAsIGcsIHNjZW5lLCB4LCB5LCBneCwgZ3kpXG4gICAgOiBmYWxzZTtcbn1cblxuZnVuY3Rpb24gcGlja0FsbCh0ZXN0LCBnLCBzY2VuZSwgeCwgeSwgZ3gsIGd5KSB7XG4gIGlmICghc2NlbmUuaXRlbXMubGVuZ3RoKSByZXR1cm4gZmFsc2U7XG4gIHZhciBvLCBiLCBpO1xuXG4gIGlmIChnLl9yYXRpbyAhPT0gMSkge1xuICAgIHggKj0gZy5fcmF0aW87XG4gICAgeSAqPSBnLl9yYXRpbztcbiAgfVxuXG4gIGZvciAoaT1zY2VuZS5pdGVtcy5sZW5ndGg7IC0taSA+PSAwOykge1xuICAgIG8gPSBzY2VuZS5pdGVtc1tpXTsgYiA9IG8uYm91bmRzO1xuICAgIC8vIGZpcnN0IGhpdCB0ZXN0IGFnYWluc3QgYm91bmRpbmcgYm94XG4gICAgaWYgKChiICYmICFiLmNvbnRhaW5zKGd4LCBneSkpIHx8ICFiKSBjb250aW51ZTtcbiAgICAvLyBpZiBpbiBib3VuZGluZyBib3gsIHBlcmZvcm0gbW9yZSBjYXJlZnVsIHRlc3RcbiAgICBpZiAodGVzdChnLCBvLCB4LCB5LCBneCwgZ3kpKSByZXR1cm4gbztcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHBpY2tBcmVhKGcsIHNjZW5lLCB4LCB5LCBneCwgZ3kpIHtcbiAgaWYgKCFzY2VuZS5pdGVtcy5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgdmFyIGl0ZW1zID0gc2NlbmUuaXRlbXMsXG4gICAgICBvLCBiLCBpLCBkaSwgZGQsIG9kLCBkeCwgZHk7XG5cbiAgYiA9IGl0ZW1zWzBdLmJvdW5kcztcbiAgaWYgKGIgJiYgIWIuY29udGFpbnMoZ3gsIGd5KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZy5fcmF0aW8gIT09IDEpIHtcbiAgICB4ICo9IGcuX3JhdGlvO1xuICAgIHkgKj0gZy5fcmF0aW87XG4gIH1cbiAgaWYgKCFoaXRUZXN0cy5hcmVhKGcsIGl0ZW1zLCB4LCB5KSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gaXRlbXNbMF07XG59XG5cbmZ1bmN0aW9uIHBpY2tMaW5lKGcsIHNjZW5lLCB4LCB5LCBneCwgZ3kpIHtcbiAgaWYgKCFzY2VuZS5pdGVtcy5sZW5ndGgpIHJldHVybiBmYWxzZTtcbiAgdmFyIGl0ZW1zID0gc2NlbmUuaXRlbXMsXG4gICAgICBvLCBiLCBpLCBkaSwgZGQsIG9kLCBkeCwgZHk7XG5cbiAgYiA9IGl0ZW1zWzBdLmJvdW5kcztcbiAgaWYgKGIgJiYgIWIuY29udGFpbnMoZ3gsIGd5KSkgcmV0dXJuIGZhbHNlO1xuICBpZiAoZy5fcmF0aW8gIT09IDEpIHtcbiAgICB4ICo9IGcuX3JhdGlvO1xuICAgIHkgKj0gZy5fcmF0aW87XG4gIH1cbiAgaWYgKCFoaXRUZXN0cy5saW5lKGcsIGl0ZW1zLCB4LCB5KSkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gaXRlbXNbMF07XG59XG5cbmZ1bmN0aW9uIHBpY2sodGVzdCkge1xuICByZXR1cm4gZnVuY3Rpb24gKGcsIHNjZW5lLCB4LCB5LCBneCwgZ3kpIHtcbiAgICByZXR1cm4gcGlja0FsbCh0ZXN0LCBnLCBzY2VuZSwgeCwgeSwgZ3gsIGd5KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gdGV4dEhpdChnLCBvLCB4LCB5LCBneCwgZ3kpIHtcbiAgaWYgKCFvLmZvbnRTaXplKSByZXR1cm4gZmFsc2U7XG4gIGlmICghby5hbmdsZSkgcmV0dXJuIHRydWU7IC8vIGJvdW5kcyBzdWZmaWNpZW50IGlmIG5vIHJvdGF0aW9uXG5cbiAgdmFyIGIgPSBib3VuZHNDYWxjLnRleHQobywgdG1wQm91bmRzLCB0cnVlKSxcbiAgICAgIGEgPSAtby5hbmdsZSAqIE1hdGguUEkgLyAxODAsXG4gICAgICBjb3MgPSBNYXRoLmNvcyhhKSxcbiAgICAgIHNpbiA9IE1hdGguc2luKGEpLFxuICAgICAgeCA9IG8ueCxcbiAgICAgIHkgPSBvLnksXG4gICAgICBweCA9IGNvcypneCAtIHNpbipneSArICh4IC0geCpjb3MgKyB5KnNpbiksXG4gICAgICBweSA9IHNpbipneCArIGNvcypneSArICh5IC0geCpzaW4gLSB5KmNvcyk7XG5cbiAgcmV0dXJuIGIuY29udGFpbnMocHgsIHB5KTtcbn1cblxudmFyIGhpdFRlc3RzID0ge1xuICB0ZXh0OiAgIHRleHRIaXQsXG4gIHJlY3Q6ICAgZnVuY3Rpb24oZyxvLHgseSkgeyByZXR1cm4gdHJ1ZTsgfSwgLy8gYm91bmRzIHRlc3QgaXMgc3VmZmljaWVudFxuICBpbWFnZTogIGZ1bmN0aW9uKGcsbyx4LHkpIHsgcmV0dXJuIHRydWU7IH0sIC8vIGJvdW5kcyB0ZXN0IGlzIHN1ZmZpY2llbnRcbiAgZ3JvdXA6ICBmdW5jdGlvbihnLG8seCx5KSB7IHJldHVybiBvLmZpbGwgfHwgby5zdHJva2U7IH0sXG4gIHJ1bGU6ICAgZnVuY3Rpb24oZyxvLHgseSkge1xuICAgICAgICAgICAgaWYgKCFnLmlzUG9pbnRJblN0cm9rZSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgcnVsZVN0cm9rZShnLG8pOyByZXR1cm4gZy5pc1BvaW50SW5TdHJva2UoeCx5KTtcbiAgICAgICAgICB9LFxuICBsaW5lOiAgIGZ1bmN0aW9uKGcscyx4LHkpIHtcbiAgICAgICAgICAgIGlmICghZy5pc1BvaW50SW5TdHJva2UpIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIGxpbmVTdHJva2UoZyxzKTsgcmV0dXJuIGcuaXNQb2ludEluU3Ryb2tlKHgseSk7XG4gICAgICAgICAgfSxcbiAgYXJjOiAgICBmdW5jdGlvbihnLG8seCx5KSB7IGFyY1BhdGgoZyxvKTsgIHJldHVybiBnLmlzUG9pbnRJblBhdGgoeCx5KTsgfSxcbiAgYXJlYTogICBmdW5jdGlvbihnLHMseCx5KSB7IGFyZWFQYXRoKGcscyk7IHJldHVybiBnLmlzUG9pbnRJblBhdGgoeCx5KTsgfSxcbiAgcGF0aDogICBmdW5jdGlvbihnLG8seCx5KSB7IHBhdGhQYXRoKGcsbyk7IHJldHVybiBnLmlzUG9pbnRJblBhdGgoeCx5KTsgfSxcbiAgc3ltYm9sOiBmdW5jdGlvbihnLG8seCx5KSB7IHN5bWJvbFBhdGgoZyxvKTsgcmV0dXJuIGcuaXNQb2ludEluUGF0aCh4LHkpOyB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZHJhdzoge1xuICAgIGdyb3VwOiAgIGRyYXdHcm91cCxcbiAgICBhcmVhOiAgICBkcmF3T25lKGFyZWFQYXRoKSxcbiAgICBsaW5lOiAgICBkcmF3T25lKGxpbmVQYXRoKSxcbiAgICBhcmM6ICAgICBkcmF3QWxsKGFyY1BhdGgpLFxuICAgIHBhdGg6ICAgIGRyYXdBbGwocGF0aFBhdGgpLFxuICAgIHN5bWJvbDogIGRyYXdBbGwoc3ltYm9sUGF0aCksXG4gICAgcmVjdDogICAgZHJhd1JlY3QsXG4gICAgcnVsZTogICAgZHJhd1J1bGUsXG4gICAgdGV4dDogICAgZHJhd1RleHQsXG4gICAgaW1hZ2U6ICAgZHJhd0ltYWdlLFxuICAgIGRyYXdPbmU6IGRyYXdPbmUsIC8vIGV4cG9zZSBmb3IgZXh0ZW5zaWJpbGl0eVxuICAgIGRyYXdBbGw6IGRyYXdBbGwgIC8vIGV4cG9zZSBmb3IgZXh0ZW5zaWJpbGl0eVxuICB9LFxuICBwaWNrOiB7XG4gICAgZ3JvdXA6ICAgcGlja0dyb3VwLFxuICAgIGFyZWE6ICAgIHBpY2tBcmVhLFxuICAgIGxpbmU6ICAgIHBpY2tMaW5lLFxuICAgIGFyYzogICAgIHBpY2soaGl0VGVzdHMuYXJjKSxcbiAgICBwYXRoOiAgICBwaWNrKGhpdFRlc3RzLnBhdGgpLFxuICAgIHN5bWJvbDogIHBpY2soaGl0VGVzdHMuc3ltYm9sKSxcbiAgICByZWN0OiAgICBwaWNrKGhpdFRlc3RzLnJlY3QpLFxuICAgIHJ1bGU6ICAgIHBpY2soaGl0VGVzdHMucnVsZSksXG4gICAgdGV4dDogICAgcGljayhoaXRUZXN0cy50ZXh0KSxcbiAgICBpbWFnZTogICBwaWNrKGhpdFRlc3RzLmltYWdlKSxcbiAgICBwaWNrQWxsOiBwaWNrQWxsICAvLyBleHBvc2UgZm9yIGV4dGVuc2liaWxpdHlcbiAgfVxufTsiLCJ2YXIgZDMgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5kMyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuZDMgOiBudWxsKSxcbiAgICBCb3VuZHMgPSByZXF1aXJlKCcuLi8uLi9jb3JlL0JvdW5kcycpO1xuXG4vLyBQYXRoIHBhcnNpbmcgYW5kIHJlbmRlcmluZyBjb2RlIHRha2VuIGZyb20gZmFicmljLmpzIC0tIFRoYW5rcyFcbnZhciBjbWRMZW5ndGggPSB7IG06MiwgbDoyLCBoOjEsIHY6MSwgYzo2LCBzOjQsIHE6NCwgdDoyLCBhOjcgfSxcbiAgICByZSA9IFsvKFtNTEhWQ1NRVEFabWxodmNzcXRhel0pL2csIC8jIyMvLCAvKFxcZCktL2csIC9cXHN8LHwjIyMvXTtcblxuZnVuY3Rpb24gcGFyc2UocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gW10sXG4gICAgICBjdXJyZW50UGF0aCxcbiAgICAgIGNodW5rcyxcbiAgICAgIHBhcnNlZDtcblxuICAvLyBGaXJzdCwgYnJlYWsgcGF0aCBpbnRvIGNvbW1hbmQgc2VxdWVuY2VcbiAgcGF0aCA9IHBhdGguc2xpY2UoKS5yZXBsYWNlKHJlWzBdLCAnIyMjJDEnKS5zcGxpdChyZVsxXSkuc2xpY2UoMSk7XG5cbiAgLy8gTmV4dCwgcGFyc2UgZWFjaCBjb21tYW5kIGluIHR1cm5cbiAgZm9yICh2YXIgaT0wLCBqLCBjaHVua3NQYXJzZWQsIGxlbj1wYXRoLmxlbmd0aDsgaTxsZW47IGkrKykge1xuICAgIGN1cnJlbnRQYXRoID0gcGF0aFtpXTtcbiAgICBjaHVua3MgPSBjdXJyZW50UGF0aC5zbGljZSgxKS50cmltKCkucmVwbGFjZShyZVsyXSwnJDEjIyMtJykuc3BsaXQocmVbM10pO1xuICAgIGNodW5rc1BhcnNlZCA9IFtjdXJyZW50UGF0aC5jaGFyQXQoMCldO1xuXG4gICAgZm9yICh2YXIgaiA9IDAsIGpsZW4gPSBjaHVua3MubGVuZ3RoOyBqIDwgamxlbjsgaisrKSB7XG4gICAgICBwYXJzZWQgPSBwYXJzZUZsb2F0KGNodW5rc1tqXSk7XG4gICAgICBpZiAoIWlzTmFOKHBhcnNlZCkpIHtcbiAgICAgICAgY2h1bmtzUGFyc2VkLnB1c2gocGFyc2VkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgY29tbWFuZCA9IGNodW5rc1BhcnNlZFswXS50b0xvd2VyQ2FzZSgpLFxuICAgICAgICBjb21tYW5kTGVuZ3RoID0gY21kTGVuZ3RoW2NvbW1hbmRdO1xuXG4gICAgaWYgKGNodW5rc1BhcnNlZC5sZW5ndGggLSAxID4gY29tbWFuZExlbmd0aCkge1xuICAgICAgZm9yICh2YXIgayA9IDEsIGtsZW4gPSBjaHVua3NQYXJzZWQubGVuZ3RoOyBrIDwga2xlbjsgayArPSBjb21tYW5kTGVuZ3RoKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKFsgY2h1bmtzUGFyc2VkWzBdIF0uY29uY2F0KGNodW5rc1BhcnNlZC5zbGljZShrLCBrICsgY29tbWFuZExlbmd0aCkpKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXN1bHQucHVzaChjaHVua3NQYXJzZWQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGRyYXdBcmMoZywgeCwgeSwgY29vcmRzLCBib3VuZHMsIGwsIHQpIHtcbiAgdmFyIHJ4ID0gY29vcmRzWzBdO1xuICB2YXIgcnkgPSBjb29yZHNbMV07XG4gIHZhciByb3QgPSBjb29yZHNbMl07XG4gIHZhciBsYXJnZSA9IGNvb3Jkc1szXTtcbiAgdmFyIHN3ZWVwID0gY29vcmRzWzRdO1xuICB2YXIgZXggPSBjb29yZHNbNV07XG4gIHZhciBleSA9IGNvb3Jkc1s2XTtcbiAgdmFyIHNlZ3MgPSBhcmNUb1NlZ21lbnRzKGV4LCBleSwgcngsIHJ5LCBsYXJnZSwgc3dlZXAsIHJvdCwgeCwgeSk7XG4gIGZvciAodmFyIGk9MDsgaTxzZWdzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJleiA9IHNlZ21lbnRUb0Jlemllci5hcHBseShudWxsLCBzZWdzW2ldKTtcbiAgICBnLmJlemllckN1cnZlVG8uYXBwbHkoZywgYmV6KTtcbiAgICBib3VuZHMuYWRkKGJlelswXS1sLCBiZXpbMV0tdCk7XG4gICAgYm91bmRzLmFkZChiZXpbMl0tbCwgYmV6WzNdLXQpO1xuICAgIGJvdW5kcy5hZGQoYmV6WzRdLWwsIGJlels1XS10KTtcbiAgfVxufVxuXG5mdW5jdGlvbiBib3VuZEFyYyh4LCB5LCBjb29yZHMsIGJvdW5kcykge1xuICB2YXIgcnggPSBjb29yZHNbMF07XG4gIHZhciByeSA9IGNvb3Jkc1sxXTtcbiAgdmFyIHJvdCA9IGNvb3Jkc1syXTtcbiAgdmFyIGxhcmdlID0gY29vcmRzWzNdO1xuICB2YXIgc3dlZXAgPSBjb29yZHNbNF07XG4gIHZhciBleCA9IGNvb3Jkc1s1XTtcbiAgdmFyIGV5ID0gY29vcmRzWzZdO1xuICB2YXIgc2VncyA9IGFyY1RvU2VnbWVudHMoZXgsIGV5LCByeCwgcnksIGxhcmdlLCBzd2VlcCwgcm90LCB4LCB5KTtcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ3MubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYmV6ID0gc2VnbWVudFRvQmV6aWVyLmFwcGx5KG51bGwsIHNlZ3NbaV0pO1xuICAgIGJvdW5kcy5hZGQoYmV6WzBdLCBiZXpbMV0pO1xuICAgIGJvdW5kcy5hZGQoYmV6WzJdLCBiZXpbM10pO1xuICAgIGJvdW5kcy5hZGQoYmV6WzRdLCBiZXpbNV0pO1xuICB9XG59XG5cbnZhciBhcmNUb1NlZ21lbnRzQ2FjaGUgPSB7IH0sXG4gICAgc2VnbWVudFRvQmV6aWVyQ2FjaGUgPSB7IH0sXG4gICAgam9pbiA9IEFycmF5LnByb3RvdHlwZS5qb2luLFxuICAgIGFyZ3NTdHI7XG5cbi8vIENvcGllZCBmcm9tIElua3NjYXBlIHN2Z3RvcGRmLCB0aGFua3MhXG5mdW5jdGlvbiBhcmNUb1NlZ21lbnRzKHgsIHksIHJ4LCByeSwgbGFyZ2UsIHN3ZWVwLCByb3RhdGVYLCBveCwgb3kpIHtcbiAgYXJnc1N0ciA9IGpvaW4uY2FsbChhcmd1bWVudHMpO1xuICBpZiAoYXJjVG9TZWdtZW50c0NhY2hlW2FyZ3NTdHJdKSB7XG4gICAgcmV0dXJuIGFyY1RvU2VnbWVudHNDYWNoZVthcmdzU3RyXTtcbiAgfVxuXG4gIHZhciB0aCA9IHJvdGF0ZVggKiAoTWF0aC5QSS8xODApO1xuICB2YXIgc2luX3RoID0gTWF0aC5zaW4odGgpO1xuICB2YXIgY29zX3RoID0gTWF0aC5jb3ModGgpO1xuICByeCA9IE1hdGguYWJzKHJ4KTtcbiAgcnkgPSBNYXRoLmFicyhyeSk7XG4gIHZhciBweCA9IGNvc190aCAqIChveCAtIHgpICogMC41ICsgc2luX3RoICogKG95IC0geSkgKiAwLjU7XG4gIHZhciBweSA9IGNvc190aCAqIChveSAtIHkpICogMC41IC0gc2luX3RoICogKG94IC0geCkgKiAwLjU7XG4gIHZhciBwbCA9IChweCpweCkgLyAocngqcngpICsgKHB5KnB5KSAvIChyeSpyeSk7XG4gIGlmIChwbCA+IDEpIHtcbiAgICBwbCA9IE1hdGguc3FydChwbCk7XG4gICAgcnggKj0gcGw7XG4gICAgcnkgKj0gcGw7XG4gIH1cblxuICB2YXIgYTAwID0gY29zX3RoIC8gcng7XG4gIHZhciBhMDEgPSBzaW5fdGggLyByeDtcbiAgdmFyIGExMCA9ICgtc2luX3RoKSAvIHJ5O1xuICB2YXIgYTExID0gKGNvc190aCkgLyByeTtcbiAgdmFyIHgwID0gYTAwICogb3ggKyBhMDEgKiBveTtcbiAgdmFyIHkwID0gYTEwICogb3ggKyBhMTEgKiBveTtcbiAgdmFyIHgxID0gYTAwICogeCArIGEwMSAqIHk7XG4gIHZhciB5MSA9IGExMCAqIHggKyBhMTEgKiB5O1xuXG4gIHZhciBkID0gKHgxLXgwKSAqICh4MS14MCkgKyAoeTEteTApICogKHkxLXkwKTtcbiAgdmFyIHNmYWN0b3Jfc3EgPSAxIC8gZCAtIDAuMjU7XG4gIGlmIChzZmFjdG9yX3NxIDwgMCkgc2ZhY3Rvcl9zcSA9IDA7XG4gIHZhciBzZmFjdG9yID0gTWF0aC5zcXJ0KHNmYWN0b3Jfc3EpO1xuICBpZiAoc3dlZXAgPT0gbGFyZ2UpIHNmYWN0b3IgPSAtc2ZhY3RvcjtcbiAgdmFyIHhjID0gMC41ICogKHgwICsgeDEpIC0gc2ZhY3RvciAqICh5MS15MCk7XG4gIHZhciB5YyA9IDAuNSAqICh5MCArIHkxKSArIHNmYWN0b3IgKiAoeDEteDApO1xuXG4gIHZhciB0aDAgPSBNYXRoLmF0YW4yKHkwLXljLCB4MC14Yyk7XG4gIHZhciB0aDEgPSBNYXRoLmF0YW4yKHkxLXljLCB4MS14Yyk7XG5cbiAgdmFyIHRoX2FyYyA9IHRoMS10aDA7XG4gIGlmICh0aF9hcmMgPCAwICYmIHN3ZWVwID09IDEpe1xuICAgIHRoX2FyYyArPSAyKk1hdGguUEk7XG4gIH0gZWxzZSBpZiAodGhfYXJjID4gMCAmJiBzd2VlcCA9PSAwKSB7XG4gICAgdGhfYXJjIC09IDIgKiBNYXRoLlBJO1xuICB9XG5cbiAgdmFyIHNlZ21lbnRzID0gTWF0aC5jZWlsKE1hdGguYWJzKHRoX2FyYyAvIChNYXRoLlBJICogMC41ICsgMC4wMDEpKSk7XG4gIHZhciByZXN1bHQgPSBbXTtcbiAgZm9yICh2YXIgaT0wOyBpPHNlZ21lbnRzOyBpKyspIHtcbiAgICB2YXIgdGgyID0gdGgwICsgaSAqIHRoX2FyYyAvIHNlZ21lbnRzO1xuICAgIHZhciB0aDMgPSB0aDAgKyAoaSsxKSAqIHRoX2FyYyAvIHNlZ21lbnRzO1xuICAgIHJlc3VsdFtpXSA9IFt4YywgeWMsIHRoMiwgdGgzLCByeCwgcnksIHNpbl90aCwgY29zX3RoXTtcbiAgfVxuXG4gIHJldHVybiAoYXJjVG9TZWdtZW50c0NhY2hlW2FyZ3NTdHJdID0gcmVzdWx0KTtcbn1cblxuZnVuY3Rpb24gc2VnbWVudFRvQmV6aWVyKGN4LCBjeSwgdGgwLCB0aDEsIHJ4LCByeSwgc2luX3RoLCBjb3NfdGgpIHtcbiAgYXJnc1N0ciA9IGpvaW4uY2FsbChhcmd1bWVudHMpO1xuICBpZiAoc2VnbWVudFRvQmV6aWVyQ2FjaGVbYXJnc1N0cl0pIHtcbiAgICByZXR1cm4gc2VnbWVudFRvQmV6aWVyQ2FjaGVbYXJnc1N0cl07XG4gIH1cblxuICB2YXIgYTAwID0gY29zX3RoICogcng7XG4gIHZhciBhMDEgPSAtc2luX3RoICogcnk7XG4gIHZhciBhMTAgPSBzaW5fdGggKiByeDtcbiAgdmFyIGExMSA9IGNvc190aCAqIHJ5O1xuXG4gIHZhciBjb3NfdGgwID0gTWF0aC5jb3ModGgwKTtcbiAgdmFyIHNpbl90aDAgPSBNYXRoLnNpbih0aDApO1xuICB2YXIgY29zX3RoMSA9IE1hdGguY29zKHRoMSk7XG4gIHZhciBzaW5fdGgxID0gTWF0aC5zaW4odGgxKTtcblxuICB2YXIgdGhfaGFsZiA9IDAuNSAqICh0aDEgLSB0aDApO1xuICB2YXIgc2luX3RoX2gyID0gTWF0aC5zaW4odGhfaGFsZiAqIDAuNSk7XG4gIHZhciB0ID0gKDgvMykgKiBzaW5fdGhfaDIgKiBzaW5fdGhfaDIgLyBNYXRoLnNpbih0aF9oYWxmKTtcbiAgdmFyIHgxID0gY3ggKyBjb3NfdGgwIC0gdCAqIHNpbl90aDA7XG4gIHZhciB5MSA9IGN5ICsgc2luX3RoMCArIHQgKiBjb3NfdGgwO1xuICB2YXIgeDMgPSBjeCArIGNvc190aDE7XG4gIHZhciB5MyA9IGN5ICsgc2luX3RoMTtcbiAgdmFyIHgyID0geDMgKyB0ICogc2luX3RoMTtcbiAgdmFyIHkyID0geTMgLSB0ICogY29zX3RoMTtcblxuICByZXR1cm4gKHNlZ21lbnRUb0JlemllckNhY2hlW2FyZ3NTdHJdID0gW1xuICAgIGEwMCAqIHgxICsgYTAxICogeTEsICBhMTAgKiB4MSArIGExMSAqIHkxLFxuICAgIGEwMCAqIHgyICsgYTAxICogeTIsICBhMTAgKiB4MiArIGExMSAqIHkyLFxuICAgIGEwMCAqIHgzICsgYTAxICogeTMsICBhMTAgKiB4MyArIGExMSAqIHkzXG4gIF0pO1xufVxuXG5mdW5jdGlvbiByZW5kZXIoZywgcGF0aCwgbCwgdCkge1xuICB2YXIgY3VycmVudCwgLy8gY3VycmVudCBpbnN0cnVjdGlvblxuICAgICAgcHJldmlvdXMgPSBudWxsLFxuICAgICAgeCA9IDAsIC8vIGN1cnJlbnQgeFxuICAgICAgeSA9IDAsIC8vIGN1cnJlbnQgeVxuICAgICAgY29udHJvbFggPSAwLCAvLyBjdXJyZW50IGNvbnRyb2wgcG9pbnQgeFxuICAgICAgY29udHJvbFkgPSAwLCAvLyBjdXJyZW50IGNvbnRyb2wgcG9pbnQgeVxuICAgICAgdGVtcFgsXG4gICAgICB0ZW1wWSxcbiAgICAgIHRlbXBDb250cm9sWCxcbiAgICAgIHRlbXBDb250cm9sWSxcbiAgICAgIGJvdW5kcyA9IG5ldyBCb3VuZHMoKTtcbiAgaWYgKGwgPT0gdW5kZWZpbmVkKSBsID0gMDtcbiAgaWYgKHQgPT0gdW5kZWZpbmVkKSB0ID0gMDtcblxuICBnLmJlZ2luUGF0aCgpO1xuXG4gIGZvciAodmFyIGk9MCwgbGVuPXBhdGgubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgY3VycmVudCA9IHBhdGhbaV07XG5cbiAgICBzd2l0Y2ggKGN1cnJlbnRbMF0pIHsgLy8gZmlyc3QgbGV0dGVyXG5cbiAgICAgIGNhc2UgJ2wnOiAvLyBsaW5ldG8sIHJlbGF0aXZlXG4gICAgICAgIHggKz0gY3VycmVudFsxXTtcbiAgICAgICAgeSArPSBjdXJyZW50WzJdO1xuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnTCc6IC8vIGxpbmV0bywgYWJzb2x1dGVcbiAgICAgICAgeCA9IGN1cnJlbnRbMV07XG4gICAgICAgIHkgPSBjdXJyZW50WzJdO1xuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnaCc6IC8vIGhvcml6b250YWwgbGluZXRvLCByZWxhdGl2ZVxuICAgICAgICB4ICs9IGN1cnJlbnRbMV07XG4gICAgICAgIGcubGluZVRvKHggKyBsLCB5ICsgdCk7XG4gICAgICAgIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdIJzogLy8gaG9yaXpvbnRhbCBsaW5ldG8sIGFic29sdXRlXG4gICAgICAgIHggPSBjdXJyZW50WzFdO1xuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndic6IC8vIHZlcnRpY2FsIGxpbmV0bywgcmVsYXRpdmVcbiAgICAgICAgeSArPSBjdXJyZW50WzFdO1xuICAgICAgICBnLmxpbmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnVic6IC8vIHZlcmljYWwgbGluZXRvLCBhYnNvbHV0ZVxuICAgICAgICB5ID0gY3VycmVudFsxXTtcbiAgICAgICAgZy5saW5lVG8oeCArIGwsIHkgKyB0KTtcbiAgICAgICAgYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ20nOiAvLyBtb3ZlVG8sIHJlbGF0aXZlXG4gICAgICAgIHggKz0gY3VycmVudFsxXTtcbiAgICAgICAgeSArPSBjdXJyZW50WzJdO1xuICAgICAgICBnLm1vdmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnTSc6IC8vIG1vdmVUbywgYWJzb2x1dGVcbiAgICAgICAgeCA9IGN1cnJlbnRbMV07XG4gICAgICAgIHkgPSBjdXJyZW50WzJdO1xuICAgICAgICBnLm1vdmVUbyh4ICsgbCwgeSArIHQpO1xuICAgICAgICBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnYyc6IC8vIGJlemllckN1cnZlVG8sIHJlbGF0aXZlXG4gICAgICAgIHRlbXBYID0geCArIGN1cnJlbnRbNV07XG4gICAgICAgIHRlbXBZID0geSArIGN1cnJlbnRbNl07XG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbM107XG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbNF07XG4gICAgICAgIGcuYmV6aWVyQ3VydmVUbyhcbiAgICAgICAgICB4ICsgY3VycmVudFsxXSArIGwsIC8vIHgxXG4gICAgICAgICAgeSArIGN1cnJlbnRbMl0gKyB0LCAvLyB5MVxuICAgICAgICAgIGNvbnRyb2xYICsgbCwgLy8geDJcbiAgICAgICAgICBjb250cm9sWSArIHQsIC8vIHkyXG4gICAgICAgICAgdGVtcFggKyBsLFxuICAgICAgICAgIHRlbXBZICsgdFxuICAgICAgICApO1xuICAgICAgICBib3VuZHMuYWRkKHggKyBjdXJyZW50WzFdLCB5ICsgY3VycmVudFsyXSk7XG4gICAgICAgIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICB4ID0gdGVtcFg7XG4gICAgICAgIHkgPSB0ZW1wWTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ0MnOiAvLyBiZXppZXJDdXJ2ZVRvLCBhYnNvbHV0ZVxuICAgICAgICB4ID0gY3VycmVudFs1XTtcbiAgICAgICAgeSA9IGN1cnJlbnRbNl07XG4gICAgICAgIGNvbnRyb2xYID0gY3VycmVudFszXTtcbiAgICAgICAgY29udHJvbFkgPSBjdXJyZW50WzRdO1xuICAgICAgICBnLmJlemllckN1cnZlVG8oXG4gICAgICAgICAgY3VycmVudFsxXSArIGwsXG4gICAgICAgICAgY3VycmVudFsyXSArIHQsXG4gICAgICAgICAgY29udHJvbFggKyBsLFxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcbiAgICAgICAgICB4ICsgbCxcbiAgICAgICAgICB5ICsgdFxuICAgICAgICApO1xuICAgICAgICBib3VuZHMuYWRkKGN1cnJlbnRbMV0sIGN1cnJlbnRbMl0pO1xuICAgICAgICBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdzJzogLy8gc2hvcnRoYW5kIGN1YmljIGJlemllckN1cnZlVG8sIHJlbGF0aXZlXG4gICAgICAgIC8vIHRyYW5zZm9ybSB0byBhYnNvbHV0ZSB4LHlcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFszXTtcbiAgICAgICAgdGVtcFkgPSB5ICsgY3VycmVudFs0XTtcbiAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHNcbiAgICAgICAgY29udHJvbFggPSAyICogeCAtIGNvbnRyb2xYO1xuICAgICAgICBjb250cm9sWSA9IDIgKiB5IC0gY29udHJvbFk7XG4gICAgICAgIGcuYmV6aWVyQ3VydmVUbyhcbiAgICAgICAgICBjb250cm9sWCArIGwsXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxuICAgICAgICAgIHggKyBjdXJyZW50WzFdICsgbCxcbiAgICAgICAgICB5ICsgY3VycmVudFsyXSArIHQsXG4gICAgICAgICAgdGVtcFggKyBsLFxuICAgICAgICAgIHRlbXBZICsgdFxuICAgICAgICApO1xuICAgICAgICBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIGJvdW5kcy5hZGQoeCArIGN1cnJlbnRbMV0sIHkgKyBjdXJyZW50WzJdKTtcbiAgICAgICAgYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuXG4gICAgICAgIC8vIHNldCBjb250cm9sIHBvaW50IHRvIDJuZCBvbmUgb2YgdGhpcyBjb21tYW5kXG4gICAgICAgIC8vIFwiLi4uIHRoZSBmaXJzdCBjb250cm9sIHBvaW50IGlzIGFzc3VtZWQgdG8gYmUgdGhlIHJlZmxlY3Rpb24gb2YgdGhlIHNlY29uZCBjb250cm9sIHBvaW50IG9uIHRoZSBwcmV2aW91cyBjb21tYW5kIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHBvaW50LlwiXG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XG5cbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdTJzogLy8gc2hvcnRoYW5kIGN1YmljIGJlemllckN1cnZlVG8sIGFic29sdXRlXG4gICAgICAgIHRlbXBYID0gY3VycmVudFszXTtcbiAgICAgICAgdGVtcFkgPSBjdXJyZW50WzRdO1xuICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50c1xuICAgICAgICBjb250cm9sWCA9IDIqeCAtIGNvbnRyb2xYO1xuICAgICAgICBjb250cm9sWSA9IDIqeSAtIGNvbnRyb2xZO1xuICAgICAgICBnLmJlemllckN1cnZlVG8oXG4gICAgICAgICAgY29udHJvbFggKyBsLFxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcbiAgICAgICAgICBjdXJyZW50WzFdICsgbCxcbiAgICAgICAgICBjdXJyZW50WzJdICsgdCxcbiAgICAgICAgICB0ZW1wWCArIGwsXG4gICAgICAgICAgdGVtcFkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICBib3VuZHMuYWRkKGN1cnJlbnRbMV0sIGN1cnJlbnRbMl0pO1xuICAgICAgICBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgLy8gc2V0IGNvbnRyb2wgcG9pbnQgdG8gMm5kIG9uZSBvZiB0aGlzIGNvbW1hbmRcbiAgICAgICAgLy8gXCIuLi4gdGhlIGZpcnN0IGNvbnRyb2wgcG9pbnQgaXMgYXNzdW1lZCB0byBiZSB0aGUgcmVmbGVjdGlvbiBvZiB0aGUgc2Vjb25kIGNvbnRyb2wgcG9pbnQgb24gdGhlIHByZXZpb3VzIGNvbW1hbmQgcmVsYXRpdmUgdG8gdGhlIGN1cnJlbnQgcG9pbnQuXCJcbiAgICAgICAgY29udHJvbFggPSBjdXJyZW50WzFdO1xuICAgICAgICBjb250cm9sWSA9IGN1cnJlbnRbMl07XG5cbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3EnOiAvLyBxdWFkcmF0aWNDdXJ2ZVRvLCByZWxhdGl2ZVxuICAgICAgICAvLyB0cmFuc2Zvcm0gdG8gYWJzb2x1dGUgeCx5XG4gICAgICAgIHRlbXBYID0geCArIGN1cnJlbnRbM107XG4gICAgICAgIHRlbXBZID0geSArIGN1cnJlbnRbNF07XG5cbiAgICAgICAgY29udHJvbFggPSB4ICsgY3VycmVudFsxXTtcbiAgICAgICAgY29udHJvbFkgPSB5ICsgY3VycmVudFsyXTtcblxuICAgICAgICBnLnF1YWRyYXRpY0N1cnZlVG8oXG4gICAgICAgICAgY29udHJvbFggKyBsLFxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcbiAgICAgICAgICB0ZW1wWCArIGwsXG4gICAgICAgICAgdGVtcFkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ1EnOiAvLyBxdWFkcmF0aWNDdXJ2ZVRvLCBhYnNvbHV0ZVxuICAgICAgICB0ZW1wWCA9IGN1cnJlbnRbM107XG4gICAgICAgIHRlbXBZID0gY3VycmVudFs0XTtcblxuICAgICAgICBnLnF1YWRyYXRpY0N1cnZlVG8oXG4gICAgICAgICAgY3VycmVudFsxXSArIGwsXG4gICAgICAgICAgY3VycmVudFsyXSArIHQsXG4gICAgICAgICAgdGVtcFggKyBsLFxuICAgICAgICAgIHRlbXBZICsgdFxuICAgICAgICApO1xuICAgICAgICB4ID0gdGVtcFg7XG4gICAgICAgIHkgPSB0ZW1wWTtcbiAgICAgICAgY29udHJvbFggPSBjdXJyZW50WzFdO1xuICAgICAgICBjb250cm9sWSA9IGN1cnJlbnRbMl07XG4gICAgICAgIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndCc6IC8vIHNob3J0aGFuZCBxdWFkcmF0aWNDdXJ2ZVRvLCByZWxhdGl2ZVxuXG4gICAgICAgIC8vIHRyYW5zZm9ybSB0byBhYnNvbHV0ZSB4LHlcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFsxXTtcbiAgICAgICAgdGVtcFkgPSB5ICsgY3VycmVudFsyXTtcblxuICAgICAgICBpZiAocHJldmlvdXNbMF0ubWF0Y2goL1tRcVR0XS8pID09PSBudWxsKSB7XG4gICAgICAgICAgLy8gSWYgdGhlcmUgaXMgbm8gcHJldmlvdXMgY29tbWFuZCBvciBpZiB0aGUgcHJldmlvdXMgY29tbWFuZCB3YXMgbm90IGEgUSwgcSwgVCBvciB0LFxuICAgICAgICAgIC8vIGFzc3VtZSB0aGUgY29udHJvbCBwb2ludCBpcyBjb2luY2lkZW50IHdpdGggdGhlIGN1cnJlbnQgcG9pbnRcbiAgICAgICAgICBjb250cm9sWCA9IHg7XG4gICAgICAgICAgY29udHJvbFkgPSB5O1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHByZXZpb3VzWzBdID09PSAndCcpIHtcbiAgICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50cyBmb3IgdFxuICAgICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSB0ZW1wQ29udHJvbFg7XG4gICAgICAgICAgY29udHJvbFkgPSAyICogeSAtIHRlbXBDb250cm9sWTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChwcmV2aW91c1swXSA9PT0gJ3EnKSB7XG4gICAgICAgICAgLy8gY2FsY3VsYXRlIHJlZmxlY3Rpb24gb2YgcHJldmlvdXMgY29udHJvbCBwb2ludHMgZm9yIHFcbiAgICAgICAgICBjb250cm9sWCA9IDIgKiB4IC0gY29udHJvbFg7XG4gICAgICAgICAgY29udHJvbFkgPSAyICogeSAtIGNvbnRyb2xZO1xuICAgICAgICB9XG5cbiAgICAgICAgdGVtcENvbnRyb2xYID0gY29udHJvbFg7XG4gICAgICAgIHRlbXBDb250cm9sWSA9IGNvbnRyb2xZO1xuXG4gICAgICAgIGcucXVhZHJhdGljQ3VydmVUbyhcbiAgICAgICAgICBjb250cm9sWCArIGwsXG4gICAgICAgICAgY29udHJvbFkgKyB0LFxuICAgICAgICAgIHRlbXBYICsgbCxcbiAgICAgICAgICB0ZW1wWSArIHRcbiAgICAgICAgKTtcbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XG4gICAgICAgIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnVCc6XG4gICAgICAgIHRlbXBYID0gY3VycmVudFsxXTtcbiAgICAgICAgdGVtcFkgPSBjdXJyZW50WzJdO1xuXG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzXG4gICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSBjb250cm9sWDtcbiAgICAgICAgY29udHJvbFkgPSAyICogeSAtIGNvbnRyb2xZO1xuICAgICAgICBnLnF1YWRyYXRpY0N1cnZlVG8oXG4gICAgICAgICAgY29udHJvbFggKyBsLFxuICAgICAgICAgIGNvbnRyb2xZICsgdCxcbiAgICAgICAgICB0ZW1wWCArIGwsXG4gICAgICAgICAgdGVtcFkgKyB0XG4gICAgICAgICk7XG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2EnOlxuICAgICAgICBkcmF3QXJjKGcsIHggKyBsLCB5ICsgdCwgW1xuICAgICAgICAgIGN1cnJlbnRbMV0sXG4gICAgICAgICAgY3VycmVudFsyXSxcbiAgICAgICAgICBjdXJyZW50WzNdLFxuICAgICAgICAgIGN1cnJlbnRbNF0sXG4gICAgICAgICAgY3VycmVudFs1XSxcbiAgICAgICAgICBjdXJyZW50WzZdICsgeCArIGwsXG4gICAgICAgICAgY3VycmVudFs3XSArIHkgKyB0XG4gICAgICAgIF0sIGJvdW5kcywgbCwgdCk7XG4gICAgICAgIHggKz0gY3VycmVudFs2XTtcbiAgICAgICAgeSArPSBjdXJyZW50WzddO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnQSc6XG4gICAgICAgIGRyYXdBcmMoZywgeCArIGwsIHkgKyB0LCBbXG4gICAgICAgICAgY3VycmVudFsxXSxcbiAgICAgICAgICBjdXJyZW50WzJdLFxuICAgICAgICAgIGN1cnJlbnRbM10sXG4gICAgICAgICAgY3VycmVudFs0XSxcbiAgICAgICAgICBjdXJyZW50WzVdLFxuICAgICAgICAgIGN1cnJlbnRbNl0gKyBsLFxuICAgICAgICAgIGN1cnJlbnRbN10gKyB0XG4gICAgICAgIF0sIGJvdW5kcywgbCwgdCk7XG4gICAgICAgIHggPSBjdXJyZW50WzZdO1xuICAgICAgICB5ID0gY3VycmVudFs3XTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3onOlxuICAgICAgY2FzZSAnWic6XG4gICAgICAgIGcuY2xvc2VQYXRoKCk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBwcmV2aW91cyA9IGN1cnJlbnQ7XG4gIH1cbiAgcmV0dXJuIGJvdW5kcy50cmFuc2xhdGUobCwgdCk7XG59XG5cbmZ1bmN0aW9uIGJvdW5kcyhwYXRoLCBib3VuZHMpIHtcbiAgdmFyIGN1cnJlbnQsIC8vIGN1cnJlbnQgaW5zdHJ1Y3Rpb25cbiAgICAgIHByZXZpb3VzID0gbnVsbCxcbiAgICAgIHggPSAwLCAvLyBjdXJyZW50IHhcbiAgICAgIHkgPSAwLCAvLyBjdXJyZW50IHlcbiAgICAgIGNvbnRyb2xYID0gMCwgLy8gY3VycmVudCBjb250cm9sIHBvaW50IHhcbiAgICAgIGNvbnRyb2xZID0gMCwgLy8gY3VycmVudCBjb250cm9sIHBvaW50IHlcbiAgICAgIHRlbXBYLFxuICAgICAgdGVtcFksXG4gICAgICB0ZW1wQ29udHJvbFgsXG4gICAgICB0ZW1wQ29udHJvbFk7XG5cbiAgZm9yICh2YXIgaT0wLCBsZW49cGF0aC5sZW5ndGg7IGk8bGVuOyArK2kpIHtcbiAgICBjdXJyZW50ID0gcGF0aFtpXTtcblxuICAgIHN3aXRjaCAoY3VycmVudFswXSkgeyAvLyBmaXJzdCBsZXR0ZXJcblxuICAgICAgY2FzZSAnbCc6IC8vIGxpbmV0bywgcmVsYXRpdmVcbiAgICAgICAgeCArPSBjdXJyZW50WzFdO1xuICAgICAgICB5ICs9IGN1cnJlbnRbMl07XG4gICAgICAgIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdMJzogLy8gbGluZXRvLCBhYnNvbHV0ZVxuICAgICAgICB4ID0gY3VycmVudFsxXTtcbiAgICAgICAgeSA9IGN1cnJlbnRbMl07XG4gICAgICAgIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdoJzogLy8gaG9yaXpvbnRhbCBsaW5ldG8sIHJlbGF0aXZlXG4gICAgICAgIHggKz0gY3VycmVudFsxXTtcbiAgICAgICAgYm91bmRzLmFkZCh4LCB5KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ0gnOiAvLyBob3Jpem9udGFsIGxpbmV0bywgYWJzb2x1dGVcbiAgICAgICAgeCA9IGN1cnJlbnRbMV07XG4gICAgICAgIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd2JzogLy8gdmVydGljYWwgbGluZXRvLCByZWxhdGl2ZVxuICAgICAgICB5ICs9IGN1cnJlbnRbMV07XG4gICAgICAgIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdWJzogLy8gdmVyaWNhbCBsaW5ldG8sIGFic29sdXRlXG4gICAgICAgIHkgPSBjdXJyZW50WzFdO1xuICAgICAgICBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnbSc6IC8vIG1vdmVUbywgcmVsYXRpdmVcbiAgICAgICAgeCArPSBjdXJyZW50WzFdO1xuICAgICAgICB5ICs9IGN1cnJlbnRbMl07XG4gICAgICAgIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdNJzogLy8gbW92ZVRvLCBhYnNvbHV0ZVxuICAgICAgICB4ID0gY3VycmVudFsxXTtcbiAgICAgICAgeSA9IGN1cnJlbnRbMl07XG4gICAgICAgIGJvdW5kcy5hZGQoeCwgeSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdjJzogLy8gYmV6aWVyQ3VydmVUbywgcmVsYXRpdmVcbiAgICAgICAgdGVtcFggPSB4ICsgY3VycmVudFs1XTtcbiAgICAgICAgdGVtcFkgPSB5ICsgY3VycmVudFs2XTtcbiAgICAgICAgY29udHJvbFggPSB4ICsgY3VycmVudFszXTtcbiAgICAgICAgY29udHJvbFkgPSB5ICsgY3VycmVudFs0XTtcbiAgICAgICAgYm91bmRzLmFkZCh4ICsgY3VycmVudFsxXSwgeSArIGN1cnJlbnRbMl0pO1xuICAgICAgICBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdDJzogLy8gYmV6aWVyQ3VydmVUbywgYWJzb2x1dGVcbiAgICAgICAgeCA9IGN1cnJlbnRbNV07XG4gICAgICAgIHkgPSBjdXJyZW50WzZdO1xuICAgICAgICBjb250cm9sWCA9IGN1cnJlbnRbM107XG4gICAgICAgIGNvbnRyb2xZID0gY3VycmVudFs0XTtcbiAgICAgICAgYm91bmRzLmFkZChjdXJyZW50WzFdLCBjdXJyZW50WzJdKTtcbiAgICAgICAgYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICBib3VuZHMuYWRkKHgsIHkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAncyc6IC8vIHNob3J0aGFuZCBjdWJpYyBiZXppZXJDdXJ2ZVRvLCByZWxhdGl2ZVxuICAgICAgICAvLyB0cmFuc2Zvcm0gdG8gYWJzb2x1dGUgeCx5XG4gICAgICAgIHRlbXBYID0geCArIGN1cnJlbnRbM107XG4gICAgICAgIHRlbXBZID0geSArIGN1cnJlbnRbNF07XG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzXG4gICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSBjb250cm9sWDtcbiAgICAgICAgY29udHJvbFkgPSAyICogeSAtIGNvbnRyb2xZO1xuICAgICAgICBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIGJvdW5kcy5hZGQoeCArIGN1cnJlbnRbMV0sIHkgKyBjdXJyZW50WzJdKTtcbiAgICAgICAgYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuXG4gICAgICAgIC8vIHNldCBjb250cm9sIHBvaW50IHRvIDJuZCBvbmUgb2YgdGhpcyBjb21tYW5kXG4gICAgICAgIC8vIFwiLi4uIHRoZSBmaXJzdCBjb250cm9sIHBvaW50IGlzIGFzc3VtZWQgdG8gYmUgdGhlIHJlZmxlY3Rpb24gb2YgdGhlIHNlY29uZCBjb250cm9sIHBvaW50IG9uIHRoZSBwcmV2aW91cyBjb21tYW5kIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHBvaW50LlwiXG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XG5cbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdTJzogLy8gc2hvcnRoYW5kIGN1YmljIGJlemllckN1cnZlVG8sIGFic29sdXRlXG4gICAgICAgIHRlbXBYID0gY3VycmVudFszXTtcbiAgICAgICAgdGVtcFkgPSBjdXJyZW50WzRdO1xuICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50c1xuICAgICAgICBjb250cm9sWCA9IDIqeCAtIGNvbnRyb2xYO1xuICAgICAgICBjb250cm9sWSA9IDIqeSAtIGNvbnRyb2xZO1xuICAgICAgICB4ID0gdGVtcFg7XG4gICAgICAgIHkgPSB0ZW1wWTtcbiAgICAgICAgYm91bmRzLmFkZChjdXJyZW50WzFdLCBjdXJyZW50WzJdKTtcbiAgICAgICAgYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XG4gICAgICAgIC8vIHNldCBjb250cm9sIHBvaW50IHRvIDJuZCBvbmUgb2YgdGhpcyBjb21tYW5kXG4gICAgICAgIC8vIFwiLi4uIHRoZSBmaXJzdCBjb250cm9sIHBvaW50IGlzIGFzc3VtZWQgdG8gYmUgdGhlIHJlZmxlY3Rpb24gb2YgdGhlIHNlY29uZCBjb250cm9sIHBvaW50IG9uIHRoZSBwcmV2aW91cyBjb21tYW5kIHJlbGF0aXZlIHRvIHRoZSBjdXJyZW50IHBvaW50LlwiXG4gICAgICAgIGNvbnRyb2xYID0gY3VycmVudFsxXTtcbiAgICAgICAgY29udHJvbFkgPSBjdXJyZW50WzJdO1xuXG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdxJzogLy8gcXVhZHJhdGljQ3VydmVUbywgcmVsYXRpdmVcbiAgICAgICAgLy8gdHJhbnNmb3JtIHRvIGFic29sdXRlIHgseVxuICAgICAgICB0ZW1wWCA9IHggKyBjdXJyZW50WzNdO1xuICAgICAgICB0ZW1wWSA9IHkgKyBjdXJyZW50WzRdO1xuXG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XG5cbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnUSc6IC8vIHF1YWRyYXRpY0N1cnZlVG8sIGFic29sdXRlXG4gICAgICAgIHRlbXBYID0gY3VycmVudFszXTtcbiAgICAgICAgdGVtcFkgPSBjdXJyZW50WzRdO1xuXG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICBjb250cm9sWCA9IGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0gY3VycmVudFsyXTtcbiAgICAgICAgYm91bmRzLmFkZChjb250cm9sWCwgY29udHJvbFkpO1xuICAgICAgICBib3VuZHMuYWRkKHRlbXBYLCB0ZW1wWSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICd0JzogLy8gc2hvcnRoYW5kIHF1YWRyYXRpY0N1cnZlVG8sIHJlbGF0aXZlXG5cbiAgICAgICAgLy8gdHJhbnNmb3JtIHRvIGFic29sdXRlIHgseVxuICAgICAgICB0ZW1wWCA9IHggKyBjdXJyZW50WzFdO1xuICAgICAgICB0ZW1wWSA9IHkgKyBjdXJyZW50WzJdO1xuXG4gICAgICAgIGlmIChwcmV2aW91c1swXS5tYXRjaCgvW1FxVHRdLykgPT09IG51bGwpIHtcbiAgICAgICAgICAvLyBJZiB0aGVyZSBpcyBubyBwcmV2aW91cyBjb21tYW5kIG9yIGlmIHRoZSBwcmV2aW91cyBjb21tYW5kIHdhcyBub3QgYSBRLCBxLCBUIG9yIHQsXG4gICAgICAgICAgLy8gYXNzdW1lIHRoZSBjb250cm9sIHBvaW50IGlzIGNvaW5jaWRlbnQgd2l0aCB0aGUgY3VycmVudCBwb2ludFxuICAgICAgICAgIGNvbnRyb2xYID0geDtcbiAgICAgICAgICBjb250cm9sWSA9IHk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocHJldmlvdXNbMF0gPT09ICd0Jykge1xuICAgICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzIGZvciB0XG4gICAgICAgICAgY29udHJvbFggPSAyICogeCAtIHRlbXBDb250cm9sWDtcbiAgICAgICAgICBjb250cm9sWSA9IDIgKiB5IC0gdGVtcENvbnRyb2xZO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKHByZXZpb3VzWzBdID09PSAncScpIHtcbiAgICAgICAgICAvLyBjYWxjdWxhdGUgcmVmbGVjdGlvbiBvZiBwcmV2aW91cyBjb250cm9sIHBvaW50cyBmb3IgcVxuICAgICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSBjb250cm9sWDtcbiAgICAgICAgICBjb250cm9sWSA9IDIgKiB5IC0gY29udHJvbFk7XG4gICAgICAgIH1cblxuICAgICAgICB0ZW1wQ29udHJvbFggPSBjb250cm9sWDtcbiAgICAgICAgdGVtcENvbnRyb2xZID0gY29udHJvbFk7XG5cbiAgICAgICAgeCA9IHRlbXBYO1xuICAgICAgICB5ID0gdGVtcFk7XG4gICAgICAgIGNvbnRyb2xYID0geCArIGN1cnJlbnRbMV07XG4gICAgICAgIGNvbnRyb2xZID0geSArIGN1cnJlbnRbMl07XG4gICAgICAgIGJvdW5kcy5hZGQoY29udHJvbFgsIGNvbnRyb2xZKTtcbiAgICAgICAgYm91bmRzLmFkZCh0ZW1wWCwgdGVtcFkpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnVCc6XG4gICAgICAgIHRlbXBYID0gY3VycmVudFsxXTtcbiAgICAgICAgdGVtcFkgPSBjdXJyZW50WzJdO1xuXG4gICAgICAgIC8vIGNhbGN1bGF0ZSByZWZsZWN0aW9uIG9mIHByZXZpb3VzIGNvbnRyb2wgcG9pbnRzXG4gICAgICAgIGNvbnRyb2xYID0gMiAqIHggLSBjb250cm9sWDtcbiAgICAgICAgY29udHJvbFkgPSAyICogeSAtIGNvbnRyb2xZO1xuXG4gICAgICAgIHggPSB0ZW1wWDtcbiAgICAgICAgeSA9IHRlbXBZO1xuICAgICAgICBib3VuZHMuYWRkKGNvbnRyb2xYLCBjb250cm9sWSk7XG4gICAgICAgIGJvdW5kcy5hZGQodGVtcFgsIHRlbXBZKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2EnOlxuICAgICAgICBib3VuZEFyYyh4LCB5LCBbXG4gICAgICAgICAgY3VycmVudFsxXSxcbiAgICAgICAgICBjdXJyZW50WzJdLFxuICAgICAgICAgIGN1cnJlbnRbM10sXG4gICAgICAgICAgY3VycmVudFs0XSxcbiAgICAgICAgICBjdXJyZW50WzVdLFxuICAgICAgICAgIGN1cnJlbnRbNl0gKyB4LFxuICAgICAgICAgIGN1cnJlbnRbN10gKyB5XG4gICAgICAgIF0sIGJvdW5kcyk7XG4gICAgICAgIHggKz0gY3VycmVudFs2XTtcbiAgICAgICAgeSArPSBjdXJyZW50WzddO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnQSc6XG4gICAgICAgIGJvdW5kQXJjKHgsIHksIFtcbiAgICAgICAgICBjdXJyZW50WzFdLFxuICAgICAgICAgIGN1cnJlbnRbMl0sXG4gICAgICAgICAgY3VycmVudFszXSxcbiAgICAgICAgICBjdXJyZW50WzRdLFxuICAgICAgICAgIGN1cnJlbnRbNV0sXG4gICAgICAgICAgY3VycmVudFs2XSxcbiAgICAgICAgICBjdXJyZW50WzddXG4gICAgICAgIF0sIGJvdW5kcyk7XG4gICAgICAgIHggPSBjdXJyZW50WzZdO1xuICAgICAgICB5ID0gY3VycmVudFs3XTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3onOlxuICAgICAgY2FzZSAnWic6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBwcmV2aW91cyA9IGN1cnJlbnQ7XG4gIH1cbiAgcmV0dXJuIGJvdW5kcztcbn1cblxuZnVuY3Rpb24gYXJlYShpdGVtcykge1xuICB2YXIgbyA9IGl0ZW1zWzBdO1xuICB2YXIgYXJlYSA9IGQzLnN2Zy5hcmVhKClcbiAgICAueChmdW5jdGlvbihkKSB7IHJldHVybiBkLng7IH0pXG4gICAgLnkxKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQueTsgfSlcbiAgICAueTAoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC55ICsgZC5oZWlnaHQ7IH0pO1xuICBpZiAoby5pbnRlcnBvbGF0ZSkgYXJlYS5pbnRlcnBvbGF0ZShvLmludGVycG9sYXRlKTtcbiAgaWYgKG8udGVuc2lvbiAhPSBudWxsKSBhcmVhLnRlbnNpb24oby50ZW5zaW9uKTtcbiAgcmV0dXJuIGFyZWEoaXRlbXMpO1xufVxuXG5mdW5jdGlvbiBsaW5lKGl0ZW1zKSB7XG4gIHZhciBvID0gaXRlbXNbMF07XG4gIHZhciBsaW5lID0gZDMuc3ZnLmxpbmUoKVxuICAgLngoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC54OyB9KVxuICAgLnkoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC55OyB9KTtcbiAgaWYgKG8uaW50ZXJwb2xhdGUpIGxpbmUuaW50ZXJwb2xhdGUoby5pbnRlcnBvbGF0ZSk7XG4gIGlmIChvLnRlbnNpb24gIT0gbnVsbCkgbGluZS50ZW5zaW9uKG8udGVuc2lvbik7XG4gIHJldHVybiBsaW5lKGl0ZW1zKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHBhcnNlOiAgcGFyc2UsXG4gIHJlbmRlcjogcmVuZGVyLFxuICBib3VuZHM6IGJvdW5kcyxcbiAgYXJlYTogICBhcmVhLFxuICBsaW5lOiAgIGxpbmVcbn07IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpO1xuXG52YXIgaGFuZGxlciA9IGZ1bmN0aW9uKGVsLCBtb2RlbCkge1xuICB0aGlzLl9hY3RpdmUgPSBudWxsO1xuICB0aGlzLl9oYW5kbGVycyA9IHt9O1xuICBpZiAoZWwpIHRoaXMuaW5pdGlhbGl6ZShlbCk7XG4gIGlmIChtb2RlbCkgdGhpcy5tb2RlbChtb2RlbCk7XG59O1xuXG5mdW5jdGlvbiBzdmdIYW5kbGVyKGhhbmRsZXIpIHtcbiAgdmFyIHRoYXQgPSB0aGlzO1xuICByZXR1cm4gZnVuY3Rpb24oZXZ0KSB7XG4gICAgdmFyIHRhcmdldCA9IGV2dC50YXJnZXQsXG4gICAgICAgIGl0ZW0gPSB0YXJnZXQuX19kYXRhX187XG5cbiAgICBpZiAoaXRlbSkgaXRlbSA9IGl0ZW0ubWFyayA/IGl0ZW0gOiBpdGVtWzBdO1xuICAgIGhhbmRsZXIuY2FsbCh0aGF0Ll9vYmosIGV2dCwgaXRlbSk7XG4gIH07XG59XG5cbmZ1bmN0aW9uIGV2ZW50TmFtZShuYW1lKSB7XG4gIHZhciBpID0gbmFtZS5pbmRleE9mKFwiLlwiKTtcbiAgcmV0dXJuIGkgPCAwID8gbmFtZSA6IG5hbWUuc2xpY2UoMCxpKTtcbn1cblxudmFyIHByb3RvdHlwZSA9IGhhbmRsZXIucHJvdG90eXBlO1xuXG5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKGVsLCBwYWQsIG9iaikge1xuICB0aGlzLl9lbCA9IGQzLnNlbGVjdChlbCkubm9kZSgpO1xuICB0aGlzLl9zdmcgPSBkMy5zZWxlY3QoZWwpLnNlbGVjdChcInN2Zy5tYXJrc1wiKS5ub2RlKCk7XG4gIHRoaXMuX3BhZGRpbmcgPSBwYWQ7XG4gIHRoaXMuX29iaiA9IG9iaiB8fCBudWxsO1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvdHlwZS5wYWRkaW5nID0gZnVuY3Rpb24ocGFkKSB7XG4gIHRoaXMuX3BhZGRpbmcgPSBwYWQ7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG90eXBlLm1vZGVsID0gZnVuY3Rpb24obW9kZWwpIHtcbiAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGhpcy5fbW9kZWw7XG4gIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG90eXBlLmhhbmRsZXJzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBoID0gdGhpcy5faGFuZGxlcnM7XG4gIHJldHVybiBkbC5rZXlzKGgpLnJlZHVjZShmdW5jdGlvbihhLCBrKSB7XG4gICAgcmV0dXJuIGhba10ucmVkdWNlKGZ1bmN0aW9uKGEsIHgpIHsgcmV0dXJuIChhLnB1c2goeCksIGEpOyB9LCBhKTtcbiAgfSwgW10pO1xufTtcblxuLy8gYWRkIGFuIGV2ZW50IGhhbmRsZXJcbnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKHR5cGUsIGhhbmRsZXIpIHtcbiAgdmFyIG5hbWUgPSBldmVudE5hbWUodHlwZSksXG4gICAgICBoID0gdGhpcy5faGFuZGxlcnMsXG4gICAgICBkb20gPSBkMy5zZWxlY3QodGhpcy5fc3ZnKS5ub2RlKCk7XG4gICAgICBcbiAgdmFyIHggPSB7XG4gICAgdHlwZTogdHlwZSxcbiAgICBoYW5kbGVyOiBoYW5kbGVyLFxuICAgIHN2Zzogc3ZnSGFuZGxlci5jYWxsKHRoaXMsIGhhbmRsZXIpXG4gIH07XG4gIGggPSBoW25hbWVdIHx8IChoW25hbWVdID0gW10pO1xuICBoLnB1c2goeCk7XG5cbiAgZG9tLmFkZEV2ZW50TGlzdGVuZXIobmFtZSwgeC5zdmcpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIHJlbW92ZSBhbiBldmVudCBoYW5kbGVyXG5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24odHlwZSwgaGFuZGxlcikge1xuICB2YXIgbmFtZSA9IGV2ZW50TmFtZSh0eXBlKSxcbiAgICAgIGggPSB0aGlzLl9oYW5kbGVyc1tuYW1lXSxcbiAgICAgIGRvbSA9IGQzLnNlbGVjdCh0aGlzLl9zdmcpLm5vZGUoKTtcbiAgaWYgKCFoKSByZXR1cm47XG4gIGZvciAodmFyIGk9aC5sZW5ndGg7IC0taT49MDspIHtcbiAgICBpZiAoaFtpXS50eXBlICE9PSB0eXBlKSBjb250aW51ZTtcbiAgICBpZiAoIWhhbmRsZXIgfHwgaFtpXS5oYW5kbGVyID09PSBoYW5kbGVyKSB7XG4gICAgICBkb20ucmVtb3ZlRXZlbnRMaXN0ZW5lcihuYW1lLCBoW2ldLnN2Zyk7XG4gICAgICBoLnNwbGljZShpLCAxKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGhhbmRsZXI7IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIG1hcmtzID0gcmVxdWlyZSgnLi9tYXJrcycpO1xuXG52YXIgcmVuZGVyZXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5fc3ZnID0gbnVsbDtcbiAgdGhpcy5fY3R4ID0gbnVsbDtcbiAgdGhpcy5fZWwgPSBudWxsO1xuICB0aGlzLl9kZWZzID0ge1xuICAgIGdyYWRpZW50OiB7fSxcbiAgICBjbGlwcGluZzoge31cbiAgfTtcbn07XG5cbnZhciBwcm90b3R5cGUgPSByZW5kZXJlci5wcm90b3R5cGU7XG5cbnByb3RvdHlwZS5pbml0aWFsaXplID0gZnVuY3Rpb24oZWwsIHdpZHRoLCBoZWlnaHQsIHBhZCkge1xuICB0aGlzLl9lbCA9IGVsO1xuXG4gIC8vIHJlbW92ZSBhbnkgZXhpc3Rpbmcgc3ZnIGVsZW1lbnRcbiAgZDMuc2VsZWN0KGVsKS5zZWxlY3QoXCJzdmcubWFya3NcIikucmVtb3ZlKCk7XG5cbiAgLy8gY3JlYXRlIHN2ZyBlbGVtZW50IGFuZCBpbml0aWFsaXplIGF0dHJpYnV0ZXNcbiAgdGhpcy5fc3ZnID0gZDMuc2VsZWN0KGVsKVxuICAgIC5hcHBlbmQoXCJzdmdcIilcbiAgICAuYXR0cihcImNsYXNzXCIsIFwibWFya3NcIik7XG4gIFxuICAvLyBzZXQgdGhlIHN2ZyByb290IGdyb3VwXG4gIHRoaXMuX2N0eCA9IHRoaXMuX3N2Zy5hcHBlbmQoXCJnXCIpO1xuICBcbiAgcmV0dXJuIHRoaXMucmVzaXplKHdpZHRoLCBoZWlnaHQsIHBhZCk7XG59O1xuXG5wcm90b3R5cGUucmVzaXplID0gZnVuY3Rpb24od2lkdGgsIGhlaWdodCwgcGFkKSB7XG4gIHRoaXMuX3dpZHRoID0gd2lkdGg7XG4gIHRoaXMuX2hlaWdodCA9IGhlaWdodDtcbiAgdGhpcy5fcGFkZGluZyA9IHBhZDtcbiAgXG4gIHRoaXMuX3N2Z1xuICAgIC5hdHRyKFwid2lkdGhcIiwgd2lkdGggKyBwYWQubGVmdCArIHBhZC5yaWdodClcbiAgICAuYXR0cihcImhlaWdodFwiLCBoZWlnaHQgKyBwYWQudG9wICsgcGFkLmJvdHRvbSk7XG4gICAgXG4gIHRoaXMuX2N0eFxuICAgIC5hdHRyKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiK3BhZC5sZWZ0K1wiLFwiK3BhZC50b3ArXCIpXCIpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG90eXBlLmNvbnRleHQgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuX2N0eDtcbn07XG5cbnByb3RvdHlwZS5lbGVtZW50ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLl9lbDtcbn07XG5cbnByb3RvdHlwZS51cGRhdGVEZWZzID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzdmcgPSB0aGlzLl9zdmcsXG4gICAgICBhbGwgPSB0aGlzLl9kZWZzLFxuICAgICAgZGdyYWQgPSBkbC5rZXlzKGFsbC5ncmFkaWVudCksXG4gICAgICBkY2xpcCA9IGRsLmtleXMoYWxsLmNsaXBwaW5nKSxcbiAgICAgIGRlZnMgPSBzdmcuc2VsZWN0KFwiZGVmc1wiKSwgZ3JhZCwgY2xpcDtcblxuICAvLyBnZXQgb3IgY3JlYXRlIHN2ZyBkZWZzIGJsb2NrXG4gIGlmIChkZ3JhZC5sZW5ndGg9PT0wICYmIGRjbGlwLmxlbmd0aD09MCkgeyBkZWZzLnJlbW92ZSgpOyByZXR1cm47IH1cbiAgaWYgKGRlZnMuZW1wdHkoKSkgZGVmcyA9IHN2Zy5pbnNlcnQoXCJkZWZzXCIsIFwiOmZpcnN0LWNoaWxkXCIpO1xuICBcbiAgZ3JhZCA9IGRlZnMuc2VsZWN0QWxsKFwibGluZWFyR3JhZGllbnRcIikuZGF0YShkZ3JhZCwgZGwuaWRlbnRpdHkpO1xuICBncmFkLmVudGVyKCkuYXBwZW5kKFwibGluZWFyR3JhZGllbnRcIikuYXR0cihcImlkXCIsIGRsLmlkZW50aXR5KTtcbiAgZ3JhZC5leGl0KCkucmVtb3ZlKCk7XG4gIGdyYWQuZWFjaChmdW5jdGlvbihpZCkge1xuICAgIHZhciBkZWYgPSBhbGwuZ3JhZGllbnRbaWRdLFxuICAgICAgICBncmQgPSBkMy5zZWxlY3QodGhpcyk7XG5cbiAgICAvLyBzZXQgZ3JhZGllbnQgY29vcmRpbmF0ZXNcbiAgICBncmQuYXR0cih7eDE6IGRlZi54MSwgeDI6IGRlZi54MiwgeTE6IGRlZi55MSwgeTI6IGRlZi55Mn0pO1xuXG4gICAgLy8gc2V0IGdyYWRpZW50IHN0b3BzXG4gICAgc3RvcCA9IGdyZC5zZWxlY3RBbGwoXCJzdG9wXCIpLmRhdGEoZGVmLnN0b3BzKTtcbiAgICBzdG9wLmVudGVyKCkuYXBwZW5kKFwic3RvcFwiKTtcbiAgICBzdG9wLmV4aXQoKS5yZW1vdmUoKTtcbiAgICBzdG9wLmF0dHIoXCJvZmZzZXRcIiwgZnVuY3Rpb24oZCkgeyByZXR1cm4gZC5vZmZzZXQ7IH0pXG4gICAgICAgIC5hdHRyKFwic3RvcC1jb2xvclwiLCBmdW5jdGlvbihkKSB7IHJldHVybiBkLmNvbG9yOyB9KTtcbiAgfSk7XG4gIFxuICBjbGlwID0gZGVmcy5zZWxlY3RBbGwoXCJjbGlwUGF0aFwiKS5kYXRhKGRjbGlwLCBkbC5pZGVudGl0eSk7XG4gIGNsaXAuZW50ZXIoKS5hcHBlbmQoXCJjbGlwUGF0aFwiKS5hdHRyKFwiaWRcIiwgZGwuaWRlbnRpdHkpO1xuICBjbGlwLmV4aXQoKS5yZW1vdmUoKTtcbiAgY2xpcC5lYWNoKGZ1bmN0aW9uKGlkKSB7XG4gICAgdmFyIGRlZiA9IGFsbC5jbGlwcGluZ1tpZF0sXG4gICAgICAgIGNyID0gZDMuc2VsZWN0KHRoaXMpLnNlbGVjdEFsbChcInJlY3RcIikuZGF0YShbMV0pO1xuICAgIGNyLmVudGVyKCkuYXBwZW5kKFwicmVjdFwiKTtcbiAgICBjci5hdHRyKFwieFwiLCAwKVxuICAgICAgLmF0dHIoXCJ5XCIsIDApXG4gICAgICAuYXR0cihcIndpZHRoXCIsIGRlZi53aWR0aClcbiAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIGRlZi5oZWlnaHQpO1xuICB9KTtcbn07XG5cbnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbihzY2VuZSwgaXRlbXMpIHtcbiAgbWFya3MuY3VycmVudCA9IHRoaXM7XG5cbiAgaWYgKGl0ZW1zKSB7XG4gICAgdGhpcy5yZW5kZXJJdGVtcyhkbC5hcnJheShpdGVtcykpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMuZHJhdyh0aGlzLl9jdHgsIHNjZW5lLCAtMSk7XG4gIH1cbiAgdGhpcy51cGRhdGVEZWZzKCk7XG5cbiBkZWxldGUgbWFya3MuY3VycmVudDtcbn07XG5cbnByb3RvdHlwZS5yZW5kZXJJdGVtcyA9IGZ1bmN0aW9uKGl0ZW1zKSB7XG4gIHZhciBpdGVtLCBub2RlLCB0eXBlLCBuZXN0LCBpLCBuO1xuXG4gIGZvciAoaT0wLCBuPWl0ZW1zLmxlbmd0aDsgaTxuOyArK2kpIHtcbiAgICBpdGVtID0gaXRlbXNbaV07XG4gICAgbm9kZSA9IGl0ZW0uX3N2ZztcbiAgICB0eXBlID0gaXRlbS5tYXJrLm1hcmt0eXBlO1xuXG4gICAgaXRlbSA9IG1hcmtzLm5lc3RlZFt0eXBlXSA/IGl0ZW0ubWFyay5pdGVtcyA6IGl0ZW07XG4gICAgbWFya3MudXBkYXRlW3R5cGVdLmNhbGwobm9kZSwgaXRlbSk7XG4gICAgbWFya3Muc3R5bGUuY2FsbChub2RlLCBpdGVtKTtcbiAgfVxufVxuXG5wcm90b3R5cGUuZHJhdyA9IGZ1bmN0aW9uKGN0eCwgc2NlbmUsIGluZGV4KSB7XG4gIHZhciBtYXJrdHlwZSA9IHNjZW5lLm1hcmt0eXBlLFxuICAgICAgcmVuZGVyZXIgPSBtYXJrcy5kcmF3W21hcmt0eXBlXTtcbiAgcmVuZGVyZXIuY2FsbCh0aGlzLCBjdHgsIHNjZW5lLCBpbmRleCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJlbmRlcmVyOyIsInZhciBkbCA9IHJlcXVpcmUoJ2RhdGFsaWInKSxcbiAgICBkMyA9ICh0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93LmQzIDogdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbC5kMyA6IG51bGwpLFxuICAgIGNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL3V0aWwvY29uZmlnJyk7XG5cbmZ1bmN0aW9uIHgobykgICAgIHsgcmV0dXJuIG8ueCB8fCAwOyB9XG5mdW5jdGlvbiB5KG8pICAgICB7IHJldHVybiBvLnkgfHwgMDsgfVxuZnVuY3Rpb24geWgobykgICAgeyByZXR1cm4gby55ICsgby5oZWlnaHQgfHwgMDsgfVxuZnVuY3Rpb24ga2V5KG8pICAgeyByZXR1cm4gby5rZXk7IH1cbmZ1bmN0aW9uIHNpemUobykgIHsgcmV0dXJuIG8uc2l6ZT09bnVsbCA/IDEwMCA6IG8uc2l6ZTsgfVxuZnVuY3Rpb24gc2hhcGUobykgeyByZXR1cm4gby5zaGFwZSB8fCBcImNpcmNsZVwiOyB9XG4gICAgXG52YXIgYXJjX3BhdGggICAgPSBkMy5zdmcuYXJjKCksXG4gICAgYXJlYV9wYXRoICAgPSBkMy5zdmcuYXJlYSgpLngoeCkueTEoeSkueTAoeWgpLFxuICAgIGxpbmVfcGF0aCAgID0gZDMuc3ZnLmxpbmUoKS54KHgpLnkoeSksXG4gICAgc3ltYm9sX3BhdGggPSBkMy5zdmcuc3ltYm9sKCkudHlwZShzaGFwZSkuc2l6ZShzaXplKTtcblxudmFyIG1hcmtfaWQgPSAwLFxuICAgIGNsaXBfaWQgPSAwO1xuXG52YXIgdGV4dEFsaWduID0ge1xuICBcImxlZnRcIjogICBcInN0YXJ0XCIsXG4gIFwiY2VudGVyXCI6IFwibWlkZGxlXCIsXG4gIFwicmlnaHRcIjogIFwiZW5kXCJcbn07XG5cbnZhciBzdHlsZXMgPSB7XG4gIFwiZmlsbFwiOiAgICAgICAgICAgICBcImZpbGxcIixcbiAgXCJmaWxsT3BhY2l0eVwiOiAgICAgIFwiZmlsbC1vcGFjaXR5XCIsXG4gIFwic3Ryb2tlXCI6ICAgICAgICAgICBcInN0cm9rZVwiLFxuICBcInN0cm9rZVdpZHRoXCI6ICAgICAgXCJzdHJva2Utd2lkdGhcIixcbiAgXCJzdHJva2VPcGFjaXR5XCI6ICAgIFwic3Ryb2tlLW9wYWNpdHlcIixcbiAgXCJzdHJva2VDYXBcIjogICAgICAgIFwic3Ryb2tlLWxpbmVjYXBcIixcbiAgXCJzdHJva2VEYXNoXCI6ICAgICAgIFwic3Ryb2tlLWRhc2hhcnJheVwiLFxuICBcInN0cm9rZURhc2hPZmZzZXRcIjogXCJzdHJva2UtZGFzaG9mZnNldFwiLFxuICBcIm9wYWNpdHlcIjogICAgICAgICAgXCJvcGFjaXR5XCJcbn07XG52YXIgc3R5bGVQcm9wcyA9IGRsLmtleXMoc3R5bGVzKTtcblxuZnVuY3Rpb24gc3R5bGUoZCkge1xuICB2YXIgaSwgbiwgcHJvcCwgbmFtZSwgdmFsdWUsXG4gICAgICBvID0gZC5tYXJrID8gZCA6IGQubGVuZ3RoID8gZFswXSA6IG51bGw7XG4gIGlmIChvID09PSBudWxsKSByZXR1cm47XG5cbiAgZm9yIChpPTAsIG49c3R5bGVQcm9wcy5sZW5ndGg7IGk8bjsgKytpKSB7XG4gICAgcHJvcCA9IHN0eWxlUHJvcHNbaV07XG4gICAgbmFtZSA9IHN0eWxlc1twcm9wXTtcbiAgICB2YWx1ZSA9IG9bcHJvcF07XG5cbiAgICBpZiAodmFsdWUgPT0gbnVsbCkge1xuICAgICAgaWYgKG5hbWUgPT09IFwiZmlsbFwiKSB0aGlzLnN0eWxlLnNldFByb3BlcnR5KG5hbWUsIFwibm9uZVwiLCBudWxsKTtcbiAgICAgIGVsc2UgdGhpcy5zdHlsZS5yZW1vdmVQcm9wZXJ0eShuYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHZhbHVlLmlkKSB7XG4gICAgICAgIC8vIGVuc3VyZSBkZWZpbml0aW9uIGlzIGluY2x1ZGVkXG4gICAgICAgIG1hcmtzLmN1cnJlbnQuX2RlZnMuZ3JhZGllbnRbdmFsdWUuaWRdID0gdmFsdWU7XG4gICAgICAgIHZhbHVlID0gXCJ1cmwoI1wiICsgdmFsdWUuaWQgKyBcIilcIjtcbiAgICAgIH1cbiAgICAgIHRoaXMuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdmFsdWUrXCJcIiwgbnVsbCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGFyYyhvKSB7XG4gIHZhciB4ID0gby54IHx8IDAsXG4gICAgICB5ID0gby55IHx8IDA7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiK3grXCIsXCIreStcIilcIik7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwiZFwiLCBhcmNfcGF0aChvKSk7XG59XG5cbmZ1bmN0aW9uIGFyZWEoaXRlbXMpIHtcbiAgaWYgKCFpdGVtcy5sZW5ndGgpIHJldHVybjtcbiAgdmFyIG8gPSBpdGVtc1swXTtcbiAgYXJlYV9wYXRoXG4gICAgLmludGVycG9sYXRlKG8uaW50ZXJwb2xhdGUgfHwgXCJsaW5lYXJcIilcbiAgICAudGVuc2lvbihvLnRlbnNpb24gPT0gbnVsbCA/IDAuNyA6IG8udGVuc2lvbik7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwiZFwiLCBhcmVhX3BhdGgoaXRlbXMpKTtcbn1cblxuZnVuY3Rpb24gbGluZShpdGVtcykge1xuICBpZiAoIWl0ZW1zLmxlbmd0aCkgcmV0dXJuO1xuICB2YXIgbyA9IGl0ZW1zWzBdO1xuICBsaW5lX3BhdGhcbiAgICAuaW50ZXJwb2xhdGUoby5pbnRlcnBvbGF0ZSB8fCBcImxpbmVhclwiKVxuICAgIC50ZW5zaW9uKG8udGVuc2lvbiA9PSBudWxsID8gMC43IDogby50ZW5zaW9uKTtcbiAgdGhpcy5zZXRBdHRyaWJ1dGUoXCJkXCIsIGxpbmVfcGF0aChpdGVtcykpO1xufVxuXG5mdW5jdGlvbiBwYXRoKG8pIHtcbiAgdmFyIHggPSBvLnggfHwgMCxcbiAgICAgIHkgPSBvLnkgfHwgMDtcbiAgdGhpcy5zZXRBdHRyaWJ1dGUoXCJ0cmFuc2Zvcm1cIiwgXCJ0cmFuc2xhdGUoXCIreCtcIixcIit5K1wiKVwiKTtcbiAgaWYgKG8ucGF0aCAhPSBudWxsKSB0aGlzLnNldEF0dHJpYnV0ZShcImRcIiwgby5wYXRoKTtcbn1cblxuZnVuY3Rpb24gcmVjdChvKSB7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwieFwiLCBvLnggfHwgMCk7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwieVwiLCBvLnkgfHwgMCk7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwid2lkdGhcIiwgby53aWR0aCB8fCAwKTtcbiAgdGhpcy5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgby5oZWlnaHQgfHwgMCk7XG59XG5cbmZ1bmN0aW9uIHJ1bGUobykge1xuICB2YXIgeDEgPSBvLnggfHwgMCxcbiAgICAgIHkxID0gby55IHx8IDA7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwieDFcIiwgeDEpO1xuICB0aGlzLnNldEF0dHJpYnV0ZShcInkxXCIsIHkxKTtcbiAgdGhpcy5zZXRBdHRyaWJ1dGUoXCJ4MlwiLCBvLngyICE9IG51bGwgPyBvLngyIDogeDEpO1xuICB0aGlzLnNldEF0dHJpYnV0ZShcInkyXCIsIG8ueTIgIT0gbnVsbCA/IG8ueTIgOiB5MSk7XG59XG5cbmZ1bmN0aW9uIHN5bWJvbChvKSB7XG4gIHZhciB4ID0gby54IHx8IDAsXG4gICAgICB5ID0gby55IHx8IDA7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwidHJhbnNsYXRlKFwiK3grXCIsXCIreStcIilcIik7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwiZFwiLCBzeW1ib2xfcGF0aChvKSk7XG59XG5cbmZ1bmN0aW9uIGltYWdlKG8pIHtcbiAgdmFyIHcgPSBvLndpZHRoIHx8IChvLmltYWdlICYmIG8uaW1hZ2Uud2lkdGgpIHx8IDAsXG4gICAgICBoID0gby5oZWlnaHQgfHwgKG8uaW1hZ2UgJiYgby5pbWFnZS5oZWlnaHQpIHx8IDAsXG4gICAgICB4ID0gby54IC0gKG8uYWxpZ24gPT09IFwiY2VudGVyXCJcbiAgICAgICAgPyB3LzIgOiAoby5hbGlnbiA9PT0gXCJyaWdodFwiID8gdyA6IDApKSxcbiAgICAgIHkgPSBvLnkgLSAoby5iYXNlbGluZSA9PT0gXCJtaWRkbGVcIlxuICAgICAgICA/IGgvMiA6IChvLmJhc2VsaW5lID09PSBcImJvdHRvbVwiID8gaCA6IDApKSxcbiAgICAgIHVybCA9IGNvbmZpZy5iYXNlVVJMICsgby51cmw7XG4gIFxuICB0aGlzLnNldEF0dHJpYnV0ZU5TKFwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiLCBcImhyZWZcIiwgdXJsKTtcbiAgdGhpcy5zZXRBdHRyaWJ1dGUoXCJ4XCIsIHgpO1xuICB0aGlzLnNldEF0dHJpYnV0ZShcInlcIiwgeSk7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwid2lkdGhcIiwgdyk7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwiaGVpZ2h0XCIsIGgpO1xufVxuICBcbmZ1bmN0aW9uIGZvbnRTdHJpbmcobykge1xuICByZXR1cm4gKG8uZm9udFN0eWxlID8gby5mb250U3R5bGUgKyBcIiBcIiA6IFwiXCIpXG4gICAgKyAoby5mb250VmFyaWFudCA/IG8uZm9udFZhcmlhbnQgKyBcIiBcIiA6IFwiXCIpXG4gICAgKyAoby5mb250V2VpZ2h0ID8gby5mb250V2VpZ2h0ICsgXCIgXCIgOiBcIlwiKVxuICAgICsgKG8uZm9udFNpemUgIT0gbnVsbCA/IG8uZm9udFNpemUgOiBjb25maWcucmVuZGVyLmZvbnRTaXplKSArIFwicHggXCJcbiAgICArIChvLmZvbnQgfHwgY29uZmlnLnJlbmRlci5mb250KTtcbn1cblxuZnVuY3Rpb24gdGV4dChvKSB7XG4gIHZhciB4ID0gby54IHx8IDAsXG4gICAgICB5ID0gby55IHx8IDAsXG4gICAgICBkeCA9IG8uZHggfHwgMCxcbiAgICAgIGR5ID0gby5keSB8fCAwLFxuICAgICAgYSA9IG8uYW5nbGUgfHwgMCxcbiAgICAgIHIgPSBvLnJhZGl1cyB8fCAwLFxuICAgICAgYWxpZ24gPSB0ZXh0QWxpZ25bby5hbGlnbiB8fCBcImxlZnRcIl0sXG4gICAgICBiYXNlID0gby5iYXNlbGluZT09PVwidG9wXCIgPyBcIi45ZW1cIlxuICAgICAgICAgICA6IG8uYmFzZWxpbmU9PT1cIm1pZGRsZVwiID8gXCIuMzVlbVwiIDogMDtcblxuICBpZiAocikge1xuICAgIHZhciB0ID0gKG8udGhldGEgfHwgMCkgLSBNYXRoLlBJLzI7XG4gICAgeCArPSByICogTWF0aC5jb3ModCk7XG4gICAgeSArPSByICogTWF0aC5zaW4odCk7XG4gIH1cblxuICB0aGlzLnNldEF0dHJpYnV0ZShcInhcIiwgeCArIGR4KTtcbiAgdGhpcy5zZXRBdHRyaWJ1dGUoXCJ5XCIsIHkgKyBkeSk7XG4gIHRoaXMuc2V0QXR0cmlidXRlKFwidGV4dC1hbmNob3JcIiwgYWxpZ24pO1xuICBcbiAgaWYgKGEpIHRoaXMuc2V0QXR0cmlidXRlKFwidHJhbnNmb3JtXCIsIFwicm90YXRlKFwiK2ErXCIgXCIreCtcIixcIit5K1wiKVwiKTtcbiAgZWxzZSB0aGlzLnJlbW92ZUF0dHJpYnV0ZShcInRyYW5zZm9ybVwiKTtcbiAgXG4gIGlmIChiYXNlKSB0aGlzLnNldEF0dHJpYnV0ZShcImR5XCIsIGJhc2UpO1xuICBlbHNlIHRoaXMucmVtb3ZlQXR0cmlidXRlKFwiZHlcIik7XG4gIFxuICB0aGlzLnRleHRDb250ZW50ID0gby50ZXh0O1xuICB0aGlzLnN0eWxlLnNldFByb3BlcnR5KFwiZm9udFwiLCBmb250U3RyaW5nKG8pLCBudWxsKTtcbn1cblxuZnVuY3Rpb24gZ3JvdXAobykge1xuICB2YXIgeCA9IG8ueCB8fCAwLFxuICAgICAgeSA9IG8ueSB8fCAwO1xuICB0aGlzLnNldEF0dHJpYnV0ZShcInRyYW5zZm9ybVwiLCBcInRyYW5zbGF0ZShcIit4K1wiLFwiK3krXCIpXCIpO1xuXG4gIGlmIChvLmNsaXApIHtcbiAgICB2YXIgYyA9IHt3aWR0aDogby53aWR0aCB8fCAwLCBoZWlnaHQ6IG8uaGVpZ2h0IHx8IDB9LFxuICAgICAgICBpZCA9IG8uY2xpcF9pZCB8fCAoby5jbGlwX2lkID0gXCJjbGlwXCIgKyBjbGlwX2lkKyspO1xuICAgIG1hcmtzLmN1cnJlbnQuX2RlZnMuY2xpcHBpbmdbaWRdID0gYztcbiAgICB0aGlzLnNldEF0dHJpYnV0ZShcImNsaXAtcGF0aFwiLCBcInVybCgjXCIraWQrXCIpXCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdyb3VwX2JnKG8pIHtcbiAgdmFyIHcgPSBvLndpZHRoIHx8IDAsXG4gICAgICBoID0gby5oZWlnaHQgfHwgMDtcbiAgdGhpcy5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCB3KTtcbiAgdGhpcy5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgaCk7XG59XG5cbmZ1bmN0aW9uIGNzc0NsYXNzKGRlZikge1xuICB2YXIgY2xzID0gXCJ0eXBlLVwiICsgZGVmLnR5cGU7XG4gIGlmIChkZWYubmFtZSkgY2xzICs9IFwiIFwiICsgZGVmLm5hbWU7XG4gIHJldHVybiBjbHM7XG59XG5cbmZ1bmN0aW9uIGRyYXcodGFnLCBhdHRyLCBuZXN0KSB7XG4gIHJldHVybiBmdW5jdGlvbihnLCBzY2VuZSwgaW5kZXgpIHtcbiAgICBkcmF3TWFyayhnLCBzY2VuZSwgaW5kZXgsIFwibWFya19cIiwgdGFnLCBhdHRyLCBuZXN0KTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gZHJhd01hcmsoZywgc2NlbmUsIGluZGV4LCBwcmVmaXgsIHRhZywgYXR0ciwgbmVzdCkge1xuICB2YXIgZGF0YSA9IG5lc3QgPyBbc2NlbmUuaXRlbXNdIDogc2NlbmUuaXRlbXMsXG4gICAgICBldnRzID0gc2NlbmUuaW50ZXJhY3RpdmU9PT1mYWxzZSA/IFwibm9uZVwiIDogbnVsbCxcbiAgICAgIGdycHMgPSBnLm5vZGUoKS5jaGlsZE5vZGVzLFxuICAgICAgbm90RyA9ICh0YWcgIT09IFwiZ1wiKSxcbiAgICAgIHAgPSAocCA9IGdycHNbaW5kZXgrMV0pIC8vICsxIHRvIHNraXAgZ3JvdXAgYmFja2dyb3VuZCByZWN0XG4gICAgICAgID8gZDMuc2VsZWN0KHApXG4gICAgICAgIDogZy5hcHBlbmQoXCJnXCIpXG4gICAgICAgICAgIC5hdHRyKFwiaWRcIiwgXCJnXCIrKCsrbWFya19pZCkpXG4gICAgICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgY3NzQ2xhc3Moc2NlbmUuZGVmKSk7XG5cbiAgdmFyIGlkID0gcC5hdHRyKFwiaWRcIiksXG4gICAgICBzID0gXCIjXCIgKyBpZCArIFwiID4gXCIgKyB0YWcsXG4gICAgICBtID0gcC5zZWxlY3RBbGwocykuZGF0YShkYXRhKSxcbiAgICAgIGUgPSBtLmVudGVyKCkuYXBwZW5kKHRhZyk7XG5cbiAgaWYgKG5vdEcpIHtcbiAgICBwLnN0eWxlKFwicG9pbnRlci1ldmVudHNcIiwgZXZ0cyk7XG4gICAgZS5lYWNoKGZ1bmN0aW9uKGQpIHtcbiAgICAgIGlmIChkLm1hcmspIGQuX3N2ZyA9IHRoaXM7XG4gICAgICBlbHNlIGlmIChkLmxlbmd0aCkgZFswXS5fc3ZnID0gdGhpcztcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBlLmFwcGVuZChcInJlY3RcIikuYXR0cihcImNsYXNzXCIsXCJiYWNrZ3JvdW5kXCIpLnN0eWxlKFwicG9pbnRlci1ldmVudHNcIixldnRzKTtcbiAgfVxuICBcbiAgbS5leGl0KCkucmVtb3ZlKCk7XG4gIG0uZWFjaChhdHRyKTtcbiAgaWYgKG5vdEcpIG0uZWFjaChzdHlsZSk7XG4gIGVsc2UgcC5zZWxlY3RBbGwocytcIiA+IHJlY3QuYmFja2dyb3VuZFwiKS5lYWNoKGdyb3VwX2JnKS5lYWNoKHN0eWxlKTtcbiAgXG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBkcmF3R3JvdXAoZywgc2NlbmUsIGluZGV4LCBwcmVmaXgpIHsgICAgXG4gIHZhciBwID0gZHJhd01hcmsoZywgc2NlbmUsIGluZGV4LCBwcmVmaXggfHwgXCJncm91cF9cIiwgXCJnXCIsIGdyb3VwKSxcbiAgICAgIGMgPSBwLm5vZGUoKS5jaGlsZE5vZGVzLCBuID0gYy5sZW5ndGgsIGksIGosIG07XG4gIFxuICBmb3IgKGk9MDsgaTxuOyArK2kpIHtcbiAgICB2YXIgaXRlbXMgPSBjW2ldLl9fZGF0YV9fLml0ZW1zLFxuICAgICAgICBsZWdlbmRzID0gY1tpXS5fX2RhdGFfXy5sZWdlbmRJdGVtcyB8fCBbXSxcbiAgICAgICAgYXhlcyA9IGNbaV0uX19kYXRhX18uYXhpc0l0ZW1zIHx8IFtdLFxuICAgICAgICBzZWwgPSBkMy5zZWxlY3QoY1tpXSksXG4gICAgICAgIGlkeCA9IDA7XG5cbiAgICBmb3IgKGo9MCwgbT1heGVzLmxlbmd0aDsgajxtOyArK2opIHtcbiAgICAgIGlmIChheGVzW2pdLmRlZi5sYXllciA9PT0gXCJiYWNrXCIpIHtcbiAgICAgICAgZHJhd0dyb3VwLmNhbGwodGhpcywgc2VsLCBheGVzW2pdLCBpZHgrKywgXCJheGlzX1wiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChqPTAsIG09aXRlbXMubGVuZ3RoOyBqPG07ICsraikge1xuICAgICAgdGhpcy5kcmF3KHNlbCwgaXRlbXNbal0sIGlkeCsrKTtcbiAgICB9XG4gICAgZm9yIChqPTAsIG09YXhlcy5sZW5ndGg7IGo8bTsgKytqKSB7XG4gICAgICBpZiAoYXhlc1tqXS5kZWYubGF5ZXIgIT09IFwiYmFja1wiKSB7XG4gICAgICAgIGRyYXdHcm91cC5jYWxsKHRoaXMsIHNlbCwgYXhlc1tqXSwgaWR4KyssIFwiYXhpc19cIik7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoaj0wLCBtPWxlZ2VuZHMubGVuZ3RoOyBqPG07ICsraikge1xuICAgICAgZHJhd0dyb3VwLmNhbGwodGhpcywgc2VsLCBsZWdlbmRzW2pdLCBpZHgrKywgXCJsZWdlbmRfXCIpO1xuICAgIH1cbiAgfVxufVxuXG52YXIgbWFya3MgPSBtb2R1bGUuZXhwb3J0cyA9IHtcbiAgdXBkYXRlOiB7XG4gICAgZ3JvdXA6ICAgcmVjdCxcbiAgICBhcmVhOiAgICBhcmVhLFxuICAgIGxpbmU6ICAgIGxpbmUsXG4gICAgYXJjOiAgICAgYXJjLFxuICAgIHBhdGg6ICAgIHBhdGgsXG4gICAgc3ltYm9sOiAgc3ltYm9sLFxuICAgIHJlY3Q6ICAgIHJlY3QsXG4gICAgcnVsZTogICAgcnVsZSxcbiAgICB0ZXh0OiAgICB0ZXh0LFxuICAgIGltYWdlOiAgIGltYWdlXG4gIH0sXG4gIG5lc3RlZDoge1xuICAgIFwiYXJlYVwiOiB0cnVlLFxuICAgIFwibGluZVwiOiB0cnVlXG4gIH0sXG4gIHN0eWxlOiBzdHlsZSxcbiAgZHJhdzoge1xuICAgIGdyb3VwOiAgIGRyYXdHcm91cCxcbiAgICBhcmVhOiAgICBkcmF3KFwicGF0aFwiLCBhcmVhLCB0cnVlKSxcbiAgICBsaW5lOiAgICBkcmF3KFwicGF0aFwiLCBsaW5lLCB0cnVlKSxcbiAgICBhcmM6ICAgICBkcmF3KFwicGF0aFwiLCBhcmMpLFxuICAgIHBhdGg6ICAgIGRyYXcoXCJwYXRoXCIsIHBhdGgpLFxuICAgIHN5bWJvbDogIGRyYXcoXCJwYXRoXCIsIHN5bWJvbCksXG4gICAgcmVjdDogICAgZHJhdyhcInJlY3RcIiwgcmVjdCksXG4gICAgcnVsZTogICAgZHJhdyhcImxpbmVcIiwgcnVsZSksXG4gICAgdGV4dDogICAgZHJhdyhcInRleHRcIiwgdGV4dCksXG4gICAgaW1hZ2U6ICAgZHJhdyhcImltYWdlXCIsIGltYWdlKSxcbiAgICBkcmF3OiAgICBkcmF3IC8vIGV4cG9zZSBmb3IgZXh0ZW5zaWJpbGl0eVxuICB9LFxuICBjdXJyZW50OiBudWxsXG59OyIsInZhciBOb2RlID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvTm9kZScpLFxuICAgIGJvdW5kcyA9IHJlcXVpcmUoJy4uL3V0aWwvYm91bmRzJyksXG4gICAgQyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uc3RhbnRzJyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyk7XG5cbmZ1bmN0aW9uIEJvdW5kZXIobW9kZWwsIG1hcmspIHtcbiAgdGhpcy5fbWFyayA9IG1hcms7XG4gIHJldHVybiBOb2RlLnByb3RvdHlwZS5pbml0LmNhbGwodGhpcywgbW9kZWwuZ3JhcGgpLnJvdXRlcih0cnVlKTtcbn1cblxudmFyIHByb3RvID0gKEJvdW5kZXIucHJvdG90eXBlID0gbmV3IE5vZGUoKSk7XG5cbnByb3RvLmV2YWx1YXRlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgZGVidWcoaW5wdXQsIFtcImJvdW5kc1wiLCB0aGlzLl9tYXJrLm1hcmt0eXBlXSk7XG5cbiAgYm91bmRzLm1hcmsodGhpcy5fbWFyayk7XG4gIGlmICh0aGlzLl9tYXJrLm1hcmt0eXBlID09PSBDLkdST1VQKSBcbiAgICBib3VuZHMubWFyayh0aGlzLl9tYXJrLCBudWxsLCBmYWxzZSk7XG5cbiAgaW5wdXQucmVmbG93ID0gdHJ1ZTtcbiAgcmV0dXJuIGlucHV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCb3VuZGVyOyIsInZhciBkbCA9IHJlcXVpcmUoJ2RhdGFsaWInKSxcbiAgICBOb2RlID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvTm9kZScpLFxuICAgIEVuY29kZXIgID0gcmVxdWlyZSgnLi9FbmNvZGVyJyksXG4gICAgQm91bmRlciAgPSByZXF1aXJlKCcuL0JvdW5kZXInKSxcbiAgICBJdGVtICA9IHJlcXVpcmUoJy4vSXRlbScpLFxuICAgIHBhcnNlRGF0YSA9IHJlcXVpcmUoJy4uL3BhcnNlL2RhdGEnKSxcbiAgICB0dXBsZSA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L3R1cGxlJyksXG4gICAgY2hhbmdlc2V0ID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvY2hhbmdlc2V0JyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyksXG4gICAgQyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uc3RhbnRzJyk7XG5cbmZ1bmN0aW9uIEJ1aWxkZXIoKSB7ICAgIFxuICByZXR1cm4gYXJndW1lbnRzLmxlbmd0aCA/IHRoaXMuaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpIDogdGhpcztcbn1cblxudmFyIHByb3RvID0gKEJ1aWxkZXIucHJvdG90eXBlID0gbmV3IE5vZGUoKSk7XG5cbnByb3RvLmluaXQgPSBmdW5jdGlvbihtb2RlbCwgZGVmLCBtYXJrLCBwYXJlbnQsIHBhcmVudF9pZCwgaW5oZXJpdEZyb20pIHtcbiAgTm9kZS5wcm90b3R5cGUuaW5pdC5jYWxsKHRoaXMsIG1vZGVsLmdyYXBoKVxuICAgIC5yb3V0ZXIodHJ1ZSlcbiAgICAuY29sbGVjdG9yKHRydWUpO1xuXG4gIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gIHRoaXMuX2RlZiAgID0gZGVmO1xuICB0aGlzLl9tYXJrICA9IG1hcms7XG4gIHRoaXMuX2Zyb20gID0gKGRlZi5mcm9tID8gZGVmLmZyb20uZGF0YSA6IG51bGwpIHx8IGluaGVyaXRGcm9tO1xuICB0aGlzLl9kcyAgICA9IGRsLmlzU3RyaW5nKHRoaXMuX2Zyb20pID8gbW9kZWwuZGF0YSh0aGlzLl9mcm9tKSA6IG51bGw7XG4gIHRoaXMuX21hcCAgID0ge307XG5cbiAgdGhpcy5fcmV2aXNlcyA9IGZhbHNlOyAgLy8gU2hvdWxkIHNjZW5lZ3JhcGggaXRlbXMgdHJhY2sgX3ByZXY/XG5cbiAgbWFyay5kZWYgPSBkZWY7XG4gIG1hcmsubWFya3R5cGUgPSBkZWYudHlwZTtcbiAgbWFyay5pbnRlcmFjdGl2ZSA9ICEoZGVmLmludGVyYWN0aXZlID09PSBmYWxzZSk7XG4gIG1hcmsuaXRlbXMgPSBbXTtcblxuICB0aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG4gIHRoaXMuX3BhcmVudF9pZCA9IHBhcmVudF9pZDtcblxuICBpZihkZWYuZnJvbSAmJiAoZGVmLmZyb20ubWFyayB8fCBkZWYuZnJvbS50cmFuc2Zvcm0gfHwgZGVmLmZyb20ubW9kaWZ5KSkge1xuICAgIGlubGluZURzLmNhbGwodGhpcyk7XG4gIH1cblxuICAvLyBOb24tZ3JvdXAgbWFyayBidWlsZGVycyBhcmUgc3VwZXIgbm9kZXMuIEVuY29kZXIgYW5kIEJvdW5kZXIgcmVtYWluIFxuICAvLyBzZXBhcmF0ZSBvcGVyYXRvcnMgYnV0IGFyZSBlbWJlZGRlZCBhbmQgY2FsbGVkIGJ5IEJ1aWxkZXIuZXZhbHVhdGUuXG4gIHRoaXMuX2lzU3VwZXIgPSAodGhpcy5fZGVmLnR5cGUgIT09IEMuR1JPVVApOyBcbiAgdGhpcy5fZW5jb2RlciA9IG5ldyBFbmNvZGVyKHRoaXMuX21vZGVsLCB0aGlzLl9tYXJrKTtcbiAgdGhpcy5fYm91bmRlciA9IG5ldyBCb3VuZGVyKHRoaXMuX21vZGVsLCB0aGlzLl9tYXJrKTtcblxuICBpZih0aGlzLl9kcykgeyB0aGlzLl9lbmNvZGVyLmRlcGVuZGVuY3koQy5EQVRBLCB0aGlzLl9mcm9tKTsgfVxuXG4gIC8vIFNpbmNlIEJ1aWxkZXJzIGFyZSBzdXBlciBub2RlcywgY29weSBvdmVyIGVuY29kZXIgZGVwZW5kZW5jaWVzXG4gIC8vIChib3VuZGVyIGhhcyBubyByZWdpc3RlcmVkIGRlcGVuZGVuY2llcykuXG4gIHRoaXMuZGVwZW5kZW5jeShDLkRBVEEsIHRoaXMuX2VuY29kZXIuZGVwZW5kZW5jeShDLkRBVEEpKTtcbiAgdGhpcy5kZXBlbmRlbmN5KEMuU0NBTEVTLCB0aGlzLl9lbmNvZGVyLmRlcGVuZGVuY3koQy5TQ0FMRVMpKTtcbiAgdGhpcy5kZXBlbmRlbmN5KEMuU0lHTkFMUywgdGhpcy5fZW5jb2Rlci5kZXBlbmRlbmN5KEMuU0lHTkFMUykpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG8ucmV2aXNlcyA9IGZ1bmN0aW9uKHApIHtcbiAgaWYoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0aGlzLl9yZXZpc2VzO1xuXG4gIC8vIElmIHdlJ3ZlIG5vdCBuZWVkZWQgcHJldiBpbiB0aGUgcGFzdCwgYnV0IGEgbmV3IGlubGluZSBkcyBuZWVkcyBpdCBub3dcbiAgLy8gZW5zdXJlIGV4aXN0aW5nIGl0ZW1zIGhhdmUgcHJldiBzZXQuXG4gIGlmKCF0aGlzLl9yZXZpc2VzICYmIHApIHtcbiAgICB0aGlzLl9pdGVtcy5mb3JFYWNoKGZ1bmN0aW9uKGQpIHsgaWYoZC5fcHJldiA9PT0gdW5kZWZpbmVkKSBkLl9wcmV2ID0gQy5TRU5USU5FTDsgfSk7XG4gIH1cblxuICB0aGlzLl9yZXZpc2VzID0gdGhpcy5fcmV2aXNlcyB8fCBwO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIFJlYWN0aXZlIGdlb21ldHJ5IGFuZCBtYXJrLWxldmVsIHRyYW5zZm9ybWF0aW9ucyBhcmUgaGFuZGxlZCBoZXJlIFxuLy8gYmVjYXVzZSB0aGV5IG5lZWQgdGhlaXIgZ3JvdXAncyBkYXRhLWpvaW5lZCBjb250ZXh0LiBcbmZ1bmN0aW9uIGlubGluZURzKCkge1xuICB2YXIgZnJvbSA9IHRoaXMuX2RlZi5mcm9tLFxuICAgICAgZ2VvbSA9IGZyb20ubWFyayxcbiAgICAgIG5hbWUsIHNwZWMsIHNpYmxpbmcsIG91dHB1dDtcblxuICBpZihnZW9tKSB7XG4gICAgbmFtZSA9IFtcInZnXCIsIHRoaXMuX3BhcmVudF9pZCwgZ2VvbV0uam9pbihcIl9cIik7XG4gICAgc3BlYyA9IHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICB0cmFuc2Zvcm06IGZyb20udHJhbnNmb3JtLCBcbiAgICAgIG1vZGlmeTogZnJvbS5tb2RpZnlcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIG5hbWUgPSBbXCJ2Z1wiLCB0aGlzLl9mcm9tLCB0aGlzLl9kZWYudHlwZSwgRGF0ZS5ub3coKV0uam9pbihcIl9cIik7XG4gICAgc3BlYyA9IHtcbiAgICAgIG5hbWU6IG5hbWUsXG4gICAgICBzb3VyY2U6IHRoaXMuX2Zyb20sXG4gICAgICB0cmFuc2Zvcm06IGZyb20udHJhbnNmb3JtLFxuICAgICAgbW9kaWZ5OiBmcm9tLm1vZGlmeVxuICAgIH07XG4gIH1cblxuICB0aGlzLl9mcm9tID0gbmFtZTtcbiAgdGhpcy5fZHMgPSBwYXJzZURhdGEuZGF0YXNvdXJjZSh0aGlzLl9tb2RlbCwgc3BlYyk7XG4gIHZhciByZXZpc2VzID0gdGhpcy5fZHMucmV2aXNlcygpO1xuXG4gIGlmKGdlb20pIHtcbiAgICBzaWJsaW5nID0gdGhpcy5zaWJsaW5nKGdlb20pLnJldmlzZXMocmV2aXNlcyk7XG4gICAgaWYoc2libGluZy5faXNTdXBlcikgc2libGluZy5hZGRMaXN0ZW5lcih0aGlzLl9kcy5saXN0ZW5lcigpKTtcbiAgICBlbHNlIHNpYmxpbmcuX2JvdW5kZXIuYWRkTGlzdGVuZXIodGhpcy5fZHMubGlzdGVuZXIoKSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQXQgdGhpcyBwb2ludCwgd2UgaGF2ZSBhIG5ldyBkYXRhc291cmNlIGJ1dCBpdCBpcyBlbXB0eSBhc1xuICAgIC8vIHRoZSBwcm9wYWdhdGlvbiBjeWNsZSBoYXMgYWxyZWFkeSBjcm9zc2VkIHRoZSBkYXRhc291cmNlcy4gXG4gICAgLy8gU28sIHdlIHJlcHVsc2UganVzdCB0aGlzIGRhdGFzb3VyY2UuIFRoaXMgc2hvdWxkIGJlIHNhZmVcbiAgICAvLyBhcyB0aGUgZHMgaXNuJ3QgY29ubmVjdGVkIHRvIHRoZSBzY2VuZWdyYXBoIHlldC5cbiAgICBcbiAgICB2YXIgb3V0cHV0ID0gdGhpcy5fZHMuc291cmNlKCkucmV2aXNlcyhyZXZpc2VzKS5sYXN0KCk7XG4gICAgICAgIGlucHV0ICA9IGNoYW5nZXNldC5jcmVhdGUob3V0cHV0KTtcblxuICAgIGlucHV0LmFkZCA9IG91dHB1dC5hZGQ7XG4gICAgaW5wdXQubW9kID0gb3V0cHV0Lm1vZDtcbiAgICBpbnB1dC5yZW0gPSBvdXRwdXQucmVtO1xuICAgIGlucHV0LnN0YW1wID0gbnVsbDtcbiAgICB0aGlzLl9ncmFwaC5wcm9wYWdhdGUoaW5wdXQsIHRoaXMuX2RzLmxpc3RlbmVyKCkpO1xuICB9XG59XG5cbnByb3RvLnBpcGVsaW5lID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbdGhpc107XG59O1xuXG5wcm90by5jb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBidWlsZGVyID0gdGhpcztcblxuICB0aGlzLl9tb2RlbC5ncmFwaC5jb25uZWN0KHRoaXMucGlwZWxpbmUoKSk7XG4gIHRoaXMuX2VuY29kZXIuZGVwZW5kZW5jeShDLlNDQUxFUykuZm9yRWFjaChmdW5jdGlvbihzKSB7XG4gICAgYnVpbGRlci5fcGFyZW50LnNjYWxlKHMpLmFkZExpc3RlbmVyKGJ1aWxkZXIpO1xuICB9KTtcblxuICBpZih0aGlzLl9wYXJlbnQpIHtcbiAgICBpZih0aGlzLl9pc1N1cGVyKSB0aGlzLmFkZExpc3RlbmVyKHRoaXMuX3BhcmVudC5fY29sbGVjdG9yKTtcbiAgICBlbHNlIHRoaXMuX2JvdW5kZXIuYWRkTGlzdGVuZXIodGhpcy5fcGFyZW50Ll9jb2xsZWN0b3IpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90by5kaXNjb25uZWN0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBidWlsZGVyID0gdGhpcztcbiAgaWYoIXRoaXMuX2xpc3RlbmVycy5sZW5ndGgpIHJldHVybiB0aGlzO1xuXG4gIE5vZGUucHJvdG90eXBlLmRpc2Nvbm5lY3QuY2FsbCh0aGlzKTtcbiAgdGhpcy5fbW9kZWwuZ3JhcGguZGlzY29ubmVjdCh0aGlzLnBpcGVsaW5lKCkpO1xuICB0aGlzLl9lbmNvZGVyLmRlcGVuZGVuY3koQy5TQ0FMRVMpLmZvckVhY2goZnVuY3Rpb24ocykge1xuICAgIGJ1aWxkZXIuX3BhcmVudC5zY2FsZShzKS5yZW1vdmVMaXN0ZW5lcihidWlsZGVyKTtcbiAgfSk7XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG8uc2libGluZyA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgcmV0dXJuIHRoaXMuX3BhcmVudC5jaGlsZChuYW1lLCB0aGlzLl9wYXJlbnRfaWQpO1xufTtcblxucHJvdG8uZXZhbHVhdGUgPSBmdW5jdGlvbihpbnB1dCkge1xuICBkZWJ1ZyhpbnB1dCwgW1wiYnVpbGRpbmdcIiwgdGhpcy5fZnJvbSwgdGhpcy5fZGVmLnR5cGVdKTtcblxuICB2YXIgb3V0cHV0LCBmdWxsVXBkYXRlLCBmY3MsIGRhdGE7XG5cbiAgaWYodGhpcy5fZHMpIHtcbiAgICBvdXRwdXQgPSBjaGFuZ2VzZXQuY3JlYXRlKGlucHV0KTtcblxuICAgIC8vIFdlIG5lZWQgdG8gZGV0ZXJtaW5lIGlmIGFueSBlbmNvZGVyIGRlcGVuZGVuY2llcyBoYXZlIGJlZW4gdXBkYXRlZC5cbiAgICAvLyBIb3dldmVyLCB0aGUgZW5jb2RlcidzIGRhdGEgc291cmNlIHdpbGwgbGlrZWx5IGJlIHVwZGF0ZWQsIGFuZCBzaG91bGRuJ3RcbiAgICAvLyB0cmlnZ2VyIGFsbCBpdGVtcyB0byBtb2QuXG4gICAgZGF0YSA9IGRsLmR1cGxpY2F0ZShvdXRwdXQuZGF0YSk7XG4gICAgZGVsZXRlIG91dHB1dC5kYXRhW3RoaXMuX2RzLm5hbWUoKV07XG4gICAgZnVsbFVwZGF0ZSA9IHRoaXMuX2VuY29kZXIucmVldmFsdWF0ZShvdXRwdXQpO1xuICAgIG91dHB1dC5kYXRhID0gZGF0YTtcblxuICAgIC8vIElmIGEgc2NhbGUgb3Igc2lnbmFsIGluIHRoZSB1cGRhdGUgcHJvcHNldCBoYXMgYmVlbiB1cGRhdGVkLCBcbiAgICAvLyBzZW5kIGZvcndhcmQgYWxsIGl0ZW1zIGZvciByZWVuY29kaW5nIGlmIHdlIGRvIGFuIGVhcmx5IHJldHVybi5cbiAgICBpZihmdWxsVXBkYXRlKSBvdXRwdXQubW9kID0gdGhpcy5fbWFyay5pdGVtcy5zbGljZSgpO1xuXG4gICAgZmNzID0gdGhpcy5fZHMubGFzdCgpO1xuICAgIGlmKCFmY3MpIHtcbiAgICAgIG91dHB1dC5yZWZsb3cgPSB0cnVlXG4gICAgfSBlbHNlIGlmKGZjcy5zdGFtcCA+IHRoaXMuX3N0YW1wKSB7XG4gICAgICBvdXRwdXQgPSBqb2luRGF0YXNvdXJjZS5jYWxsKHRoaXMsIGZjcywgdGhpcy5fZHMudmFsdWVzKCksIGZ1bGxVcGRhdGUpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmdWxsVXBkYXRlID0gdGhpcy5fZW5jb2Rlci5yZWV2YWx1YXRlKGlucHV0KTtcbiAgICBkYXRhID0gZGwuaXNGdW5jdGlvbih0aGlzLl9kZWYuZnJvbSkgPyB0aGlzLl9kZWYuZnJvbSgpIDogW0MuU0VOVElORUxdO1xuICAgIG91dHB1dCA9IGpvaW5WYWx1ZXMuY2FsbCh0aGlzLCBpbnB1dCwgZGF0YSwgZnVsbFVwZGF0ZSk7XG4gIH1cblxuICBvdXRwdXQgPSB0aGlzLl9ncmFwaC5ldmFsdWF0ZShvdXRwdXQsIHRoaXMuX2VuY29kZXIpO1xuICByZXR1cm4gdGhpcy5faXNTdXBlciA/IHRoaXMuX2dyYXBoLmV2YWx1YXRlKG91dHB1dCwgdGhpcy5fYm91bmRlcikgOiBvdXRwdXQ7XG59O1xuXG5mdW5jdGlvbiBuZXdJdGVtKCkge1xuICB2YXIgcHJldiA9IHRoaXMuX3JldmlzZXMgPyBudWxsIDogdW5kZWZpbmVkLFxuICAgICAgaXRlbSA9IHR1cGxlLmluZ2VzdChuZXcgSXRlbSh0aGlzLl9tYXJrKSwgcHJldik7XG5cbiAgLy8gRm9yIHRoZSByb290IG5vZGUncyBpdGVtXG4gIGlmKHRoaXMuX2RlZi53aWR0aCkgIHR1cGxlLnNldChpdGVtLCBcIndpZHRoXCIsICB0aGlzLl9kZWYud2lkdGgpO1xuICBpZih0aGlzLl9kZWYuaGVpZ2h0KSB0dXBsZS5zZXQoaXRlbSwgXCJoZWlnaHRcIiwgdGhpcy5fZGVmLmhlaWdodCk7XG4gIHJldHVybiBpdGVtO1xufTtcblxuZnVuY3Rpb24gam9pbihkYXRhLCBrZXlmLCBuZXh0LCBvdXRwdXQsIHByZXYsIG1vZCkge1xuICB2YXIgaSwga2V5LCBsZW4sIGl0ZW0sIGRhdHVtLCBlbnRlcjtcblxuICBmb3IoaT0wLCBsZW49ZGF0YS5sZW5ndGg7IGk8bGVuOyArK2kpIHtcbiAgICBkYXR1bSA9IGRhdGFbaV07XG4gICAgaXRlbSAgPSBrZXlmID8gdGhpcy5fbWFwW2tleSA9IGtleWYoZGF0dW0pXSA6IHByZXZbaV07XG4gICAgZW50ZXIgPSBpdGVtID8gZmFsc2UgOiAoaXRlbSA9IG5ld0l0ZW0uY2FsbCh0aGlzKSwgdHJ1ZSk7XG4gICAgaXRlbS5zdGF0dXMgPSBlbnRlciA/IEMuRU5URVIgOiBDLlVQREFURTtcbiAgICBpdGVtLmRhdHVtID0gZGF0dW07XG4gICAgdHVwbGUuc2V0KGl0ZW0sIFwia2V5XCIsIGtleSk7XG4gICAgdGhpcy5fbWFwW2tleV0gPSBpdGVtO1xuICAgIG5leHQucHVzaChpdGVtKTtcbiAgICBpZihlbnRlcikgb3V0cHV0LmFkZC5wdXNoKGl0ZW0pO1xuICAgIGVsc2UgaWYoIW1vZCB8fCAobW9kICYmIG1vZFtkYXR1bS5faWRdKSkgb3V0cHV0Lm1vZC5wdXNoKGl0ZW0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGpvaW5EYXRhc291cmNlKGlucHV0LCBkYXRhLCBmdWxsVXBkYXRlKSB7XG4gIHZhciBvdXRwdXQgPSBjaGFuZ2VzZXQuY3JlYXRlKGlucHV0KSxcbiAgICAgIGtleWYgPSBrZXlGdW5jdGlvbih0aGlzLl9kZWYua2V5IHx8IFwiX2lkXCIpLFxuICAgICAgYWRkID0gaW5wdXQuYWRkLCBcbiAgICAgIG1vZCA9IGlucHV0Lm1vZCwgXG4gICAgICByZW0gPSBpbnB1dC5yZW0sXG4gICAgICBuZXh0ID0gW10sXG4gICAgICBpLCBrZXksIGxlbiwgaXRlbSwgZGF0dW0sIGVudGVyO1xuXG4gIC8vIEJ1aWxkIHJlbXMgZmlyc3QsIGFuZCBwdXQgdGhlbSBhdCB0aGUgaGVhZCBvZiB0aGUgbmV4dCBpdGVtc1xuICAvLyBUaGVuIGJ1aWxkIHRoZSByZXN0IG9mIHRoZSBkYXRhIHZhbHVlcyAod2hpY2ggd29uJ3QgY29udGFpbiByZW0pLlxuICAvLyBUaGlzIHdpbGwgcHJlc2VydmUgdGhlIHNvcnQgb3JkZXIgd2l0aG91dCBuZWVkaW5nIGFueXRoaW5nIGV4dHJhLlxuXG4gIGZvcihpPTAsIGxlbj1yZW0ubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgaXRlbSA9IHRoaXMuX21hcFtrZXkgPSBrZXlmKHJlbVtpXSldO1xuICAgIGl0ZW0uc3RhdHVzID0gQy5FWElUO1xuICAgIG5leHQucHVzaChpdGVtKTtcbiAgICBvdXRwdXQucmVtLnB1c2goaXRlbSk7XG4gICAgdGhpcy5fbWFwW2tleV0gPSBudWxsO1xuICB9XG5cbiAgam9pbi5jYWxsKHRoaXMsIGRhdGEsIGtleWYsIG5leHQsIG91dHB1dCwgbnVsbCwgdHVwbGUuaWRNYXAoZnVsbFVwZGF0ZSA/IGRhdGEgOiBtb2QpKTtcblxuICByZXR1cm4gKHRoaXMuX21hcmsuaXRlbXMgPSBuZXh0LCBvdXRwdXQpO1xufVxuXG5mdW5jdGlvbiBqb2luVmFsdWVzKGlucHV0LCBkYXRhLCBmdWxsVXBkYXRlKSB7XG4gIHZhciBvdXRwdXQgPSBjaGFuZ2VzZXQuY3JlYXRlKGlucHV0KSxcbiAgICAgIGtleWYgPSBrZXlGdW5jdGlvbih0aGlzLl9kZWYua2V5KSxcbiAgICAgIHByZXYgPSB0aGlzLl9tYXJrLml0ZW1zIHx8IFtdLFxuICAgICAgbmV4dCA9IFtdLFxuICAgICAgaSwga2V5LCBsZW4sIGl0ZW0sIGRhdHVtLCBlbnRlcjtcblxuICBmb3IgKGk9MCwgbGVuPXByZXYubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgaXRlbSA9IHByZXZbaV07XG4gICAgaXRlbS5zdGF0dXMgPSBDLkVYSVQ7XG4gICAgaWYgKGtleWYpIHRoaXMuX21hcFtpdGVtLmtleV0gPSBpdGVtO1xuICB9XG4gIFxuICBqb2luLmNhbGwodGhpcywgZGF0YSwga2V5ZiwgbmV4dCwgb3V0cHV0LCBwcmV2LCBmdWxsVXBkYXRlID8gdHVwbGUuaWRNYXAoZGF0YSkgOiBudWxsKTtcblxuICBmb3IgKGk9MCwgbGVuPXByZXYubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgaXRlbSA9IHByZXZbaV07XG4gICAgaWYgKGl0ZW0uc3RhdHVzID09PSBDLkVYSVQpIHtcbiAgICAgIHR1cGxlLnNldChpdGVtLCBcImtleVwiLCBrZXlmID8gaXRlbS5rZXkgOiB0aGlzLl9pdGVtcy5sZW5ndGgpO1xuICAgICAgbmV4dC5zcGxpY2UoMCwgMCwgaXRlbSk7ICAvLyBLZWVwIGl0ZW0gYXJvdW5kIGZvciBcImV4aXRcIiB0cmFuc2l0aW9uLlxuICAgICAgb3V0cHV0LnJlbS5wdXNoKGl0ZW0pO1xuICAgIH1cbiAgfVxuICBcbiAgcmV0dXJuICh0aGlzLl9tYXJrLml0ZW1zID0gbmV4dCwgb3V0cHV0KTtcbn07XG5cbmZ1bmN0aW9uIGtleUZ1bmN0aW9uKGtleSkge1xuICBpZiAoa2V5ID09IG51bGwpIHJldHVybiBudWxsO1xuICB2YXIgZiA9IGRsLmFycmF5KGtleSkubWFwKGRsLmFjY2Vzc29yKTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGQpIHtcbiAgICBmb3IgKHZhciBzPVwiXCIsIGk9MCwgbj1mLmxlbmd0aDsgaTxuOyArK2kpIHtcbiAgICAgIGlmIChpPjApIHMgKz0gXCJ8XCI7XG4gICAgICBzICs9IFN0cmluZyhmW2ldKGQpKTtcbiAgICB9XG4gICAgcmV0dXJuIHM7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQnVpbGRlcjsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L05vZGUnKSxcbiAgICBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKSxcbiAgICBkZWJ1ZyA9IHJlcXVpcmUoJy4uL3V0aWwvZGVidWcnKSxcbiAgICBFTVBUWSA9IHt9O1xuXG5mdW5jdGlvbiBFbmNvZGVyKG1vZGVsLCBtYXJrKSB7XG4gIHZhciBwcm9wcyA9IG1hcmsuZGVmLnByb3BlcnRpZXMgfHwge30sXG4gICAgICB1cGRhdGUgPSBwcm9wcy51cGRhdGU7XG5cbiAgTm9kZS5wcm90b3R5cGUuaW5pdC5jYWxsKHRoaXMsIG1vZGVsLmdyYXBoKVxuXG4gIHRoaXMuX21vZGVsID0gbW9kZWw7XG4gIHRoaXMuX21hcmsgID0gbWFyaztcblxuICBpZih1cGRhdGUpIHtcbiAgICB0aGlzLmRlcGVuZGVuY3koQy5EQVRBLCB1cGRhdGUuZGF0YSk7XG4gICAgdGhpcy5kZXBlbmRlbmN5KEMuU0NBTEVTLCB1cGRhdGUuc2NhbGVzKTtcbiAgICB0aGlzLmRlcGVuZGVuY3koQy5TSUdOQUxTLCB1cGRhdGUuc2lnbmFscyk7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn1cblxudmFyIHByb3RvID0gKEVuY29kZXIucHJvdG90eXBlID0gbmV3IE5vZGUoKSk7XG5cbnByb3RvLmV2YWx1YXRlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgZGVidWcoaW5wdXQsIFtcImVuY29kaW5nXCIsIHRoaXMuX21hcmsuZGVmLnR5cGVdKTtcbiAgdmFyIGl0ZW1zID0gdGhpcy5fbWFyay5pdGVtcyxcbiAgICAgIHByb3BzID0gdGhpcy5fbWFyay5kZWYucHJvcGVydGllcyB8fCB7fSxcbiAgICAgIGVudGVyICA9IHByb3BzLmVudGVyLFxuICAgICAgdXBkYXRlID0gcHJvcHMudXBkYXRlLFxuICAgICAgZXhpdCAgID0gcHJvcHMuZXhpdCxcbiAgICAgIGksIGxlbiwgaXRlbTtcblxuICAvLyBJdGVtcyBtYXJrZWQgZm9yIHJlbW92YWwgYXJlIGF0IHRoZSBoZWFkIG9mIGl0ZW1zLiBQcm9jZXNzIHRoZW0gZmlyc3QuXG4gIGZvcihpPTAsIGxlbj1pbnB1dC5yZW0ubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgaXRlbSA9IGlucHV0LnJlbVtpXTtcbiAgICBpZih1cGRhdGUpIGVuY29kZS5jYWxsKHRoaXMsIHVwZGF0ZSwgaXRlbSwgaW5wdXQudHJhbnMpO1xuICAgIGlmKGV4aXQpICAgZW5jb2RlLmNhbGwodGhpcywgZXhpdCwgICBpdGVtLCBpbnB1dC50cmFucyk7IFxuICAgIGlmKGlucHV0LnRyYW5zICYmICFleGl0KSBpbnB1dC50cmFucy5pbnRlcnBvbGF0ZShpdGVtLCBFTVBUWSk7XG4gICAgZWxzZSBpZighaW5wdXQudHJhbnMpIGl0ZW0ucmVtb3ZlKCk7XG4gIH1cblxuICBmb3IoaT0wLCBsZW49aW5wdXQuYWRkLmxlbmd0aDsgaTxsZW47ICsraSkge1xuICAgIGl0ZW0gPSBpbnB1dC5hZGRbaV07XG4gICAgaWYoZW50ZXIpICBlbmNvZGUuY2FsbCh0aGlzLCBlbnRlciwgIGl0ZW0sIGlucHV0LnRyYW5zKTtcbiAgICBpZih1cGRhdGUpIGVuY29kZS5jYWxsKHRoaXMsIHVwZGF0ZSwgaXRlbSwgaW5wdXQudHJhbnMpO1xuICAgIGl0ZW0uc3RhdHVzID0gQy5VUERBVEU7XG4gIH1cblxuICBpZih1cGRhdGUpIHtcbiAgICBmb3IoaT0wLCBsZW49aW5wdXQubW9kLmxlbmd0aDsgaTxsZW47ICsraSkge1xuICAgICAgaXRlbSA9IGlucHV0Lm1vZFtpXTtcbiAgICAgIGVuY29kZS5jYWxsKHRoaXMsIHVwZGF0ZSwgaXRlbSwgaW5wdXQudHJhbnMpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBpbnB1dDtcbn07XG5cbmZ1bmN0aW9uIGVuY29kZShwcm9wLCBpdGVtLCB0cmFucywgc3RhbXApIHtcbiAgdmFyIG1vZGVsID0gdGhpcy5fbW9kZWwsXG4gICAgICBlbmMgPSBwcm9wLmVuY29kZSxcbiAgICAgIHNnID0gdGhpcy5fZ3JhcGguc2lnbmFsVmFsdWVzKHByb3Auc2lnbmFsc3x8W10pLFxuICAgICAgZGIgPSAocHJvcC5kYXRhfHxbXSkucmVkdWNlKGZ1bmN0aW9uKGRiLCBkcykgeyBcbiAgICAgICAgcmV0dXJuIGRiW2RzXSA9IG1vZGVsLmRhdGEoZHMpLnZhbHVlcygpLCBkYjtcbiAgICAgIH0sIHt9KTtcblxuICBlbmMuY2FsbChlbmMsIGl0ZW0sIGl0ZW0ubWFyay5ncm91cHx8aXRlbSwgdHJhbnMsIGRiLCBzZywgbW9kZWwucHJlZGljYXRlcygpKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFbmNvZGVyOyIsInZhciBkbCA9IHJlcXVpcmUoJ2RhdGFsaWInKSxcbiAgICBOb2RlID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvTm9kZScpLFxuICAgIENvbGxlY3RvciA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L0NvbGxlY3RvcicpLFxuICAgIEJ1aWxkZXIgPSByZXF1aXJlKCcuL0J1aWxkZXInKSxcbiAgICBTY2FsZSA9IHJlcXVpcmUoJy4vU2NhbGUnKSxcbiAgICBwYXJzZUF4ZXMgPSByZXF1aXJlKCcuLi9wYXJzZS9heGVzJyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyksXG4gICAgQyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uc3RhbnRzJyk7XG5cbmZ1bmN0aW9uIEdyb3VwQnVpbGRlcigpIHtcbiAgdGhpcy5fY2hpbGRyZW4gPSB7fTtcbiAgdGhpcy5fc2NhbGVyID0gbnVsbDtcbiAgdGhpcy5fcmVjdXJzb3IgPSBudWxsO1xuXG4gIHRoaXMuX3NjYWxlcyA9IHt9O1xuICB0aGlzLnNjYWxlID0gc2NhbGUuYmluZCh0aGlzKTtcbiAgcmV0dXJuIGFyZ3VtZW50cy5sZW5ndGggPyB0aGlzLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKSA6IHRoaXM7XG59XG5cbnZhciBwcm90byA9IChHcm91cEJ1aWxkZXIucHJvdG90eXBlID0gbmV3IEJ1aWxkZXIoKSk7XG5cbnByb3RvLmluaXQgPSBmdW5jdGlvbihtb2RlbCwgZGVmLCBtYXJrLCBwYXJlbnQsIHBhcmVudF9pZCwgaW5oZXJpdEZyb20pIHtcbiAgdmFyIGJ1aWxkZXIgPSB0aGlzO1xuXG4gIHRoaXMuX3NjYWxlciA9IG5ldyBOb2RlKG1vZGVsLmdyYXBoKTtcblxuICAoZGVmLnNjYWxlc3x8W10pLmZvckVhY2goZnVuY3Rpb24ocykgeyBcbiAgICBzID0gYnVpbGRlci5zY2FsZShzLm5hbWUsIG5ldyBTY2FsZShtb2RlbCwgcywgYnVpbGRlcikpO1xuICAgIGJ1aWxkZXIuX3NjYWxlci5hZGRMaXN0ZW5lcihzKTsgIC8vIFNjYWxlcyBzaG91bGQgYmUgY29tcHV0ZWQgYWZ0ZXIgZ3JvdXAgaXMgZW5jb2RlZFxuICB9KTtcblxuICB0aGlzLl9yZWN1cnNvciA9IG5ldyBOb2RlKG1vZGVsLmdyYXBoKTtcbiAgdGhpcy5fcmVjdXJzb3IuZXZhbHVhdGUgPSByZWN1cnNlLmJpbmQodGhpcyk7XG5cbiAgdmFyIHNjYWxlcyA9IChkZWYuYXhlc3x8W10pLnJlZHVjZShmdW5jdGlvbihhY2MsIHgpIHtcbiAgICByZXR1cm4gKGFjY1t4LnNjYWxlXSA9IDEsIGFjYyk7XG4gIH0sIHt9KTtcbiAgdGhpcy5fcmVjdXJzb3IuZGVwZW5kZW5jeShDLlNDQUxFUywgZGwua2V5cyhzY2FsZXMpKTtcblxuICAvLyBXZSBvbmx5IG5lZWQgYSBjb2xsZWN0b3IgZm9yIHVwLXByb3BhZ2F0aW9uIG9mIGJvdW5kcyBjYWxjdWxhdGlvbixcbiAgLy8gc28gb25seSBHcm91cEJ1aWxkZXJzLCBhbmQgbm90IHJlZ3VsYXIgQnVpbGRlcnMsIGhhdmUgY29sbGVjdG9ycy5cbiAgdGhpcy5fY29sbGVjdG9yID0gbmV3IENvbGxlY3Rvcihtb2RlbC5ncmFwaCk7XG5cbiAgcmV0dXJuIEJ1aWxkZXIucHJvdG90eXBlLmluaXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbnByb3RvLmV2YWx1YXRlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIG91dHB1dCA9IEJ1aWxkZXIucHJvdG90eXBlLmV2YWx1YXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyksXG4gICAgICBidWlsZGVyID0gdGhpcztcblxuICBvdXRwdXQuYWRkLmZvckVhY2goZnVuY3Rpb24oZ3JvdXApIHsgYnVpbGRHcm91cC5jYWxsKGJ1aWxkZXIsIG91dHB1dCwgZ3JvdXApOyB9KTtcbiAgcmV0dXJuIG91dHB1dDtcbn07XG5cbnByb3RvLnBpcGVsaW5lID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbdGhpcywgdGhpcy5fc2NhbGVyLCB0aGlzLl9yZWN1cnNvciwgdGhpcy5fY29sbGVjdG9yLCB0aGlzLl9ib3VuZGVyXTtcbn07XG5cbnByb3RvLmRpc2Nvbm5lY3QgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGJ1aWxkZXIgPSB0aGlzO1xuICBkbC5rZXlzKGJ1aWxkZXIuX2NoaWxkcmVuKS5mb3JFYWNoKGZ1bmN0aW9uKGdyb3VwX2lkKSB7XG4gICAgYnVpbGRlci5fY2hpbGRyZW5bZ3JvdXBfaWRdLmZvckVhY2goZnVuY3Rpb24oYykge1xuICAgICAgYnVpbGRlci5fcmVjdXJzb3IucmVtb3ZlTGlzdGVuZXIoYy5idWlsZGVyKTtcbiAgICAgIGMuYnVpbGRlci5kaXNjb25uZWN0KCk7XG4gICAgfSlcbiAgfSk7XG5cbiAgYnVpbGRlci5fY2hpbGRyZW4gPSB7fTtcbiAgcmV0dXJuIEJ1aWxkZXIucHJvdG90eXBlLmRpc2Nvbm5lY3QuY2FsbCh0aGlzKTtcbn07XG5cbnByb3RvLmNoaWxkID0gZnVuY3Rpb24obmFtZSwgZ3JvdXBfaWQpIHtcbiAgdmFyIGNoaWxkcmVuID0gdGhpcy5fY2hpbGRyZW5bZ3JvdXBfaWRdLFxuICAgICAgaSA9IDAsIGxlbiA9IGNoaWxkcmVuLmxlbmd0aCxcbiAgICAgIGNoaWxkO1xuXG4gIGZvcig7IGk8bGVuOyArK2kpIHtcbiAgICBjaGlsZCA9IGNoaWxkcmVuW2ldO1xuICAgIGlmKGNoaWxkLnR5cGUgPT0gQy5NQVJLICYmIGNoaWxkLmJ1aWxkZXIuX2RlZi5uYW1lID09IG5hbWUpIGJyZWFrO1xuICB9XG5cbiAgcmV0dXJuIGNoaWxkLmJ1aWxkZXI7XG59O1xuXG5mdW5jdGlvbiByZWN1cnNlKGlucHV0KSB7XG4gIHZhciBidWlsZGVyID0gdGhpcyxcbiAgICAgIGhhc01hcmtzID0gdGhpcy5fZGVmLm1hcmtzICYmIHRoaXMuX2RlZi5tYXJrcy5sZW5ndGggPiAwLFxuICAgICAgaGFzQXhlcyA9IHRoaXMuX2RlZi5heGVzICYmIHRoaXMuX2RlZi5heGVzLmxlbmd0aCA+IDAsXG4gICAgICBpLCBsZW4sIGdyb3VwLCBwaXBlbGluZSwgZGVmLCBpbmxpbmUgPSBmYWxzZTtcblxuICBmb3IoaT0wLCBsZW49aW5wdXQuYWRkLmxlbmd0aDsgaTxsZW47ICsraSkge1xuICAgIGdyb3VwID0gaW5wdXQuYWRkW2ldO1xuICAgIGlmKGhhc01hcmtzKSBidWlsZE1hcmtzLmNhbGwodGhpcywgaW5wdXQsIGdyb3VwKTtcbiAgICBpZihoYXNBeGVzKSAgYnVpbGRBeGVzLmNhbGwodGhpcywgaW5wdXQsIGdyb3VwKTtcbiAgfVxuXG4gIC8vIFdpcmUgdXAgbmV3IGNoaWxkcmVuIGJ1aWxkZXJzIGluIHJldmVyc2UgdG8gbWluaW1pemUgZ3JhcGggcmV3cml0ZXMuXG4gIGZvciAoaT1pbnB1dC5hZGQubGVuZ3RoLTE7IGk+PTA7IC0taSkge1xuICAgIGdyb3VwID0gaW5wdXQuYWRkW2ldO1xuICAgIGZvciAoaj10aGlzLl9jaGlsZHJlbltncm91cC5faWRdLmxlbmd0aC0xOyBqPj0wOyAtLWopIHtcbiAgICAgIGMgPSB0aGlzLl9jaGlsZHJlbltncm91cC5faWRdW2pdO1xuICAgICAgYy5idWlsZGVyLmNvbm5lY3QoKTtcbiAgICAgIHBpcGVsaW5lID0gYy5idWlsZGVyLnBpcGVsaW5lKCk7XG4gICAgICBkZWYgPSBjLmJ1aWxkZXIuX2RlZjtcblxuICAgICAgLy8gVGhpcyBuZXcgY2hpbGQgbmVlZHMgdG8gYmUgYnVpbHQgZHVyaW5nIHRoaXMgcHJvcGFnYXRpb24gY3ljbGUuXG4gICAgICAvLyBXZSBjb3VsZCBhZGQgaXRzIGJ1aWxkZXIgYXMgYSBsaXN0ZW5lciBvZmYgdGhlIF9yZWN1cnNvciBub2RlLCBcbiAgICAgIC8vIGJ1dCB0cnkgdG8gaW5saW5lIGl0IGlmIHdlIGNhbiB0byBtaW5pbWl6ZSBncmFwaCBkaXNwYXRjaGVzLlxuICAgICAgaW5saW5lID0gKGRlZi50eXBlICE9PSBDLkdST1VQKTtcbiAgICAgIGlubGluZSA9IGlubGluZSAmJiAodGhpcy5fbW9kZWwuZGF0YShjLmZyb20pICE9PSB1bmRlZmluZWQpOyBcbiAgICAgIGlubGluZSA9IGlubGluZSAmJiAocGlwZWxpbmVbcGlwZWxpbmUubGVuZ3RoLTFdLmxpc3RlbmVycygpLmxlbmd0aCA9PSAxKTsgLy8gUmVhY3RpdmUgZ2VvbVxuICAgICAgYy5pbmxpbmUgPSBpbmxpbmU7XG5cbiAgICAgIGlmKGlubGluZSkgYy5idWlsZGVyLmV2YWx1YXRlKGlucHV0KTtcbiAgICAgIGVsc2UgdGhpcy5fcmVjdXJzb3IuYWRkTGlzdGVuZXIoYy5idWlsZGVyKTtcbiAgICB9XG4gIH1cblxuICBmb3IoaT0wLCBsZW49aW5wdXQubW9kLmxlbmd0aDsgaTxsZW47ICsraSkge1xuICAgIGdyb3VwID0gaW5wdXQubW9kW2ldO1xuICAgIC8vIFJlbW92ZSB0ZW1wb3JhcnkgY29ubmVjdGlvbiBmb3IgbWFya3MgdGhhdCBkcmF3IGZyb20gYSBzb3VyY2VcbiAgICBpZihoYXNNYXJrcykge1xuICAgICAgYnVpbGRlci5fY2hpbGRyZW5bZ3JvdXAuX2lkXS5mb3JFYWNoKGZ1bmN0aW9uKGMpIHtcbiAgICAgICAgaWYoYy50eXBlID09IEMuTUFSSyAmJiAhYy5pbmxpbmUgJiYgYnVpbGRlci5fbW9kZWwuZGF0YShjLmZyb20pICE9PSB1bmRlZmluZWQgKSB7XG4gICAgICAgICAgYnVpbGRlci5fcmVjdXJzb3IucmVtb3ZlTGlzdGVuZXIoYy5idWlsZGVyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIGF4ZXMgZGF0YSBkZWZzXG4gICAgaWYoaGFzQXhlcykge1xuICAgICAgcGFyc2VBeGVzKGJ1aWxkZXIuX21vZGVsLCBidWlsZGVyLl9kZWYuYXhlcywgZ3JvdXAuYXhlcywgZ3JvdXApO1xuICAgICAgZ3JvdXAuYXhlcy5mb3JFYWNoKGZ1bmN0aW9uKGEsIGkpIHsgYS5kZWYoKSB9KTtcbiAgICB9ICAgICAgXG4gIH1cblxuICBmb3IoaT0wLCBsZW49aW5wdXQucmVtLmxlbmd0aDsgaTxsZW47ICsraSkge1xuICAgIGdyb3VwID0gaW5wdXQucmVtW2ldO1xuICAgIC8vIEZvciBkZWxldGVkIGdyb3VwcywgZGlzY29ubmVjdCB0aGVpciBjaGlsZHJlblxuICAgIGJ1aWxkZXIuX2NoaWxkcmVuW2dyb3VwLl9pZF0uZm9yRWFjaChmdW5jdGlvbihjKSB7IFxuICAgICAgYnVpbGRlci5fcmVjdXJzb3IucmVtb3ZlTGlzdGVuZXIoYy5idWlsZGVyKTtcbiAgICAgIGMuYnVpbGRlci5kaXNjb25uZWN0KCk7IFxuICAgIH0pO1xuICAgIGRlbGV0ZSBidWlsZGVyLl9jaGlsZHJlbltncm91cC5faWRdO1xuICB9XG5cbiAgcmV0dXJuIGlucHV0O1xufTtcblxuZnVuY3Rpb24gc2NhbGUobmFtZSwgc2NhbGUpIHtcbiAgdmFyIGdyb3VwID0gdGhpcztcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikgcmV0dXJuIChncm91cC5fc2NhbGVzW25hbWVdID0gc2NhbGUsIHNjYWxlKTtcbiAgd2hpbGUoc2NhbGUgPT0gbnVsbCkge1xuICAgIHNjYWxlID0gZ3JvdXAuX3NjYWxlc1tuYW1lXTtcbiAgICBncm91cCA9IGdyb3VwLm1hcmsgPyBncm91cC5tYXJrLmdyb3VwIDogZ3JvdXAuX3BhcmVudDtcbiAgICBpZighZ3JvdXApIGJyZWFrO1xuICB9XG4gIHJldHVybiBzY2FsZTtcbn1cblxuZnVuY3Rpb24gYnVpbGRHcm91cChpbnB1dCwgZ3JvdXApIHtcbiAgZGVidWcoaW5wdXQsIFtcImJ1aWxkaW5nIGdyb3VwXCIsIGdyb3VwLl9pZF0pO1xuXG4gIGdyb3VwLl9zY2FsZXMgPSBncm91cC5fc2NhbGVzIHx8IHt9OyAgICBcbiAgZ3JvdXAuc2NhbGUgID0gc2NhbGUuYmluZChncm91cCk7XG5cbiAgZ3JvdXAuaXRlbXMgPSBncm91cC5pdGVtcyB8fCBbXTtcbiAgdGhpcy5fY2hpbGRyZW5bZ3JvdXAuX2lkXSA9IHRoaXMuX2NoaWxkcmVuW2dyb3VwLl9pZF0gfHwgW107XG5cbiAgZ3JvdXAuYXhlcyA9IGdyb3VwLmF4ZXMgfHwgW107XG4gIGdyb3VwLmF4aXNJdGVtcyA9IGdyb3VwLmF4aXNJdGVtcyB8fCBbXTtcbn1cblxuZnVuY3Rpb24gYnVpbGRNYXJrcyhpbnB1dCwgZ3JvdXApIHtcbiAgZGVidWcoaW5wdXQsIFtcImJ1aWxkaW5nIG1hcmtzXCIsIGdyb3VwLl9pZF0pO1xuICB2YXIgbWFya3MgPSB0aGlzLl9kZWYubWFya3MsXG4gICAgICBsaXN0ZW5lcnMgPSBbXSxcbiAgICAgIG1hcmssIGZyb20sIGluaGVyaXQsIGksIGxlbiwgbSwgYjtcblxuICBmb3IoaT0wLCBsZW49bWFya3MubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgbWFyayA9IG1hcmtzW2ldO1xuICAgIGZyb20gPSBtYXJrLmZyb20gfHwge307XG4gICAgaW5oZXJpdCA9IFwidmdfXCIrZ3JvdXAuZGF0dW0uX2lkO1xuICAgIGdyb3VwLml0ZW1zW2ldID0ge2dyb3VwOiBncm91cH07XG4gICAgYiA9IChtYXJrLnR5cGUgPT09IEMuR1JPVVApID8gbmV3IEdyb3VwQnVpbGRlcigpIDogbmV3IEJ1aWxkZXIoKTtcbiAgICBiLmluaXQodGhpcy5fbW9kZWwsIG1hcmssIGdyb3VwLml0ZW1zW2ldLCB0aGlzLCBncm91cC5faWQsIGluaGVyaXQpO1xuICAgIHRoaXMuX2NoaWxkcmVuW2dyb3VwLl9pZF0ucHVzaCh7IFxuICAgICAgYnVpbGRlcjogYiwgXG4gICAgICBmcm9tOiBmcm9tLmRhdGEgfHwgKGZyb20ubWFyayA/IChcInZnX1wiICsgZ3JvdXAuX2lkICsgXCJfXCIgKyBmcm9tLm1hcmspIDogaW5oZXJpdCksIFxuICAgICAgdHlwZTogQy5NQVJLIFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIGJ1aWxkQXhlcyhpbnB1dCwgZ3JvdXApIHtcbiAgdmFyIGF4ZXMgPSBncm91cC5heGVzLFxuICAgICAgYXhpc0l0ZW1zID0gZ3JvdXAuYXhpc0l0ZW1zLFxuICAgICAgYnVpbGRlciA9IHRoaXM7XG5cbiAgcGFyc2VBeGVzKHRoaXMuX21vZGVsLCB0aGlzLl9kZWYuYXhlcywgYXhlcywgZ3JvdXApO1xuICBheGVzLmZvckVhY2goZnVuY3Rpb24oYSwgaSkge1xuICAgIHZhciBzY2FsZSA9IGJ1aWxkZXIuX2RlZi5heGVzW2ldLnNjYWxlLFxuICAgICAgICBkZWYgPSBhLmRlZigpLFxuICAgICAgICBiID0gbnVsbDtcblxuICAgIGF4aXNJdGVtc1tpXSA9IHtncm91cDogZ3JvdXAsIGF4aXNEZWY6IGRlZn07XG4gICAgYiA9IChkZWYudHlwZSA9PT0gQy5HUk9VUCkgPyBuZXcgR3JvdXBCdWlsZGVyKCkgOiBuZXcgQnVpbGRlcigpO1xuICAgIGIuaW5pdChidWlsZGVyLl9tb2RlbCwgZGVmLCBheGlzSXRlbXNbaV0sIGJ1aWxkZXIpXG4gICAgICAuZGVwZW5kZW5jeShDLlNDQUxFUywgc2NhbGUpO1xuICAgIGJ1aWxkZXIuX2NoaWxkcmVuW2dyb3VwLl9pZF0ucHVzaCh7IGJ1aWxkZXI6IGIsIHR5cGU6IEMuQVhJUywgc2NhbGU6IHNjYWxlIH0pO1xuICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBHcm91cEJ1aWxkZXI7IiwiZnVuY3Rpb24gSXRlbShtYXJrKSB7XG4gIHRoaXMubWFyayA9IG1hcms7XG59XG5cbnZhciBwcm90b3R5cGUgPSBJdGVtLnByb3RvdHlwZTtcblxucHJvdG90eXBlLmhhc1Byb3BlcnR5U2V0ID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgcHJvcHMgPSB0aGlzLm1hcmsuZGVmLnByb3BlcnRpZXM7XG4gIHJldHVybiBwcm9wcyAmJiBwcm9wc1tuYW1lXSAhPSBudWxsO1xufTtcblxucHJvdG90eXBlLmNvdXNpbiA9IGZ1bmN0aW9uKG9mZnNldCwgaW5kZXgpIHtcbiAgaWYgKG9mZnNldCA9PT0gMCkgcmV0dXJuIHRoaXM7XG4gIG9mZnNldCA9IG9mZnNldCB8fCAtMTtcbiAgdmFyIG1hcmsgPSB0aGlzLm1hcmssXG4gICAgICBncm91cCA9IG1hcmsuZ3JvdXAsXG4gICAgICBpaWR4ID0gaW5kZXg9PW51bGwgPyBtYXJrLml0ZW1zLmluZGV4T2YodGhpcykgOiBpbmRleCxcbiAgICAgIG1pZHggPSBncm91cC5pdGVtcy5pbmRleE9mKG1hcmspICsgb2Zmc2V0O1xuICByZXR1cm4gZ3JvdXAuaXRlbXNbbWlkeF0uaXRlbXNbaWlkeF07XG59O1xuXG5wcm90b3R5cGUuc2libGluZyA9IGZ1bmN0aW9uKG9mZnNldCkge1xuICBpZiAob2Zmc2V0ID09PSAwKSByZXR1cm4gdGhpcztcbiAgb2Zmc2V0ID0gb2Zmc2V0IHx8IC0xO1xuICB2YXIgbWFyayA9IHRoaXMubWFyayxcbiAgICAgIGlpZHggPSBtYXJrLml0ZW1zLmluZGV4T2YodGhpcykgKyBvZmZzZXQ7XG4gIHJldHVybiBtYXJrLml0ZW1zW2lpZHhdO1xufTtcblxucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaXRlbSA9IHRoaXMsXG4gICAgICBsaXN0ID0gaXRlbS5tYXJrLml0ZW1zLFxuICAgICAgaSA9IGxpc3QuaW5kZXhPZihpdGVtKTtcbiAgaWYgKGkgPj0gMCkgKGk9PT1saXN0Lmxlbmd0aC0xKSA/IGxpc3QucG9wKCkgOiBsaXN0LnNwbGljZShpLCAxKTtcbiAgcmV0dXJuIGl0ZW07XG59O1xuXG5wcm90b3R5cGUudG91Y2ggPSBmdW5jdGlvbigpIHtcbiAgaWYgKHRoaXMucGF0aENhY2hlKSB0aGlzLnBhdGhDYWNoZSA9IG51bGw7XG4gIGlmICh0aGlzLm1hcmsucGF0aENhY2hlKSB0aGlzLm1hcmsucGF0aENhY2hlID0gbnVsbDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSXRlbTsiLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgZDMgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5kMyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuZDMgOiBudWxsKSxcbiAgICBOb2RlID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvTm9kZScpLFxuICAgIEFnZ3JlZ2F0ZSA9IHJlcXVpcmUoJy4uL3RyYW5zZm9ybXMvQWdncmVnYXRlJyksXG4gICAgY2hhbmdlc2V0ID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvY2hhbmdlc2V0JyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyksXG4gICAgY29uZmlnID0gcmVxdWlyZSgnLi4vdXRpbC9jb25maWcnKSxcbiAgICBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKTtcblxudmFyIEdST1VQX1BST1BFUlRZID0ge3dpZHRoOiAxLCBoZWlnaHQ6IDF9O1xuXG5mdW5jdGlvbiBTY2FsZShtb2RlbCwgZGVmLCBwYXJlbnQpIHtcbiAgdGhpcy5fbW9kZWwgICA9IG1vZGVsO1xuICB0aGlzLl9kZWYgICAgID0gZGVmO1xuICB0aGlzLl9wYXJlbnQgID0gcGFyZW50O1xuICB0aGlzLl91cGRhdGVkID0gZmFsc2U7XG4gIHJldHVybiBOb2RlLnByb3RvdHlwZS5pbml0LmNhbGwodGhpcywgbW9kZWwuZ3JhcGgpO1xufVxuXG52YXIgcHJvdG8gPSAoU2NhbGUucHJvdG90eXBlID0gbmV3IE5vZGUoKSk7XG5cbnByb3RvLmV2YWx1YXRlID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzLFxuICAgICAgZm4gPSBmdW5jdGlvbihncm91cCkgeyBzY2FsZS5jYWxsKHNlbGYsIGdyb3VwKTsgfTtcblxuICB0aGlzLl91cGRhdGVkID0gZmFsc2U7XG4gIGlucHV0LmFkZC5mb3JFYWNoKGZuKTtcbiAgaW5wdXQubW9kLmZvckVhY2goZm4pO1xuXG4gIC8vIFNjYWxlcyBhcmUgYXQgdGhlIGVuZCBvZiBhbiBlbmNvZGluZyBwaXBlbGluZSwgc28gdGhleSBzaG91bGQgZm9yd2FyZCBhXG4gIC8vIHJlZmxvdyBwdWxzZS4gVGh1cywgaWYgbXVsdGlwbGUgc2NhbGVzIHVwZGF0ZSBpbiB0aGUgcGFyZW50IGdyb3VwLCB3ZSBkb24ndFxuICAvLyByZWV2YWx1YXRlIGNoaWxkIG1hcmtzIG11bHRpcGxlIHRpbWVzLiBcbiAgaWYgKHRoaXMuX3VwZGF0ZWQpIGlucHV0LnNjYWxlc1t0aGlzLl9kZWYubmFtZV0gPSAxO1xuICByZXR1cm4gY2hhbmdlc2V0LmNyZWF0ZShpbnB1dCwgdHJ1ZSk7XG59O1xuXG4vLyBBbGwgb2YgYSBzY2FsZSdzIGRlcGVuZGVuY2llcyBhcmUgcmVnaXN0ZXJlZCBkdXJpbmcgcHJvcGFnYXRpb24gYXMgd2UgcGFyc2Vcbi8vIGRhdGFSZWZzLiBTbyBhIHNjYWxlIG11c3QgYmUgcmVzcG9uc2libGUgZm9yIGNvbm5lY3RpbmcgaXRzZWxmIHRvIGRlcGVuZGVudHMuXG5wcm90by5kZXBlbmRlbmN5ID0gZnVuY3Rpb24odHlwZSwgZGVwcykge1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PSAyKSB7XG4gICAgZGVwcyA9IGRsLmFycmF5KGRlcHMpO1xuICAgIGZvcih2YXIgaT0wLCBsZW49ZGVwcy5sZW5ndGg7IGk8bGVuOyArK2kpIHtcbiAgICAgIHRoaXMuX2dyYXBoW3R5cGUgPT0gQy5EQVRBID8gQy5EQVRBIDogQy5TSUdOQUxdKGRlcHNbaV0pXG4gICAgICAgIC5hZGRMaXN0ZW5lcih0aGlzLl9wYXJlbnQpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBOb2RlLnByb3RvdHlwZS5kZXBlbmRlbmN5LmNhbGwodGhpcywgdHlwZSwgZGVwcyk7XG59O1xuXG5mdW5jdGlvbiBzY2FsZShncm91cCkge1xuICB2YXIgbmFtZSA9IHRoaXMuX2RlZi5uYW1lLFxuICAgICAgcHJldiA9IG5hbWUgKyBcIjpwcmV2XCIsXG4gICAgICBzID0gaW5zdGFuY2UuY2FsbCh0aGlzLCBncm91cC5zY2FsZShuYW1lKSksXG4gICAgICBtID0gcy50eXBlPT09Qy5PUkRJTkFMID8gb3JkaW5hbCA6IHF1YW50aXRhdGl2ZSxcbiAgICAgIHJuZyA9IHJhbmdlLmNhbGwodGhpcywgZ3JvdXApO1xuXG4gIG0uY2FsbCh0aGlzLCBzLCBybmcsIGdyb3VwKTtcblxuICBncm91cC5zY2FsZShuYW1lLCBzKTtcbiAgZ3JvdXAuc2NhbGUocHJldiwgZ3JvdXAuc2NhbGUocHJldikgfHwgcyk7XG5cbiAgcmV0dXJuIHM7XG59XG5cbmZ1bmN0aW9uIGluc3RhbmNlKHNjYWxlKSB7XG4gIHZhciB0eXBlID0gdGhpcy5fZGVmLnR5cGUgfHwgQy5MSU5FQVI7XG4gIGlmICghc2NhbGUgfHwgdHlwZSAhPT0gc2NhbGUudHlwZSkge1xuICAgIHZhciBjdG9yID0gY29uZmlnLnNjYWxlW3R5cGVdIHx8IGQzLnNjYWxlW3R5cGVdO1xuICAgIGlmICghY3RvcikgZGwuZXJyb3IoXCJVbnJlY29nbml6ZWQgc2NhbGUgdHlwZTogXCIgKyB0eXBlKTtcbiAgICAoc2NhbGUgPSBjdG9yKCkpLnR5cGUgPSBzY2FsZS50eXBlIHx8IHR5cGU7XG4gICAgc2NhbGUuc2NhbGVOYW1lID0gdGhpcy5fZGVmLm5hbWU7XG4gICAgc2NhbGUuX3ByZXYgPSB7fTtcbiAgfVxuICByZXR1cm4gc2NhbGU7XG59XG5cbmZ1bmN0aW9uIG9yZGluYWwoc2NhbGUsIHJuZywgZ3JvdXApIHtcbiAgdmFyIGRlZiA9IHRoaXMuX2RlZixcbiAgICAgIHByZXYgPSBzY2FsZS5fcHJldixcbiAgICAgIGRvbWFpbiwgc29ydCwgc3RyLCByZWZzLCBkYXRhRHJpdmVuUmFuZ2UgPSBmYWxzZTtcbiAgXG4gIC8vIHJhbmdlIHByZS1wcm9jZXNzaW5nIGZvciBkYXRhLWRyaXZlbiByYW5nZXNcbiAgaWYgKGRsLmlzT2JqZWN0KGRlZi5yYW5nZSkgJiYgIWRsLmlzQXJyYXkoZGVmLnJhbmdlKSkge1xuICAgIGRhdGFEcml2ZW5SYW5nZSA9IHRydWU7XG4gICAgcm5nID0gZGF0YVJlZi5jYWxsKHRoaXMsIEMuUkFOR0UsIGRlZi5yYW5nZSwgc2NhbGUsIGdyb3VwKTtcbiAgfVxuICBcbiAgLy8gZG9tYWluXG4gIGRvbWFpbiA9IGRhdGFSZWYuY2FsbCh0aGlzLCBDLkRPTUFJTiwgZGVmLmRvbWFpbiwgc2NhbGUsIGdyb3VwKTtcbiAgaWYgKGRvbWFpbiAmJiAhZGwuZXF1YWwocHJldi5kb21haW4sIGRvbWFpbikpIHtcbiAgICBzY2FsZS5kb21haW4oZG9tYWluKTtcbiAgICBwcmV2LmRvbWFpbiA9IGRvbWFpbjtcbiAgICB0aGlzLl91cGRhdGVkID0gdHJ1ZTtcbiAgfSBcblxuICAvLyByYW5nZVxuICBpZiAoZGwuZXF1YWwocHJldi5yYW5nZSwgcm5nKSkgcmV0dXJuO1xuXG4gIHN0ciA9IHR5cGVvZiBybmdbMF0gPT09ICdzdHJpbmcnO1xuICBpZiAoc3RyIHx8IHJuZy5sZW5ndGggPiAyIHx8IHJuZy5sZW5ndGg9PT0xIHx8IGRhdGFEcml2ZW5SYW5nZSkge1xuICAgIHNjYWxlLnJhbmdlKHJuZyk7IC8vIGNvbG9yIG9yIHNoYXBlIHZhbHVlc1xuICB9IGVsc2UgaWYgKGRlZi5wb2ludHMpIHtcbiAgICBzY2FsZS5yYW5nZVBvaW50cyhybmcsIGRlZi5wYWRkaW5nfHwwKTtcbiAgfSBlbHNlIGlmIChkZWYucm91bmQgfHwgZGVmLnJvdW5kPT09dW5kZWZpbmVkKSB7XG4gICAgc2NhbGUucmFuZ2VSb3VuZEJhbmRzKHJuZywgZGVmLnBhZGRpbmd8fDApO1xuICB9IGVsc2Uge1xuICAgIHNjYWxlLnJhbmdlQmFuZHMocm5nLCBkZWYucGFkZGluZ3x8MCk7XG4gIH1cblxuICBwcmV2LnJhbmdlID0gcm5nO1xuICB0aGlzLl91cGRhdGVkID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gcXVhbnRpdGF0aXZlKHNjYWxlLCBybmcsIGdyb3VwKSB7XG4gIHZhciBkZWYgPSB0aGlzLl9kZWYsXG4gICAgICBwcmV2ID0gc2NhbGUuX3ByZXYsXG4gICAgICBkb21haW4sIGludGVydmFsO1xuXG4gIC8vIGRvbWFpblxuICBkb21haW4gPSAoZGVmLnR5cGUgPT09IEMuUVVBTlRJTEUpXG4gICAgPyBkYXRhUmVmLmNhbGwodGhpcywgQy5ET01BSU4sIGRlZi5kb21haW4sIHNjYWxlLCBncm91cClcbiAgICA6IGRvbWFpbk1pbk1heC5jYWxsKHRoaXMsIHNjYWxlLCBncm91cCk7XG4gIGlmIChkb21haW4gJiYgIWRsLmVxdWFsKHByZXYuZG9tYWluLCBkb21haW4pKSB7XG4gICAgc2NhbGUuZG9tYWluKGRvbWFpbik7XG4gICAgcHJldi5kb21haW4gPSBkb21haW47XG4gICAgdGhpcy5fdXBkYXRlZCA9IHRydWU7XG4gIH0gXG5cbiAgLy8gcmFuZ2VcbiAgLy8gdmVydGljYWwgc2NhbGVzIHNob3VsZCBmbGlwIGJ5IGRlZmF1bHQsIHNvIHVzZSBYT1IgaGVyZVxuICBpZiAoZGVmLnJhbmdlID09PSBcImhlaWdodFwiKSBybmcgPSBybmcucmV2ZXJzZSgpO1xuICBpZiAoZGwuZXF1YWwocHJldi5yYW5nZSwgcm5nKSkgcmV0dXJuO1xuICBzY2FsZVtkZWYucm91bmQgJiYgc2NhbGUucmFuZ2VSb3VuZCA/IFwicmFuZ2VSb3VuZFwiIDogXCJyYW5nZVwiXShybmcpO1xuICBwcmV2LnJhbmdlID0gcm5nO1xuICB0aGlzLl91cGRhdGVkID0gdHJ1ZTtcblxuICAvLyBUT0RPOiBTdXBwb3J0IHNpZ25hbHMgZm9yIHRoZXNlIHByb3BlcnRpZXMuIFVudGlsIHRoZW4sIG9ubHkgZXZhbFxuICAvLyB0aGVtIG9uY2UuXG4gIGlmICh0aGlzLl9zdGFtcCA+IDApIHJldHVybjtcbiAgaWYgKGRlZi5leHBvbmVudCAmJiBkZWYudHlwZT09PUMuUE9XRVIpIHNjYWxlLmV4cG9uZW50KGRlZi5leHBvbmVudCk7XG4gIGlmIChkZWYuY2xhbXApIHNjYWxlLmNsYW1wKHRydWUpO1xuICBpZiAoZGVmLm5pY2UpIHtcbiAgICBpZiAoZGVmLnR5cGUgPT09IEMuVElNRSkge1xuICAgICAgaW50ZXJ2YWwgPSBkMy50aW1lW2RlZi5uaWNlXTtcbiAgICAgIGlmICghaW50ZXJ2YWwpIGRsLmVycm9yKFwiVW5yZWNvZ25pemVkIGludGVydmFsOiBcIiArIGludGVydmFsKTtcbiAgICAgIHNjYWxlLm5pY2UoaW50ZXJ2YWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzY2FsZS5uaWNlKCk7XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIGRhdGFSZWYod2hpY2gsIGRlZiwgc2NhbGUsIGdyb3VwKSB7XG4gIGlmIChkbC5pc0FycmF5KGRlZikpIHJldHVybiBkZWYubWFwKHNpZ25hbC5iaW5kKHRoaXMpKTtcblxuICB2YXIgc2VsZiA9IHRoaXMsIGdyYXBoID0gdGhpcy5fZ3JhcGgsXG4gICAgICByZWZzID0gZGVmLmZpZWxkcyB8fCBkbC5hcnJheShkZWYpLFxuICAgICAgdW5pcXVlcyA9IHNjYWxlLnR5cGUgPT09IEMuT1JESU5BTCB8fCBzY2FsZS50eXBlID09PSBDLlFVQU5USUxFLFxuICAgICAgY2sgPSBcIl9cIit3aGljaCxcbiAgICAgIGNhY2hlID0gc2NhbGVbY2tdLFxuICAgICAgY2FjaGVGaWVsZCA9IHtvcHM6IFtdfSwgIC8vIHRoZSBmaWVsZCBhbmQgbWVhc3VyZXMgaW4gdGhlIGFnZ3JlZ2F0b3JcbiAgICAgIHNvcnQgPSBkZWYuc29ydCxcbiAgICAgIGksIHJsZW4sIGosIGZsZW4sIHIsIGZpZWxkcywgZnJvbSwgZGF0YSwga2V5cztcblxuICBpZighY2FjaGUpIHtcbiAgICBjYWNoZSA9IHNjYWxlW2NrXSA9IG5ldyBBZ2dyZWdhdGUoZ3JhcGgpO1xuICAgIGNhY2hlRmllbGQub3BzID0gW107XG4gICAgY2FjaGUuc2luZ2xldG9uKHRydWUpO1xuICAgIGlmKHVuaXF1ZXMgJiYgc29ydCkgY2FjaGVGaWVsZC5vcHMucHVzaChzb3J0LnN0YXQpO1xuICB9XG5cbiAgZm9yKGk9MCwgcmxlbj1yZWZzLmxlbmd0aDsgaTxybGVuOyArK2kpIHtcbiAgICByID0gcmVmc1tpXTtcbiAgICBmcm9tID0gci5kYXRhIHx8IFwidmdfXCIrZ3JvdXAuZGF0dW0uX2lkO1xuICAgIGRhdGEgPSBncmFwaC5kYXRhKGZyb20pXG4gICAgICAucmV2aXNlcyh0cnVlKVxuICAgICAgLmxhc3QoKTtcblxuICAgIGlmIChkYXRhLnN0YW1wIDw9IHRoaXMuX3N0YW1wKSBjb250aW51ZTtcblxuICAgIGZpZWxkcyA9IGRsLmFycmF5KHIuZmllbGQpLm1hcChmdW5jdGlvbihmKSB7XG4gICAgICBpZiAoZi5ncm91cCkgcmV0dXJuIGRsLmFjY2Vzc29yKGYuZ3JvdXApKGdyb3VwLmRhdHVtKVxuICAgICAgcmV0dXJuIGY7IC8vIFN0cmluZyBvciB7XCJzaWduYWxcIn1cbiAgICB9KTtcblxuICAgIGlmKHVuaXF1ZXMpIHtcbiAgICAgIGNhY2hlRmllbGQubmFtZSA9IHNvcnQgPyBzb3J0LmZpZWxkIDogXCJfaWRcIjtcbiAgICAgIGNhY2hlLmZpZWxkcy5zZXQoY2FjaGUsIFtjYWNoZUZpZWxkXSk7XG4gICAgICBmb3Ioaj0wLCBmbGVuPWZpZWxkcy5sZW5ndGg7IGo8ZmxlbjsgKytqKSB7XG4gICAgICAgIGNhY2hlLmdyb3VwX2J5LnNldChjYWNoZSwgZmllbGRzW2pdKVxuICAgICAgICAgIC5ldmFsdWF0ZShkYXRhKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yKGo9MCwgZmxlbj1maWVsZHMubGVuZ3RoOyBqPGZsZW47ICsraikge1xuICAgICAgICBjYWNoZUZpZWxkLm5hbWUgPSBmaWVsZHNbal07XG4gICAgICAgIGNhY2hlRmllbGQub3BzICA9IFtDLk1JTiwgQy5NQVhdO1xuICAgICAgICBjYWNoZS5maWVsZHMuc2V0KGNhY2hlLCBbY2FjaGVGaWVsZF0pIC8vIFRyZWF0IGFzIGZsYXQgZGF0YXNvdXJjZVxuICAgICAgICAgIC5ldmFsdWF0ZShkYXRhKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmRlcGVuZGVuY3koQy5EQVRBLCBmcm9tKTtcbiAgICBjYWNoZS5kZXBlbmRlbmN5KEMuU0lHTkFMUykuZm9yRWFjaChmdW5jdGlvbihzKSB7IHNlbGYuZGVwZW5kZW5jeShDLlNJR05BTFMsIHMpIH0pO1xuICB9XG5cbiAgZGF0YSA9IGNhY2hlLmRhdGEoKTtcbiAgaWYgKHVuaXF1ZXMpIHtcbiAgICBrZXlzID0gZGwua2V5cyhkYXRhKVxuICAgICAgLmZpbHRlcihmdW5jdGlvbihrKSB7IHJldHVybiBkYXRhW2tdICE9IG51bGw7IH0pO1xuXG4gICAgaWYgKHNvcnQpIHtcbiAgICAgIHNvcnQgPSBzb3J0Lm9yZGVyLnNpZ25hbCA/IGdyYXBoLnNpZ25hbFJlZihzb3J0Lm9yZGVyLnNpZ25hbCkgOiBzb3J0Lm9yZGVyO1xuICAgICAgc29ydCA9IChzb3J0ID09IEMuREVTQyA/IFwiLVwiIDogXCIrXCIpICsgXCJ0cGwuXCIgKyBjYWNoZUZpZWxkLm5hbWU7XG4gICAgICBzb3J0ID0gZGwuY29tcGFyYXRvcihzb3J0KTtcbiAgICAgIGtleXMgPSBrZXlzLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiB7IGtleTogaywgdHBsOiBkYXRhW2tdLnRwbCB9fSlcbiAgICAgICAgLnNvcnQoc29ydClcbiAgICAgICAgLm1hcChmdW5jdGlvbihrKSB7IHJldHVybiBrLmtleTsgfSk7XG4gICAgLy8gfSBlbHNlIHsgIC8vIFwiRmlyc3Qgc2VlblwiIG9yZGVyXG4gICAgLy8gICBzb3J0ID0gZGwuY29tcGFyYXRvcihcInRwbC5faWRcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIGtleXM7XG4gIH0gZWxzZSB7XG4gICAgZGF0YSA9IGRhdGFbXCJcIl07IC8vIFVucGFjayBmbGF0IGFnZ3JlZ2F0aW9uXG4gICAgcmV0dXJuIChkYXRhID09PSBudWxsKSA/IFtdIDogW2RhdGFbQy5TSU5HTEVUT05dLm1pbiwgZGF0YVtDLlNJTkdMRVRPTl0ubWF4XTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaWduYWwodikge1xuICB2YXIgcyA9IHYuc2lnbmFsLCByZWY7XG4gIGlmICghcykgcmV0dXJuIHY7XG4gIHRoaXMuZGVwZW5kZW5jeShDLlNJR05BTFMsIChyZWYgPSBkbC5maWVsZChzKSlbMF0pO1xuICByZXR1cm4gdGhpcy5fZ3JhcGguc2lnbmFsUmVmKHJlZik7XG59XG5cbmZ1bmN0aW9uIGRvbWFpbk1pbk1heChzY2FsZSwgZ3JvdXApIHtcbiAgdmFyIGRlZiA9IHRoaXMuX2RlZixcbiAgICAgIGRvbWFpbiA9IFtudWxsLCBudWxsXSwgcmVmcywgejtcblxuICBpZiAoZGVmLmRvbWFpbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZG9tYWluID0gKCFkbC5pc09iamVjdChkZWYuZG9tYWluKSkgPyBkb21haW4gOlxuICAgICAgZGF0YVJlZi5jYWxsKHRoaXMsIEMuRE9NQUlOLCBkZWYuZG9tYWluLCBzY2FsZSwgZ3JvdXApO1xuICB9XG5cbiAgeiA9IGRvbWFpbi5sZW5ndGggLSAxO1xuICBpZiAoZGVmLmRvbWFpbk1pbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGRsLmlzT2JqZWN0KGRlZi5kb21haW5NaW4pKSB7XG4gICAgICBpZiAoZGVmLmRvbWFpbk1pbi5zaWduYWwpIHtcbiAgICAgICAgZG9tYWluWzBdID0gc2lnbmFsLmNhbGwodGhpcywgZGVmLmRvbWFpbk1pbik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkb21haW5bMF0gPSBkYXRhUmVmLmNhbGwodGhpcywgQy5ET01BSU4rQy5NSU4sIGRlZi5kb21haW5NaW4sIHNjYWxlLCBncm91cClbMF07XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGRvbWFpblswXSA9IGRlZi5kb21haW5NaW47XG4gICAgfVxuICB9XG4gIGlmIChkZWYuZG9tYWluTWF4ICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoZGwuaXNPYmplY3QoZGVmLmRvbWFpbk1heCkpIHtcbiAgICAgIGlmIChkZWYuZG9tYWluTWF4LnNpZ25hbCkge1xuICAgICAgICBkb21haW5bel0gPSBzaWduYWwuY2FsbCh0aGlzLCBkZWYuZG9tYWluTWF4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRvbWFpblt6XSA9IGRhdGFSZWYuY2FsbCh0aGlzLCBDLkRPTUFJTitDLk1BWCwgZGVmLmRvbWFpbk1heCwgc2NhbGUsIGdyb3VwKVsxXTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZG9tYWluW3pdID0gZGVmLmRvbWFpbk1heDtcbiAgICB9XG4gIH1cbiAgaWYgKGRlZi50eXBlICE9PSBDLkxPRyAmJiBkZWYudHlwZSAhPT0gQy5USU1FICYmIChkZWYuemVybyB8fCBkZWYuemVybz09PXVuZGVmaW5lZCkpIHtcbiAgICBkb21haW5bMF0gPSBNYXRoLm1pbigwLCBkb21haW5bMF0pO1xuICAgIGRvbWFpblt6XSA9IE1hdGgubWF4KDAsIGRvbWFpblt6XSk7XG4gIH1cbiAgcmV0dXJuIGRvbWFpbjtcbn1cblxuZnVuY3Rpb24gcmFuZ2UoZ3JvdXApIHtcbiAgdmFyIGRlZiA9IHRoaXMuX2RlZixcbiAgICAgIHJuZyA9IFtudWxsLCBudWxsXTtcblxuICBpZiAoZGVmLnJhbmdlICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodHlwZW9mIGRlZi5yYW5nZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIGlmIChHUk9VUF9QUk9QRVJUWVtkZWYucmFuZ2VdKSB7XG4gICAgICAgIHJuZyA9IFswLCBncm91cFtkZWYucmFuZ2VdXTtcbiAgICAgIH0gZWxzZSBpZiAoY29uZmlnLnJhbmdlW2RlZi5yYW5nZV0pIHtcbiAgICAgICAgcm5nID0gY29uZmlnLnJhbmdlW2RlZi5yYW5nZV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkbC5lcnJvcihcIlVucmVjb2dpemVkIHJhbmdlOiBcIitkZWYucmFuZ2UpO1xuICAgICAgICByZXR1cm4gcm5nO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZGwuaXNBcnJheShkZWYucmFuZ2UpKSB7XG4gICAgICBybmcgPSBkZWYucmFuZ2UubWFwKHNpZ25hbC5iaW5kKHRoaXMpKTtcbiAgICB9IGVsc2UgaWYgKGRsLmlzT2JqZWN0KGRlZi5yYW5nZSkpIHtcbiAgICAgIHJldHVybiBudWxsOyAvLyBlYXJseSBleGl0XG4gICAgfSBlbHNlIHtcbiAgICAgIHJuZyA9IFswLCBkZWYucmFuZ2VdO1xuICAgIH1cbiAgfVxuICBpZiAoZGVmLnJhbmdlTWluICE9PSB1bmRlZmluZWQpIHtcbiAgICBybmdbMF0gPSBkZWYucmFuZ2VNaW4uc2lnbmFsID8gc2lnbmFsLmNhbGwodGhpcywgZGVmLnJhbmdlTWluKSA6IGRlZi5yYW5nZU1pbjtcbiAgfVxuICBpZiAoZGVmLnJhbmdlTWF4ICE9PSB1bmRlZmluZWQpIHtcbiAgICBybmdbcm5nLmxlbmd0aC0xXSA9IGRlZi5yYW5nZU1heC5zaWduYWwgPyBzaWduYWwuY2FsbCh0aGlzLCBkZWYucmFuZ2VNYXgpIDogZGVmLnJhbmdlTWF4O1xuICB9XG4gIFxuICBpZiAoZGVmLnJldmVyc2UgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciByZXYgPSBkZWYucmV2ZXJzZTtcbiAgICBpZiAoZGwuaXNPYmplY3QocmV2KSkge1xuICAgICAgcmV2ID0gZGwuYWNjZXNzb3IocmV2LmZpZWxkKShncm91cC5kYXR1bSk7XG4gICAgfVxuICAgIGlmIChyZXYpIHJuZyA9IHJuZy5yZXZlcnNlKCk7XG4gIH1cbiAgXG4gIHJldHVybiBybmc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU2NhbGU7IiwidmFyIHR1cGxlID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvdHVwbGUnKSxcbiAgICBjYWxjQm91bmRzID0gcmVxdWlyZSgnLi4vdXRpbC9ib3VuZHMnKSxcbiAgICBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKTtcblxuZnVuY3Rpb24gVHJhbnNpdGlvbihkdXJhdGlvbiwgZWFzZSkge1xuICB0aGlzLmR1cmF0aW9uID0gZHVyYXRpb24gfHwgNTAwO1xuICB0aGlzLmVhc2UgPSBlYXNlICYmIGQzLmVhc2UoZWFzZSkgfHwgZDMuZWFzZShcImN1YmljLWluLW91dFwiKTtcbiAgdGhpcy51cGRhdGVzID0ge25leHQ6IG51bGx9O1xufVxuXG52YXIgcHJvdG90eXBlID0gVHJhbnNpdGlvbi5wcm90b3R5cGU7XG5cbnZhciBza2lwID0ge1xuICBcInRleHRcIjogMSxcbiAgXCJ1cmxcIjogIDFcbn07XG5cbnByb3RvdHlwZS5pbnRlcnBvbGF0ZSA9IGZ1bmN0aW9uKGl0ZW0sIHZhbHVlcywgc3RhbXApIHtcbiAgdmFyIGtleSwgY3VyciwgbmV4dCwgaW50ZXJwLCBsaXN0ID0gbnVsbDtcblxuICBmb3IgKGtleSBpbiB2YWx1ZXMpIHtcbiAgICBjdXJyID0gaXRlbVtrZXldO1xuICAgIG5leHQgPSB2YWx1ZXNba2V5XTsgICAgICBcbiAgICBpZiAoY3VyciAhPT0gbmV4dCkge1xuICAgICAgaWYgKHNraXBba2V5XSB8fCBjdXJyID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gc2tpcCBpbnRlcnBvbGF0aW9uIGZvciBzcGVjaWZpYyBrZXlzIG9yIHVuZGVmaW5lZCBzdGFydCB2YWx1ZXNcbiAgICAgICAgdHVwbGUuc2V0KGl0ZW0sIGtleSwgbmV4dCk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGVvZiBjdXJyID09PSBcIm51bWJlclwiICYmICFpc0Zpbml0ZShjdXJyKSkge1xuICAgICAgICAvLyBmb3IgTmFOIG9yIGluZmluaXRlIG51bWVyaWMgdmFsdWVzLCBza2lwIHRvIGZpbmFsIHZhbHVlXG4gICAgICAgIHR1cGxlLnNldChpdGVtLCBrZXksIG5leHQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gb3RoZXJ3aXNlIGxvb2t1cCBpbnRlcnBvbGF0b3JcbiAgICAgICAgaW50ZXJwID0gZDMuaW50ZXJwb2xhdGUoY3VyciwgbmV4dCk7XG4gICAgICAgIGludGVycC5wcm9wZXJ0eSA9IGtleTtcbiAgICAgICAgKGxpc3QgfHwgKGxpc3Q9W10pKS5wdXNoKGludGVycCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKGxpc3QgPT09IG51bGwgJiYgaXRlbS5zdGF0dXMgPT09IEMuRVhJVCkge1xuICAgIGxpc3QgPSBbXTsgLy8gZW5zdXJlIGV4aXRpbmcgaXRlbXMgYXJlIGluY2x1ZGVkXG4gIH1cblxuICBpZiAobGlzdCAhPSBudWxsKSB7XG4gICAgbGlzdC5pdGVtID0gaXRlbTtcbiAgICBsaXN0LmVhc2UgPSBpdGVtLm1hcmsuZWFzZSB8fCB0aGlzLmVhc2U7XG4gICAgbGlzdC5uZXh0ID0gdGhpcy51cGRhdGVzLm5leHQ7XG4gICAgdGhpcy51cGRhdGVzLm5leHQgPSBsaXN0O1xuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgdmFyIHQgPSB0aGlzLCBwcmV2ID0gdC51cGRhdGVzLCBjdXJyID0gcHJldi5uZXh0O1xuICBmb3IgKDsgY3VyciE9bnVsbDsgcHJldj1jdXJyLCBjdXJyPXByZXYubmV4dCkge1xuICAgIGlmIChjdXJyLml0ZW0uc3RhdHVzID09PSBDLkVYSVQpIGN1cnIucmVtb3ZlID0gdHJ1ZTtcbiAgfVxuICB0LmNhbGxiYWNrID0gY2FsbGJhY2s7XG4gIGQzLnRpbWVyKGZ1bmN0aW9uKGVsYXBzZWQpIHsgcmV0dXJuIHN0ZXAuY2FsbCh0LCBlbGFwc2VkKTsgfSk7XG59O1xuXG5mdW5jdGlvbiBzdGVwKGVsYXBzZWQpIHtcbiAgdmFyIGxpc3QgPSB0aGlzLnVwZGF0ZXMsIHByZXYgPSBsaXN0LCBjdXJyID0gcHJldi5uZXh0LFxuICAgICAgZHVyYXRpb24gPSB0aGlzLmR1cmF0aW9uLFxuICAgICAgaXRlbSwgZGVsYXksIGYsIGUsIGksIG4sIHN0b3AgPSB0cnVlO1xuXG4gIGZvciAoOyBjdXJyIT1udWxsOyBwcmV2PWN1cnIsIGN1cnI9cHJldi5uZXh0KSB7XG4gICAgaXRlbSA9IGN1cnIuaXRlbTtcbiAgICBkZWxheSA9IGl0ZW0uZGVsYXkgfHwgMDtcblxuICAgIGYgPSAoZWxhcHNlZCAtIGRlbGF5KSAvIGR1cmF0aW9uO1xuICAgIGlmIChmIDwgMCkgeyBzdG9wID0gZmFsc2U7IGNvbnRpbnVlOyB9XG4gICAgaWYgKGYgPiAxKSBmID0gMTtcbiAgICBlID0gY3Vyci5lYXNlKGYpO1xuXG4gICAgZm9yIChpPTAsIG49Y3Vyci5sZW5ndGg7IGk8bjsgKytpKSB7XG4gICAgICBpdGVtW2N1cnJbaV0ucHJvcGVydHldID0gY3VycltpXShlKTtcbiAgICB9XG4gICAgaXRlbS50b3VjaCgpO1xuICAgIGNhbGNCb3VuZHMuaXRlbShpdGVtKTtcblxuICAgIGlmIChmID09PSAxKSB7XG4gICAgICBpZiAoY3Vyci5yZW1vdmUpIGl0ZW0ucmVtb3ZlKCk7XG4gICAgICBwcmV2Lm5leHQgPSBjdXJyLm5leHQ7XG4gICAgICBjdXJyID0gcHJldjtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RvcCA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHRoaXMuY2FsbGJhY2soKTtcbiAgcmV0dXJuIHN0b3A7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFRyYW5zaXRpb247IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIGNvbmZpZyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uZmlnJyksXG4gICAgdHBsID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvdHVwbGUnKSxcbiAgICBwYXJzZU1hcmsgPSByZXF1aXJlKCcuLi9wYXJzZS9tYXJrJyk7XG5cbmZ1bmN0aW9uIGF4cyhtb2RlbCkge1xuICB2YXIgc2NhbGUsXG4gICAgICBvcmllbnQgPSBjb25maWcuYXhpcy5vcmllbnQsXG4gICAgICBvZmZzZXQgPSAwLFxuICAgICAgdGl0bGVPZmZzZXQgPSBjb25maWcuYXhpcy50aXRsZU9mZnNldCxcbiAgICAgIGF4aXNEZWYgPSB7fSxcbiAgICAgIGxheWVyID0gXCJmcm9udFwiLFxuICAgICAgZ3JpZCA9IGZhbHNlLFxuICAgICAgdGl0bGUgPSBudWxsLFxuICAgICAgdGlja01ham9yU2l6ZSA9IGNvbmZpZy5heGlzLnRpY2tTaXplLFxuICAgICAgdGlja01pbm9yU2l6ZSA9IGNvbmZpZy5heGlzLnRpY2tTaXplLFxuICAgICAgdGlja0VuZFNpemUgPSBjb25maWcuYXhpcy50aWNrU2l6ZSxcbiAgICAgIHRpY2tQYWRkaW5nID0gY29uZmlnLmF4aXMucGFkZGluZyxcbiAgICAgIHRpY2tWYWx1ZXMgPSBudWxsLFxuICAgICAgdGlja0Zvcm1hdFN0cmluZyA9IG51bGwsXG4gICAgICB0aWNrRm9ybWF0ID0gbnVsbCxcbiAgICAgIHRpY2tTdWJkaXZpZGUgPSAwLFxuICAgICAgdGlja0FyZ3VtZW50cyA9IFtjb25maWcuYXhpcy50aWNrc10sXG4gICAgICBncmlkTGluZVN0eWxlID0ge30sXG4gICAgICB0aWNrTGFiZWxTdHlsZSA9IHt9LFxuICAgICAgbWFqb3JUaWNrU3R5bGUgPSB7fSxcbiAgICAgIG1pbm9yVGlja1N0eWxlID0ge30sXG4gICAgICB0aXRsZVN0eWxlID0ge30sXG4gICAgICBkb21haW5TdHlsZSA9IHt9LFxuICAgICAgbSA9IHsgLy8gQXhpcyBtYXJrcyBhcyByZWZlcmVuY2VzIGZvciB1cGRhdGVzXG4gICAgICAgIGdyaWRMaW5lczogbnVsbCxcbiAgICAgICAgbWFqb3JUaWNrczogbnVsbCxcbiAgICAgICAgbWlub3JUaWNrczogbnVsbCxcbiAgICAgICAgdGlja0xhYmVsczogbnVsbCxcbiAgICAgICAgZG9tYWluOiBudWxsLFxuICAgICAgICB0aXRsZTogbnVsbFxuICAgICAgfTtcblxuICB2YXIgYXhpcyA9IHt9O1xuXG4gIGZ1bmN0aW9uIHJlc2V0KCkge1xuICAgIGF4aXNEZWYudHlwZSA9IG51bGw7XG4gIH07XG5cbiAgYXhpcy5kZWYgPSBmdW5jdGlvbigpIHtcbiAgICBpZighYXhpc0RlZi50eXBlKSBheGlzX2RlZihzY2FsZSk7XG5cbiAgICAvLyB0aWNrIGZvcm1hdFxuICAgIHRpY2tGb3JtYXQgPSAhdGlja0Zvcm1hdFN0cmluZyA/IG51bGwgOiAoKHNjYWxlLnR5cGUgPT09ICd0aW1lJylcbiAgICAgID8gZDMudGltZS5mb3JtYXQodGlja0Zvcm1hdFN0cmluZylcbiAgICAgIDogZDMuZm9ybWF0KHRpY2tGb3JtYXRTdHJpbmcpKTtcblxuICAgIC8vIGdlbmVyYXRlIGRhdGFcbiAgICAvLyBXZSBkb24ndCBfcmVhbGx5XyBuZWVkIHRvIG1vZGVsIHRoZXNlIGFzIHR1cGxlcyBhcyBubyBmdXJ0aGVyXG4gICAgLy8gZGF0YSB0cmFuc2Zvcm1hdGlvbiBpcyBkb25lLiBTbyB3ZSBvcHRpbWl6ZSBmb3IgYSBoaWdoIGNodXJuIHJhdGUuIFxuICAgIHZhciBpbmplc3QgPSBmdW5jdGlvbihkKSB7IHJldHVybiB7ZGF0YTogZH07IH07XG4gICAgdmFyIG1ham9yID0gdGlja1ZhbHVlcyA9PSBudWxsXG4gICAgICA/IChzY2FsZS50aWNrcyA/IHNjYWxlLnRpY2tzLmFwcGx5KHNjYWxlLCB0aWNrQXJndW1lbnRzKSA6IHNjYWxlLmRvbWFpbigpKVxuICAgICAgOiB0aWNrVmFsdWVzO1xuICAgIHZhciBtaW5vciA9IHZnX2F4aXNTdWJkaXZpZGUoc2NhbGUsIG1ham9yLCB0aWNrU3ViZGl2aWRlKS5tYXAoaW5qZXN0KTtcbiAgICBtYWpvciA9IG1ham9yLm1hcChpbmplc3QpO1xuICAgIHZhciBmbXQgPSB0aWNrRm9ybWF0PT1udWxsID8gKHNjYWxlLnRpY2tGb3JtYXQgPyBzY2FsZS50aWNrRm9ybWF0LmFwcGx5KHNjYWxlLCB0aWNrQXJndW1lbnRzKSA6IFN0cmluZykgOiB0aWNrRm9ybWF0O1xuICAgIG1ham9yLmZvckVhY2goZnVuY3Rpb24oZCkgeyBkLmxhYmVsID0gZm10KGQuZGF0YSk7IH0pO1xuICAgIHZhciB0ZGF0YSA9IHRpdGxlID8gW3RpdGxlXS5tYXAoaW5qZXN0KSA6IFtdO1xuXG4gICAgYXhpc0RlZi5tYXJrc1swXS5mcm9tID0gZnVuY3Rpb24oKSB7IHJldHVybiBncmlkID8gbWFqb3IgOiBbXTsgfTtcbiAgICBheGlzRGVmLm1hcmtzWzFdLmZyb20gPSBmdW5jdGlvbigpIHsgcmV0dXJuIG1ham9yOyB9O1xuICAgIGF4aXNEZWYubWFya3NbMl0uZnJvbSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gbWlub3I7IH07XG4gICAgYXhpc0RlZi5tYXJrc1szXS5mcm9tID0gYXhpc0RlZi5tYXJrc1sxXS5mcm9tO1xuICAgIGF4aXNEZWYubWFya3NbNF0uZnJvbSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gWzFdOyB9O1xuICAgIGF4aXNEZWYubWFya3NbNV0uZnJvbSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGRhdGE7IH07XG4gICAgYXhpc0RlZi5vZmZzZXQgPSBvZmZzZXQ7XG4gICAgYXhpc0RlZi5vcmllbnQgPSBvcmllbnQ7XG4gICAgYXhpc0RlZi5sYXllciA9IGxheWVyO1xuICAgIHJldHVybiBheGlzRGVmO1xuICB9O1xuXG4gIGZ1bmN0aW9uIGF4aXNfZGVmKHNjYWxlKSB7XG4gICAgLy8gc2V0dXAgc2NhbGUgbWFwcGluZ1xuICAgIHZhciBuZXdTY2FsZSwgb2xkU2NhbGUsIHJhbmdlO1xuICAgIGlmIChzY2FsZS50eXBlID09PSBcIm9yZGluYWxcIikge1xuICAgICAgbmV3U2NhbGUgPSB7c2NhbGU6IHNjYWxlLnNjYWxlTmFtZSwgb2Zmc2V0OiAwLjUgKyBzY2FsZS5yYW5nZUJhbmQoKS8yfTtcbiAgICAgIG9sZFNjYWxlID0gbmV3U2NhbGU7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5ld1NjYWxlID0ge3NjYWxlOiBzY2FsZS5zY2FsZU5hbWUsIG9mZnNldDogMC41fTtcbiAgICAgIG9sZFNjYWxlID0ge3NjYWxlOiBzY2FsZS5zY2FsZU5hbWUrXCI6cHJldlwiLCBvZmZzZXQ6IDAuNX07XG4gICAgfVxuICAgIHJhbmdlID0gdmdfYXhpc1NjYWxlUmFuZ2Uoc2NhbGUpO1xuXG4gICAgLy8gc2V0dXAgYXhpcyBtYXJrc1xuICAgIGlmICghbS5ncmlkTGluZXMpICBtLmdyaWRMaW5lcyAgPSB2Z19heGlzVGlja3MoKTtcbiAgICBpZiAoIW0ubWFqb3JUaWNrcykgbS5tYWpvclRpY2tzID0gdmdfYXhpc1RpY2tzKCk7XG4gICAgaWYgKCFtLm1pbm9yVGlja3MpIG0ubWlub3JUaWNrcyA9IHZnX2F4aXNUaWNrcygpO1xuICAgIGlmICghbS50aWNrTGFiZWxzKSBtLnRpY2tMYWJlbHMgPSB2Z19heGlzVGlja0xhYmVscygpO1xuICAgIGlmICghbS5kb21haW4pIG0uZG9tYWluID0gdmdfYXhpc0RvbWFpbigpO1xuICAgIGlmICghbS50aXRsZSkgIG0udGl0bGUgID0gdmdfYXhpc1RpdGxlKCk7XG4gICAgbS5ncmlkTGluZXMucHJvcGVydGllcy5lbnRlci5zdHJva2UgPSB7dmFsdWU6IGNvbmZpZy5heGlzLmdyaWRDb2xvcn07XG5cbiAgICAvLyBleHRlbmQgYXhpcyBtYXJrcyBiYXNlZCBvbiBheGlzIG9yaWVudGF0aW9uXG4gICAgdmdfYXhpc1RpY2tzRXh0ZW5kKG9yaWVudCwgbS5ncmlkTGluZXMsIG9sZFNjYWxlLCBuZXdTY2FsZSwgSW5maW5pdHkpO1xuICAgIHZnX2F4aXNUaWNrc0V4dGVuZChvcmllbnQsIG0ubWFqb3JUaWNrcywgb2xkU2NhbGUsIG5ld1NjYWxlLCB0aWNrTWFqb3JTaXplKTtcbiAgICB2Z19heGlzVGlja3NFeHRlbmQob3JpZW50LCBtLm1pbm9yVGlja3MsIG9sZFNjYWxlLCBuZXdTY2FsZSwgdGlja01pbm9yU2l6ZSk7XG4gICAgdmdfYXhpc0xhYmVsRXh0ZW5kKG9yaWVudCwgbS50aWNrTGFiZWxzLCBvbGRTY2FsZSwgbmV3U2NhbGUsIHRpY2tNYWpvclNpemUsIHRpY2tQYWRkaW5nKTtcblxuICAgIHZnX2F4aXNEb21haW5FeHRlbmQob3JpZW50LCBtLmRvbWFpbiwgcmFuZ2UsIHRpY2tFbmRTaXplKTtcbiAgICB2Z19heGlzVGl0bGVFeHRlbmQob3JpZW50LCBtLnRpdGxlLCByYW5nZSwgdGl0bGVPZmZzZXQpOyAvLyBUT0RPIGdldCBvZmZzZXRcbiAgICBcbiAgICAvLyBhZGQgLyBvdmVycmlkZSBjdXN0b20gc3R5bGUgcHJvcGVydGllc1xuICAgIGRsLmV4dGVuZChtLmdyaWRMaW5lcy5wcm9wZXJ0aWVzLnVwZGF0ZSwgZ3JpZExpbmVTdHlsZSk7XG4gICAgZGwuZXh0ZW5kKG0ubWFqb3JUaWNrcy5wcm9wZXJ0aWVzLnVwZGF0ZSwgbWFqb3JUaWNrU3R5bGUpO1xuICAgIGRsLmV4dGVuZChtLm1pbm9yVGlja3MucHJvcGVydGllcy51cGRhdGUsIG1pbm9yVGlja1N0eWxlKTtcbiAgICBkbC5leHRlbmQobS50aWNrTGFiZWxzLnByb3BlcnRpZXMudXBkYXRlLCB0aWNrTGFiZWxTdHlsZSk7XG4gICAgZGwuZXh0ZW5kKG0uZG9tYWluLnByb3BlcnRpZXMudXBkYXRlLCBkb21haW5TdHlsZSk7XG4gICAgZGwuZXh0ZW5kKG0udGl0bGUucHJvcGVydGllcy51cGRhdGUsIHRpdGxlU3R5bGUpO1xuXG4gICAgdmFyIG1hcmtzID0gW20uZ3JpZExpbmVzLCBtLm1ham9yVGlja3MsIG0ubWlub3JUaWNrcywgbS50aWNrTGFiZWxzLCBtLmRvbWFpbiwgbS50aXRsZV07XG4gICAgZGwuZXh0ZW5kKGF4aXNEZWYsIHtcbiAgICAgIHR5cGU6IFwiZ3JvdXBcIixcbiAgICAgIGludGVyYWN0aXZlOiBmYWxzZSxcbiAgICAgIHByb3BlcnRpZXM6IHsgXG4gICAgICAgIGVudGVyOiB7XG4gICAgICAgICAgZW5jb2RlOiB2Z19heGlzVXBkYXRlLFxuICAgICAgICAgIHNjYWxlczogW3NjYWxlLnNjYWxlTmFtZV0sXG4gICAgICAgICAgc2lnbmFsczogW10sIGRhdGE6IFtdXG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZToge1xuICAgICAgICAgIGVuY29kZTogdmdfYXhpc1VwZGF0ZSxcbiAgICAgICAgICBzY2FsZXM6IFtzY2FsZS5zY2FsZU5hbWVdLFxuICAgICAgICAgIHNpZ25hbHM6IFtdLCBkYXRhOiBbXVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBheGlzRGVmLm1hcmtzID0gbWFya3MubWFwKGZ1bmN0aW9uKG0pIHsgcmV0dXJuIHBhcnNlTWFyayhtb2RlbCwgbSk7IH0pO1xuICB9O1xuXG4gIGF4aXMuc2NhbGUgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gc2NhbGU7XG4gICAgaWYgKHNjYWxlICE9PSB4KSB7IHNjYWxlID0geDsgcmVzZXQoKTsgfVxuICAgIHJldHVybiBheGlzO1xuICB9O1xuXG4gIGF4aXMub3JpZW50ID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG9yaWVudDtcbiAgICBpZiAob3JpZW50ICE9PSB4KSB7XG4gICAgICBvcmllbnQgPSB4IGluIHZnX2F4aXNPcmllbnRzID8geCArIFwiXCIgOiBjb25maWcuYXhpcy5vcmllbnQ7XG4gICAgICByZXNldCgpO1xuICAgIH1cbiAgICByZXR1cm4gYXhpcztcbiAgfTtcblxuICBheGlzLnRpdGxlID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRpdGxlO1xuICAgIGlmICh0aXRsZSAhPT0geCkgeyB0aXRsZSA9IHg7IHJlc2V0KCk7IH1cbiAgICByZXR1cm4gYXhpcztcbiAgfTtcblxuICBheGlzLnRpY2tzID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGlja0FyZ3VtZW50cztcbiAgICB0aWNrQXJndW1lbnRzID0gYXJndW1lbnRzO1xuICAgIHJldHVybiBheGlzO1xuICB9O1xuXG4gIGF4aXMudGlja1ZhbHVlcyA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0aWNrVmFsdWVzO1xuICAgIHRpY2tWYWx1ZXMgPSB4O1xuICAgIHJldHVybiBheGlzO1xuICB9O1xuXG4gIGF4aXMudGlja0Zvcm1hdCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0aWNrRm9ybWF0U3RyaW5nO1xuICAgIGlmICh0aWNrRm9ybWF0U3RyaW5nICE9PSB4KSB7XG4gICAgICB0aWNrRm9ybWF0U3RyaW5nID0geDtcbiAgICAgIHJlc2V0KCk7XG4gICAgfVxuICAgIHJldHVybiBheGlzO1xuICB9O1xuICBcbiAgYXhpcy50aWNrU2l6ZSA9IGZ1bmN0aW9uKHgsIHkpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0aWNrTWFqb3JTaXplO1xuICAgIHZhciBuID0gYXJndW1lbnRzLmxlbmd0aCAtIDEsXG4gICAgICAgIG1ham9yID0gK3gsXG4gICAgICAgIG1pbm9yID0gbiA+IDEgPyAreSA6IHRpY2tNYWpvclNpemUsXG4gICAgICAgIGVuZCAgID0gbiA+IDAgPyArYXJndW1lbnRzW25dIDogdGlja01ham9yU2l6ZTtcblxuICAgIGlmICh0aWNrTWFqb3JTaXplICE9PSBtYWpvciB8fFxuICAgICAgICB0aWNrTWlub3JTaXplICE9PSBtaW5vciB8fFxuICAgICAgICB0aWNrRW5kU2l6ZSAhPT0gZW5kKSB7XG4gICAgICByZXNldCgpO1xuICAgIH1cblxuICAgIHRpY2tNYWpvclNpemUgPSBtYWpvcjtcbiAgICB0aWNrTWlub3JTaXplID0gbWlub3I7XG4gICAgdGlja0VuZFNpemUgPSBlbmQ7XG4gICAgcmV0dXJuIGF4aXM7XG4gIH07XG5cbiAgYXhpcy50aWNrU3ViZGl2aWRlID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRpY2tTdWJkaXZpZGU7XG4gICAgdGlja1N1YmRpdmlkZSA9ICt4O1xuICAgIHJldHVybiBheGlzO1xuICB9O1xuICBcbiAgYXhpcy5vZmZzZXQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gb2Zmc2V0O1xuICAgIG9mZnNldCA9IGRsLmlzT2JqZWN0KHgpID8geCA6ICt4O1xuICAgIHJldHVybiBheGlzO1xuICB9O1xuXG4gIGF4aXMudGlja1BhZGRpbmcgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gdGlja1BhZGRpbmc7XG4gICAgaWYgKHRpY2tQYWRkaW5nICE9PSAreCkgeyB0aWNrUGFkZGluZyA9ICt4OyByZXNldCgpOyB9XG4gICAgcmV0dXJuIGF4aXM7XG4gIH07XG5cbiAgYXhpcy50aXRsZU9mZnNldCA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0aXRsZU9mZnNldDtcbiAgICBpZiAodGl0bGVPZmZzZXQgIT09ICt4KSB7IHRpdGxlT2Zmc2V0ID0gK3g7IHJlc2V0KCk7IH1cbiAgICByZXR1cm4gYXhpcztcbiAgfTtcblxuICBheGlzLmxheWVyID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGxheWVyO1xuICAgIGlmIChsYXllciAhPT0geCkgeyBsYXllciA9IHg7IHJlc2V0KCk7IH1cbiAgICByZXR1cm4gYXhpcztcbiAgfTtcblxuICBheGlzLmdyaWQgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZ3JpZDtcbiAgICBpZiAoZ3JpZCAhPT0geCkgeyBncmlkID0geDsgcmVzZXQoKTsgfVxuICAgIHJldHVybiBheGlzO1xuICB9O1xuXG4gIGF4aXMuZ3JpZExpbmVQcm9wZXJ0aWVzID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGdyaWRMaW5lU3R5bGU7XG4gICAgaWYgKGdyaWRMaW5lU3R5bGUgIT09IHgpIHsgZ3JpZExpbmVTdHlsZSA9IHg7IH1cbiAgICByZXR1cm4gYXhpcztcbiAgfTtcblxuICBheGlzLm1ham9yVGlja1Byb3BlcnRpZXMgPSBmdW5jdGlvbih4KSB7XG4gICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gbWFqb3JUaWNrU3R5bGU7XG4gICAgaWYgKG1ham9yVGlja1N0eWxlICE9PSB4KSB7IG1ham9yVGlja1N0eWxlID0geDsgfVxuICAgIHJldHVybiBheGlzO1xuICB9O1xuXG4gIGF4aXMubWlub3JUaWNrUHJvcGVydGllcyA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBtaW5vclRpY2tTdHlsZTtcbiAgICBpZiAobWlub3JUaWNrU3R5bGUgIT09IHgpIHsgbWlub3JUaWNrU3R5bGUgPSB4OyB9XG4gICAgcmV0dXJuIGF4aXM7XG4gIH07XG5cbiAgYXhpcy50aWNrTGFiZWxQcm9wZXJ0aWVzID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRpY2tMYWJlbFN0eWxlO1xuICAgIGlmICh0aWNrTGFiZWxTdHlsZSAhPT0geCkgeyB0aWNrTGFiZWxTdHlsZSA9IHg7IH1cbiAgICByZXR1cm4gYXhpcztcbiAgfTtcblxuICBheGlzLnRpdGxlUHJvcGVydGllcyA9IGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiB0aXRsZVN0eWxlO1xuICAgIGlmICh0aXRsZVN0eWxlICE9PSB4KSB7IHRpdGxlU3R5bGUgPSB4OyB9XG4gICAgcmV0dXJuIGF4aXM7XG4gIH07XG5cbiAgYXhpcy5kb21haW5Qcm9wZXJ0aWVzID0gZnVuY3Rpb24oeCkge1xuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRvbWFpblN0eWxlO1xuICAgIGlmIChkb21haW5TdHlsZSAhPT0geCkgeyBkb21haW5TdHlsZSA9IHg7IH1cbiAgICByZXR1cm4gYXhpcztcbiAgfTtcbiAgXG4gIGF4aXMucmVzZXQgPSBmdW5jdGlvbigpIHsgcmVzZXQoKTsgfTtcblxuICByZXR1cm4gYXhpcztcbn07XG5cbnZhciB2Z19heGlzT3JpZW50cyA9IHt0b3A6IDEsIHJpZ2h0OiAxLCBib3R0b206IDEsIGxlZnQ6IDF9O1xuXG5mdW5jdGlvbiB2Z19heGlzU3ViZGl2aWRlKHNjYWxlLCB0aWNrcywgbSkge1xuICBzdWJ0aWNrcyA9IFtdO1xuICBpZiAobSAmJiB0aWNrcy5sZW5ndGggPiAxKSB7XG4gICAgdmFyIGV4dGVudCA9IHZnX2F4aXNTY2FsZUV4dGVudChzY2FsZS5kb21haW4oKSksXG4gICAgICAgIHN1YnRpY2tzLFxuICAgICAgICBpID0gLTEsXG4gICAgICAgIG4gPSB0aWNrcy5sZW5ndGgsXG4gICAgICAgIGQgPSAodGlja3NbMV0gLSB0aWNrc1swXSkgLyArK20sXG4gICAgICAgIGosXG4gICAgICAgIHY7XG4gICAgd2hpbGUgKCsraSA8IG4pIHtcbiAgICAgIGZvciAoaiA9IG07IC0taiA+IDA7KSB7XG4gICAgICAgIGlmICgodiA9ICt0aWNrc1tpXSAtIGogKiBkKSA+PSBleHRlbnRbMF0pIHtcbiAgICAgICAgICBzdWJ0aWNrcy5wdXNoKHYpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoLS1pLCBqID0gMDsgKytqIDwgbSAmJiAodiA9ICt0aWNrc1tpXSArIGogKiBkKSA8IGV4dGVudFsxXTspIHtcbiAgICAgIHN1YnRpY2tzLnB1c2godik7XG4gICAgfVxuICB9XG4gIHJldHVybiBzdWJ0aWNrcztcbn1cblxuZnVuY3Rpb24gdmdfYXhpc1NjYWxlRXh0ZW50KGRvbWFpbikge1xuICB2YXIgc3RhcnQgPSBkb21haW5bMF0sIHN0b3AgPSBkb21haW5bZG9tYWluLmxlbmd0aCAtIDFdO1xuICByZXR1cm4gc3RhcnQgPCBzdG9wID8gW3N0YXJ0LCBzdG9wXSA6IFtzdG9wLCBzdGFydF07XG59XG5cbmZ1bmN0aW9uIHZnX2F4aXNTY2FsZVJhbmdlKHNjYWxlKSB7XG4gIHJldHVybiBzY2FsZS5yYW5nZUV4dGVudFxuICAgID8gc2NhbGUucmFuZ2VFeHRlbnQoKVxuICAgIDogdmdfYXhpc1NjYWxlRXh0ZW50KHNjYWxlLnJhbmdlKCkpO1xufVxuXG52YXIgdmdfYXhpc0FsaWduID0ge1xuICBib3R0b206IFwiY2VudGVyXCIsXG4gIHRvcDogXCJjZW50ZXJcIixcbiAgbGVmdDogXCJyaWdodFwiLFxuICByaWdodDogXCJsZWZ0XCJcbn07XG5cbnZhciB2Z19heGlzQmFzZWxpbmUgPSB7XG4gIGJvdHRvbTogXCJ0b3BcIixcbiAgdG9wOiBcImJvdHRvbVwiLFxuICBsZWZ0OiBcIm1pZGRsZVwiLFxuICByaWdodDogXCJtaWRkbGVcIlxufTtcblxuZnVuY3Rpb24gdmdfYXhpc0xhYmVsRXh0ZW5kKG9yaWVudCwgbGFiZWxzLCBvbGRTY2FsZSwgbmV3U2NhbGUsIHNpemUsIHBhZCkge1xuICBzaXplID0gTWF0aC5tYXgoc2l6ZSwgMCkgKyBwYWQ7XG4gIGlmIChvcmllbnQgPT09IFwibGVmdFwiIHx8IG9yaWVudCA9PT0gXCJ0b3BcIikge1xuICAgIHNpemUgKj0gLTE7XG4gIH0gIFxuICBpZiAob3JpZW50ID09PSBcInRvcFwiIHx8IG9yaWVudCA9PT0gXCJib3R0b21cIikge1xuICAgIGRsLmV4dGVuZChsYWJlbHMucHJvcGVydGllcy5lbnRlciwge1xuICAgICAgeDogb2xkU2NhbGUsXG4gICAgICB5OiB7dmFsdWU6IHNpemV9LFxuICAgIH0pO1xuICAgIGRsLmV4dGVuZChsYWJlbHMucHJvcGVydGllcy51cGRhdGUsIHtcbiAgICAgIHg6IG5ld1NjYWxlLFxuICAgICAgeToge3ZhbHVlOiBzaXplfSxcbiAgICAgIGFsaWduOiB7dmFsdWU6IFwiY2VudGVyXCJ9LFxuICAgICAgYmFzZWxpbmU6IHt2YWx1ZTogdmdfYXhpc0Jhc2VsaW5lW29yaWVudF19XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgZGwuZXh0ZW5kKGxhYmVscy5wcm9wZXJ0aWVzLmVudGVyLCB7XG4gICAgICB4OiB7dmFsdWU6IHNpemV9LFxuICAgICAgeTogb2xkU2NhbGUsXG4gICAgfSk7XG4gICAgZGwuZXh0ZW5kKGxhYmVscy5wcm9wZXJ0aWVzLnVwZGF0ZSwge1xuICAgICAgeDoge3ZhbHVlOiBzaXplfSxcbiAgICAgIHk6IG5ld1NjYWxlLFxuICAgICAgYWxpZ246IHt2YWx1ZTogdmdfYXhpc0FsaWduW29yaWVudF19LFxuICAgICAgYmFzZWxpbmU6IHt2YWx1ZTogXCJtaWRkbGVcIn1cbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB2Z19heGlzVGlja3NFeHRlbmQob3JpZW50LCB0aWNrcywgb2xkU2NhbGUsIG5ld1NjYWxlLCBzaXplKSB7XG4gIHZhciBzaWduID0gKG9yaWVudCA9PT0gXCJsZWZ0XCIgfHwgb3JpZW50ID09PSBcInRvcFwiKSA/IC0xIDogMTtcbiAgaWYgKHNpemUgPT09IEluZmluaXR5KSB7XG4gICAgc2l6ZSA9IChvcmllbnQgPT09IFwidG9wXCIgfHwgb3JpZW50ID09PSBcImJvdHRvbVwiKVxuICAgICAgPyB7Z3JvdXA6IFwibWFyay5ncm91cC5oZWlnaHRcIiwgbXVsdDogLXNpZ259XG4gICAgICA6IHtncm91cDogXCJtYXJrLmdyb3VwLndpZHRoXCIsIG11bHQ6IC1zaWdufTtcbiAgfSBlbHNlIHtcbiAgICBzaXplID0ge3ZhbHVlOiBzaWduICogc2l6ZX07XG4gIH1cbiAgaWYgKG9yaWVudCA9PT0gXCJ0b3BcIiB8fCBvcmllbnQgPT09IFwiYm90dG9tXCIpIHtcbiAgICBkbC5leHRlbmQodGlja3MucHJvcGVydGllcy5lbnRlciwge1xuICAgICAgeDogIG9sZFNjYWxlLFxuICAgICAgeTogIHt2YWx1ZTogMH0sXG4gICAgICB5Mjogc2l6ZVxuICAgIH0pO1xuICAgIGRsLmV4dGVuZCh0aWNrcy5wcm9wZXJ0aWVzLnVwZGF0ZSwge1xuICAgICAgeDogIG5ld1NjYWxlLFxuICAgICAgeTogIHt2YWx1ZTogMH0sXG4gICAgICB5Mjogc2l6ZVxuICAgIH0pO1xuICAgIGRsLmV4dGVuZCh0aWNrcy5wcm9wZXJ0aWVzLmV4aXQsIHtcbiAgICAgIHg6ICBuZXdTY2FsZSxcbiAgICB9KTsgICAgICAgIFxuICB9IGVsc2Uge1xuICAgIGRsLmV4dGVuZCh0aWNrcy5wcm9wZXJ0aWVzLmVudGVyLCB7XG4gICAgICB4OiAge3ZhbHVlOiAwfSxcbiAgICAgIHgyOiBzaXplLFxuICAgICAgeTogIG9sZFNjYWxlXG4gICAgfSk7XG4gICAgZGwuZXh0ZW5kKHRpY2tzLnByb3BlcnRpZXMudXBkYXRlLCB7XG4gICAgICB4OiAge3ZhbHVlOiAwfSxcbiAgICAgIHgyOiBzaXplLFxuICAgICAgeTogIG5ld1NjYWxlXG4gICAgfSk7XG4gICAgZGwuZXh0ZW5kKHRpY2tzLnByb3BlcnRpZXMuZXhpdCwge1xuICAgICAgeTogIG5ld1NjYWxlLFxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZnX2F4aXNUaXRsZUV4dGVuZChvcmllbnQsIHRpdGxlLCByYW5nZSwgb2Zmc2V0KSB7XG4gIHZhciBtaWQgPSB+figocmFuZ2VbMF0gKyByYW5nZVsxXSkgLyAyKSxcbiAgICAgIHNpZ24gPSAob3JpZW50ID09PSBcInRvcFwiIHx8IG9yaWVudCA9PT0gXCJsZWZ0XCIpID8gLTEgOiAxO1xuICBcbiAgaWYgKG9yaWVudCA9PT0gXCJib3R0b21cIiB8fCBvcmllbnQgPT09IFwidG9wXCIpIHtcbiAgICBkbC5leHRlbmQodGl0bGUucHJvcGVydGllcy51cGRhdGUsIHtcbiAgICAgIHg6IHt2YWx1ZTogbWlkfSxcbiAgICAgIHk6IHt2YWx1ZTogc2lnbipvZmZzZXR9LFxuICAgICAgYW5nbGU6IHt2YWx1ZTogMH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICBkbC5leHRlbmQodGl0bGUucHJvcGVydGllcy51cGRhdGUsIHtcbiAgICAgIHg6IHt2YWx1ZTogc2lnbipvZmZzZXR9LFxuICAgICAgeToge3ZhbHVlOiBtaWR9LFxuICAgICAgYW5nbGU6IHt2YWx1ZTogLTkwfVxuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHZnX2F4aXNEb21haW5FeHRlbmQob3JpZW50LCBkb21haW4sIHJhbmdlLCBzaXplKSB7XG4gIHZhciBwYXRoO1xuICBpZiAob3JpZW50ID09PSBcInRvcFwiIHx8IG9yaWVudCA9PT0gXCJsZWZ0XCIpIHtcbiAgICBzaXplID0gLTEgKiBzaXplO1xuICB9XG4gIGlmIChvcmllbnQgPT09IFwiYm90dG9tXCIgfHwgb3JpZW50ID09PSBcInRvcFwiKSB7XG4gICAgcGF0aCA9IFwiTVwiICsgcmFuZ2VbMF0gKyBcIixcIiArIHNpemUgKyBcIlYwSFwiICsgcmFuZ2VbMV0gKyBcIlZcIiArIHNpemU7XG4gIH0gZWxzZSB7XG4gICAgcGF0aCA9IFwiTVwiICsgc2l6ZSArIFwiLFwiICsgcmFuZ2VbMF0gKyBcIkgwVlwiICsgcmFuZ2VbMV0gKyBcIkhcIiArIHNpemU7XG4gIH1cbiAgZG9tYWluLnByb3BlcnRpZXMudXBkYXRlLnBhdGggPSB7dmFsdWU6IHBhdGh9O1xufVxuXG5mdW5jdGlvbiB2Z19heGlzVXBkYXRlKGl0ZW0sIGdyb3VwLCB0cmFucywgZGIsIHNpZ25hbHMsIHByZWRpY2F0ZXMpIHtcbiAgdmFyIG8gPSB0cmFucyA/IHt9IDogaXRlbSxcbiAgICAgIG9mZnNldCA9IGl0ZW0ubWFyay5kZWYub2Zmc2V0LFxuICAgICAgb3JpZW50ID0gaXRlbS5tYXJrLmRlZi5vcmllbnQsXG4gICAgICB3aWR0aCAgPSBncm91cC53aWR0aCxcbiAgICAgIGhlaWdodCA9IGdyb3VwLmhlaWdodDsgLy8gVE9ETyBmYWxsYmFjayB0byBnbG9iYWwgdyxoP1xuXG4gIGlmIChkbC5pc09iamVjdChvZmZzZXQpKSB7XG4gICAgb2Zmc2V0ID0gLWdyb3VwLnNjYWxlKG9mZnNldC5zY2FsZSkob2Zmc2V0LnZhbHVlKTtcbiAgfVxuXG4gIHN3aXRjaCAob3JpZW50KSB7XG4gICAgY2FzZSBcImxlZnRcIjogICB7IHRwbC5zZXQobywgJ3gnLCAtb2Zmc2V0KTsgdHBsLnNldChvLCAneScsIDApOyBicmVhazsgfVxuICAgIGNhc2UgXCJyaWdodFwiOiAgeyB0cGwuc2V0KG8sICd4Jywgd2lkdGggKyBvZmZzZXQpOyB0cGwuc2V0KG8sICd5JywgMCk7IGJyZWFrOyB9XG4gICAgY2FzZSBcImJvdHRvbVwiOiB7IHRwbC5zZXQobywgJ3gnLCAwKTsgdHBsLnNldChvLCAneScsIGhlaWdodCArIG9mZnNldCk7IGJyZWFrOyB9XG4gICAgY2FzZSBcInRvcFwiOiAgICB7IHRwbC5zZXQobywgJ3gnLCAwKTsgdHBsLnNldChvLCAneScsIC1vZmZzZXQpOyBicmVhazsgfVxuICAgIGRlZmF1bHQ6ICAgICAgIHsgdHBsLnNldChvLCAneCcsIDApOyB0cGwuc2V0KG8sICd5JywgMCk7IH1cbiAgfVxuXG4gIGlmICh0cmFucykgdHJhbnMuaW50ZXJwb2xhdGUoaXRlbSwgbyk7XG59XG5cbmZ1bmN0aW9uIHZnX2F4aXNUaWNrcygpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBcInJ1bGVcIixcbiAgICBpbnRlcmFjdGl2ZTogZmFsc2UsXG4gICAga2V5OiBcImRhdGFcIixcbiAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICBlbnRlcjoge1xuICAgICAgICBzdHJva2U6IHt2YWx1ZTogY29uZmlnLmF4aXMudGlja0NvbG9yfSxcbiAgICAgICAgc3Ryb2tlV2lkdGg6IHt2YWx1ZTogY29uZmlnLmF4aXMudGlja1dpZHRofSxcbiAgICAgICAgb3BhY2l0eToge3ZhbHVlOiAxZS02fVxuICAgICAgfSxcbiAgICAgIGV4aXQ6IHsgb3BhY2l0eToge3ZhbHVlOiAxZS02fSB9LFxuICAgICAgdXBkYXRlOiB7IG9wYWNpdHk6IHt2YWx1ZTogMX0gfVxuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gdmdfYXhpc1RpY2tMYWJlbHMoKSB7XG4gIHJldHVybiB7XG4gICAgdHlwZTogXCJ0ZXh0XCIsXG4gICAgaW50ZXJhY3RpdmU6IHRydWUsXG4gICAga2V5OiBcImRhdGFcIixcbiAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICBlbnRlcjoge1xuICAgICAgICBmaWxsOiB7dmFsdWU6IGNvbmZpZy5heGlzLnRpY2tMYWJlbENvbG9yfSxcbiAgICAgICAgZm9udDoge3ZhbHVlOiBjb25maWcuYXhpcy50aWNrTGFiZWxGb250fSxcbiAgICAgICAgZm9udFNpemU6IHt2YWx1ZTogY29uZmlnLmF4aXMudGlja0xhYmVsRm9udFNpemV9LFxuICAgICAgICBvcGFjaXR5OiB7dmFsdWU6IDFlLTZ9LFxuICAgICAgICB0ZXh0OiB7ZmllbGQ6IFwibGFiZWxcIn1cbiAgICAgIH0sXG4gICAgICBleGl0OiB7IG9wYWNpdHk6IHt2YWx1ZTogMWUtNn0gfSxcbiAgICAgIHVwZGF0ZTogeyBvcGFjaXR5OiB7dmFsdWU6IDF9IH1cbiAgICB9XG4gIH07XG59XG5cbmZ1bmN0aW9uIHZnX2F4aXNUaXRsZSgpIHtcbiAgcmV0dXJuIHtcbiAgICB0eXBlOiBcInRleHRcIixcbiAgICBpbnRlcmFjdGl2ZTogdHJ1ZSxcbiAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICBlbnRlcjoge1xuICAgICAgICBmb250OiB7dmFsdWU6IGNvbmZpZy5heGlzLnRpdGxlRm9udH0sXG4gICAgICAgIGZvbnRTaXplOiB7dmFsdWU6IGNvbmZpZy5heGlzLnRpdGxlRm9udFNpemV9LFxuICAgICAgICBmb250V2VpZ2h0OiB7dmFsdWU6IGNvbmZpZy5heGlzLnRpdGxlRm9udFdlaWdodH0sXG4gICAgICAgIGZpbGw6IHt2YWx1ZTogY29uZmlnLmF4aXMudGl0bGVDb2xvcn0sXG4gICAgICAgIGFsaWduOiB7dmFsdWU6IFwiY2VudGVyXCJ9LFxuICAgICAgICBiYXNlbGluZToge3ZhbHVlOiBcIm1pZGRsZVwifSxcbiAgICAgICAgdGV4dDoge2ZpZWxkOiBcImRhdGFcIn1cbiAgICAgIH0sXG4gICAgICB1cGRhdGU6IHt9XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiB2Z19heGlzRG9tYWluKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6IFwicGF0aFwiLFxuICAgIGludGVyYWN0aXZlOiBmYWxzZSxcbiAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICBlbnRlcjoge1xuICAgICAgICB4OiB7dmFsdWU6IDAuNX0sXG4gICAgICAgIHk6IHt2YWx1ZTogMC41fSxcbiAgICAgICAgc3Ryb2tlOiB7dmFsdWU6IGNvbmZpZy5heGlzLmF4aXNDb2xvcn0sXG4gICAgICAgIHN0cm9rZVdpZHRoOiB7dmFsdWU6IGNvbmZpZy5heGlzLmF4aXNXaWR0aH1cbiAgICAgIH0sXG4gICAgICB1cGRhdGU6IHt9XG4gICAgfVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGF4czsiLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9UcmFuc2Zvcm0nKSxcbiAgICBHcm91cEJ5ID0gcmVxdWlyZSgnLi9Hcm91cEJ5JyksXG4gICAgdHVwbGUgPSByZXF1aXJlKCcuLi9kYXRhZmxvdy90dXBsZScpLCBcbiAgICBjaGFuZ2VzZXQgPSByZXF1aXJlKCcuLi9kYXRhZmxvdy9jaGFuZ2VzZXQnKSwgXG4gICAgbWVhcyA9IHJlcXVpcmUoJy4vbWVhc3VyZXMnKSxcbiAgICBkZWJ1ZyA9IHJlcXVpcmUoJy4uL3V0aWwvZGVidWcnKSxcbiAgICBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKTtcblxuZnVuY3Rpb24gQWdncmVnYXRlKGdyYXBoKSB7XG4gIEdyb3VwQnkucHJvdG90eXBlLmluaXQuY2FsbCh0aGlzLCBncmFwaCk7XG4gIFRyYW5zZm9ybS5hZGRQYXJhbWV0ZXJzKHRoaXMsIHtcbiAgICBncm91cF9ieToge3R5cGU6IFwiYXJyYXk8ZmllbGQ+XCJ9XG4gIH0pO1xuXG4gIHRoaXMuX291dHB1dCA9IHtcbiAgICBcImNvdW50XCI6ICAgIFwiY291bnRcIixcbiAgICBcImF2Z1wiOiAgICAgIFwiYXZnXCIsXG4gICAgXCJtaW5cIjogICAgICBcIm1pblwiLFxuICAgIFwibWF4XCI6ICAgICAgXCJtYXhcIixcbiAgICBcInN1bVwiOiAgICAgIFwic3VtXCIsXG4gICAgXCJtZWFuXCI6ICAgICBcIm1lYW5cIixcbiAgICBcInZhclwiOiAgICAgIFwidmFyXCIsXG4gICAgXCJzdGRldlwiOiAgICBcInN0ZGV2XCIsXG4gICAgXCJ2YXJwXCI6ICAgICBcInZhcnBcIixcbiAgICBcInN0ZGV2cFwiOiAgIFwic3RkZXZwXCIsXG4gICAgXCJtZWRpYW5cIjogICBcIm1lZGlhblwiXG4gIH07XG5cbiAgLy8gQWdncmVnYXRvcnMgcGFyYW1ldGVyIGhhbmRsZWQgbWFudWFsbHkuXG4gIHRoaXMuX2ZpZWxkc0RlZiAgID0gbnVsbDtcbiAgdGhpcy5fQWdncmVnYXRvcnMgPSBudWxsO1xuICB0aGlzLl9zaW5nbGV0b24gICA9IGZhbHNlOyAgLy8gSWYgdHJ1ZSwgYWxsIGZpZWxkcyBhZ2dyZWdhdGVkIHdpdGhpbiBhIHNpbmdsZSBtb25vaWRcblxuICByZXR1cm4gdGhpcztcbn1cblxudmFyIHByb3RvID0gKEFnZ3JlZ2F0ZS5wcm90b3R5cGUgPSBuZXcgR3JvdXBCeSgpKTtcblxucHJvdG8uZmllbGRzID0ge1xuICBzZXQ6IGZ1bmN0aW9uKHRyYW5zZm9ybSwgZmllbGRzKSB7XG4gICAgdmFyIGksIGxlbiwgZiwgc2lnbmFscyA9IHt9O1xuICAgIGZvcihpPTAsIGxlbj1maWVsZHMubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgICBmID0gZmllbGRzW2ldO1xuICAgICAgaWYoZi5uYW1lLnNpZ25hbCkgc2lnbmFsc1tmLm5hbWUuc2lnbmFsXSA9IDE7XG4gICAgICBkbC5hcnJheShmLm9wcykuZm9yRWFjaChmdW5jdGlvbihvKXsgaWYoby5zaWduYWwpIHNpZ25hbHNbby5zaWduYWxdID0gMSB9KTtcbiAgICB9XG5cbiAgICB0cmFuc2Zvcm0uX2ZpZWxkc0RlZiA9IGZpZWxkcztcbiAgICB0cmFuc2Zvcm0uX0FnZ3JlZ2F0b3JzID0gbnVsbDtcbiAgICB0cmFuc2Zvcm0uYWdncygpO1xuICAgIHRyYW5zZm9ybS5kZXBlbmRlbmN5KEMuU0lHTkFMUywgZGwua2V5cyhzaWduYWxzKSk7XG4gICAgcmV0dXJuIHRyYW5zZm9ybTtcbiAgfVxufTtcblxucHJvdG8uc2luZ2xldG9uID0gZnVuY3Rpb24oYykge1xuICBpZighYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX3NpbmdsZXRvbjtcbiAgdGhpcy5fc2luZ2xldG9uID0gYztcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5wcm90by5hZ2dzID0gZnVuY3Rpb24oKSB7XG4gIHZhciB0cmFuc2Zvcm0gPSB0aGlzLFxuICAgICAgZ3JhcGggPSB0aGlzLl9ncmFwaCxcbiAgICAgIGZpZWxkcyA9IHRoaXMuX2ZpZWxkc0RlZixcbiAgICAgIGFnZ3MgPSB0aGlzLl9BZ2dyZWdhdG9ycyxcbiAgICAgIGYsIGksIGssIG5hbWUsIG9wcywgbWVhc3VyZXM7XG5cbiAgaWYoYWdncykgcmV0dXJuIGFnZ3M7XG4gIGVsc2UgYWdncyA9IHRoaXMuX0FnZ3JlZ2F0b3JzID0gW107IFxuXG4gIGZvciAoaSA9IDA7IGkgPCBmaWVsZHMubGVuZ3RoOyBpKyspIHtcbiAgICBmID0gZmllbGRzW2ldO1xuICAgIGlmIChmLm9wcy5sZW5ndGggPT09IDApIGNvbnRpbnVlO1xuXG4gICAgbmFtZSA9IGYubmFtZS5zaWduYWwgPyBncmFwaC5zaWduYWxSZWYoZi5uYW1lLnNpZ25hbCkgOiBmLm5hbWU7XG4gICAgb3BzICA9IGRsLmFycmF5KGYub3BzLnNpZ25hbCA/IGdyYXBoLnNpZ25hbFJlZihmLm9wcy5zaWduYWwpIDogZi5vcHMpO1xuICAgIG1lYXN1cmVzID0gb3BzLm1hcChmdW5jdGlvbihhKSB7XG4gICAgICBhID0gYS5zaWduYWwgPyBncmFwaC5zaWduYWxSZWYoYS5zaWduYWwpIDogYTtcbiAgICAgIHJldHVybiBtZWFzW2FdKG5hbWUgKyAnXycgKyB0cmFuc2Zvcm0uX291dHB1dFthXSk7XG4gICAgfSk7XG4gICAgYWdncy5wdXNoKHtcbiAgICAgIGFjY2Vzc29yOiBkbC5hY2Nlc3NvcihuYW1lKSxcbiAgICAgIGZpZWxkOiB0aGlzLl9zaW5nbGV0b24gPyBDLlNJTkdMRVRPTiA6IG5hbWUsXG4gICAgICBtZWFzdXJlczogbWVhcy5jcmVhdGUobWVhc3VyZXMpXG4gICAgfSk7XG4gIH1cblxuICByZXR1cm4gYWdncztcbn07XG5cbnByb3RvLl9yZXNldCA9IGZ1bmN0aW9uKGlucHV0LCBvdXRwdXQpIHtcbiAgdGhpcy5fQWdncmVnYXRvcnMgPSBudWxsOyAvLyByZWJ1aWxkIGFnZ3JlZ2F0b3JzXG4gIHRoaXMuYWdncygpO1xuICByZXR1cm4gR3JvdXBCeS5wcm90b3R5cGUuX3Jlc2V0LmNhbGwodGhpcywgaW5wdXQsIG91dHB1dCk7XG59O1xuXG5wcm90by5fa2V5cyA9IGZ1bmN0aW9uKHgpIHtcbiAgcmV0dXJuIHRoaXMuX2diLmZpZWxkcy5sZW5ndGggPyBcbiAgICBHcm91cEJ5LnByb3RvdHlwZS5fa2V5cy5jYWxsKHRoaXMsIHgpIDoge2tleXM6IFtdLCBrZXk6IFwiXCJ9O1xufTtcblxucHJvdG8uX25ld19jZWxsID0gZnVuY3Rpb24oeCwgaykge1xuICB2YXIgY2VsbCA9IEdyb3VwQnkucHJvdG90eXBlLl9uZXdfY2VsbC5jYWxsKHRoaXMsIHgsIGspLFxuICAgICAgYWdncyA9IHRoaXMuYWdncygpLFxuICAgICAgaSA9IDAsIGxlbiA9IGFnZ3MubGVuZ3RoLCBcbiAgICAgIGFnZztcblxuICBmb3IoOyBpPGxlbjsgaSsrKSB7XG4gICAgYWdnID0gYWdnc1tpXTtcbiAgICBjZWxsW2FnZy5maWVsZF0gPSBuZXcgYWdnLm1lYXN1cmVzKGNlbGwsIGNlbGwudHBsKTtcbiAgfVxuXG4gIHJldHVybiBjZWxsO1xufTtcblxucHJvdG8uX2FkZCA9IGZ1bmN0aW9uKHgpIHtcbiAgdmFyIGMgPSB0aGlzLl9jZWxsKHgpLFxuICAgICAgYWdncyA9IHRoaXMuYWdncygpLFxuICAgICAgaSA9IDAsIGxlbiA9IGFnZ3MubGVuZ3RoLFxuICAgICAgYWdnO1xuXG4gIGMuY250Kys7XG4gIGZvcig7IGk8bGVuOyBpKyspIHtcbiAgICBhZ2cgPSBhZ2dzW2ldO1xuICAgIGNbYWdnLmZpZWxkXS5hZGQoYWdnLmFjY2Vzc29yKHgpKTtcbiAgfVxuICBjLmZsZyB8PSBDLk1PRF9DRUxMO1xufTtcblxucHJvdG8uX3JlbSA9IGZ1bmN0aW9uKHgpIHtcbiAgdmFyIGMgPSB0aGlzLl9jZWxsKHgpLFxuICAgICAgYWdncyA9IHRoaXMuYWdncygpLFxuICAgICAgaSA9IDAsIGxlbiA9IGFnZ3MubGVuZ3RoLFxuICAgICAgYWdnO1xuXG4gIGMuY250LS07XG4gIGZvcig7IGk8bGVuOyBpKyspIHtcbiAgICBhZ2cgPSBhZ2dzW2ldO1xuICAgIGNbYWdnLmZpZWxkXS5yZW0oYWdnLmFjY2Vzc29yKHgpKTtcbiAgfVxuICBjLmZsZyB8PSBDLk1PRF9DRUxMO1xufTtcblxucHJvdG8udHJhbnNmb3JtID0gZnVuY3Rpb24oaW5wdXQsIHJlc2V0KSB7XG4gIGRlYnVnKGlucHV0LCBbXCJhZ2dyZWdhdGVcIl0pO1xuXG4gIHRoaXMuX2diID0gdGhpcy5ncm91cF9ieS5nZXQodGhpcy5fZ3JhcGgpO1xuXG4gIHZhciBvdXRwdXQgPSBHcm91cEJ5LnByb3RvdHlwZS50cmFuc2Zvcm0uY2FsbCh0aGlzLCBpbnB1dCwgcmVzZXQpLFxuICAgICAgYWdncyA9IHRoaXMuYWdncygpLFxuICAgICAgbGVuID0gYWdncy5sZW5ndGgsXG4gICAgICBpLCBrLCBjO1xuXG4gIGZvcihrIGluIHRoaXMuX2NlbGxzKSB7XG4gICAgYyA9IHRoaXMuX2NlbGxzW2tdO1xuICAgIGlmKCFjKSBjb250aW51ZTtcbiAgICBmb3IoaT0wOyBpPGxlbjsgaSsrKSB7XG4gICAgICBjW2FnZ3NbaV0uZmllbGRdLnNldCgpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvdXRwdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFnZ3JlZ2F0ZTsiLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9UcmFuc2Zvcm0nKSxcbiAgICB0dXBsZSA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L3R1cGxlJyk7XG5cbmZ1bmN0aW9uIEJpbihncmFwaCkge1xuICBUcmFuc2Zvcm0ucHJvdG90eXBlLmluaXQuY2FsbCh0aGlzLCBncmFwaCk7XG4gIFRyYW5zZm9ybS5hZGRQYXJhbWV0ZXJzKHRoaXMsIHtcbiAgICBmaWVsZDoge3R5cGU6IFwiZmllbGRcIn0sXG4gICAgbWluOiB7dHlwZTogXCJ2YWx1ZVwifSxcbiAgICBtYXg6IHt0eXBlOiBcInZhbHVlXCJ9LFxuICAgIHN0ZXA6IHt0eXBlOiBcInZhbHVlXCJ9LFxuICAgIG1heGJpbnM6IHt0eXBlOiBcInZhbHVlXCIsIGRlZmF1bHQ6IDIwfVxuICB9KTtcblxuICB0aGlzLl9vdXRwdXQgPSB7XCJiaW5cIjogXCJiaW5cIn07XG4gIHJldHVybiB0aGlzO1xufVxuXG52YXIgcHJvdG8gPSAoQmluLnByb3RvdHlwZSA9IG5ldyBUcmFuc2Zvcm0oKSk7XG5cbnByb3RvLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIHZhciB0cmFuc2Zvcm0gPSB0aGlzLFxuICAgICAgb3V0cHV0ID0gdGhpcy5fb3V0cHV0LmJpbjtcbiAgICAgIFxuICB2YXIgYiA9IGRsLmJpbih7XG4gICAgbWluOiB0aGlzLm1pbi5nZXQoKSxcbiAgICBtYXg6IHRoaXMubWF4LmdldCgpLFxuICAgIHN0ZXA6IHRoaXMuc3RlcC5nZXQoKSxcbiAgICBtYXhiaW5zOiB0aGlzLm1heGJpbnMuZ2V0KClcbiAgfSk7XG5cbiAgZnVuY3Rpb24gdXBkYXRlKGQpIHtcbiAgICB2YXIgdiA9IHRyYW5zZm9ybS5maWVsZC5nZXQoKS5hY2Nlc3NvcihkKTtcbiAgICB2ID0gdiA9PSBudWxsID8gbnVsbFxuICAgICAgOiBiLnN0YXJ0ICsgYi5zdGVwICogfn4oKHYgLSBiLnN0YXJ0KSAvIGIuc3RlcCk7XG4gICAgdHVwbGUuc2V0KGQsIG91dHB1dCwgdiwgaW5wdXQuc3RhbXApO1xuICB9XG4gIGlucHV0LmFkZC5mb3JFYWNoKHVwZGF0ZSk7XG4gIGlucHV0Lm1vZC5mb3JFYWNoKHVwZGF0ZSk7XG4gIGlucHV0LnJlbS5mb3JFYWNoKHVwZGF0ZSk7XG5cbiAgcmV0dXJuIGlucHV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBCaW47IiwidmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyksXG4gICAgQ29sbGVjdG9yID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvQ29sbGVjdG9yJyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyksXG4gICAgdHVwbGUgPSByZXF1aXJlKCcuLi9kYXRhZmxvdy90dXBsZScpLFxuICAgIGNoYW5nZXNldCA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L2NoYW5nZXNldCcpO1xuXG5mdW5jdGlvbiBDcm9zcyhncmFwaCkge1xuICBUcmFuc2Zvcm0ucHJvdG90eXBlLmluaXQuY2FsbCh0aGlzLCBncmFwaCk7XG4gIFRyYW5zZm9ybS5hZGRQYXJhbWV0ZXJzKHRoaXMsIHtcbiAgICB3aXRoOiB7dHlwZTogXCJkYXRhXCJ9LFxuICAgIGRpYWdvbmFsOiB7dHlwZTogXCJ2YWx1ZVwiLCBkZWZhdWx0OiBcInRydWVcIn1cbiAgfSk7XG5cbiAgdGhpcy5fb3V0cHV0ID0ge1wibGVmdFwiOiBcImFcIiwgXCJyaWdodFwiOiBcImJcIn07XG4gIHRoaXMuX2NvbGxlY3RvciA9IG5ldyBDb2xsZWN0b3IoZ3JhcGgpO1xuICB0aGlzLl9sYXN0UmVtICA9IG51bGw7IC8vIE1vc3QgcmVjZW50IHN0YW1wIHRoYXQgcmVtIG9jY3VyZWQuIFxuICB0aGlzLl9sYXN0V2l0aCA9IG51bGw7IC8vIExhc3QgdGltZSB3ZSBjcm9zc2VkIHcvd2l0aGRzLlxuICB0aGlzLl9pZHMgICA9IHt9O1xuICB0aGlzLl9jYWNoZSA9IHt9O1xuXG4gIHJldHVybiB0aGlzLnJvdXRlcih0cnVlKTtcbn1cblxudmFyIHByb3RvID0gKENyb3NzLnByb3RvdHlwZSA9IG5ldyBUcmFuc2Zvcm0oKSk7XG5cbi8vIEVhY2ggY2FjaGVkIGluY29taW5nIHR1cGxlIGFsc28gaGFzIGEgc3RhbXAgdG8gdHJhY2sgaWYgd2UgbmVlZCB0byBkb1xuLy8gbGF6eSBmaWx0ZXJpbmcgb2YgcmVtb3ZlZCB0dXBsZXMuXG5mdW5jdGlvbiBjYWNoZSh4LCB0KSB7XG4gIHZhciBjID0gdGhpcy5fY2FjaGVbeC5faWRdID0gdGhpcy5fY2FjaGVbeC5faWRdIHx8IHtjOiBbXSwgczogdGhpcy5fc3RhbXB9O1xuICBjLmMucHVzaCh0KTtcbn1cblxuZnVuY3Rpb24gYWRkKG91dHB1dCwgbGVmdCwgd2RhdGEsIGRpYWcsIHgpIHtcbiAgdmFyIGRhdGEgPSBsZWZ0ID8gd2RhdGEgOiB0aGlzLl9jb2xsZWN0b3IuZGF0YSgpLCAvLyBMZWZ0IHR1cGxlcyBjcm9zcyB3L3JpZ2h0LlxuICAgICAgaSA9IDAsIGxlbiA9IGRhdGEubGVuZ3RoLFxuICAgICAgcHJldiAgPSB4Ll9wcmV2ICE9PSB1bmRlZmluZWQgPyBudWxsIDogdW5kZWZpbmVkLCBcbiAgICAgIHQsIHksIGlkO1xuXG4gIGZvcig7IGk8bGVuOyArK2kpIHtcbiAgICB5ID0gZGF0YVtpXTtcbiAgICBpZCA9IGxlZnQgPyB4Ll9pZCtcIl9cIit5Ll9pZCA6IHkuX2lkK1wiX1wiK3guX2lkO1xuICAgIGlmKHRoaXMuX2lkc1tpZF0pIGNvbnRpbnVlO1xuICAgIGlmKHguX2lkID09IHkuX2lkICYmICFkaWFnKSBjb250aW51ZTtcblxuICAgIHQgPSB0dXBsZS5pbmdlc3Qoe30sIHByZXYpO1xuICAgIHRbdGhpcy5fb3V0cHV0LmxlZnRdICA9IGxlZnQgPyB4IDogeTtcbiAgICB0W3RoaXMuX291dHB1dC5yaWdodF0gPSBsZWZ0ID8geSA6IHg7XG4gICAgb3V0cHV0LmFkZC5wdXNoKHQpO1xuICAgIGNhY2hlLmNhbGwodGhpcywgeCwgdCk7XG4gICAgY2FjaGUuY2FsbCh0aGlzLCB5LCB0KTtcbiAgICB0aGlzLl9pZHNbaWRdID0gMTtcbiAgfVxufVxuXG5mdW5jdGlvbiBtb2Qob3V0cHV0LCBsZWZ0LCB4KSB7XG4gIHZhciBjcm9zcyA9IHRoaXMsXG4gICAgICBjID0gdGhpcy5fY2FjaGVbeC5faWRdO1xuXG4gIGlmKHRoaXMuX2xhc3RSZW0gPiBjLnMpIHsgIC8vIFJlbW92ZWQgdHVwbGVzIGhhdmVuJ3QgYmVlbiBmaWx0ZXJlZCB5ZXRcbiAgICBjLmMgPSBjLmMuZmlsdGVyKGZ1bmN0aW9uKHkpIHtcbiAgICAgIHZhciB0ID0geVtjcm9zcy5fb3V0cHV0W2xlZnQgPyBcInJpZ2h0XCIgOiBcImxlZnRcIl1dO1xuICAgICAgcmV0dXJuIGNyb3NzLl9jYWNoZVt0Ll9pZF0gIT09IG51bGw7XG4gICAgfSk7XG4gICAgYy5zID0gdGhpcy5fbGFzdFJlbTtcbiAgfVxuXG4gIG91dHB1dC5tb2QucHVzaC5hcHBseShvdXRwdXQubW9kLCBjLmMpO1xufVxuXG5mdW5jdGlvbiByZW0ob3V0cHV0LCB4KSB7XG4gIG91dHB1dC5yZW0ucHVzaC5hcHBseShvdXRwdXQucmVtLCB0aGlzLl9jYWNoZVt4Ll9pZF0uYyk7XG4gIHRoaXMuX2NhY2hlW3guX2lkXSA9IG51bGw7XG4gIHRoaXMuX2xhc3RSZW0gPSB0aGlzLl9zdGFtcDtcbn1cblxuZnVuY3Rpb24gdXBGaWVsZHMoaW5wdXQsIG91dHB1dCkge1xuICBpZihpbnB1dC5hZGQubGVuZ3RoIHx8IGlucHV0LnJlbS5sZW5ndGgpIHtcbiAgICBvdXRwdXQuZmllbGRzW3RoaXMuX291dHB1dC5sZWZ0XSAgPSAxOyBcbiAgICBvdXRwdXQuZmllbGRzW3RoaXMuX291dHB1dC5yaWdodF0gPSAxO1xuICB9XG59XG5cbnByb3RvLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIGRlYnVnKGlucHV0LCBbXCJjcm9zc2luZ1wiXSk7XG5cbiAgLy8gTWF0ZXJpYWxpemUgdGhlIGN1cnJlbnQgZGF0YXNvdXJjZS4gVE9ETzogc2hhcmUgY29sbGVjdG9yc1xuICB0aGlzLl9jb2xsZWN0b3IuZXZhbHVhdGUoaW5wdXQpO1xuXG4gIHZhciB3ID0gdGhpcy53aXRoLmdldCh0aGlzLl9ncmFwaCksXG4gICAgICBkaWFnID0gdGhpcy5kaWFnb25hbC5nZXQodGhpcy5fZ3JhcGgpLFxuICAgICAgc2VsZkNyb3NzID0gKCF3Lm5hbWUpLFxuICAgICAgZGF0YSA9IHRoaXMuX2NvbGxlY3Rvci5kYXRhKCksXG4gICAgICB3b3V0cHV0ID0gc2VsZkNyb3NzID8gaW5wdXQgOiB3LnNvdXJjZS5sYXN0KCksXG4gICAgICB3ZGF0YSAgID0gc2VsZkNyb3NzID8gZGF0YSA6IHcuc291cmNlLnZhbHVlcygpLFxuICAgICAgb3V0cHV0ICA9IGNoYW5nZXNldC5jcmVhdGUoaW5wdXQpLFxuICAgICAgciA9IHJlbS5iaW5kKHRoaXMsIG91dHB1dCk7IFxuXG4gIGlucHV0LnJlbS5mb3JFYWNoKHIpO1xuICBpbnB1dC5hZGQuZm9yRWFjaChhZGQuYmluZCh0aGlzLCBvdXRwdXQsIHRydWUsIHdkYXRhLCBkaWFnKSk7XG5cbiAgaWYoIXNlbGZDcm9zcyAmJiB3b3V0cHV0LnN0YW1wID4gdGhpcy5fbGFzdFdpdGgpIHtcbiAgICB3b3V0cHV0LnJlbS5mb3JFYWNoKHIpO1xuICAgIHdvdXRwdXQuYWRkLmZvckVhY2goYWRkLmJpbmQodGhpcywgb3V0cHV0LCBmYWxzZSwgZGF0YSwgZGlhZykpO1xuICAgIHdvdXRwdXQubW9kLmZvckVhY2gobW9kLmJpbmQodGhpcywgb3V0cHV0LCBmYWxzZSkpO1xuICAgIHVwRmllbGRzLmNhbGwodGhpcywgd291dHB1dCwgb3V0cHV0KTtcbiAgICB0aGlzLl9sYXN0V2l0aCA9IHdvdXRwdXQuc3RhbXA7XG4gIH1cblxuICAvLyBNb2RzIG5lZWQgdG8gY29tZSBhZnRlciBhbGwgcmVtb3ZhbHMgaGF2ZSBiZWVuIHJ1bi5cbiAgaW5wdXQubW9kLmZvckVhY2gobW9kLmJpbmQodGhpcywgb3V0cHV0LCB0cnVlKSk7XG4gIHVwRmllbGRzLmNhbGwodGhpcywgaW5wdXQsIG91dHB1dCk7XG5cbiAgcmV0dXJuIG91dHB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ3Jvc3M7IiwidmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyksXG4gICAgR3JvdXBCeSA9IHJlcXVpcmUoJy4vR3JvdXBCeScpLFxuICAgIHR1cGxlID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvdHVwbGUnKSwgXG4gICAgY2hhbmdlc2V0ID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvY2hhbmdlc2V0JyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyksXG4gICAgQyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uc3RhbnRzJyk7XG5cbmZ1bmN0aW9uIEZhY2V0KGdyYXBoKSB7XG4gIEdyb3VwQnkucHJvdG90eXBlLmluaXQuY2FsbCh0aGlzLCBncmFwaCk7XG4gIFRyYW5zZm9ybS5hZGRQYXJhbWV0ZXJzKHRoaXMsIHtrZXlzOiB7dHlwZTogXCJhcnJheTxmaWVsZD5cIn0gfSk7XG5cbiAgdGhpcy5fcGlwZWxpbmUgPSBbXTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cbnZhciBwcm90byA9IChGYWNldC5wcm90b3R5cGUgPSBuZXcgR3JvdXBCeSgpKTtcblxucHJvdG8ucGlwZWxpbmUgPSBmdW5jdGlvbihwaXBlbGluZSkge1xuICBpZighYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIHRoaXMuX3BpcGVsaW5lO1xuICB0aGlzLl9waXBlbGluZSA9IHBpcGVsaW5lO1xuICByZXR1cm4gdGhpcztcbn07XG5cbnByb3RvLl9yZXNldCA9IGZ1bmN0aW9uKGlucHV0LCBvdXRwdXQpIHtcbiAgdmFyIGssIGM7XG4gIGZvcihrIGluIHRoaXMuX2NlbGxzKSB7XG4gICAgYyA9IHRoaXMuX2NlbGxzW2tdO1xuICAgIGlmKCFjKSBjb250aW51ZTtcbiAgICBvdXRwdXQucmVtLnB1c2goYy50cGwpO1xuICAgIGMuZGVsZXRlKCk7XG4gIH1cbiAgdGhpcy5fY2VsbHMgPSB7fTtcbn07XG5cbnByb3RvLl9uZXdfdHVwbGUgPSBmdW5jdGlvbih4LCBrKSB7XG4gIHJldHVybiB0dXBsZS5pbmdlc3QoaywgbnVsbCk7XG59O1xuXG5wcm90by5fbmV3X2NlbGwgPSBmdW5jdGlvbih4LCBrKSB7XG4gIC8vIFJhdGhlciB0aGFuIHNoYXJpbmcgdGhlIHBpcGVsaW5lIGJldHdlZW4gYWxsIG5vZGVzLFxuICAvLyBnaXZlIGVhY2ggY2VsbCBpdHMgaW5kaXZpZHVhbCBwaXBlbGluZS4gVGhpcyBhbGxvd3NcbiAgLy8gZHluYW1pY2FsbHkgYWRkZWQgY29sbGVjdG9ycyB0byBkbyB0aGUgcmlnaHQgdGhpbmdcbiAgLy8gd2hlbiB3aXJpbmcgdXAgdGhlIHBpcGVsaW5lcy5cbiAgdmFyIGNlbGwgPSBHcm91cEJ5LnByb3RvdHlwZS5fbmV3X2NlbGwuY2FsbCh0aGlzLCB4LCBrKSxcbiAgICAgIHBpcGVsaW5lID0gdGhpcy5fcGlwZWxpbmUubWFwKGZ1bmN0aW9uKG4pIHsgcmV0dXJuIG4uY2xvbmUoKTsgfSksXG4gICAgICBmYWNldCA9IHRoaXMsXG4gICAgICB0ID0gY2VsbC50cGw7XG5cbiAgY2VsbC5kcyA9IHRoaXMuX2dyYXBoLmRhdGEoXCJ2Z19cIit0Ll9pZCwgcGlwZWxpbmUsIHQpO1xuICBjZWxsLmRlbGV0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGRlYnVnKHt9LCBbXCJkZWxldGluZyBjZWxsXCIsIGsua2V5XSk7XG4gICAgZmFjZXQucmVtb3ZlTGlzdGVuZXIocGlwZWxpbmVbMF0pO1xuICAgIGZhY2V0Ll9ncmFwaC5kaXNjb25uZWN0KHBpcGVsaW5lKTtcbiAgfTtcblxuICB0aGlzLmFkZExpc3RlbmVyKHBpcGVsaW5lWzBdKTtcblxuICByZXR1cm4gY2VsbDtcbn07XG5cbnByb3RvLl9hZGQgPSBmdW5jdGlvbih4KSB7XG4gIHZhciBjZWxsID0gR3JvdXBCeS5wcm90b3R5cGUuX2FkZC5jYWxsKHRoaXMsIHgpO1xuICBjZWxsLmRzLl9pbnB1dC5hZGQucHVzaCh4KTtcbiAgcmV0dXJuIGNlbGw7XG59O1xuXG5wcm90by5fbW9kID0gZnVuY3Rpb24oeCwgcmVzZXQpIHtcbiAgdmFyIGNlbGwgPSBHcm91cEJ5LnByb3RvdHlwZS5fbW9kLmNhbGwodGhpcywgeCwgcmVzZXQpO1xuICBpZighKGNlbGwuZmxnICYgQy5BRERfQ0VMTCkpIGNlbGwuZHMuX2lucHV0Lm1vZC5wdXNoKHgpOyAvLyBQcm9wYWdhdGUgdHVwbGVzXG4gIGNlbGwuZmxnIHw9IEMuTU9EX0NFTEw7XG4gIHJldHVybiBjZWxsO1xufTtcblxucHJvdG8uX3JlbSA9IGZ1bmN0aW9uKHgpIHtcbiAgdmFyIGNlbGwgPSBHcm91cEJ5LnByb3RvdHlwZS5fcmVtLmNhbGwodGhpcywgeCk7XG4gIGNlbGwuZHMuX2lucHV0LnJlbS5wdXNoKHgpO1xuICByZXR1cm4gY2VsbDtcbn07XG5cbnByb3RvLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKGlucHV0LCByZXNldCkge1xuICBkZWJ1ZyhpbnB1dCwgW1wiZmFjZXRpbmdcIl0pO1xuXG4gIHRoaXMuX2diID0gdGhpcy5rZXlzLmdldCh0aGlzLl9ncmFwaCk7XG5cbiAgdmFyIG91dHB1dCA9IEdyb3VwQnkucHJvdG90eXBlLnRyYW5zZm9ybS5jYWxsKHRoaXMsIGlucHV0LCByZXNldCksXG4gICAgICBrLCBjO1xuXG4gIGZvcihrIGluIHRoaXMuX2NlbGxzKSB7XG4gICAgYyA9IHRoaXMuX2NlbGxzW2tdO1xuICAgIGlmKGMgPT0gbnVsbCkgY29udGludWU7XG4gICAgaWYoYy5jbnQgPT09IDApIHtcbiAgICAgIGMuZGVsZXRlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHByb3BhZ2F0ZSBzb3J0LCBzaWduYWxzLCBmaWVsZHMsIGV0Yy5cbiAgICAgIGNoYW5nZXNldC5jb3B5KGlucHV0LCBjLmRzLl9pbnB1dCk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIG91dHB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRmFjZXQ7IiwidmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyksXG4gICAgY2hhbmdlc2V0ID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvY2hhbmdlc2V0JyksIFxuICAgIGV4cHIgPSByZXF1aXJlKCcuLi9wYXJzZS9leHByJyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyksXG4gICAgQyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uc3RhbnRzJyk7XG5cbmZ1bmN0aW9uIEZpbHRlcihncmFwaCkge1xuICBUcmFuc2Zvcm0ucHJvdG90eXBlLmluaXQuY2FsbCh0aGlzLCBncmFwaCk7XG4gIFRyYW5zZm9ybS5hZGRQYXJhbWV0ZXJzKHRoaXMsIHt0ZXN0OiB7dHlwZTogXCJleHByXCJ9IH0pO1xuXG4gIHRoaXMuX3NraXAgPSB7fTtcbiAgcmV0dXJuIHRoaXM7XG59XG5cbnZhciBwcm90byA9IChGaWx0ZXIucHJvdG90eXBlID0gbmV3IFRyYW5zZm9ybSgpKTtcblxuZnVuY3Rpb24gdGVzdCh4KSB7XG4gIHJldHVybiBleHByLmV2YWwodGhpcy5fZ3JhcGgsIHRoaXMudGVzdC5nZXQodGhpcy5fZ3JhcGgpLCBcbiAgICB4LCBudWxsLCBudWxsLCBudWxsLCB0aGlzLmRlcGVuZGVuY3koQy5TSUdOQUxTKSk7XG59O1xuXG5wcm90by50cmFuc2Zvcm0gPSBmdW5jdGlvbihpbnB1dCkge1xuICBkZWJ1ZyhpbnB1dCwgW1wiZmlsdGVyaW5nXCJdKTtcbiAgdmFyIG91dHB1dCA9IGNoYW5nZXNldC5jcmVhdGUoaW5wdXQpLFxuICAgICAgc2tpcCA9IHRoaXMuX3NraXAsXG4gICAgICBmID0gdGhpcztcblxuICBpbnB1dC5yZW0uZm9yRWFjaChmdW5jdGlvbih4KSB7XG4gICAgaWYgKHNraXBbeC5faWRdICE9PSAxKSBvdXRwdXQucmVtLnB1c2goeCk7XG4gICAgZWxzZSBza2lwW3guX2lkXSA9IDA7XG4gIH0pO1xuXG4gIGlucHV0LmFkZC5mb3JFYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAodGVzdC5jYWxsKGYsIHgpKSBvdXRwdXQuYWRkLnB1c2goeCk7XG4gICAgZWxzZSBza2lwW3guX2lkXSA9IDE7XG4gIH0pO1xuXG4gIGlucHV0Lm1vZC5mb3JFYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICB2YXIgYiA9IHRlc3QuY2FsbChmLCB4KSxcbiAgICAgICAgcyA9IChza2lwW3guX2lkXSA9PT0gMSk7XG4gICAgaWYgKGIgJiYgcykge1xuICAgICAgc2tpcFt4Ll9pZF0gPSAwO1xuICAgICAgb3V0cHV0LmFkZC5wdXNoKHgpO1xuICAgIH0gZWxzZSBpZiAoYiAmJiAhcykge1xuICAgICAgb3V0cHV0Lm1vZC5wdXNoKHgpO1xuICAgIH0gZWxzZSBpZiAoIWIgJiYgcykge1xuICAgICAgLy8gZG8gbm90aGluZywga2VlcCBza2lwIHRydWVcbiAgICB9IGVsc2UgeyAvLyAhYiAmJiAhc1xuICAgICAgb3V0cHV0LnJlbS5wdXNoKHgpO1xuICAgICAgc2tpcFt4Ll9pZF0gPSAxO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIG91dHB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gRmlsdGVyOyIsInZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL1RyYW5zZm9ybScpLFxuICAgIGRlYnVnID0gcmVxdWlyZSgnLi4vdXRpbC9kZWJ1ZycpLCBcbiAgICB0dXBsZSA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L3R1cGxlJyksIFxuICAgIGNoYW5nZXNldCA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L2NoYW5nZXNldCcpO1xuXG5mdW5jdGlvbiBGb2xkKGdyYXBoKSB7XG4gIFRyYW5zZm9ybS5wcm90b3R5cGUuaW5pdC5jYWxsKHRoaXMsIGdyYXBoKTtcbiAgVHJhbnNmb3JtLmFkZFBhcmFtZXRlcnModGhpcywge1xuICAgIGZpZWxkczoge3R5cGU6IFwiYXJyYXk8ZmllbGQ+XCJ9IFxuICB9KTtcblxuICB0aGlzLl9vdXRwdXQgPSB7a2V5OiBcImtleVwiLCB2YWx1ZTogXCJ2YWx1ZVwifTtcbiAgdGhpcy5fY2FjaGUgPSB7fTtcblxuICByZXR1cm4gdGhpcy5yb3V0ZXIodHJ1ZSkucmV2aXNlcyh0cnVlKTtcbn1cblxudmFyIHByb3RvID0gKEZvbGQucHJvdG90eXBlID0gbmV3IFRyYW5zZm9ybSgpKTtcblxuZnVuY3Rpb24gcnN0KGlucHV0LCBvdXRwdXQpIHsgXG4gIGZvcih2YXIgaWQgaW4gdGhpcy5fY2FjaGUpIG91dHB1dC5yZW0ucHVzaC5hcHBseShvdXRwdXQucmVtLCB0aGlzLl9jYWNoZVtpZF0pO1xuICB0aGlzLl9jYWNoZSA9IHt9O1xufTtcblxuZnVuY3Rpb24gZ2V0X3R1cGxlKHgsIGksIGxlbikge1xuICB2YXIgbGlzdCA9IHRoaXMuX2NhY2hlW3guX2lkXSB8fCAodGhpcy5fY2FjaGVbeC5faWRdID0gQXJyYXkobGVuKSk7XG4gIHJldHVybiBsaXN0W2ldIHx8IChsaXN0W2ldID0gdHVwbGUuZGVyaXZlKHgsIHguX3ByZXYpKTtcbn07XG5cbmZ1bmN0aW9uIGZuKGRhdGEsIGZpZWxkcywgYWNjZXNzb3JzLCBvdXQsIHN0YW1wKSB7XG4gIHZhciBpID0gMCwgZGxlbiA9IGRhdGEubGVuZ3RoLFxuICAgICAgaiwgZmxlbiA9IGZpZWxkcy5sZW5ndGgsXG4gICAgICBkLCB0O1xuXG4gIGZvcig7IGk8ZGxlbjsgKytpKSB7XG4gICAgZCA9IGRhdGFbaV07XG4gICAgZm9yKGo9MDsgajxmbGVuOyArK2opIHtcbiAgICAgIHQgPSBnZXRfdHVwbGUuY2FsbCh0aGlzLCBkLCBqLCBmbGVuKTsgIFxuICAgICAgdHVwbGUuc2V0KHQsIHRoaXMuX291dHB1dC5rZXksIGZpZWxkc1tqXSk7XG4gICAgICB0dXBsZS5zZXQodCwgdGhpcy5fb3V0cHV0LnZhbHVlLCBhY2Nlc3NvcnNbal0oZCkpO1xuICAgICAgb3V0LnB1c2godCk7XG4gICAgfSAgICAgIFxuICB9XG59O1xuXG5wcm90by50cmFuc2Zvcm0gPSBmdW5jdGlvbihpbnB1dCwgcmVzZXQpIHtcbiAgZGVidWcoaW5wdXQsIFtcImZvbGRpbmdcIl0pO1xuXG4gIHZhciBmb2xkID0gdGhpcyxcbiAgICAgIG9uID0gdGhpcy5maWVsZHMuZ2V0KHRoaXMuX2dyYXBoKSxcbiAgICAgIGZpZWxkcyA9IG9uLmZpZWxkcywgYWNjZXNzb3JzID0gb24uYWNjZXNzb3JzLFxuICAgICAgb3V0cHV0ID0gY2hhbmdlc2V0LmNyZWF0ZShpbnB1dCk7XG5cbiAgaWYocmVzZXQpIHJzdC5jYWxsKHRoaXMsIGlucHV0LCBvdXRwdXQpO1xuXG4gIGZuLmNhbGwodGhpcywgaW5wdXQuYWRkLCBmaWVsZHMsIGFjY2Vzc29ycywgb3V0cHV0LmFkZCwgaW5wdXQuc3RhbXApO1xuICBmbi5jYWxsKHRoaXMsIGlucHV0Lm1vZCwgZmllbGRzLCBhY2Nlc3NvcnMsIHJlc2V0ID8gb3V0cHV0LmFkZCA6IG91dHB1dC5tb2QsIGlucHV0LnN0YW1wKTtcbiAgaW5wdXQucmVtLmZvckVhY2goZnVuY3Rpb24oeCkge1xuICAgIG91dHB1dC5yZW0ucHVzaC5hcHBseShvdXRwdXQucmVtLCBmb2xkLl9jYWNoZVt4Ll9pZF0pO1xuICAgIGZvbGQuX2NhY2hlW3guX2lkXSA9IG51bGw7XG4gIH0pO1xuXG4gIC8vIElmIHdlJ3JlIG9ubHkgcHJvcGFnYXRpbmcgdmFsdWVzLCBkb24ndCBtYXJrIGtleS92YWx1ZSBhcyB1cGRhdGVkLlxuICBpZihpbnB1dC5hZGQubGVuZ3RoIHx8IGlucHV0LnJlbS5sZW5ndGggfHwgXG4gICAgZmllbGRzLnNvbWUoZnVuY3Rpb24oZikgeyByZXR1cm4gISFpbnB1dC5maWVsZHNbZl07IH0pKVxuICAgICAgb3V0cHV0LmZpZWxkc1t0aGlzLl9vdXRwdXQua2V5XSA9IDEsIG91dHB1dC5maWVsZHNbdGhpcy5fb3V0cHV0LnZhbHVlXSA9IDE7XG4gIHJldHVybiBvdXRwdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZvbGQ7IiwidmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyksXG4gICAgQ29sbGVjdG9yID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvQ29sbGVjdG9yJyksXG4gICAgdHVwbGUgPSByZXF1aXJlKCcuLi9kYXRhZmxvdy90dXBsZScpLFxuICAgIGNoYW5nZXNldCA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L2NoYW5nZXNldCcpLFxuICAgIGQzID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuZDMgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmQzIDogbnVsbCk7XG5cbmZ1bmN0aW9uIEZvcmNlKGdyYXBoKSB7XG4gIFRyYW5zZm9ybS5wcm90b3R5cGUuaW5pdC5jYWxsKHRoaXMsIGdyYXBoKTtcbiAgVHJhbnNmb3JtLmFkZFBhcmFtZXRlcnModGhpcywge1xuICAgIHNpemU6IHt0eXBlOiBcImFycmF5PHZhbHVlPlwiLCBkZWZhdWx0OiBbNTAwLCA1MDBdfSxcbiAgICBsaW5rczoge3R5cGU6IFwiZGF0YVwifSxcbiAgICBsaW5rRGlzdGFuY2U6IHt0eXBlOiBcImZpZWxkXCIsIGRlZmF1bHQ6IDIwfSxcbiAgICBsaW5rU3RyZW5ndGg6IHt0eXBlOiBcImZpZWxkXCIsIGRlZmF1bHQ6IDF9LFxuICAgIGNoYXJnZToge3R5cGU6IFwiZmllbGRcIiwgZGVmYXVsdDogMzB9LFxuICAgIGNoYXJnZURpc3RhbmNlOiB7dHlwZTogXCJmaWVsZFwiLCBkZWZhdWx0OiBJbmZpbml0eX0sXG4gICAgaXRlcmF0aW9uczoge3R5cGU6IFwidmFsdWVcIiwgZGVmYXVsdDogNTAwfSxcbiAgICBmcmljdGlvbjoge3R5cGU6IFwidmFsdWVcIiwgZGVmYXVsdDogMC45fSxcbiAgICB0aGV0YToge3R5cGU6IFwidmFsdWVcIiwgZGVmYXVsdDogMC44fSxcbiAgICBncmF2aXR5OiB7dHlwZTogXCJ2YWx1ZVwiLCBkZWZhdWx0OiAwLjF9LFxuICAgIGFscGhhOiB7dHlwZTogXCJ2YWx1ZVwiLCBkZWZhdWx0OiAwLjF9XG4gIH0pO1xuXG4gIHRoaXMuX25vZGVzID0gW107XG4gIHRoaXMuX2xpbmtzID0gW107XG4gIHRoaXMuX2xheW91dCA9IGQzLmxheW91dC5mb3JjZSgpO1xuXG4gIHRoaXMuX291dHB1dCA9IHtcbiAgICBcInhcIjogXCJmb3JjZTp4XCIsXG4gICAgXCJ5XCI6IFwiZm9yY2U6eVwiLFxuICAgIFwic291cmNlXCI6IFwiZm9yY2U6c291cmNlXCIsXG4gICAgXCJ0YXJnZXRcIjogXCJmb3JjZTp0YXJnZXRcIlxuICB9O1xuXG4gIHJldHVybiB0aGlzO1xufVxuXG52YXIgcHJvdG8gPSAoRm9yY2UucHJvdG90eXBlID0gbmV3IFRyYW5zZm9ybSgpKTtcblxuZnVuY3Rpb24gZ2V0KHRyYW5zZm9ybSwgbmFtZSkge1xuICB2YXIgdiA9IHRyYW5zZm9ybVtuYW1lXS5nZXQodHJhbnNmb3JtLl9ncmFwaCk7XG4gIHJldHVybiB2LmFjY2Vzc29yXG4gICAgPyBmdW5jdGlvbih4KSB7IHJldHVybiB2LmFjY2Vzc29yKHgudHVwbGUpOyB9XG4gICAgOiB2LmZpZWxkO1xufVxuXG5wcm90by50cmFuc2Zvcm0gPSBmdW5jdGlvbihub2RlSW5wdXQpIHtcbiAgLy8gZ2V0IHZhcmlhYmxlc1xuICB2YXIgZyA9IHRoaXMuX2dyYXBoLFxuICAgICAgbGlua0lucHV0ID0gdGhpcy5saW5rcy5nZXQoZykuc291cmNlLmxhc3QoKSxcbiAgICAgIGxheW91dCA9IHRoaXMuX2xheW91dCxcbiAgICAgIG91dHB1dCA9IHRoaXMuX291dHB1dCxcbiAgICAgIG5vZGVzID0gdGhpcy5fbm9kZXMsXG4gICAgICBsaW5rcyA9IHRoaXMuX2xpbmtzLFxuICAgICAgaXRlciA9IHRoaXMuaXRlcmF0aW9ucy5nZXQoZyk7XG5cbiAgLy8gcHJvY2VzcyBhZGRlZCBub2Rlc1xuICBub2RlSW5wdXQuYWRkLmZvckVhY2goZnVuY3Rpb24obikge1xuICAgIG5vZGVzLnB1c2goe3R1cGxlOiBufSk7XG4gIH0pO1xuXG4gIC8vIHByb2Nlc3MgYWRkZWQgZWRnZXNcbiAgbGlua0lucHV0LmFkZC5mb3JFYWNoKGZ1bmN0aW9uKGwpIHtcbiAgICB2YXIgbGluayA9IHtcbiAgICAgIHR1cGxlOiBsLFxuICAgICAgc291cmNlOiBub2Rlc1tsLnNvdXJjZV0sXG4gICAgICB0YXJnZXQ6IG5vZGVzW2wudGFyZ2V0XVxuICAgIH07XG4gICAgdHVwbGUuc2V0KGwsIG91dHB1dC5zb3VyY2UsIGxpbmsuc291cmNlLnR1cGxlKTtcbiAgICB0dXBsZS5zZXQobCwgb3V0cHV0LnRhcmdldCwgbGluay50YXJnZXQudHVwbGUpO1xuICAgIGxpbmtzLnB1c2gobGluayk7XG4gIH0pO1xuXG4gIC8vIFRPRE8gcHJvY2VzcyBcIm1vZFwiIG9mIGVkZ2Ugc291cmNlIG9yIHRhcmdldD9cblxuICAvLyBjb25maWd1cmUgbGF5b3V0XG4gIGxheW91dFxuICAgIC5zaXplKHRoaXMuc2l6ZS5nZXQoZykpXG4gICAgLmxpbmtEaXN0YW5jZShnZXQodGhpcywgXCJsaW5rRGlzdGFuY2VcIikpXG4gICAgLmxpbmtTdHJlbmd0aChnZXQodGhpcywgXCJsaW5rU3RyZW5ndGhcIikpXG4gICAgLmNoYXJnZShnZXQodGhpcywgXCJjaGFyZ2VcIikpXG4gICAgLmNoYXJnZURpc3RhbmNlKGdldCh0aGlzLCBcImNoYXJnZURpc3RhbmNlXCIpKVxuICAgIC5mcmljdGlvbih0aGlzLmZyaWN0aW9uLmdldChnKSlcbiAgICAudGhldGEodGhpcy50aGV0YS5nZXQoZykpXG4gICAgLmdyYXZpdHkodGhpcy5ncmF2aXR5LmdldChnKSlcbiAgICAuYWxwaGEodGhpcy5hbHBoYS5nZXQoZykpXG4gICAgLm5vZGVzKG5vZGVzKVxuICAgIC5saW5rcyhsaW5rcyk7XG5cbiAgLy8gcnVuIGxheW91dFxuICBsYXlvdXQuc3RhcnQoKTtcbiAgZm9yICh2YXIgaT0wOyBpPGl0ZXI7ICsraSkge1xuICAgIGxheW91dC50aWNrKCk7XG4gIH1cbiAgbGF5b3V0LnN0b3AoKTtcblxuICAvLyBjb3B5IGxheW91dCB2YWx1ZXMgdG8gbm9kZXNcbiAgbm9kZXMuZm9yRWFjaChmdW5jdGlvbihuKSB7XG4gICAgdHVwbGUuc2V0KG4udHVwbGUsIG91dHB1dC54LCBuLngpO1xuICAgIHR1cGxlLnNldChuLnR1cGxlLCBvdXRwdXQueSwgbi55KTtcbiAgfSk7XG5cbiAgLy8gcHJvY2VzcyByZW1vdmVkIG5vZGVzXG4gIGlmIChub2RlSW5wdXQucmVtLmxlbmd0aCA+IDApIHtcbiAgICB2YXIgbm9kZUlkcyA9IHR1cGxlLmlkTWFwKG5vZGVJbnB1dC5yZW0pO1xuICAgIHRoaXMuX25vZGVzID0gbm9kZXMuZmlsdGVyKGZ1bmN0aW9uKG4pIHsgcmV0dXJuICFub2RlSWRzW24udHVwbGUuX2lkXTsgfSk7XG4gIH1cblxuICAvLyBwcm9jZXNzIHJlbW92ZWQgZWRnZXNcbiAgaWYgKGxpbmtJbnB1dC5yZW0ubGVuZ3RoID4gMCkge1xuICAgIHZhciBsaW5rSWRzID0gdHVwbGUuaWRNYXAobGlua0lucHV0LnJlbSk7XG4gICAgdGhpcy5fbGlua3MgPSBsaW5rcy5maWx0ZXIoZnVuY3Rpb24obCkgeyByZXR1cm4gIWxpbmtJZHNbbC50dXBsZS5faWRdOyB9KTtcbiAgfVxuXG4gIC8vIHJldHVybiBjaGFuZ2VzZXRcbiAgbm9kZUlucHV0LmZpZWxkc1tvdXRwdXQueF0gPSAxO1xuICBub2RlSW5wdXQuZmllbGRzW291dHB1dC55XSA9IDE7XG4gIHJldHVybiBub2RlSW5wdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZvcmNlOyIsInZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL1RyYW5zZm9ybScpLFxuICAgIHR1cGxlID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvdHVwbGUnKSwgXG4gICAgZXhwcmVzc2lvbiA9IHJlcXVpcmUoJy4uL3BhcnNlL2V4cHInKSxcbiAgICBkZWJ1ZyA9IHJlcXVpcmUoJy4uL3V0aWwvZGVidWcnKSxcbiAgICBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKTtcblxuZnVuY3Rpb24gRm9ybXVsYShncmFwaCkge1xuICBUcmFuc2Zvcm0ucHJvdG90eXBlLmluaXQuY2FsbCh0aGlzLCBncmFwaCk7XG4gIFRyYW5zZm9ybS5hZGRQYXJhbWV0ZXJzKHRoaXMsIHtcbiAgICBmaWVsZDoge3R5cGU6IFwidmFsdWVcIn0sXG4gICAgZXhwcjogIHt0eXBlOiBcImV4cHJcIn1cbiAgfSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59XG5cbnZhciBwcm90byA9IChGb3JtdWxhLnByb3RvdHlwZSA9IG5ldyBUcmFuc2Zvcm0oKSk7XG5cbnByb3RvLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIGRlYnVnKGlucHV0LCBbXCJmb3JtdWxhdGluZ1wiXSk7XG4gIHZhciB0ID0gdGhpcywgXG4gICAgICBnID0gdGhpcy5fZ3JhcGgsXG4gICAgICBmaWVsZCA9IHRoaXMuZmllbGQuZ2V0KGcpLFxuICAgICAgZXhwciA9IHRoaXMuZXhwci5nZXQoZyksXG4gICAgICBkZXBzID0gdGhpcy5kZXBlbmRlbmN5KEMuU0lHTkFMUyk7XG4gIFxuICBmdW5jdGlvbiBzZXQoeCkge1xuICAgIHZhciB2YWwgPSBleHByZXNzaW9uLmV2YWwoZywgZXhwciwgeCwgbnVsbCwgbnVsbCwgbnVsbCwgZGVwcyk7XG4gICAgdHVwbGUuc2V0KHgsIGZpZWxkLCB2YWwpO1xuICB9XG5cbiAgaW5wdXQuYWRkLmZvckVhY2goc2V0KTtcbiAgXG4gIGlmICh0aGlzLnJlZXZhbHVhdGUoaW5wdXQpKSB7XG4gICAgaW5wdXQubW9kLmZvckVhY2goc2V0KTtcbiAgfVxuXG4gIGlucHV0LmZpZWxkc1tmaWVsZF0gPSAxO1xuICByZXR1cm4gaW5wdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEZvcm11bGE7IiwidmFyIFRyYW5zZm9ybSA9IHJlcXVpcmUoJy4vVHJhbnNmb3JtJyksXG4gICAgdHVwbGUgPSByZXF1aXJlKCcuLi9kYXRhZmxvdy90dXBsZScpLFxuICAgIGNoYW5nZXNldCA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L2NoYW5nZXNldCcpLFxuICAgIEMgPSByZXF1aXJlKCcuLi91dGlsL2NvbnN0YW50cycpO1xuXG5mdW5jdGlvbiBHcm91cEJ5KGdyYXBoKSB7XG4gIGlmKGdyYXBoKSB0aGlzLmluaXQoZ3JhcGgpO1xuICByZXR1cm4gdGhpcztcbn1cblxudmFyIHByb3RvID0gKEdyb3VwQnkucHJvdG90eXBlID0gbmV3IFRyYW5zZm9ybSgpKTtcblxucHJvdG8uaW5pdCA9IGZ1bmN0aW9uKGdyYXBoKSB7XG4gIHRoaXMuX2diID0gbnVsbDsgLy8gZmllbGRzK2FjY2Vzc29ycyB0byBncm91cGJ5IGZpZWxkc1xuICB0aGlzLl9jZWxscyA9IHt9O1xuICByZXR1cm4gVHJhbnNmb3JtLnByb3RvdHlwZS5pbml0LmNhbGwodGhpcywgZ3JhcGgpXG4gICAgLnJvdXRlcih0cnVlKS5yZXZpc2VzKHRydWUpO1xufTtcblxucHJvdG8uZGF0YSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fY2VsbHM7IH07XG5cbnByb3RvLl9yZXNldCA9IGZ1bmN0aW9uKGlucHV0LCBvdXRwdXQpIHtcbiAgdmFyIGssIGM7XG4gIGZvcihrIGluIHRoaXMuX2NlbGxzKSB7XG4gICAgaWYoIShjID0gdGhpcy5fY2VsbHNba10pKSBjb250aW51ZTtcbiAgICBvdXRwdXQucmVtLnB1c2goYy50cGwpO1xuICB9XG4gIHRoaXMuX2NlbGxzID0ge307XG59O1xuXG5wcm90by5fa2V5cyA9IGZ1bmN0aW9uKHgpIHtcbiAgdmFyIGFjYyA9IHRoaXMuX2diLmFjY2Vzc29ycyB8fCBbdGhpcy5fZ2IuYWNjZXNzb3JdO1xuICB2YXIga2V5cyA9IGFjYy5yZWR1Y2UoZnVuY3Rpb24oZywgZikge1xuICAgIHJldHVybiAoKHYgPSBmKHgpKSAhPT0gdW5kZWZpbmVkKSA/IChnLnB1c2godiksIGcpIDogZztcbiAgfSwgW10pLCBrID0ga2V5cy5qb2luKFwifFwiKSwgdjtcbiAgcmV0dXJuIGtleXMubGVuZ3RoID4gMCA/IHtrZXlzOiBrZXlzLCBrZXk6IGt9IDogdW5kZWZpbmVkO1xufTtcblxucHJvdG8uX2NlbGwgPSBmdW5jdGlvbih4KSB7XG4gIHZhciBrID0gdGhpcy5fa2V5cyh4KTtcbiAgcmV0dXJuIHRoaXMuX2NlbGxzW2sua2V5XSB8fCAodGhpcy5fY2VsbHNbay5rZXldID0gdGhpcy5fbmV3X2NlbGwoeCwgaykpO1xufTtcblxucHJvdG8uX25ld19jZWxsID0gZnVuY3Rpb24oeCwgaykge1xuICByZXR1cm4ge1xuICAgIGNudDogMCxcbiAgICB0cGw6IHRoaXMuX25ld190dXBsZSh4LCBrKSxcbiAgICBmbGc6IEMuQUREX0NFTExcbiAgfTtcbn07XG5cbnByb3RvLl9uZXdfdHVwbGUgPSBmdW5jdGlvbih4LCBrKSB7XG4gIHZhciBnYiA9IHRoaXMuX2diLFxuICAgICAgZmllbGRzID0gZ2IuZmllbGRzIHx8IFtnYi5maWVsZF0sXG4gICAgICBhY2MgPSBnYi5hY2Nlc3NvcnMgfHwgW2diLmFjY2Vzc29yXSxcbiAgICAgIHQgPSB7fSwgaSwgbGVuO1xuXG4gIGZvcihpPTAsIGxlbj1maWVsZHMubGVuZ3RoOyBpPGxlbjsgKytpKSB7XG4gICAgdFtmaWVsZHNbaV1dID0gYWNjW2ldKHgpO1xuICB9IFxuXG4gIHJldHVybiB0dXBsZS5pbmdlc3QodCwgbnVsbCk7XG59O1xuXG5wcm90by5fYWRkID0gZnVuY3Rpb24oeCkge1xuICB2YXIgY2VsbCA9IHRoaXMuX2NlbGwoeCk7XG4gIGNlbGwuY250ICs9IDE7XG4gIGNlbGwuZmxnIHw9IEMuTU9EX0NFTEw7XG4gIHJldHVybiBjZWxsO1xufTtcblxucHJvdG8uX3JlbSA9IGZ1bmN0aW9uKHgpIHtcbiAgdmFyIGNlbGwgPSB0aGlzLl9jZWxsKHgpO1xuICBjZWxsLmNudCAtPSAxO1xuICBjZWxsLmZsZyB8PSBDLk1PRF9DRUxMO1xuICByZXR1cm4gY2VsbDtcbn07XG5cbnByb3RvLl9tb2QgPSBmdW5jdGlvbih4LCByZXNldCkge1xuICBpZih4Ll9wcmV2ICYmIHguX3ByZXYgIT09IEMuU0VOVElORUwgJiYgdGhpcy5fa2V5cyh4Ll9wcmV2KSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5fcmVtKHguX3ByZXYpO1xuICAgIHJldHVybiB0aGlzLl9hZGQoeCk7XG4gIH0gZWxzZSBpZihyZXNldCkgeyAvLyBTaWduYWwgY2hhbmdlIHRyaWdnZXJlZCByZWZsb3dcbiAgICByZXR1cm4gdGhpcy5fYWRkKHgpO1xuICB9XG4gIHJldHVybiB0aGlzLl9jZWxsKHgpO1xufTtcblxucHJvdG8udHJhbnNmb3JtID0gZnVuY3Rpb24oaW5wdXQsIHJlc2V0KSB7XG4gIHZhciBncm91cEJ5ID0gdGhpcyxcbiAgICAgIG91dHB1dCA9IGNoYW5nZXNldC5jcmVhdGUoaW5wdXQpLFxuICAgICAgaywgYywgZiwgdDtcblxuICBpZihyZXNldCkgdGhpcy5fcmVzZXQoaW5wdXQsIG91dHB1dCk7XG5cbiAgaW5wdXQuYWRkLmZvckVhY2goZnVuY3Rpb24oeCkgeyBncm91cEJ5Ll9hZGQoeCk7IH0pO1xuICBpbnB1dC5tb2QuZm9yRWFjaChmdW5jdGlvbih4KSB7IGdyb3VwQnkuX21vZCh4LCByZXNldCk7IH0pO1xuICBpbnB1dC5yZW0uZm9yRWFjaChmdW5jdGlvbih4KSB7XG4gICAgaWYoeC5fcHJldiAmJiB4Ll9wcmV2ICE9PSBDLlNFTlRJTkVMICYmIGdyb3VwQnkuX2tleXMoeC5fcHJldikgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZ3JvdXBCeS5fcmVtKHguX3ByZXYpO1xuICAgIH0gZWxzZSB7XG4gICAgICBncm91cEJ5Ll9yZW0oeCk7XG4gICAgfVxuICB9KTtcblxuICBmb3IoayBpbiB0aGlzLl9jZWxscykge1xuICAgIGMgPSB0aGlzLl9jZWxsc1trXTtcbiAgICBpZighYykgY29udGludWU7XG4gICAgZiA9IGMuZmxnO1xuICAgIHQgPSBjLnRwbDtcblxuICAgIGlmKGMuY250ID09PSAwKSB7XG4gICAgICBpZihmID09PSBDLk1PRF9DRUxMKSBvdXRwdXQucmVtLnB1c2godCk7XG4gICAgICB0aGlzLl9jZWxsc1trXSA9IG51bGw7XG4gICAgfSBlbHNlIGlmKGYgJiBDLkFERF9DRUxMKSB7XG4gICAgICBvdXRwdXQuYWRkLnB1c2godCk7XG4gICAgfSBlbHNlIGlmKGYgJiBDLk1PRF9DRUxMKSB7XG4gICAgICBvdXRwdXQubW9kLnB1c2godCk7XG4gICAgfVxuICAgIGMuZmxnID0gMDtcbiAgfVxuXG4gIHJldHVybiBvdXRwdXQ7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEdyb3VwQnk7IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIGV4cHIgPSByZXF1aXJlKCcuLi9wYXJzZS9leHByJyksXG4gICAgQyA9IHJlcXVpcmUoJy4uL3V0aWwvY29uc3RhbnRzJyk7XG5cbnZhciBhcnJheVR5cGUgPSAvYXJyYXkvaSxcbiAgICBkYXRhVHlwZSAgPSAvZGF0YS9pLFxuICAgIGZpZWxkVHlwZSA9IC9maWVsZC9pLFxuICAgIGV4cHJUeXBlICA9IC9leHByL2k7XG5cbmZ1bmN0aW9uIFBhcmFtZXRlcihuYW1lLCB0eXBlKSB7XG4gIHRoaXMuX25hbWUgPSBuYW1lO1xuICB0aGlzLl90eXBlID0gdHlwZTtcblxuICAvLyBJZiBwYXJhbWV0ZXIgaXMgZGVmaW5lZCB3L3NpZ25hbHMsIGl0IG11c3QgYmUgcmVzb2x2ZWRcbiAgLy8gb24gZXZlcnkgcHVsc2UuXG4gIHRoaXMuX3ZhbHVlID0gW107XG4gIHRoaXMuX2FjY2Vzc29ycyA9IFtdO1xuICB0aGlzLl9yZXNvbHV0aW9uID0gZmFsc2U7XG4gIHRoaXMuX3NpZ25hbHMgPSB7fTtcbn1cblxudmFyIHByb3RvID0gUGFyYW1ldGVyLnByb3RvdHlwZTtcblxucHJvdG8uX2dldCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaXNBcnJheSA9IGFycmF5VHlwZS50ZXN0KHRoaXMuX3R5cGUpLFxuICAgICAgaXNEYXRhICA9IGRhdGFUeXBlLnRlc3QodGhpcy5fdHlwZSksXG4gICAgICBpc0ZpZWxkID0gZmllbGRUeXBlLnRlc3QodGhpcy5fdHlwZSk7XG5cbiAgaWYgKGlzRGF0YSkge1xuICAgIHJldHVybiBpc0FycmF5ID8geyBuYW1lczogdGhpcy5fdmFsdWUsIHNvdXJjZXM6IHRoaXMuX2FjY2Vzc29ycyB9IDpcbiAgICAgIHsgbmFtZTogdGhpcy5fdmFsdWVbMF0sIHNvdXJjZTogdGhpcy5fYWNjZXNzb3JzWzBdIH07XG4gIH0gZWxzZSBpZiAoaXNGaWVsZCkge1xuICAgIHJldHVybiBpc0FycmF5ID8geyBmaWVsZHM6IHRoaXMuX3ZhbHVlLCBhY2Nlc3NvcnM6IHRoaXMuX2FjY2Vzc29ycyB9IDpcbiAgICAgIHsgZmllbGQ6IHRoaXMuX3ZhbHVlWzBdLCBhY2Nlc3NvcjogdGhpcy5fYWNjZXNzb3JzWzBdIH07XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGlzQXJyYXkgPyB0aGlzLl92YWx1ZSA6IHRoaXMuX3ZhbHVlWzBdO1xuICB9XG59O1xuXG5wcm90by5nZXQgPSBmdW5jdGlvbihncmFwaCkge1xuICB2YXIgaXNEYXRhICA9IGRhdGFUeXBlLnRlc3QodGhpcy5fdHlwZSksXG4gICAgICBpc0ZpZWxkID0gZmllbGRUeXBlLnRlc3QodGhpcy5fdHlwZSksXG4gICAgICBzLCBpZHgsIHZhbDtcblxuICAvLyBJZiB3ZSBkb24ndCByZXF1aXJlIHJlc29sdXRpb24sIHJldHVybiB0aGUgdmFsdWUgaW1tZWRpYXRlbHkuXG4gIGlmICghdGhpcy5fcmVzb2x1dGlvbikgcmV0dXJuIHRoaXMuX2dldCgpO1xuXG4gIGlmIChpc0RhdGEpIHtcbiAgICB0aGlzLl9hY2Nlc3NvcnMgPSB0aGlzLl92YWx1ZS5tYXAoZnVuY3Rpb24odikgeyByZXR1cm4gZ3JhcGguZGF0YSh2KTsgfSk7XG4gICAgcmV0dXJuIHRoaXMuX2dldCgpOyAvLyBUT0RPOiBzdXBwb3J0IHNpZ25hbCBhcyBkYXRhVHlwZXNcbiAgfVxuXG4gIGZvcihzIGluIHRoaXMuX3NpZ25hbHMpIHtcbiAgICBpZHggID0gdGhpcy5fc2lnbmFsc1tzXTtcbiAgICB2YWwgID0gZ3JhcGguc2lnbmFsUmVmKHMpO1xuXG4gICAgaWYgKGlzRmllbGQpIHtcbiAgICAgIHRoaXMuX2FjY2Vzc29yc1tpZHhdID0gdGhpcy5fdmFsdWVbaWR4XSAhPSB2YWwgPyBcbiAgICAgICAgZGwuYWNjZXNzb3IodmFsKSA6IHRoaXMuX2FjY2Vzc29yc1tpZHhdO1xuICAgIH1cblxuICAgIHRoaXMuX3ZhbHVlW2lkeF0gPSB2YWw7XG4gIH1cblxuICByZXR1cm4gdGhpcy5fZ2V0KCk7XG59O1xuXG5wcm90by5zZXQgPSBmdW5jdGlvbih0cmFuc2Zvcm0sIHZhbHVlKSB7XG4gIHZhciBwYXJhbSA9IHRoaXMsIFxuICAgICAgaXNFeHByID0gZXhwclR5cGUudGVzdCh0aGlzLl90eXBlKSxcbiAgICAgIGlzRGF0YSAgPSBkYXRhVHlwZS50ZXN0KHRoaXMuX3R5cGUpLFxuICAgICAgaXNGaWVsZCA9IGZpZWxkVHlwZS50ZXN0KHRoaXMuX3R5cGUpO1xuXG4gIHRoaXMuX3ZhbHVlID0gZGwuYXJyYXkodmFsdWUpLm1hcChmdW5jdGlvbih2LCBpKSB7XG4gICAgaWYgKGRsLmlzU3RyaW5nKHYpKSB7XG4gICAgICBpZiAoaXNFeHByKSB7XG4gICAgICAgIHZhciBlID0gZXhwcih2KTtcbiAgICAgICAgdHJhbnNmb3JtLmRlcGVuZGVuY3koQy5GSUVMRFMsICBlLmZpZWxkcyk7XG4gICAgICAgIHRyYW5zZm9ybS5kZXBlbmRlbmN5KEMuU0lHTkFMUywgZS5zaWduYWxzKTtcbiAgICAgICAgcmV0dXJuIGUuZm47XG4gICAgICB9IGVsc2UgaWYgKGlzRmllbGQpIHsgIC8vIEJhY2t3YXJkcyBjb21wYXRpYmlsaXR5XG4gICAgICAgIHBhcmFtLl9hY2Nlc3NvcnNbaV0gPSBkbC5hY2Nlc3Nvcih2KTtcbiAgICAgICAgdHJhbnNmb3JtLmRlcGVuZGVuY3koQy5GSUVMRFMsIHYpO1xuICAgICAgfSBlbHNlIGlmIChpc0RhdGEpIHtcbiAgICAgICAgcGFyYW0uX3Jlc29sdXRpb24gPSB0cnVlO1xuICAgICAgICB0cmFuc2Zvcm0uZGVwZW5kZW5jeShDLkRBVEEsIHYpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHY7XG4gICAgfSBlbHNlIGlmICh2LnZhbHVlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB2LnZhbHVlO1xuICAgIH0gZWxzZSBpZiAodi5maWVsZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBwYXJhbS5fYWNjZXNzb3JzW2ldID0gZGwuYWNjZXNzb3Iodi5maWVsZCk7XG4gICAgICB0cmFuc2Zvcm0uZGVwZW5kZW5jeShDLkZJRUxEUywgdi5maWVsZCk7XG4gICAgICByZXR1cm4gdi5maWVsZDtcbiAgICB9IGVsc2UgaWYgKHYuc2lnbmFsICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHBhcmFtLl9yZXNvbHV0aW9uID0gdHJ1ZTtcbiAgICAgIHBhcmFtLl9zaWduYWxzW3Yuc2lnbmFsXSA9IGk7XG4gICAgICB0cmFuc2Zvcm0uZGVwZW5kZW5jeShDLlNJR05BTFMsIHYuc2lnbmFsKTtcbiAgICAgIHJldHVybiB2LnNpZ25hbDtcbiAgICB9XG5cbiAgICByZXR1cm4gdjtcbiAgfSk7XG5cbiAgcmV0dXJuIHRyYW5zZm9ybTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gUGFyYW1ldGVyOyIsInZhciBkbCA9IHJlcXVpcmUoJ2RhdGFsaWInKSxcbiAgICBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL1RyYW5zZm9ybScpLFxuICAgIGV4cHIgPSByZXF1aXJlKCcuLi9wYXJzZS9leHByJyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyk7XG5cbmZ1bmN0aW9uIFNvcnQoZ3JhcGgpIHtcbiAgVHJhbnNmb3JtLnByb3RvdHlwZS5pbml0LmNhbGwodGhpcywgZ3JhcGgpO1xuICBUcmFuc2Zvcm0uYWRkUGFyYW1ldGVycyh0aGlzLCB7Ynk6IHt0eXBlOiBcImFycmF5PGZpZWxkPlwifSB9KTtcbiAgcmV0dXJuIHRoaXMucm91dGVyKHRydWUpO1xufVxuXG52YXIgcHJvdG8gPSAoU29ydC5wcm90b3R5cGUgPSBuZXcgVHJhbnNmb3JtKCkpO1xuXG5wcm90by50cmFuc2Zvcm0gPSBmdW5jdGlvbihpbnB1dCkge1xuICBkZWJ1ZyhpbnB1dCwgW1wic29ydGluZ1wiXSk7XG5cbiAgaWYoaW5wdXQuYWRkLmxlbmd0aCB8fCBpbnB1dC5tb2QubGVuZ3RoIHx8IGlucHV0LnJlbS5sZW5ndGgpIHtcbiAgICBpbnB1dC5zb3J0ID0gZGwuY29tcGFyYXRvcih0aGlzLmJ5LmdldCh0aGlzLl9ncmFwaCkuZmllbGRzKTtcbiAgfVxuXG4gIHJldHVybiBpbnB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gU29ydDsiLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9UcmFuc2Zvcm0nKSxcbiAgICBDb2xsZWN0b3IgPSByZXF1aXJlKCcuLi9kYXRhZmxvdy9Db2xsZWN0b3InKSxcbiAgICB0dXBsZSA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L3R1cGxlJyksXG4gICAgY2hhbmdlc2V0ID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvY2hhbmdlc2V0Jyk7XG5cbmZ1bmN0aW9uIFN0YWNrKGdyYXBoKSB7XG4gIFRyYW5zZm9ybS5wcm90b3R5cGUuaW5pdC5jYWxsKHRoaXMsIGdyYXBoKTtcbiAgVHJhbnNmb3JtLmFkZFBhcmFtZXRlcnModGhpcywge1xuICAgIGdyb3VwYnk6IHt0eXBlOiBcImFycmF5PGZpZWxkPlwifSxcbiAgICBzb3J0Ynk6IHt0eXBlOiBcImFycmF5PGZpZWxkPlwifSxcbiAgICB2YWx1ZToge3R5cGU6IFwiZmllbGRcIn0sXG4gICAgb2Zmc2V0OiB7dHlwZTogXCJ2YWx1ZVwiLCBkZWZhdWx0OiBcInplcm9cIn1cbiAgfSk7XG5cbiAgdGhpcy5fb3V0cHV0ID0ge1xuICAgIFwic3RhcnRcIjogXCJ5MlwiLFxuICAgIFwic3RvcFwiOiBcInlcIixcbiAgICBcIm1pZFwiOiBcImN5XCJcbiAgfTtcbiAgdGhpcy5fY29sbGVjdG9yID0gbmV3IENvbGxlY3RvcihncmFwaCk7XG5cbiAgcmV0dXJuIHRoaXM7XG59XG5cbnZhciBwcm90byA9IChTdGFjay5wcm90b3R5cGUgPSBuZXcgVHJhbnNmb3JtKCkpO1xuXG5wcm90by50cmFuc2Zvcm0gPSBmdW5jdGlvbihpbnB1dCkge1xuICAvLyBNYXRlcmlhbGl6ZSB0aGUgY3VycmVudCBkYXRhc291cmNlLiBUT0RPOiBzaGFyZSBjb2xsZWN0b3JzXG4gIHRoaXMuX2NvbGxlY3Rvci5ldmFsdWF0ZShpbnB1dCk7XG4gIHZhciBkYXRhID0gdGhpcy5fY29sbGVjdG9yLmRhdGEoKTtcblxuICB2YXIgZyA9IHRoaXMuX2dyYXBoLFxuICAgICAgZ3JvdXBieSA9IHRoaXMuZ3JvdXBieS5nZXQoZykuYWNjZXNzb3JzLFxuICAgICAgc29ydGJ5ID0gZGwuY29tcGFyYXRvcih0aGlzLnNvcnRieS5nZXQoZykuZmllbGRzKSxcbiAgICAgIHZhbHVlID0gdGhpcy52YWx1ZS5nZXQoZykuYWNjZXNzb3IsXG4gICAgICBvZmZzZXQgPSB0aGlzLm9mZnNldC5nZXQoZyksXG4gICAgICBvdXRwdXQgPSB0aGlzLl9vdXRwdXQ7XG5cbiAgLy8gcGFydGl0aW9uLCBzdW0sIGFuZCBzb3J0IHRoZSBzdGFjayBncm91cHNcbiAgdmFyIGdyb3VwcyA9IHBhcnRpdGlvbihkYXRhLCBncm91cGJ5LCBzb3J0YnksIHZhbHVlKTtcblxuICAvLyBjb21wdXRlIHN0YWNrIGxheW91dHMgcGVyIGdyb3VwXG4gIGZvciAodmFyIGk9MCwgbWF4PWdyb3Vwcy5tYXg7IGk8Z3JvdXBzLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGdyb3VwID0gZ3JvdXBzW2ldLFxuICAgICAgICBzdW0gPSBncm91cC5zdW0sXG4gICAgICAgIG9mZiA9IG9mZnNldD09PVwiY2VudGVyXCIgPyAobWF4IC0gc3VtKS8yIDogMCxcbiAgICAgICAgc2NhbGUgPSBvZmZzZXQ9PT1cIm5vcm1hbGl6ZVwiID8gKDEvc3VtKSA6IDEsXG4gICAgICAgIGksIHgsIGEsIGIgPSBvZmYsIHYgPSAwO1xuXG4gICAgLy8gc2V0IHN0YWNrIGNvb3JkaW5hdGVzIGZvciBlYWNoIGRhdHVtIGluIGdyb3VwXG4gICAgZm9yIChqPTA7IGo8Z3JvdXAubGVuZ3RoOyArK2opIHtcbiAgICAgIHggPSBncm91cFtqXTtcbiAgICAgIGEgPSBiOyAvLyB1c2UgcHJldmlvdXMgdmFsdWUgZm9yIHN0YXJ0IHBvaW50XG4gICAgICB2ICs9IHZhbHVlKHgpO1xuICAgICAgYiA9IHNjYWxlICogdiArIG9mZjsgLy8gY29tcHV0ZSBlbmQgcG9pbnRcbiAgICAgIHR1cGxlLnNldCh4LCBvdXRwdXQuc3RhcnQsIGEpO1xuICAgICAgdHVwbGUuc2V0KHgsIG91dHB1dC5zdG9wLCBiKTtcbiAgICAgIHR1cGxlLnNldCh4LCBvdXRwdXQubWlkLCAwLjUgKiAoYSArIGIpKTtcbiAgICB9XG4gIH1cblxuICBpbnB1dC5maWVsZHNbb3V0cHV0LnN0YXJ0XSA9IDE7XG4gIGlucHV0LmZpZWxkc1tvdXRwdXQuc3RvcF0gPSAxO1xuICBpbnB1dC5maWVsZHNbb3V0cHV0Lm1pZF0gPSAxO1xuICByZXR1cm4gaW5wdXQ7XG59O1xuXG5mdW5jdGlvbiBwYXJ0aXRpb24oZGF0YSwgZ3JvdXBieSwgc29ydGJ5LCB2YWx1ZSkge1xuICB2YXIgZ3JvdXBzID0gW10sXG4gICAgICBtYXAsIGksIHgsIGssIGcsIHMsIG1heDtcblxuICAvLyBwYXJ0aXRpb24gZGF0YSBwb2ludHMgaW50byBzdGFjayBncm91cHNcbiAgaWYgKGdyb3VwYnkgPT0gbnVsbCkge1xuICAgIGdyb3Vwcy5wdXNoKGRhdGEuc2xpY2UoKSk7XG4gIH0gZWxzZSB7XG4gICAgZm9yIChtYXA9e30sIGk9MDsgaTxkYXRhLmxlbmd0aDsgKytpKSB7XG4gICAgICB4ID0gZGF0YVtpXTtcbiAgICAgIGsgPSAoZ3JvdXBieS5tYXAoZnVuY3Rpb24oZikgeyByZXR1cm4gZih4KTsgfSkpO1xuICAgICAgZyA9IG1hcFtrXSB8fCAoZ3JvdXBzLnB1c2gobWFwW2tdID0gW10pLCBtYXBba10pO1xuICAgICAgZy5wdXNoKHgpO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNvbXB1dGUgc3VtcyBvZiBncm91cHMsIHNvcnQgZ3JvdXBzIGFzIG5lZWRlZFxuICBmb3IgKGs9MCwgbWF4PTA7IGs8Z3JvdXBzLmxlbmd0aDsgKytrKSB7XG4gICAgZyA9IGdyb3Vwc1trXTtcbiAgICBmb3IgKGk9MCwgcz0wOyBpPGcubGVuZ3RoOyArK2kpIHtcbiAgICAgIHMgKz0gdmFsdWUoZ1tpXSk7XG4gICAgfVxuICAgIGcuc3VtID0gcztcbiAgICBpZiAocyA+IG1heCkgbWF4ID0gcztcbiAgICBpZiAoc29ydGJ5ICE9IG51bGwpIGcuc29ydChzb3J0YnkpO1xuICB9XG4gIGdyb3Vwcy5tYXggPSBtYXg7XG5cbiAgcmV0dXJuIGdyb3Vwcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTdGFjazsiLCJ2YXIgTm9kZSA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L05vZGUnKSxcbiAgICBQYXJhbWV0ZXIgPSByZXF1aXJlKCcuL1BhcmFtZXRlcicpLFxuICAgIEMgPSByZXF1aXJlKCcuLi91dGlsL2NvbnN0YW50cycpO1xuXG5mdW5jdGlvbiBUcmFuc2Zvcm0oZ3JhcGgpIHtcbiAgaWYoZ3JhcGgpIE5vZGUucHJvdG90eXBlLmluaXQuY2FsbCh0aGlzLCBncmFwaCk7XG4gIHJldHVybiB0aGlzO1xufVxuXG5UcmFuc2Zvcm0uYWRkUGFyYW1ldGVycyA9IGZ1bmN0aW9uKHByb3RvLCBwYXJhbXMpIHtcbiAgdmFyIHA7XG4gIGZvciAodmFyIG5hbWUgaW4gcGFyYW1zKSB7XG4gICAgcCA9IHBhcmFtc1tuYW1lXTtcbiAgICBwcm90b1tuYW1lXSA9IG5ldyBQYXJhbWV0ZXIobmFtZSwgcC50eXBlKTtcbiAgICBpZihwLmRlZmF1bHQpIHByb3RvW25hbWVdLnNldChwcm90bywgcC5kZWZhdWx0KTtcbiAgfVxuICBwcm90by5fcGFyYW1ldGVycyA9IHBhcmFtcztcbn07XG5cbnZhciBwcm90byA9IChUcmFuc2Zvcm0ucHJvdG90eXBlID0gbmV3IE5vZGUoKSk7XG5cbnByb3RvLmNsb25lID0gZnVuY3Rpb24oKSB7XG4gIHZhciBuID0gTm9kZS5wcm90b3R5cGUuY2xvbmUuY2FsbCh0aGlzKTtcbiAgbi50cmFuc2Zvcm0gPSB0aGlzLnRyYW5zZm9ybTtcbiAgbi5fcGFyYW1ldGVycyA9IHRoaXMuX3BhcmFtZXRlcnM7XG4gIGZvcih2YXIgayBpbiB0aGlzKSB7IFxuICAgIGlmKG5ba10pIGNvbnRpbnVlO1xuICAgIG5ba10gPSB0aGlzW2tdOyBcbiAgfVxuICByZXR1cm4gbjtcbn07XG5cbnByb3RvLnRyYW5zZm9ybSA9IGZ1bmN0aW9uKGlucHV0LCByZXNldCkgeyByZXR1cm4gaW5wdXQ7IH07XG5wcm90by5ldmFsdWF0ZSA9IGZ1bmN0aW9uKGlucHV0KSB7XG4gIC8vIE1hbnkgdHJhbnNmb3JtcyBzdG9yZSBjYWNoZXMgdGhhdCBtdXN0IGJlIGludmFsaWRhdGVkIGlmXG4gIC8vIGEgc2lnbmFsIHZhbHVlIGhhcyBjaGFuZ2VkLiBcbiAgdmFyIHJlc2V0ID0gdGhpcy5fc3RhbXAgPCBpbnB1dC5zdGFtcCAmJiB0aGlzLmRlcGVuZGVuY3koQy5TSUdOQUxTKS5zb21lKGZ1bmN0aW9uKHMpIHsgXG4gICAgcmV0dXJuICEhaW5wdXQuc2lnbmFsc1tzXSBcbiAgfSk7XG5cbiAgcmV0dXJuIHRoaXMudHJhbnNmb3JtKGlucHV0LCByZXNldCk7XG59O1xuXG5wcm90by5vdXRwdXQgPSBmdW5jdGlvbihtYXApIHtcbiAgZm9yICh2YXIga2V5IGluIHRoaXMuX291dHB1dCkge1xuICAgIGlmIChtYXBba2V5XSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aGlzLl9vdXRwdXRba2V5XSA9IG1hcFtrZXldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gVHJhbnNmb3JtOyIsInZhciBUcmFuc2Zvcm0gPSByZXF1aXJlKCcuL1RyYW5zZm9ybScpLFxuICAgIEdyb3VwQnkgPSByZXF1aXJlKCcuL0dyb3VwQnknKSxcbiAgICB0dXBsZSA9IHJlcXVpcmUoJy4uL2RhdGFmbG93L3R1cGxlJyksXG4gICAgZGVidWcgPSByZXF1aXJlKCcuLi91dGlsL2RlYnVnJyk7XG5cbmZ1bmN0aW9uIFVuaXF1ZShncmFwaCkge1xuICBHcm91cEJ5LnByb3RvdHlwZS5pbml0LmNhbGwodGhpcywgZ3JhcGgpO1xuICBUcmFuc2Zvcm0uYWRkUGFyYW1ldGVycyh0aGlzLCB7XG4gICAgZmllbGQ6IHt0eXBlOiBcImZpZWxkXCJ9LFxuICAgIGFzOiB7dHlwZTogXCJ2YWx1ZVwifVxuICB9KTtcblxuICByZXR1cm4gdGhpcztcbn1cblxudmFyIHByb3RvID0gKFVuaXF1ZS5wcm90b3R5cGUgPSBuZXcgR3JvdXBCeSgpKTtcblxucHJvdG8uX25ld190dXBsZSA9IGZ1bmN0aW9uKHgpIHtcbiAgdmFyIG8gID0ge30sXG4gICAgICBvbiA9IHRoaXMuZmllbGQuZ2V0KHRoaXMuX2dyYXBoKSxcbiAgICAgIGFzID0gdGhpcy5hcy5nZXQodGhpcy5fZ3JhcGgpO1xuXG4gIG9bYXNdID0gb24uYWNjZXNzb3IoeCk7XG4gIHJldHVybiB0dXBsZS5pbmdlc3QobywgbnVsbCk7XG59O1xuXG5wcm90by50cmFuc2Zvcm0gPSBmdW5jdGlvbihpbnB1dCwgcmVzZXQpIHtcbiAgZGVidWcoaW5wdXQsIFtcInVuaXF1ZXNcIl0pO1xuICB0aGlzLl9nYiA9IHRoaXMuZmllbGQuZ2V0KHRoaXMuX2dyYXBoKTtcbiAgcmV0dXJuIEdyb3VwQnkucHJvdG90eXBlLnRyYW5zZm9ybS5jYWxsKHRoaXMsIGlucHV0LCByZXNldCk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFVuaXF1ZTsiLCJ2YXIgZGwgPSByZXF1aXJlKCdkYXRhbGliJyksXG4gICAgVHJhbnNmb3JtID0gcmVxdWlyZSgnLi9UcmFuc2Zvcm0nKSxcbiAgICBDb2xsZWN0b3IgPSByZXF1aXJlKCcuLi9kYXRhZmxvdy9Db2xsZWN0b3InKSxcbiAgICBkZWJ1ZyA9IHJlcXVpcmUoJy4uL3V0aWwvZGVidWcnKTtcblxuZnVuY3Rpb24gWmlwKGdyYXBoKSB7XG4gIFRyYW5zZm9ybS5wcm90b3R5cGUuaW5pdC5jYWxsKHRoaXMsIGdyYXBoKTtcbiAgVHJhbnNmb3JtLmFkZFBhcmFtZXRlcnModGhpcywge1xuICAgIHdpdGg6IHt0eXBlOiBcImRhdGFcIn0sXG4gICAgYXM6ICB7dHlwZTogXCJ2YWx1ZVwifSxcbiAgICBrZXk6IHt0eXBlOiBcImZpZWxkXCIsIGRlZmF1bHQ6IFwiZGF0YVwifSxcbiAgICB3aXRoS2V5OiB7dHlwZTogXCJmaWVsZFwiLCBkZWZhdWx0OiBudWxsfSxcbiAgICBkZWZhdWx0OiB7dHlwZTogXCJ2YWx1ZVwifVxuICB9KTtcblxuICB0aGlzLl9tYXAgPSB7fTtcbiAgdGhpcy5fY29sbGVjdG9yID0gbmV3IENvbGxlY3RvcihncmFwaCk7XG4gIHRoaXMuX2xhc3RKb2luID0gMDtcblxuICByZXR1cm4gdGhpcy5yZXZpc2VzKHRydWUpO1xufVxuXG52YXIgcHJvdG8gPSAoWmlwLnByb3RvdHlwZSA9IG5ldyBUcmFuc2Zvcm0oKSk7XG5cbmZ1bmN0aW9uIG1wKGspIHtcbiAgcmV0dXJuIHRoaXMuX21hcFtrXSB8fCAodGhpcy5fbWFwW2tdID0gW10pO1xufTtcblxucHJvdG8udHJhbnNmb3JtID0gZnVuY3Rpb24oaW5wdXQpIHtcbiAgdmFyIHcgPSB0aGlzLndpdGguZ2V0KHRoaXMuX2dyYXBoKSxcbiAgICAgIHdkcyA9IHcuc291cmNlLFxuICAgICAgd291dHB1dCA9IHdkcy5sYXN0KCksXG4gICAgICB3ZGF0YSA9IHdkcy52YWx1ZXMoKSxcbiAgICAgIGtleSA9IHRoaXMua2V5LmdldCh0aGlzLl9ncmFwaCksXG4gICAgICB3aXRoS2V5ID0gdGhpcy53aXRoS2V5LmdldCh0aGlzLl9ncmFwaCksXG4gICAgICBhcyA9IHRoaXMuYXMuZ2V0KHRoaXMuX2dyYXBoKSxcbiAgICAgIGRmbHQgPSB0aGlzLmRlZmF1bHQuZ2V0KHRoaXMuX2dyYXBoKSxcbiAgICAgIG1hcCA9IG1wLmJpbmQodGhpcyksXG4gICAgICByZW0gPSB7fTtcblxuICBkZWJ1ZyhpbnB1dCwgW1wiemlwcGluZ1wiLCB3Lm5hbWVdKTtcblxuICBpZih3aXRoS2V5LmZpZWxkKSB7XG4gICAgaWYod291dHB1dCAmJiB3b3V0cHV0LnN0YW1wID4gdGhpcy5fbGFzdEpvaW4pIHtcbiAgICAgIHdvdXRwdXQucmVtLmZvckVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgbSA9IG1hcCh3aXRoS2V5LmFjY2Vzc29yKHgpKTtcbiAgICAgICAgaWYobVswXSkgbVswXS5mb3JFYWNoKGZ1bmN0aW9uKGQpIHsgZFthc10gPSBkZmx0IH0pO1xuICAgICAgICBtWzFdID0gbnVsbDtcbiAgICAgIH0pO1xuXG4gICAgICB3b3V0cHV0LmFkZC5mb3JFYWNoKGZ1bmN0aW9uKHgpIHsgXG4gICAgICAgIHZhciBtID0gbWFwKHdpdGhLZXkuYWNjZXNzb3IoeCkpO1xuICAgICAgICBpZihtWzBdKSBtWzBdLmZvckVhY2goZnVuY3Rpb24oZCkgeyBkW2FzXSA9IHggfSk7XG4gICAgICAgIG1bMV0gPSB4O1xuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIE9ubHkgcHJvY2VzcyB3b3V0cHV0Lm1vZCB0dXBsZXMgaWYgdGhlIGpvaW4ga2V5IGhhcyBjaGFuZ2VkLlxuICAgICAgLy8gT3RoZXIgZmllbGQgdXBkYXRlcyB3aWxsIGF1dG8tcHJvcGFnYXRlIHZpYSBwcm90b3R5cGUuXG4gICAgICBpZih3b3V0cHV0LmZpZWxkc1t3aXRoS2V5LmZpZWxkXSkge1xuICAgICAgICB3b3V0cHV0Lm1vZC5mb3JFYWNoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICB2YXIgcHJldjtcbiAgICAgICAgICBpZigheC5fcHJldiB8fCAocHJldiA9IHdpdGhLZXkuYWNjZXNzb3IoeC5fcHJldikpID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICAgICAgICB2YXIgcHJldm0gPSBtYXAocHJldik7XG4gICAgICAgICAgaWYocHJldm1bMF0pIHByZXZtWzBdLmZvckVhY2goZnVuY3Rpb24oZCkgeyBkW2FzXSA9IGRmbHQgfSk7XG4gICAgICAgICAgcHJldm1bMV0gPSBudWxsO1xuXG4gICAgICAgICAgdmFyIG0gPSBtYXAod2l0aEtleS5hY2Nlc3Nvcih4KSk7XG4gICAgICAgICAgaWYobVswXSkgbVswXS5mb3JFYWNoKGZ1bmN0aW9uKGQpIHsgZFthc10gPSB4IH0pO1xuICAgICAgICAgIG1bMV0gPSB4O1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgdGhpcy5fbGFzdEpvaW4gPSB3b3V0cHV0LnN0YW1wO1xuICAgIH1cbiAgXG4gICAgaW5wdXQuYWRkLmZvckVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgdmFyIG0gPSBtYXAoa2V5LmFjY2Vzc29yKHgpKTtcbiAgICAgIHhbYXNdID0gbVsxXSB8fCBkZmx0O1xuICAgICAgKG1bMF09bVswXXx8W10pLnB1c2goeCk7XG4gICAgfSk7XG5cbiAgICBpbnB1dC5yZW0uZm9yRWFjaChmdW5jdGlvbih4KSB7IFxuICAgICAgdmFyIGsgPSBrZXkuYWNjZXNzb3IoeCk7XG4gICAgICAocmVtW2tdPXJlbVtrXXx8e30pW3guX2lkXSA9IDE7XG4gICAgfSk7XG5cbiAgICBpZihpbnB1dC5maWVsZHNba2V5LmZpZWxkXSkge1xuICAgICAgaW5wdXQubW9kLmZvckVhY2goZnVuY3Rpb24oeCkge1xuICAgICAgICB2YXIgcHJldjtcbiAgICAgICAgaWYoIXguX3ByZXYgfHwgKHByZXYgPSBrZXkuYWNjZXNzb3IoeC5fcHJldikpID09PSB1bmRlZmluZWQpIHJldHVybjtcblxuICAgICAgICB2YXIgbSA9IG1hcChrZXkuYWNjZXNzb3IoeCkpO1xuICAgICAgICB4W2FzXSA9IG1bMV0gfHwgZGZsdDtcbiAgICAgICAgKG1bMF09bVswXXx8W10pLnB1c2goeCk7XG4gICAgICAgIChyZW1bcHJldl09cmVtW3ByZXZdfHx7fSlbeC5faWRdID0gMTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGRsLmtleXMocmVtKS5mb3JFYWNoKGZ1bmN0aW9uKGspIHsgXG4gICAgICB2YXIgbSA9IG1hcChrKTtcbiAgICAgIGlmKCFtWzBdKSByZXR1cm47XG4gICAgICBtWzBdID0gbVswXS5maWx0ZXIoZnVuY3Rpb24oeCkgeyByZXR1cm4gcmVtW2tdW3guX2lkXSAhPT0gMSB9KTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICAvLyBXZSBvbmx5IG5lZWQgdG8gcnVuIGEgbm9uLWtleS1qb2luIGFnYWluIGlmIHdlJ3ZlIGdvdCBhbnkgYWRkL3JlbVxuICAgIC8vIG9uIGlucHV0IG9yIHdvdXRwdXRcbiAgICBpZihpbnB1dC5hZGQubGVuZ3RoID09IDAgJiYgaW5wdXQucmVtLmxlbmd0aCA9PSAwICYmIFxuICAgICAgICB3b3V0cHV0LmFkZC5sZW5ndGggPT0gMCAmJiB3b3V0cHV0LnJlbS5sZW5ndGggPT0gMCkgcmV0dXJuIGlucHV0O1xuXG4gICAgLy8gSWYgd2UgZG9uJ3QgaGF2ZSBhIGtleS1qb2luLCB0aGVuIHdlIG5lZWQgdG8gbWF0ZXJpYWxpemUgYm90aFxuICAgIC8vIGRhdGEgc291cmNlcyB0byBpdGVyYXRlIHRocm91Z2ggdGhlbS4gXG4gICAgdGhpcy5fY29sbGVjdG9yLmV2YWx1YXRlKGlucHV0KTtcblxuICAgIHZhciBkYXRhID0gdGhpcy5fY29sbGVjdG9yLmRhdGEoKSwgXG4gICAgICAgIHdsZW4gPSB3ZGF0YS5sZW5ndGgsIGk7XG5cbiAgICBmb3IoaSA9IDA7IGkgPCBkYXRhLmxlbmd0aDsgaSsrKSB7IGRhdGFbaV1bYXNdID0gd2RhdGFbaSV3bGVuXTsgfVxuICB9XG5cbiAgaW5wdXQuZmllbGRzW2FzXSA9IDE7XG4gIHJldHVybiBpbnB1dDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gWmlwOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBhZ2dyZWdhdGU6ICByZXF1aXJlKCcuL0FnZ3JlZ2F0ZScpLFxuICBiaW46ICAgICAgICByZXF1aXJlKCcuL0JpbicpLFxuICBjcm9zczogICAgICByZXF1aXJlKCcuL0Nyb3NzJyksXG4gIGZhY2V0OiAgICAgIHJlcXVpcmUoJy4vRmFjZXQnKSxcbiAgZmlsdGVyOiAgICAgcmVxdWlyZSgnLi9GaWx0ZXInKSxcbiAgZm9sZDogICAgICAgcmVxdWlyZSgnLi9Gb2xkJyksXG4gIGZvcmNlOiAgICAgIHJlcXVpcmUoJy4vRm9yY2UnKSxcbiAgZm9ybXVsYTogICAgcmVxdWlyZSgnLi9Gb3JtdWxhJyksXG4gIHNvcnQ6ICAgICAgIHJlcXVpcmUoJy4vU29ydCcpLFxuICBzdGFjazogICAgICByZXF1aXJlKCcuL1N0YWNrJyksXG4gIHVuaXF1ZTogICAgIHJlcXVpcmUoJy4vVW5pcXVlJyksXG4gIHppcDogICAgICAgIHJlcXVpcmUoJy4vWmlwJylcbn07IiwidmFyIGRsID0gcmVxdWlyZSgnZGF0YWxpYicpLFxuICAgIHR1cGxlID0gcmVxdWlyZSgnLi4vZGF0YWZsb3cvdHVwbGUnKSxcbiAgICBxdWlja3NlbGVjdCA9IHJlcXVpcmUoJy4uL3V0aWwvcXVpY2tzZWxlY3QnKSxcbiAgICBDID0gcmVxdWlyZSgnLi4vdXRpbC9jb25zdGFudHMnKTtcblxudmFyIHR5cGVzID0ge1xuICBcImNvdW50XCI6IG1lYXN1cmUoe1xuICAgIG5hbWU6IFwiY291bnRcIixcbiAgICBpbml0OiBcIlwiLFxuICAgIGFkZDogIFwiXCIsXG4gICAgcmVtOiAgXCJcIixcbiAgICBzZXQ6ICBcInRoaXMuY2VsbC5jbnRcIlxuICB9KSxcbiAgXCJfY291bnRzXCI6IG1lYXN1cmUoe1xuICAgIG5hbWU6IFwiX2NvdW50c1wiLFxuICAgIGluaXQ6IFwidGhpcy5jbnRzID0ge307XCIsXG4gICAgYWRkOiAgXCJ0aGlzLmNudHNbdl0gPSArK3RoaXMuY250c1t2XSB8fCAxO1wiLFxuICAgIHJlbTogIFwidGhpcy5jbnRzW3ZdID0gLS10aGlzLmNudHNbdl0gPCAwID8gMCA6IHRoaXMuY250c1t2XTtcIixcbiAgICBzZXQ6ICBcIlwiLFxuICAgIHJlcTogIFtcImNvdW50XCJdXG4gIH0pLFxuICBcInN1bVwiOiBtZWFzdXJlKHtcbiAgICBuYW1lOiBcInN1bVwiLFxuICAgIGluaXQ6IFwidGhpcy5zdW0gPSAwO1wiLFxuICAgIGFkZDogIFwidGhpcy5zdW0gKz0gdjtcIixcbiAgICByZW06ICBcInRoaXMuc3VtIC09IHY7XCIsXG4gICAgc2V0OiAgXCJ0aGlzLnN1bVwiXG4gIH0pLFxuICBcImF2Z1wiOiBtZWFzdXJlKHtcbiAgICBuYW1lOiBcImF2Z1wiLFxuICAgIGluaXQ6IFwidGhpcy5hdmcgPSAwO1wiLFxuICAgIGFkZDogIFwidmFyIGQgPSB2IC0gdGhpcy5hdmc7IHRoaXMuYXZnICs9IGQgLyB0aGlzLmNlbGwuY250O1wiLFxuICAgIHJlbTogIFwidmFyIGQgPSB2IC0gdGhpcy5hdmc7IHRoaXMuYXZnIC09IGQgLyB0aGlzLmNlbGwuY250O1wiLFxuICAgIHNldDogIFwidGhpcy5hdmdcIixcbiAgICByZXE6ICBbXCJjb3VudFwiXSwgaWR4OiAxXG4gIH0pLFxuICBcInZhclwiOiBtZWFzdXJlKHtcbiAgICBuYW1lOiBcInZhclwiLFxuICAgIGluaXQ6IFwidGhpcy5kZXYgPSAwO1wiLFxuICAgIGFkZDogIFwidGhpcy5kZXYgKz0gZCAqICh2IC0gdGhpcy5hdmcpO1wiLFxuICAgIHJlbTogIFwidGhpcy5kZXYgLT0gZCAqICh2IC0gdGhpcy5hdmcpO1wiLFxuICAgIHNldDogIFwidGhpcy5kZXYgLyAodGhpcy5jZWxsLmNudC0xKVwiLFxuICAgIHJlcTogIFtcImF2Z1wiXSwgaWR4OiAyXG4gIH0pLFxuICBcInZhcnBcIjogbWVhc3VyZSh7XG4gICAgbmFtZTogXCJ2YXJwXCIsXG4gICAgaW5pdDogXCJcIixcbiAgICBhZGQ6ICBcIlwiLFxuICAgIHJlbTogIFwiXCIsXG4gICAgc2V0OiAgXCJ0aGlzLmRldiAvIHRoaXMuY2VsbC5jbnRcIixcbiAgICByZXE6ICBbXCJ2YXJcIl0sIGlkeDogM1xuICB9KSxcbiAgXCJzdGRldlwiOiBtZWFzdXJlKHtcbiAgICBuYW1lOiBcInN0ZGV2XCIsXG4gICAgaW5pdDogXCJcIixcbiAgICBhZGQ6ICBcIlwiLFxuICAgIHJlbTogIFwiXCIsXG4gICAgc2V0OiAgXCJNYXRoLnNxcnQodGhpcy5kZXYgLyAodGhpcy5jZWxsLmNudC0xKSlcIixcbiAgICByZXE6ICBbXCJ2YXJcIl0sIGlkeDogNFxuICB9KSxcbiAgXCJzdGRldnBcIjogbWVhc3VyZSh7XG4gICAgbmFtZTogXCJzdGRldnBcIixcbiAgICBpbml0OiBcIlwiLFxuICAgIGFkZDogIFwiXCIsXG4gICAgcmVtOiAgXCJcIixcbiAgICBzZXQ6ICBcIk1hdGguc3FydCh0aGlzLmRldiAvIHRoaXMuY2VsbC5jbnQpXCIsXG4gICAgcmVxOiAgW1widmFyXCJdLCBpZHg6IDVcbiAgfSksXG4gIFwibWluXCI6IG1lYXN1cmUoe1xuICAgIG5hbWU6IFwibWluXCIsXG4gICAgaW5pdDogXCJ0aGlzLm1pbiA9ICtJbmZpbml0eTtcIixcbiAgICBhZGQ6ICBcInRoaXMubWluID0gdiA8IHRoaXMubWluID8gdiA6IHRoaXMubWluO1wiLFxuICAgIHJlbTogIFwidmFyIHNlbGYgPSB0aGlzOyB0aGlzLm1pbiA9IHYgPT0gdGhpcy5taW4gXCIgK1xuICAgICAgICAgIFwiPyB0aGlzLmtleXModGhpcy5jbnRzKS5yZWR1Y2UoZnVuY3Rpb24obSwgdikgeyBcIiArXG4gICAgICAgICAgXCIgICByZXR1cm4gc2VsZi5jbnRzWyh2ID0gK3YpXSA+IDAgJiYgdiA8IG0gPyB2IDogbSB9LCArSW5maW5pdHkpIFwiICsgXG4gICAgICAgICAgXCI6IHRoaXMubWluO1wiLFxuICAgIHNldDogIFwidGhpcy5taW5cIixcbiAgICByZXE6IFtcIl9jb3VudHNcIl0sIGlkeDogNlxuICB9KSxcbiAgXCJtYXhcIjogbWVhc3VyZSh7XG4gICAgbmFtZTogXCJtYXhcIixcbiAgICBpbml0OiBcInRoaXMubWF4ID0gLUluZmluaXR5O1wiLFxuICAgIGFkZDogIFwidGhpcy5tYXggPSB2ID4gdGhpcy5tYXggPyB2IDogdGhpcy5tYXg7XCIsXG4gICAgcmVtOiAgXCJ2YXIgc2VsZiA9IHRoaXM7IHRoaXMubWF4ID0gdiA9PSB0aGlzLm1heCBcIiArXG4gICAgICAgICAgXCI/IHRoaXMua2V5cyh0aGlzLmNudHMpLnJlZHVjZShmdW5jdGlvbihtLCB2KSB7IFwiICtcbiAgICAgICAgICBcIiAgIHJldHVybiBzZWxmLmNudHNbKHYgPSArdildID4gMCAmJiB2ID4gbSA/IHYgOiBtIH0sIC1JbmZpbml0eSkgXCIgKyBcbiAgICAgICAgICBcIjogdGhpcy5tYXg7XCIsXG4gICAgc2V0OiAgXCJ0aGlzLm1heFwiLFxuICAgIHJlcTogW1wiX2NvdW50c1wiXSwgaWR4OiA3XG4gIH0pLFxuICBcIm1lZGlhblwiOiBtZWFzdXJlKHtcbiAgICBuYW1lOiBcIm1lZGlhblwiLFxuICAgIGluaXQ6IFwidGhpcy52YWxzID0gW107IFwiLFxuICAgIGFkZDogIFwiaWYodGhpcy52YWxzKSB0aGlzLnZhbHMucHVzaCh2KTsgXCIsXG4gICAgcmVtOiAgXCJ0aGlzLnZhbHMgPSBudWxsO1wiLFxuICAgIHNldDogIFwidGhpcy5jZWxsLmNudCAlIDIgPyB0aGlzLnNlbCh+fih0aGlzLmNlbGwuY250LzIpLCB0aGlzLnZhbHMsIHRoaXMuY250cykgOiBcIitcbiAgICAgICAgICBcIjAuNSAqICh0aGlzLnNlbCh+fih0aGlzLmNlbGwuY250LzIpLTEsIHRoaXMudmFscywgdGhpcy5jbnRzKSArIHRoaXMuc2VsKH5+KHRoaXMuY2VsbC5jbnQvMiksIHRoaXMudmFscywgdGhpcy5jbnRzKSlcIixcbiAgICByZXE6IFtcIl9jb3VudHNcIl0sIGlkeDogOFxuICB9KVxufTtcblxuZnVuY3Rpb24gbWVhc3VyZShiYXNlKSB7XG4gIHJldHVybiBmdW5jdGlvbihvdXQpIHtcbiAgICB2YXIgbSA9IE9iamVjdC5jcmVhdGUoYmFzZSk7XG4gICAgbS5vdXQgPSBvdXQgfHwgYmFzZS5uYW1lO1xuICAgIGlmICghbS5pZHgpIG0uaWR4ID0gMDtcbiAgICByZXR1cm4gbTtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZShhZ2cpIHtcbiAgZnVuY3Rpb24gY29sbGVjdChtLCBhKSB7XG4gICAgKGEucmVxIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uKHIpIHtcbiAgICAgIGlmICghbVtyXSkgY29sbGVjdChtLCBtW3JdID0gdHlwZXNbcl0oKSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIG07XG4gIH1cbiAgdmFyIG1hcCA9IGFnZy5yZWR1Y2UoY29sbGVjdCxcbiAgICBhZ2cucmVkdWNlKGZ1bmN0aW9uKG0sIGEpIHsgcmV0dXJuIChtW2EubmFtZV0gPSBhLCBtKTsgfSwge30pKTtcbiAgdmFyIGFsbCA9IFtdO1xuICBmb3IgKHZhciBrIGluIG1hcCkgYWxsLnB1c2gobWFwW2tdKTtcbiAgYWxsLnNvcnQoZnVuY3Rpb24oYSxiKSB7IHJldHVybiBhLmlkeCAtIGIuaWR4OyB9KTtcbiAgcmV0dXJuIGFsbDtcbn1cblxuZnVuY3Rpb24gY29tcGlsZShhZ2cpIHtcbiAgdmFyIGFsbCA9IHJlc29sdmUoYWdnKSxcbiAgICAgIGN0ciA9IFwidGhpcy50cGwgPSB0OyB0aGlzLmNlbGwgPSBjO1wiLFxuICAgICAgYWRkID0gXCJcIixcbiAgICAgIHJlbSA9IFwiXCIsXG4gICAgICBzZXQgPSBcInZhciB0ID0gdGhpcy50cGw7XCI7XG5cbiAgYWxsLmZvckVhY2goZnVuY3Rpb24oYSkgeyBjdHIgKz0gYS5pbml0OyBhZGQgKz0gYS5hZGQ7IHJlbSArPSBhLnJlbTsgfSk7XG4gIGFnZy5mb3JFYWNoKGZ1bmN0aW9uKGEpIHsgc2V0ICs9IFwidGhpcy50dXBsZS5zZXQodCwnXCIrYS5vdXQrXCInLFwiK2Euc2V0K1wiKTtcIjsgfSk7XG4gIHNldCArPSBcInJldHVybiB0O1wiO1xuXG4gIGN0ciA9IEZ1bmN0aW9uKFwiY1wiLCBcInRcIiwgY3RyKTtcbiAgY3RyLnByb3RvdHlwZS5hZGQgPSBGdW5jdGlvbihcInZcIiwgYWRkKTtcbiAgY3RyLnByb3RvdHlwZS5yZW0gPSBGdW5jdGlvbihcInZcIiwgcmVtKTtcbiAgY3RyLnByb3RvdHlwZS5zZXQgPSBGdW5jdGlvbihcInN0YW1wXCIsIHNldCk7XG4gIGN0ci5wcm90b3R5cGUubW9kID0gbW9kO1xuICBjdHIucHJvdG90eXBlLmtleXMgPSBkbC5rZXlzO1xuICBjdHIucHJvdG90eXBlLnNlbCA9IHF1aWNrc2VsZWN0O1xuICBjdHIucHJvdG90eXBlLnR1cGxlID0gdHVwbGU7XG4gIHJldHVybiBjdHI7XG59XG5cbmZ1bmN0aW9uIG1vZCh2X25ldywgdl9vbGQpIHtcbiAgaWYgKHZfb2xkID09PSB1bmRlZmluZWQgfHwgdl9vbGQgPT09IHZfbmV3KSByZXR1cm47XG4gIHRoaXMucmVtKHZfb2xkKTtcbiAgdGhpcy5hZGQodl9uZXcpO1xufTtcblxudHlwZXMuY3JlYXRlICAgPSBjb21waWxlO1xubW9kdWxlLmV4cG9ydHMgPSB0eXBlczsiLCJ2YXIgZDMgPSAodHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdy5kMyA6IHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwuZDMgOiBudWxsKSxcbiAgICBCb3VuZHMgPSByZXF1aXJlKCcuLi9jb3JlL0JvdW5kcycpLFxuICAgIGNhbnZhcyA9IHJlcXVpcmUoJy4uL3JlbmRlci9jYW52YXMvcGF0aCcpLFxuICAgIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG5cbnZhciBwYXJzZSA9IGNhbnZhcy5wYXJzZSxcbiAgICBib3VuZFBhdGggPSBjYW52YXMuYm91bmRzLFxuICAgIGFyZWFQYXRoID0gY2FudmFzLmFyZWEsXG4gICAgbGluZVBhdGggPSBjYW52YXMubGluZSxcbiAgICBoYWxmcGkgPSBNYXRoLlBJIC8gMixcbiAgICBzcXJ0MyA9IE1hdGguc3FydCgzKSxcbiAgICB0YW4zMCA9IE1hdGgudGFuKDMwICogTWF0aC5QSSAvIDE4MCksXG4gICAgZ2Z4ID0gbnVsbDtcblxuZnVuY3Rpb24gZm9udFN0cmluZyhvKSB7XG4gIHJldHVybiAoby5mb250U3R5bGUgPyBvLmZvbnRTdHlsZSArIFwiIFwiIDogXCJcIilcbiAgICArIChvLmZvbnRWYXJpYW50ID8gby5mb250VmFyaWFudCArIFwiIFwiIDogXCJcIilcbiAgICArIChvLmZvbnRXZWlnaHQgPyBvLmZvbnRXZWlnaHQgKyBcIiBcIiA6IFwiXCIpXG4gICAgKyAoby5mb250U2l6ZSAhPSBudWxsID8gby5mb250U2l6ZSA6IGNvbmZpZy5yZW5kZXIuZm9udFNpemUpICsgXCJweCBcIlxuICAgICsgKG8uZm9udCB8fCBjb25maWcucmVuZGVyLmZvbnQpO1xufVxuXG5mdW5jdGlvbiBjb250ZXh0KCkge1xuICAvLyBUT0RPOiBob3cgdG8gY2hlY2sgaWYgbm9kZUpTIGluIHJlcXVpcmVKUz9cbiAgcmV0dXJuIGdmeCB8fCAoZ2Z4ID0gKC8qY29uZmlnLmlzTm9kZVxuICAgID8gbmV3IChyZXF1aXJlKFwiY2FudmFzXCIpKSgxLDEpXG4gICAgOiAqL2QzLnNlbGVjdChcImJvZHlcIikuYXBwZW5kKFwiY2FudmFzXCIpXG4gICAgICAgIC5hdHRyKFwiY2xhc3NcIiwgXCJ2ZWdhX2hpZGRlblwiKVxuICAgICAgICAuYXR0cihcIndpZHRoXCIsIDEpXG4gICAgICAgIC5hdHRyKFwiaGVpZ2h0XCIsIDEpXG4gICAgICAgIC5zdHlsZShcImRpc3BsYXlcIiwgXCJub25lXCIpXG4gICAgICAgIC5ub2RlKCkpXG4gICAgLmdldENvbnRleHQoXCIyZFwiKSk7XG59XG5cbmZ1bmN0aW9uIHBhdGhCb3VuZHMobywgcGF0aCwgYm91bmRzKSB7XG4gIGlmIChwYXRoID09IG51bGwpIHtcbiAgICBib3VuZHMuc2V0KDAsIDAsIDAsIDApO1xuICB9IGVsc2Uge1xuICAgIGJvdW5kUGF0aChwYXRoLCBib3VuZHMpO1xuICAgIGlmIChvLnN0cm9rZSAmJiBvLm9wYWNpdHkgIT09IDAgJiYgby5zdHJva2VXaWR0aCA+IDApIHtcbiAgICAgIGJvdW5kcy5leHBhbmQoby5zdHJva2VXaWR0aCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBib3VuZHM7XG59XG5cbmZ1bmN0aW9uIHBhdGgobywgYm91bmRzKSB7XG4gIHZhciBwID0gby5wYXRoXG4gICAgPyBvLnBhdGhDYWNoZSB8fCAoby5wYXRoQ2FjaGUgPSBwYXJzZShvLnBhdGgpKVxuICAgIDogbnVsbDtcbiAgcmV0dXJuIHBhdGhCb3VuZHMobywgcCwgYm91bmRzKTtcbn1cblxuZnVuY3Rpb24gYXJlYShvLCBib3VuZHMpIHtcbiAgdmFyIGl0ZW1zID0gby5tYXJrLml0ZW1zLCBvID0gaXRlbXNbMF07XG4gIHZhciBwID0gby5wYXRoQ2FjaGUgfHwgKG8ucGF0aENhY2hlID0gcGFyc2UoYXJlYVBhdGgoaXRlbXMpKSk7XG4gIHJldHVybiBwYXRoQm91bmRzKGl0ZW1zWzBdLCBwLCBib3VuZHMpO1xufVxuXG5mdW5jdGlvbiBsaW5lKG8sIGJvdW5kcykge1xuICB2YXIgaXRlbXMgPSBvLm1hcmsuaXRlbXMsIG8gPSBpdGVtc1swXTtcbiAgdmFyIHAgPSBvLnBhdGhDYWNoZSB8fCAoby5wYXRoQ2FjaGUgPSBwYXJzZShsaW5lUGF0aChpdGVtcykpKTtcbiAgcmV0dXJuIHBhdGhCb3VuZHMoaXRlbXNbMF0sIHAsIGJvdW5kcyk7XG59XG5cbmZ1bmN0aW9uIHJlY3QobywgYm91bmRzKSB7XG4gIHZhciB4ID0gby54IHx8IDAsXG4gICAgICB5ID0gby55IHx8IDAsXG4gICAgICB3ID0gKHggKyBvLndpZHRoKSB8fCAwLFxuICAgICAgaCA9ICh5ICsgby5oZWlnaHQpIHx8IDA7XG4gIGJvdW5kcy5zZXQoeCwgeSwgdywgaCk7XG4gIGlmIChvLnN0cm9rZSAmJiBvLm9wYWNpdHkgIT09IDAgJiYgby5zdHJva2VXaWR0aCA+IDApIHtcbiAgICBib3VuZHMuZXhwYW5kKG8uc3Ryb2tlV2lkdGgpO1xuICB9XG4gIHJldHVybiBib3VuZHM7XG59XG5cbmZ1bmN0aW9uIGltYWdlKG8sIGJvdW5kcykge1xuICB2YXIgdyA9IG8ud2lkdGggfHwgMCxcbiAgICAgIGggPSBvLmhlaWdodCB8fCAwLFxuICAgICAgeCA9IChvLnh8fDApIC0gKG8uYWxpZ24gPT09IFwiY2VudGVyXCJcbiAgICAgICAgICA/IHcvMiA6IChvLmFsaWduID09PSBcInJpZ2h0XCIgPyB3IDogMCkpLFxuICAgICAgeSA9IChvLnl8fDApIC0gKG8uYmFzZWxpbmUgPT09IFwibWlkZGxlXCJcbiAgICAgICAgICA/IGgvMiA6IChvLmJhc2VsaW5lID09PSBcImJvdHRvbVwiID8gaCA6IDApKTtcbiAgcmV0dXJuIGJvdW5kcy5zZXQoeCwgeSwgeCt3LCB5K2gpO1xufVxuXG5mdW5jdGlvbiBydWxlKG8sIGJvdW5kcykge1xuICB2YXIgeDEsIHkxO1xuICBib3VuZHMuc2V0KFxuICAgIHgxID0gby54IHx8IDAsXG4gICAgeTEgPSBvLnkgfHwgMCxcbiAgICBvLngyICE9IG51bGwgPyBvLngyIDogeDEsXG4gICAgby55MiAhPSBudWxsID8gby55MiA6IHkxXG4gICk7XG4gIGlmIChvLnN0cm9rZSAmJiBvLm9wYWNpdHkgIT09IDAgJiYgby5zdHJva2VXaWR0aCA+IDApIHtcbiAgICBib3VuZHMuZXhwYW5kKG8uc3Ryb2tlV2lkdGgpO1xuICB9XG4gIHJldHVybiBib3VuZHM7XG59XG5cbmZ1bmN0aW9uIGFyYyhvLCBib3VuZHMpIHtcbiAgdmFyIGN4ID0gby54IHx8IDAsXG4gICAgICBjeSA9IG8ueSB8fCAwLFxuICAgICAgaXIgPSBvLmlubmVyUmFkaXVzIHx8IDAsXG4gICAgICBvciA9IG8ub3V0ZXJSYWRpdXMgfHwgMCxcbiAgICAgIHNhID0gKG8uc3RhcnRBbmdsZSB8fCAwKSAtIGhhbGZwaSxcbiAgICAgIGVhID0gKG8uZW5kQW5nbGUgfHwgMCkgLSBoYWxmcGksXG4gICAgICB4bWluID0gSW5maW5pdHksIHhtYXggPSAtSW5maW5pdHksXG4gICAgICB5bWluID0gSW5maW5pdHksIHltYXggPSAtSW5maW5pdHksXG4gICAgICBhLCBpLCBuLCB4LCB5LCBpeCwgaXksIG94LCBveTtcblxuICB2YXIgYW5nbGVzID0gW3NhLCBlYV0sXG4gICAgICBzID0gc2EgLSAoc2ElaGFsZnBpKTtcbiAgZm9yIChpPTA7IGk8NCAmJiBzPGVhOyArK2ksIHMrPWhhbGZwaSkge1xuICAgIGFuZ2xlcy5wdXNoKHMpO1xuICB9XG5cbiAgZm9yIChpPTAsIG49YW5nbGVzLmxlbmd0aDsgaTxuOyArK2kpIHtcbiAgICBhID0gYW5nbGVzW2ldO1xuICAgIHggPSBNYXRoLmNvcyhhKTsgaXggPSBpcip4OyBveCA9IG9yKng7XG4gICAgeSA9IE1hdGguc2luKGEpOyBpeSA9IGlyKnk7IG95ID0gb3IqeTtcbiAgICB4bWluID0gTWF0aC5taW4oeG1pbiwgaXgsIG94KTtcbiAgICB4bWF4ID0gTWF0aC5tYXgoeG1heCwgaXgsIG94KTtcbiAgICB5bWluID0gTWF0aC5taW4oeW1pbiwgaXksIG95KTtcbiAgICB5bWF4ID0gTWF0aC5tYXgoeW1heCwgaXksIG95KTtcbiAgfVxuXG4gIGJvdW5kcy5zZXQoY3greG1pbiwgY3kreW1pbiwgY3greG1heCwgY3kreW1heCk7XG4gIGlmIChvLnN0cm9rZSAmJiBvLm9wYWNpdHkgIT09IDAgJiYgby5zdHJva2VXaWR0aCA+IDApIHtcbiAgICBib3VuZHMuZXhwYW5kKG8uc3Ryb2tlV2lkdGgpO1xuICB9XG4gIHJldHVybiBib3VuZHM7XG59XG5cbmZ1bmN0aW9uIHN5bWJvbChvLCBib3VuZHMpIHtcbiAgdmFyIHNpemUgPSBvLnNpemUgIT0gbnVsbCA/IG8uc2l6ZSA6IDEwMCxcbiAgICAgIHggPSBvLnggfHwgMCxcbiAgICAgIHkgPSBvLnkgfHwgMCxcbiAgICAgIHIsIHQsIHJ4LCByeTtcblxuICBzd2l0Y2ggKG8uc2hhcGUpIHtcbiAgICBjYXNlIFwiY3Jvc3NcIjpcbiAgICAgIHIgPSBNYXRoLnNxcnQoc2l6ZSAvIDUpIC8gMjtcbiAgICAgIHQgPSAzKnI7XG4gICAgICBib3VuZHMuc2V0KHgtdCwgeS1yLCB4K3QsIHkrcik7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgXCJkaWFtb25kXCI6XG4gICAgICByeSA9IE1hdGguc3FydChzaXplIC8gKDIgKiB0YW4zMCkpO1xuICAgICAgcnggPSByeSAqIHRhbjMwO1xuICAgICAgYm91bmRzLnNldCh4LXJ4LCB5LXJ5LCB4K3J4LCB5K3J5KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcInNxdWFyZVwiOlxuICAgICAgdCA9IE1hdGguc3FydChzaXplKTtcbiAgICAgIHIgPSB0IC8gMjtcbiAgICAgIGJvdW5kcy5zZXQoeC1yLCB5LXIsIHgrciwgeStyKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcInRyaWFuZ2xlLWRvd25cIjpcbiAgICAgIHJ4ID0gTWF0aC5zcXJ0KHNpemUgLyBzcXJ0Myk7XG4gICAgICByeSA9IHJ4ICogc3FydDMgLyAyO1xuICAgICAgYm91bmRzLnNldCh4LXJ4LCB5LXJ5LCB4K3J4LCB5K3J5KTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBcInRyaWFuZ2xlLXVwXCI6XG4gICAgICByeCA9IE1hdGguc3FydChzaXplIC8gc3FydDMpO1xuICAgICAgcnkgPSByeCAqIHNxcnQzIC8gMjtcbiAgICAgIGJvdW5kcy5zZXQoeC1yeCwgeS1yeSwgeCtyeCwgeStyeSk7XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICByID0gTWF0aC5zcXJ0KHNpemUvTWF0aC5QSSk7XG4gICAgICBib3VuZHMuc2V0KHgtciwgeS1yLCB4K3IsIHkrcik7XG4gIH1cbiAgaWYgKG8uc3Ryb2tlICYmIG8ub3BhY2l0eSAhPT0gMCAmJiBvLnN0cm9rZVdpZHRoID4gMCkge1xuICAgIGJvdW5kcy5leHBhbmQoby5zdHJva2VXaWR0aCk7XG4gIH1cbiAgcmV0dXJuIGJvdW5kcztcbn1cblxuZnVuY3Rpb24gdGV4dChvLCBib3VuZHMsIG5vUm90YXRlKSB7XG4gIHZhciB4ID0gKG8ueCB8fCAwKSArIChvLmR4IHx8IDApLFxuICAgICAgeSA9IChvLnkgfHwgMCkgKyAoby5keSB8fCAwKSxcbiAgICAgIGggPSBvLmZvbnRTaXplIHx8IGNvbmZpZy5yZW5kZXIuZm9udFNpemUsXG4gICAgICBhID0gby5hbGlnbixcbiAgICAgIGIgPSBvLmJhc2VsaW5lLFxuICAgICAgciA9IG8ucmFkaXVzIHx8IDAsXG4gICAgICBnID0gY29udGV4dCgpLCB3LCB0O1xuXG4gIGcuZm9udCA9IGZvbnRTdHJpbmcobyk7XG4gIGcudGV4dEFsaWduID0gYSB8fCBcImxlZnRcIjtcbiAgZy50ZXh0QmFzZWxpbmUgPSBiIHx8IFwiYWxwaGFiZXRpY1wiO1xuICB3ID0gZy5tZWFzdXJlVGV4dChvLnRleHQgfHwgXCJcIikud2lkdGg7XG5cbiAgaWYgKHIpIHtcbiAgICB0ID0gKG8udGhldGEgfHwgMCkgLSBNYXRoLlBJLzI7XG4gICAgeCArPSByICogTWF0aC5jb3ModCk7XG4gICAgeSArPSByICogTWF0aC5zaW4odCk7XG4gIH1cblxuICAvLyBob3Jpem9udGFsXG4gIGlmIChhID09PSBcImNlbnRlclwiKSB7XG4gICAgeCA9IHggLSAodyAvIDIpO1xuICB9IGVsc2UgaWYgKGEgPT09IFwicmlnaHRcIikge1xuICAgIHggPSB4IC0gdztcbiAgfSBlbHNlIHtcbiAgICAvLyBsZWZ0IGJ5IGRlZmF1bHQsIGRvIG5vdGhpbmdcbiAgfVxuXG4gIC8vLyBUT0RPIGZpbmQgYSByb2J1c3Qgc29sdXRpb24gZm9yIGhlaWdodHMuXG4gIC8vLyBUaGVzZSBvZmZzZXRzIHdvcmsgZm9yIHNvbWUgYnV0IG5vdCBhbGwgZm9udHMuXG5cbiAgLy8gdmVydGljYWxcbiAgaWYgKGIgPT09IFwidG9wXCIpIHtcbiAgICB5ID0geSArIChoLzUpO1xuICB9IGVsc2UgaWYgKGIgPT09IFwiYm90dG9tXCIpIHtcbiAgICB5ID0geSAtIGg7XG4gIH0gZWxzZSBpZiAoYiA9PT0gXCJtaWRkbGVcIikge1xuICAgIHkgPSB5IC0gKGgvMikgKyAoaC8xMCk7XG4gIH0gZWxzZSB7XG4gICAgeSA9IHkgLSA0KmgvNTsgLy8gYWxwaGFiZXRpYyBieSBkZWZhdWx0XG4gIH1cbiAgXG4gIGJvdW5kcy5zZXQoeCwgeSwgeCt3LCB5K2gpO1xuICBpZiAoby5hbmdsZSAmJiAhbm9Sb3RhdGUpIHtcbiAgICBib3VuZHMucm90YXRlKG8uYW5nbGUqTWF0aC5QSS8xODAsIG8ueHx8MCwgby55fHwwKTtcbiAgfVxuICByZXR1cm4gYm91bmRzLmV4cGFuZChub1JvdGF0ZSA/IDAgOiAxKTtcbn1cblxuZnVuY3Rpb24gZ3JvdXAoZywgYm91bmRzLCBpbmNsdWRlTGVnZW5kcykge1xuICB2YXIgYXhlcyA9IGcuYXhpc0l0ZW1zIHx8IFtdLFxuICAgICAgbGVnZW5kcyA9IGcubGVnZW5kSXRlbXMgfHwgW10sIGosIG07XG5cbiAgZm9yIChqPTAsIG09YXhlcy5sZW5ndGg7IGo8bTsgKytqKSB7XG4gICAgYm91bmRzLnVuaW9uKGF4ZXNbal0uYm91bmRzKTtcbiAgfVxuICBmb3IgKGo9MCwgbT1nLml0ZW1zLmxlbmd0aDsgajxtOyArK2opIHtcbiAgICBib3VuZHMudW5pb24oZy5pdGVtc1tqXS5ib3VuZHMpO1xuICB9XG4gIGlmIChpbmNsdWRlTGVnZW5kcykge1xuICAgIGZvciAoaj0wLCBtPWxlZ2VuZHMubGVuZ3RoOyBqPG07ICsraikge1xuICAgICAgYm91bmRzLnVuaW9uKGxlZ2VuZHNbal0uYm91bmRzKTtcbiAgICB9XG4gICAgaWYgKGcud2lkdGggIT0gbnVsbCAmJiBnLmhlaWdodCAhPSBudWxsKSB7XG4gICAgICBib3VuZHMuYWRkKGcud2lkdGgsIGcuaGVpZ2h0KTtcbiAgICB9XG4gICAgaWYgKGcueCAhPSBudWxsICYmIGcueSAhPSBudWxsKSB7XG4gICAgICBib3VuZHMuYWRkKDAsIDApO1xuICAgIH1cbiAgfVxuICBib3VuZHMudHJhbnNsYXRlKGcueHx8MCwgZy55fHwwKTtcbiAgcmV0dXJuIGJvdW5kcztcbn1cblxudmFyIG1ldGhvZHMgPSB7XG4gIGdyb3VwOiAgZ3JvdXAsXG4gIHN5bWJvbDogc3ltYm9sLFxuICBpbWFnZTogIGltYWdlLFxuICByZWN0OiAgIHJlY3QsXG4gIHJ1bGU6ICAgcnVsZSxcbiAgYXJjOiAgICBhcmMsXG4gIHRleHQ6ICAgdGV4dCxcbiAgcGF0aDogICBwYXRoLFxuICBhcmVhOiAgIGFyZWEsXG4gIGxpbmU6ICAgbGluZVxufTtcblxuZnVuY3Rpb24gaXRlbUJvdW5kcyhpdGVtLCBmdW5jLCBvcHQpIHtcbiAgZnVuYyA9IGZ1bmMgfHwgbWV0aG9kc1tpdGVtLm1hcmsubWFya3R5cGVdO1xuICBpZiAoIWl0ZW0uYm91bmRzX3ByZXYpIGl0ZW1bJ2JvdW5kczpwcmV2J10gPSBuZXcgQm91bmRzKCk7XG4gIHZhciBiID0gaXRlbS5ib3VuZHMsIHBiID0gaXRlbVsnYm91bmRzOnByZXYnXTtcbiAgaWYgKGIpIHBiLmNsZWFyKCkudW5pb24oYik7XG4gIGl0ZW0uYm91bmRzID0gZnVuYyhpdGVtLCBiID8gYi5jbGVhcigpIDogbmV3IEJvdW5kcygpLCBvcHQpO1xuICBpZiAoIWIpIHBiLmNsZWFyKCkudW5pb24oaXRlbS5ib3VuZHMpO1xuICByZXR1cm4gaXRlbS5ib3VuZHM7XG59XG5cbmZ1bmN0aW9uIG1hcmtCb3VuZHMobWFyaywgYm91bmRzLCBvcHQpIHtcbiAgYm91bmRzID0gYm91bmRzIHx8IG1hcmsuYm91bmRzICYmIG1hcmsuYm91bmRzLmNsZWFyKCkgfHwgbmV3IEJvdW5kcygpO1xuICB2YXIgdHlwZSAgPSBtYXJrLm1hcmt0eXBlLFxuICAgICAgZnVuYyAgPSBtZXRob2RzW3R5cGVdLFxuICAgICAgaXRlbXMgPSBtYXJrLml0ZW1zLFxuICAgICAgaXRlbSwgaSwgbGVuO1xuICAgICAgXG4gIGlmICh0eXBlPT09XCJhcmVhXCIgfHwgdHlwZT09PVwibGluZVwiKSB7XG4gICAgaWYgKGl0ZW1zLmxlbmd0aCkge1xuICAgICAgaXRlbXNbMF0uYm91bmRzID0gZnVuYyhpdGVtc1swXSwgYm91bmRzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgZm9yIChpPTAsIGxlbj1pdGVtcy5sZW5ndGg7IGk8bGVuOyArK2kpIHtcbiAgICAgIGJvdW5kcy51bmlvbihpdGVtQm91bmRzKGl0ZW1zW2ldLCBmdW5jLCBvcHQpKTtcbiAgICB9XG4gIH1cbiAgbWFyay5ib3VuZHMgPSBib3VuZHM7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBtYXJrOiAgbWFya0JvdW5kcyxcbiAgaXRlbTogIGl0ZW1Cb3VuZHMsXG4gIHRleHQ6ICB0ZXh0LFxuICBncm91cDogZ3JvdXBcbn07IiwidmFyIGQzID0gKHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cuZDMgOiB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsLmQzIDogbnVsbCksXG4gICAgY29uZmlnID0ge307XG5cbmNvbmZpZy5kZWJ1ZyA9IGZhbHNlO1xuXG5jb25maWcubG9hZCA9IHtcbiAgLy8gYmFzZSB1cmwgZm9yIGxvYWRpbmcgZXh0ZXJuYWwgZGF0YSBmaWxlc1xuICAvLyB1c2VkIG9ubHkgZm9yIHNlcnZlci1zaWRlIG9wZXJhdGlvblxuICBiYXNlVVJMOiBcIlwiLFxuICAvLyBBbGxvd3MgZG9tYWluIHJlc3RyaWN0aW9uIHdoZW4gdXNpbmcgZGF0YSBsb2FkaW5nIHZpYSBYSFIuXG4gIC8vIFRvIGVuYWJsZSwgc2V0IGl0IHRvIGEgbGlzdCBvZiBhbGxvd2VkIGRvbWFpbnNcbiAgLy8gZS5nLiwgWyd3aWtpcGVkaWEub3JnJywgJ2VmZi5vcmcnXVxuICBkb21haW5XaGl0ZUxpc3Q6IGZhbHNlXG59O1xuXG4vLyB2ZXJzaW9uIGFuZCBuYW1lcHNhY2VzIGZvciBleHBvcnRlZCBzdmdcbmNvbmZpZy5zdmdOYW1lc3BhY2UgPVxuICAndmVyc2lvbj1cIjEuMVwiIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiAnICtcbiAgJ3htbG5zOnhsaW5rPVwiaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGlua1wiJztcblxuLy8gaW5zZXQgcGFkZGluZyBmb3IgYXV0b21hdGljIHBhZGRpbmcgY2FsY3VsYXRpb25cbmNvbmZpZy5hdXRvcGFkSW5zZXQgPSA1O1xuXG4vLyBleHRlbnNpYmxlIHNjYWxlIGxvb2t1cCB0YWJsZVxuLy8gYWxsIGQzLnNjYWxlLiogaW5zdGFuY2VzIGFsc28gc3VwcG9ydGVkXG5jb25maWcuc2NhbGUgPSB7XG4gIHRpbWU6IGQzLnRpbWUuc2NhbGUsXG4gIHV0YzogIGQzLnRpbWUuc2NhbGUudXRjXG59O1xuXG4vLyBkZWZhdWx0IHJlbmRlcmluZyBzZXR0aW5nc1xuY29uZmlnLnJlbmRlciA9IHtcbiAgbGluZVdpZHRoOiAxLFxuICBsaW5lQ2FwOiAgIFwiYnV0dFwiLFxuICBmb250OiAgICAgIFwic2Fucy1zZXJpZlwiLFxuICBmb250U2l6ZTogIDExXG59O1xuXG4vLyBkZWZhdWx0IGF4aXMgcHJvcGVydGllc1xuY29uZmlnLmF4aXMgPSB7XG4gIG9yaWVudDogXCJib3R0b21cIixcbiAgdGlja3M6IDEwLFxuICBwYWRkaW5nOiAzLFxuICBheGlzQ29sb3I6IFwiIzAwMFwiLFxuICBncmlkQ29sb3I6IFwiI2Q4ZDhkOFwiLFxuICB0aWNrQ29sb3I6IFwiIzAwMFwiLFxuICB0aWNrTGFiZWxDb2xvcjogXCIjMDAwXCIsXG4gIGF4aXNXaWR0aDogMSxcbiAgdGlja1dpZHRoOiAxLFxuICB0aWNrU2l6ZTogNixcbiAgdGlja0xhYmVsRm9udFNpemU6IDExLFxuICB0aWNrTGFiZWxGb250OiBcInNhbnMtc2VyaWZcIixcbiAgdGl0bGVDb2xvcjogXCIjMDAwXCIsXG4gIHRpdGxlRm9udDogXCJzYW5zLXNlcmlmXCIsXG4gIHRpdGxlRm9udFNpemU6IDExLFxuICB0aXRsZUZvbnRXZWlnaHQ6IFwiYm9sZFwiLFxuICB0aXRsZU9mZnNldDogMzVcbn07XG5cbi8vIGRlZmF1bHQgbGVnZW5kIHByb3BlcnRpZXNcbmNvbmZpZy5sZWdlbmQgPSB7XG4gIG9yaWVudDogXCJyaWdodFwiLFxuICBvZmZzZXQ6IDEwLFxuICBwYWRkaW5nOiAzLFxuICBncmFkaWVudFN0cm9rZUNvbG9yOiBcIiM4ODhcIixcbiAgZ3JhZGllbnRTdHJva2VXaWR0aDogMSxcbiAgZ3JhZGllbnRIZWlnaHQ6IDE2LFxuICBncmFkaWVudFdpZHRoOiAxMDAsXG4gIGxhYmVsQ29sb3I6IFwiIzAwMFwiLFxuICBsYWJlbEZvbnRTaXplOiAxMCxcbiAgbGFiZWxGb250OiBcInNhbnMtc2VyaWZcIixcbiAgbGFiZWxBbGlnbjogXCJsZWZ0XCIsXG4gIGxhYmVsQmFzZWxpbmU6IFwibWlkZGxlXCIsXG4gIGxhYmVsT2Zmc2V0OiA4LFxuICBzeW1ib2xTaGFwZTogXCJjaXJjbGVcIixcbiAgc3ltYm9sU2l6ZTogNTAsXG4gIHN5bWJvbENvbG9yOiBcIiM4ODhcIixcbiAgc3ltYm9sU3Ryb2tlV2lkdGg6IDEsXG4gIHRpdGxlQ29sb3I6IFwiIzAwMFwiLFxuICB0aXRsZUZvbnQ6IFwic2Fucy1zZXJpZlwiLFxuICB0aXRsZUZvbnRTaXplOiAxMSxcbiAgdGl0bGVGb250V2VpZ2h0OiBcImJvbGRcIlxufTtcblxuLy8gZGVmYXVsdCBjb2xvciB2YWx1ZXNcbmNvbmZpZy5jb2xvciA9IHtcbiAgcmdiOiBbMTI4LCAxMjgsIDEyOF0sXG4gIGxhYjogWzUwLCAwLCAwXSxcbiAgaGNsOiBbMCwgMCwgNTBdLFxuICBoc2w6IFswLCAwLCAwLjVdXG59O1xuXG4vLyBkZWZhdWx0IHNjYWxlIHJhbmdlc1xuY29uZmlnLnJhbmdlID0ge1xuICBjYXRlZ29yeTEwOiBbXG4gICAgXCIjMWY3N2I0XCIsXG4gICAgXCIjZmY3ZjBlXCIsXG4gICAgXCIjMmNhMDJjXCIsXG4gICAgXCIjZDYyNzI4XCIsXG4gICAgXCIjOTQ2N2JkXCIsXG4gICAgXCIjOGM1NjRiXCIsXG4gICAgXCIjZTM3N2MyXCIsXG4gICAgXCIjN2Y3ZjdmXCIsXG4gICAgXCIjYmNiZDIyXCIsXG4gICAgXCIjMTdiZWNmXCJcbiAgXSxcbiAgY2F0ZWdvcnkyMDogW1xuICAgIFwiIzFmNzdiNFwiLFxuICAgIFwiI2FlYzdlOFwiLFxuICAgIFwiI2ZmN2YwZVwiLFxuICAgIFwiI2ZmYmI3OFwiLFxuICAgIFwiIzJjYTAyY1wiLFxuICAgIFwiIzk4ZGY4YVwiLFxuICAgIFwiI2Q2MjcyOFwiLFxuICAgIFwiI2ZmOTg5NlwiLFxuICAgIFwiIzk0NjdiZFwiLFxuICAgIFwiI2M1YjBkNVwiLFxuICAgIFwiIzhjNTY0YlwiLFxuICAgIFwiI2M0OWM5NFwiLFxuICAgIFwiI2UzNzdjMlwiLFxuICAgIFwiI2Y3YjZkMlwiLFxuICAgIFwiIzdmN2Y3ZlwiLFxuICAgIFwiI2M3YzdjN1wiLFxuICAgIFwiI2JjYmQyMlwiLFxuICAgIFwiI2RiZGI4ZFwiLFxuICAgIFwiIzE3YmVjZlwiLFxuICAgIFwiIzllZGFlNVwiXG4gIF0sXG4gIHNoYXBlczogW1xuICAgIFwiY2lyY2xlXCIsXG4gICAgXCJjcm9zc1wiLFxuICAgIFwiZGlhbW9uZFwiLFxuICAgIFwic3F1YXJlXCIsXG4gICAgXCJ0cmlhbmdsZS1kb3duXCIsXG4gICAgXCJ0cmlhbmdsZS11cFwiXG4gIF1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gY29uZmlnOyIsIm1vZHVsZS5leHBvcnRzID0ge1xuICBBRERfQ0VMTDogMSxcbiAgTU9EX0NFTEw6IDIsXG5cbiAgREFUQTogXCJkYXRhXCIsXG4gIEZJRUxEUzogIFwiZmllbGRzXCIsXG4gIFNDQUxFUzogIFwic2NhbGVzXCIsXG4gIFNJR05BTDogIFwic2lnbmFsXCIsXG4gIFNJR05BTFM6IFwic2lnbmFsc1wiLFxuXG4gIEdST1VQOiBcImdyb3VwXCIsXG5cbiAgRU5URVI6IFwiZW50ZXJcIixcbiAgVVBEQVRFOiBcInVwZGF0ZVwiLFxuICBFWElUOiBcImV4aXRcIixcblxuICBTRU5USU5FTDoge1wic2VudGluZWxcIjogMX0sXG4gIFNJTkdMRVRPTjogXCJfc2luZ2xldG9uXCIsXG5cbiAgQUREOiBcImFkZFwiLFxuICBSRU1PVkU6IFwicmVtb3ZlXCIsXG4gIFRPR0dMRTogXCJ0b2dnbGVcIixcbiAgQ0xFQVI6IFwiY2xlYXJcIixcblxuICBMSU5FQVI6IFwibGluZWFyXCIsXG4gIE9SRElOQUw6IFwib3JkaW5hbFwiLFxuICBMT0c6IFwibG9nXCIsXG4gIFBPV0VSOiBcInBvd1wiLFxuICBUSU1FOiBcInRpbWVcIixcbiAgUVVBTlRJTEU6IFwicXVhbnRpbGVcIixcblxuICBET01BSU46IFwiZG9tYWluXCIsXG4gIFJBTkdFOiBcInJhbmdlXCIsXG5cbiAgTUFSSzogXCJtYXJrXCIsXG4gIEFYSVM6IFwiYXhpc1wiLFxuXG4gIENPVU5UOiBcImNvdW50XCIsXG4gIE1JTjogXCJtaW5cIixcbiAgTUFYOiBcIm1heFwiLFxuXG4gIEFTQzogXCJhc2NcIixcbiAgREVTQzogXCJkZXNjXCJcbn07IiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJyk7XG52YXIgdHM7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaW5wdXQsIGFyZ3MpIHtcbiAgaWYgKCFjb25maWcuZGVidWcpIHJldHVybjtcbiAgdmFyIGxvZyA9IEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kLmNhbGwoY29uc29sZS5sb2csIGNvbnNvbGUpO1xuICBhcmdzLnVuc2hpZnQoaW5wdXQuc3RhbXB8fC0xKTtcbiAgYXJncy51bnNoaWZ0KERhdGUubm93KCkgLSB0cyk7XG4gIGlmKGlucHV0LmFkZCkgYXJncy5wdXNoKGlucHV0LmFkZC5sZW5ndGgsIGlucHV0Lm1vZC5sZW5ndGgsIGlucHV0LnJlbS5sZW5ndGgsICEhaW5wdXQucmVmbG93KTtcbiAgbG9nLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICB0cyA9IERhdGUubm93KCk7XG59OyIsInZhciBkbCA9IHJlcXVpcmUoJ2RhdGFsaWInKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBxdWlja3NlbGVjdChrLCB4LCBjKSB7XG4gIGZ1bmN0aW9uIHN3YXAoYSwgYikge1xuICAgIHZhciB0ID0geFthXTtcbiAgICB4W2FdID0geFtiXTtcbiAgICB4W2JdID0gdDtcbiAgfVxuXG4gIC8vIHggbWF5IGJlIG51bGwsIGluIHdoaWNoIGNhc2UgYXNzZW1ibGUgYW4gYXJyYXkgZnJvbSBjIChjb3VudHMpXG4gIGlmKHggPT09IG51bGwpIHtcbiAgICB4ID0gW107XG4gICAgZGwua2V5cyhjKS5mb3JFYWNoKGZ1bmN0aW9uKGspIHtcbiAgICAgIHZhciBpID0gMCwgbGVuID0gY1trXTtcbiAgICAgIGsgPSArayB8fCBrO1xuICAgICAgZm9yKDsgaTxsZW47ICsraSkgeC5wdXNoKGspO1xuICAgIH0pO1xuICB9XG4gIFxuICB2YXIgbGVmdCA9IDAsXG4gICAgICByaWdodCA9IHgubGVuZ3RoIC0gMSxcbiAgICAgIHBvcywgaSwgcGl2b3Q7XG4gIFxuICB3aGlsZSAobGVmdCA8IHJpZ2h0KSB7XG4gICAgcGl2b3QgPSB4W2tdO1xuICAgIHN3YXAoaywgcmlnaHQpO1xuICAgIGZvciAoaSA9IHBvcyA9IGxlZnQ7IGkgPCByaWdodDsgKytpKSB7XG4gICAgICBpZiAoeFtpXSA8IHBpdm90KSB7IHN3YXAoaSwgcG9zKyspOyB9XG4gICAgfVxuICAgIHN3YXAocmlnaHQsIHBvcyk7XG4gICAgaWYgKHBvcyA9PT0gaykgYnJlYWs7XG4gICAgaWYgKHBvcyA8IGspIGxlZnQgPSBwb3MgKyAxO1xuICAgIGVsc2UgcmlnaHQgPSBwb3MgLSAxO1xuICB9XG4gIHJldHVybiB4W2tdO1xufTsiXX0=
