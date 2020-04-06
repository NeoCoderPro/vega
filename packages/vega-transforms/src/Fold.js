import {derive, Transform} from 'vega-dataflow';
import {inherits, accessorName} from 'vega-util';

/**
 * Folds one more tuple fields into multiple tuples in which the field
 * name and values are available under new 'key' and 'value' fields.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object): *} params.fields - An array of field accessors
 *   for the tuple fields that should be folded.
 * @param {Array<string>} [params.as] - Output field names for folded key
 *   and value fields, defaults to ['key', 'value'].
 */
export default function Fold(params) {
  Transform.call(this, [], params);
}

Fold.Definition = {
  type: 'Fold',
  metadata: {generates: true},
  params: [
    {name: 'fields', type: 'field', array: true, required: true},
    {name: 'as', type: 'string', array: true, length: 2, default: ['key', 'value']}
  ]
};

const prototype = inherits(Fold, Transform);

prototype.transform = function (_, pulse) {
  const out = pulse.fork(pulse.NO_SOURCE);
  const fields = _.fields;
  const fnames = fields.map(accessorName);
  const as = _.as || ['key', 'value'];
  const k = as[0];
  const v = as[1];
  const n = fields.length;

  out.rem = this.value;

  pulse.visit(pulse.SOURCE, function (t) {
    for (let i = 0, d; i < n; ++i) {
      d = derive(t);
      d[k] = fnames[i];
      d[v] = fields[i](t);
      out.add.push(d);
    }
  });

  this.value = out.source = out.add;
  return out.modifies(as);
};
