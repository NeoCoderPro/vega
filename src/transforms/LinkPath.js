var Transform = require('./Transform'),
    tuple = require('../dataflow/tuple');

function LinkPath(graph) {
  Transform.prototype.init.call(this, graph);
  Transform.addParameters(this, {
    source:  {type: "field", default: "_source"},
    target:  {type: "field", default: "_target"},
    x:       {type: "field", default: "layout_x"},
    y:       {type: "field", default: "layout_y"},
    tension: {type: "value", default: 0.2},
    shape:   {type: "value", default: "line"}
  });

  this._output = {"path": "layout_path"};
  return this;
}

var proto = (LinkPath.prototype = new Transform());

function line(d, source, target, x, y, tension) {
  var s = source(d), sx = x(s), sy = y(s),
      t = target(d), tx = x(t), ty = y(t);
  return "M" + sx + "," + sy
       + "L" + tx + "," + ty;
}

function curve(d, source, target, x, y, tension) {
  var s = source(d), sx = x(s), sy = y(s),
      t = target(d), tx = x(t), ty = y(t),
      dx = tx - sx,
      dy = ty - sy,
      ix = tension * (dx + dy),
      iy = tension * (dy - dx);
  return "M" + sx + "," + sy
       + "C" + (sx+ix) + "," + (sy+iy)
       + " " + (tx+iy) + "," + (ty-ix)
       + " " + tx + "," + ty;
}

function diagonalX(d, source, target, x, y, tension) {
  var s = source(d), sx = x(s), sy = y(s),
      t = target(d), tx = x(t), ty = y(t),
      m = (sx + tx) / 2;
  return "M" + sx + "," + sy
       + "C" + m  + "," + sy
       + " " + m  + "," + ty
       + " " + tx + "," + ty;
}

function diagonalY(d, source, target, x, y, tension) {
  var s = source(d), sx = x(s), sy = y(s),
      t = target(d), tx = x(t), ty = y(t),
      m = (sy + ty) / 2;
  return "M" + sx + "," + sy
       + "C" + sx + "," + m
       + " " + tx + "," + m
       + " " + tx + "," + ty;
}

var shapes = {
  line:      line,
  curve:     curve,
  diagonal:  diagonalX,
  diagonalX: diagonalX,
  diagonalY: diagonalY
};

proto.transform = function(input) {
  var output = this._output,
      shape = shapes[this.param("shape")] || shapes.line,
      source = this.param("source").accessor,
      target = this.param("target").accessor,
      x = this.param("x").accessor,
      y = this.param("y").accessor,
      tension = this.param("tension");
  
  function set(t) {
    var path = shape(t, source, target, x, y, tension)
    tuple.set(t, output.path, path);
  }

  input.add.forEach(set);
  if (this.reevaluate(input)) {
    input.mod.forEach(set);
  }

  input.fields[output.path] = 1;
  return input;
};

module.exports = LinkPath;