define(function(require, exports, module) {
  var encode  = require('./encode'),
      collect = require('../dataflow/collector'),
      bounds  = require('./bounds'),
      group   = require('./group'),
      Item  = require('./Item'),
      parseData = require('../parse/data'),
      tuple = require('../dataflow/tuple'),
      changeset = require('../dataflow/changeset'),
      util = require('../util/index'),
      C = require('../util/constants');

  function Builder(model, renderer, def, mark, parent, inheritFrom) {
    this._model = model;
    this._def   = def;
    this._mark  = mark;
    this._from  = (def.from ? def.from.data : null) || inheritFrom;
    this._ds    = util.isString(f) ? model.data(this._from) : null;
    this._map   = {};
    this._items = [];
    this._lastBuild = 0;
    this._parent = parent;
    this._encoder = null;
    this._bounder = null;
    this._collector = null;
    this._recursor = null;
    this._renderer = renderer;
    return this.init();
  }

  var proto = (Builder.prototype = new Node());

  proto.init = function() {
    var mark = this._mark,
        def  = this._def;

    mark.def = def;
    mark.marktype = def.type;
    mark.interactive = !(def.interactive === false);
    mark.items = this._items;

    if(def.from && (def.from.transform || def.from.modify)) inlineDs.call(this);

    this._encoder = new Encoder(this._model, this._mark);
    this._bounder = new Bounder(this._model, this._mark);
    this._collector = new Collector(this._model.graph);

    if(def.type === C.GROUP) {
      this._recursor = new Recursor(this);
    }

    if(this._ds) {
      this.dependency(C.DATA, this._from);
      this._encoder.dependency(C.DATA, this._from);
    }

    this.connect();

    return Node.prototype.init.call(this, this._model.graph)
      .router(true)
      .collector(true);
  };

  proto.evaluate = function(input) {
    util.debug(input, ["building", this._from, this._def.type]);

    var fullUpdate = this._encoder.reevaluate(input),
        output, fcs, data;

    if(from) {
      output = changeset.create(input);

      // If a scale or signal in the update propset has been updated, 
      // send forward all items for reencoding if we do an early return.
      if(fullUpdate) output.mod = this._items.slice();

      fcs = this._ds.last();
      if(!fcs) return output.touch = true, output;
      if(fcs.stamp <= lastBuild) return output;

      this._lastBuild = fcs.stamp;
      return joinChangeset.call(this, fcs);
    } else {
      data = util.isFunction(this._def.from) ? this._def.from() : [C.SENTINEL];
      return joinValues.call(this, input, data);
    }
  };

  // Mark-level transformations are handled here because they may be
  // inheriting from a group's faceted datasource. 
  function inlineDs() {
    var name = [this._from, this._def.type, Date.now()].join('_');
    var spec = {
      name: name,
      source: this._from,
      transform: this._def.from.transform,
      modify: this._def.from.modify
    };

    this._f = name;
    this._ds = parseData.datasource(this._model, spec);

    // At this point, we have a new datasource but it is empty as
    // the propagation cycle has already crossed the datasources. 
    // So, we repulse just this datasource. This should be safe
    // as the ds isn't connected to the scenegraph yet.
    var output = this._ds.source().last(),
        input  = changeset.create(output);

    input.add = output.add;
    input.mod = output.mod;
    input.rem = output.rem;
    input.stamp = null;
    this._ds.fire(input);
  };

  function pipeline() {
    var pipeline = [this, this._encoder];
    if(this._recursor) pipeline.push(this._recursor);
    pipeline.push(this._collector, this._bounder, this._renderer);
    return pipeline;
  };

  proto.connect = function() {
    var builder = this;
    this._model.graph.connect(pipeline.call(this));
    this._encoder.dependency(C.SCALES).forEach(function(s) {
      builder._parent.group.scale(s).addListener(builder);
    });
    if(this._parent) this._bounder.addListener(this._parent._collector);
  };

  proto.disconnect = function() {
    var builder = this;
    this._model.graph.disconnect(pipeline.call(this));
    this._encoder.dependency(C.SCALES).forEach(function(s) {
      builder._parent.group.scale(s).removeListener(builder);
    });
    if(this._recursor) this._recursor.disconnect();
  };

  function newItem(d, stamp) {
    var item   = tuple.create(new Item(this._mark));
    item.datum = d;

    // For the root node's item
    if(this._def.width)  tuple.set(item, "width",  this._def.width, stamp);
    if(this._def.height) tuple.set(item, "height", this._def.height, stamp);

    return item;
  };

  function joinChangeset(input) {
    var keyf = keyFunction(this._def.key || "_id"),
        output = changeset.create(input),
        add = input.add, 
        mod = input.mod, 
        rem = input.rem,
        stamp = input.stamp,
        i, key, len, item, datum;

    for(i=0, len=add.length; i<len; ++i) {
      key = keyf(datum = add[i]);
      item = newItem.call(this, datum, stamp);
      tuple.set(item, "key", key, stamp);
      item.status = C.ENTER;
      this._map[key] = item;
      this._items.push(item);
      output.add.push(item);
    }

    for(i=0, len=mod.length; i<len; ++i) {
      item = this._map[key = keyf(datum = mod[i])];
      tuple.set(item, "key", key, stamp);
      item.datum  = datum;
      item.status = C.UPDATE;
      output.mod.push(item);
    }

    for(i=0, len=rem.length; i<len; ++i) {
      item = this._map[key = keyf(rem[i])];
      item.status = C.EXIT;
      output.rem.push(item);
      this._map[key] = null;
    }

    // Sort items according to how data is sorted, or by _id. The else 
    // condition is important to ensure lines and areas are drawn correctly.
    items.sort(function(a, b) { 
      return input.sort ? input.sort(a.datum, b.datum) : (a.datum._id - b.datum._id);
    });

    return output;
  }

  function joinValues(input, data) {
    var keyf = keyFunction(this._def.key),
        prev = this._items.splice(0),
        output = changeset.create(input),
        i, key, len, item, datum, enter;

    for (i=0, len=prev.length; i<len; ++i) {
      item = prev[i];
      item.status = C.EXIT;
      if (keyf) this._map[item.key] = item;
    }
    
    for (i=0, len=data.length; i<len; ++i) {
      datum = data[i];
      key = i;
      item = keyf ? this._map[key = keyf(datum)] : prev[i];
      if(!item) {
        this._items.push(item = newItem.call(this, datum, input.stamp));
        output.add.push(item);
        tuple.set(item, "key", key);
        item.status = C.ENTER;
      } else {
        this._items.push(item);
        output.mod.push(item);
        tuple.set(item, "key", key);
        item.datum = datum;
        item.status = C.UPDATE;
      }
    }

    for (i=0, len=prev.length; i<len; ++i) {
      item = prev[i];
      if (item.status === C.EXIT) {
        tuple.set(item, "key", keyf ? item.key : this._items.length);
        this._items.unshift(item);  // Keep item around for "exit" transition.
        output.rem.unshift(item);
      }
    }
    
    return output;
  };

  function keyFunction(key) {
    if (key == null) return null;
    var f = util.array(key).map(util.accessor);
    return function(d) {
      for (var s="", i=0, n=f.length; i<n; ++i) {
        if (i>0) s += "|";
        s += String(f[i](d));
      }
      return s;
    }
  };

  return Builder;
});