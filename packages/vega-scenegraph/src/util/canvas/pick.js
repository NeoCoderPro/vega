import {pickVisit} from '../visit';
import {truthy} from 'vega-util';

export function pick(test) {
  test = test || truthy;

  return function (context, scene, x, y, gx, gy) {
    x *= context.pixelRatio;
    y *= context.pixelRatio;

    return pickVisit(scene, function (item) {
      const b = item.bounds;
      // first hit test against bounding box
      if ((b && !b.contains(gx, gy)) || !b) return;
      // if in bounding box, perform more careful test
      if (test(context, item, x, y, gx, gy)) return item;
    });
  };
}

export function hitPath(path, filled) {
  return function (context, o, x, y) {
    const item = Array.isArray(o) ? o[0] : o;
    const fill = filled == null ? item.fill : filled;
    const stroke = item.stroke && context.isPointInStroke;
    let lw;
    let lc;

    if (stroke) {
      lw = item.strokeWidth;
      lc = item.strokeCap;
      context.lineWidth = lw != null ? lw : 1;
      context.lineCap = lc != null ? lc : 'butt';
    }

    return path(context, o)
      ? false
      : (fill && context.isPointInPath(x, y)) || (stroke && context.isPointInStroke(x, y));
  };
}

export function pickPath(path) {
  return pick(hitPath(path));
}
