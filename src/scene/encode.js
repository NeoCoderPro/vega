define(function(require, exports, module) {
  var vg = require('vega');

  return function encode(model, mark) {
    var props = mark.def.properties || {},
      enter  = props.enter,
      update = props.update,
      exit   = props.exit,
      i, len, item, prop;

    function encodeProp(prop, item, trans, stamp) {
      var sg = model.signal(prop.signals||[]),
          db = {};

      (prop.db||[]).forEach(function(d) { db[d] = model.data(d).data(); });

      prop.encode.call(prop.encode, stamp, item, item.mark.group||item, trans, 
        db, sg, model._predicates);
    }

    var node = new model.Node(function(input) {
      global.debug(input, ["encoding", mark.def.type]);

      if(enter || update) {
        input.add.forEach(function(i) { 
          if(enter) encodeProp(enter, i, null, input.stamp); 
          if(update) encodeProp(update, i, null, input.stamp);
        });
      }

      if(update) input.mod.forEach(function(i) { encodeProp(update, i, null, input.stamp); });
      if(exit) input.rem.forEach(function(i) { encodeProp(exit, i, null, input.stamp); });

      return input;
    });

    var sg = node._deps.signals, sc = node._deps.scales;
    [enter, update, exit].forEach(function(prop) {
      if(!prop) return;
      sg.push.apply(sg, prop.signals||[]);
      sc.push.apply(sc, prop.scales||[]);
    });
    return node;
  }; 
});

