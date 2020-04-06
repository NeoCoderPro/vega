import {textMetrics} from 'vega-scenegraph';

// pixel direction offsets for flood fill search
const X_DIR = [-1, -1, 1, 1];
const Y_DIR = [-1, 1, -1, 1];

export default function ($, bitmaps, avoidBaseMark, markIndex) {
  const width = $.width;
  const height = $.height;
  const bm0 = bitmaps[0]; // where labels have been placed
  const bm1 = bitmaps[1]; // area outlines
  const bm2 = $.bitmap(); // flood-fill visitations

  // try to place a label within an input area mark
  return function (d) {
    const items = d.datum.datum.items[markIndex].items; // area points
    const n = items.length; // number of points
    const textHeight = d.datum.fontSize; // label width
    const textWidth = textMetrics.width(d.datum); // label height
    const stack = []; // flood fill stack

    let maxSize = avoidBaseMark ? textHeight : 0;
    let labelPlaced = false;
    let labelPlaced2 = false;
    let maxAreaWidth = 0;
    let x1;
    let x2;
    let y1;
    let y2;
    let x;
    let y;
    let _x;
    let _y;
    let lo;
    let hi;
    let mid;
    let areaWidth;

    // for each area sample point
    for (let i = 0; i < n; ++i) {
      x1 = items[i].x;
      y1 = items[i].y;
      x2 = items[i].x2 === undefined ? x1 : items[i].x2;
      y2 = items[i].y2 === undefined ? y1 : items[i].y2;

      // add scaled center point to stack
      stack.push([$((x1 + x2) / 2), $((y1 + y2) / 2)]);

      // perform flood fill, visit points
      while (stack.length) {
        [_x, _y] = stack.pop();

        // exit if point already marked
        if (bm0.get(_x, _y) || bm1.get(_x, _y) || bm2.get(_x, _y)) continue;

        // mark point in flood fill bitmap
        // add search points for all (in bound) directions
        bm2.set(_x, _y);
        for (let j = 0; j < 4; ++j) {
          x = _x + X_DIR[j];
          y = _y + Y_DIR[j];
          if (!bm2.outOfBounds(x, y, x, y)) stack.push([x, y]);
        }

        // unscale point back to x, y space
        x = $.invert(_x);
        y = $.invert(_y);
        lo = maxSize;
        hi = height; // TODO: make this bound smaller

        if (
          !outOfBounds(x, y, textWidth, textHeight, width, height) &&
          !collision($, x, y, textHeight, textWidth, lo, bm0, bm1)
        ) {
          // if the label fits at the current sample point,
          // perform binary search to find the largest font size that fits
          while (hi - lo >= 1) {
            mid = (lo + hi) / 2;
            if (collision($, x, y, textHeight, textWidth, mid, bm0, bm1)) {
              hi = mid;
            } else {
              lo = mid;
            }
          }
          // place label if current lower bound exceeds prior max font size
          if (lo > maxSize) {
            d.x = x;
            d.y = y;
            maxSize = lo;
            labelPlaced = true;
          }
        }
      }

      // place label at slice center if not placed through other means
      // and if we're not avoiding overlap with other areas
      if (!labelPlaced && !avoidBaseMark) {
        // one span is zero, hence we can add
        areaWidth = Math.abs(x2 - x1 + y2 - y1);
        x = (x1 + x2) / 2;
        y = (y1 + y2) / 2;

        // place label if it fits and improves the max area width
        if (
          areaWidth >= maxAreaWidth &&
          !outOfBounds(x, y, textWidth, textHeight, width, height) &&
          !collision($, x, y, textHeight, textWidth, textHeight, bm0, null)
        ) {
          maxAreaWidth = areaWidth;
          d.x = x;
          d.y = y;
          labelPlaced2 = true;
        }
      }
    }

    // record current label placement information, update label bitmap
    if (labelPlaced || labelPlaced2) {
      x = textWidth / 2;
      y = textHeight / 2;
      bm0.setRange($(d.x - x), $(d.y - y), $(d.x + x), $(d.y + y));
      d.align = 'center';
      d.baseline = 'middle';
      return true;
    } else {
      return false;
    }
  };
}

function outOfBounds(x, y, textWidth, textHeight, width, height) {
  let r = textWidth / 2;
  return x - r < 0 || x + r > width || y - (r = textHeight / 2) < 0 || y + r > height;
}

function collision($, x, y, textHeight, textWidth, h, bm0, bm1) {
  const w = (textWidth * h) / (textHeight * 2);
  const x1 = $(x - w);
  const x2 = $(x + w);
  const y1 = $(y - (h = h / 2));
  const y2 = $(y + h);

  return bm0.outOfBounds(x1, y1, x2, y2) || bm0.getRange(x1, y1, x2, y2) || (bm1 && bm1.getRange(x1, y1, x2, y2));
}
