vg.scene.bounds = (function() {

  var parsePath = vg.canvas.path.parse,
      boundPath = vg.canvas.path.bounds,
      halfpi = Math.PI / 2,
      gfx = null;

  function context() {
    return gfx || (gfx = (vg.config.isNode
      ? new Canvas(0, 0)
      : d3.select("body").append("canvas")
          .style("display", "none")
          .attr("class", "vega_hidden")
          .attr("width", 0)
          .attr("height", 0)
          .node())
      .getContext("2d"));
  }

  function pathBounds(o, path, bounds) {
    boundPath(parsePath(path), bounds);
    if (o.stroke && o.opacity !== 0 && o.strokeWidth > 0) {
      bounds.expand(o.strokeWidth);
    }
    return bounds;
  }

  function path(o, bounds) {
    return pathBounds(o, o.path, bounds);
  }
  
  function area(o, bounds) {
    var items = o.mark.items;
    var area = d3.svg.area()
     .x(function(d) { return d.x; })
     .y1(function(d) { return d.y; })
     .y0(function(d) { return d.y + d.height; });
    o = items[0];
    if (o.interpolate) area.interpolate(o.interpolate);
    if (o.tension != undefined) area.tension(o.tension);
    return pathBounds(o, area(items), bounds);
  }

  function line(o, bounds) {
    var items = o.mark.items;
    var line = d3.svg.line()
     .x(function(d) { return d.x; })
     .y(function(d) { return d.y; });
    o = items[0];
    if (o.interpolate) line.interpolate(o.interpolate);
    if (o.tension != undefined) line.tension(o.tension);
    return pathBounds(o, line(items), bounds);
  }

  function rect(o, bounds) {
    bounds.set(
      o.x || 0,
      o.y || 0,
      (o.x + o.width) || 0,
      (o.y + o.height) || 0
    );
    if (o.stroke && o.opacity !== 0 && o.strokeWidth > 0) {
      bounds.expand(o.strokeWidth);
    }
    return bounds;
  }

  function image(o, bounds) {
    var w = o.width || 0,
        h = o.height || 0,
        x = o.x - (o.align === "center"
            ? w/2 : (o.align === "right" ? w : 0)),
        y = o.y - (o.baseline === "middle"
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
        s = sa - (sa%halfpi) + halfpi;
    for (var i=0; i<4 && s<ea; ++i, s+=halfpi) {
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
        x = o.x, y = o.y, r, t, rx, ry;

    switch (o.shape) {
      case "cross":
        r = Math.sqrt(size / 5) / 2;
        t = 3*r;
        bounds.set(x-t, y-t, x+y, y+t);
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
    var x = o.x + (o.dx || 0),
        y = o.y + (o.dy || 0),
        h = o.fontSize || vg.config.render.fontSize,
        a = o.align,
        b = o.baseline,
        g = context(), w;

    g.font = vg.scene.fontString(o);
    g.textAlign = o.align || "left";
    g.textBaseline = o.baseline || "alphabetic";
    w = g.measureText(o.text).width;

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
      bounds.rotate(o.angle*Math.PI/180, o.x, o.y);
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
    if (!item.bounds_prev) item.bounds_prev = new vg.Bounds();
    var b = item.bounds, pb = item.bounds_prev;
    if (b) pb.clear().union(b);
    item.bounds = func(item, b ? b.clear() : new vg.Bounds(), opt);
    if (!b) pb.clear().union(item.bounds);
    return item.bounds;
  }

  function markBounds(mark, bounds, opt) {
    bounds = bounds || mark.bounds && mark.bounds.clear() || new vg.Bounds();
    var type  = mark.marktype,
        func  = methods[type],
        items = mark.items,
        item, i, len;
        
    if (type==="area" || type==="line") {
      items[0].bounds = func(items[0], bounds);
    } else {
      for (i=0, len=items.length; i<len; ++i) {
        bounds.union(itemBounds(items[i], func, opt));
      }
    }
    mark.bounds = bounds;
  }
  
  return {
    mark:  markBounds,
    item:  itemBounds,
    text:  text,
    group: group
  };

})();