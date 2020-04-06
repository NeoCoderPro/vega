import {Transform} from 'vega-dataflow';
import {bin} from 'vega-statistics';
import {inherits, accessor, accessorFields, accessorName} from 'vega-util';

// epsilon bias to offset floating point error (#1737)
const EPSILON = 1e-14;

/**
 * Generates a binning function for discretizing data.
 * @constructor
 * @param {object} params - The parameters for this operator. The
 *   provided values should be valid options for the {@link bin} function.
 * @param {function(object): *} params.field - The data field to bin.
 */
export default function Bin(params) {
  Transform.call(this, null, params);
}

Bin.Definition = {
  type: 'Bin',
  metadata: {modifies: true},
  params: [
    {name: 'field', type: 'field', required: true},
    {name: 'interval', type: 'boolean', default: true},
    {name: 'anchor', type: 'number'},
    {name: 'maxbins', type: 'number', default: 20},
    {name: 'base', type: 'number', default: 10},
    {name: 'divide', type: 'number', array: true, default: [5, 2]},
    {name: 'extent', type: 'number', array: true, length: 2, required: true},
    {name: 'span', type: 'number'},
    {name: 'step', type: 'number'},
    {name: 'steps', type: 'number', array: true},
    {name: 'minstep', type: 'number', default: 0},
    {name: 'nice', type: 'boolean', default: true},
    {name: 'name', type: 'string'},
    {name: 'as', type: 'string', array: true, length: 2, default: ['bin0', 'bin1']}
  ]
};

const prototype = inherits(Bin, Transform);

prototype.transform = function (_, pulse) {
  const band = _.interval !== false;
  const bins = this._bins(_);
  const start = bins.start;
  const step = bins.step;
  const as = _.as || ['bin0', 'bin1'];
  const b0 = as[0];
  const b1 = as[1];
  let flag;

  if (_.modified()) {
    pulse = pulse.reflow(true);
    flag = pulse.SOURCE;
  } else {
    flag = pulse.modified(accessorFields(_.field)) ? pulse.ADD_MOD : pulse.ADD;
  }

  pulse.visit(
    flag,
    band
      ? function (t) {
          const v = bins(t);
          // minimum bin value (inclusive)
          t[b0] = v;
          // maximum bin value (exclusive)
          // use convoluted math for better floating point agreement
          // see https://github.com/vega/vega/issues/830
          // infinite values propagate through this formula! #2227
          t[b1] = v == null ? null : start + step * (1 + (v - start) / step);
        }
      : function (t) {
          t[b0] = bins(t);
        }
  );

  return pulse.modifies(band ? as : b0);
};

prototype._bins = function (_) {
  if (this.value && !_.modified()) {
    return this.value;
  }

  const field = _.field;
  const bins = bin(_);
  const step = bins.step;
  let start = bins.start;
  let stop = start + Math.ceil((bins.stop - start) / step) * step;
  let a;
  let d;

  if ((a = _.anchor) != null) {
    d = a - (start + step * Math.floor((a - start) / step));
    start += d;
    stop += d;
  }

  const f = function (t) {
    let v = field(t);
    return v == null
      ? null
      : v < start
      ? -Infinity
      : v > stop
      ? +Infinity
      : ((v = Math.max(start, Math.min(+v, stop - step))), start + step * Math.floor(EPSILON + (v - start) / step));
  };

  f.start = start;
  f.stop = bins.stop;
  f.step = step;

  return (this.value = accessor(f, accessorFields(field), _.name || 'bin_' + accessorName(field)));
};
