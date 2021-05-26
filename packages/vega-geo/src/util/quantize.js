import {range, tickStep} from 'd3-array';
import {extent} from 'vega-util';

export default function(k, nice, zero) {
  return function(values) {
    var ex = extent(values);
    var start = zero ? Math.min(ex[0], 0) : ex[0];
    var stop = ex[1];
    var span = stop - start;
    var step = nice ? tickStep(start, stop, k) : (span / (k + 1));
    return range(start + step, stop, step);
  };
}
