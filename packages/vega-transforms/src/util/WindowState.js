import {createMeasure, compileMeasures, measureName} from './AggregateOps';
import TupleStore from './TupleStore';
import {WindowOp, WindowOps} from './WindowOps';
import {accessorFields, accessorName, array, error, hasOwnProperty} from 'vega-util';

export default function WindowState(_) {
  const self = this;
  const ops = array(_.ops);
  const fields = array(_.fields);
  const params = array(_.params);
  const as = array(_.as);
  const outputs = (self.outputs = []);
  const windows = (self.windows = []);
  const inputs = {};
  const map = {};
  let countOnly = true;
  const counts = [];
  const measures = [];

  function visitInputs(f) {
    array(accessorFields(f)).forEach(_ => (inputs[_] = 1));
  }
  visitInputs(_.sort);

  ops.forEach(function (op, i) {
    const field = fields[i];
    const mname = accessorName(field);
    const name = measureName(op, mname, as[i]);

    visitInputs(field);
    outputs.push(name);

    // Window operation
    if (hasOwnProperty(WindowOps, op)) {
      windows.push(WindowOp(op, fields[i], params[i], name));
    }

    // Aggregate operation
    else {
      if (field == null && op !== 'count') {
        error('Null aggregate field specified.');
      }
      if (op === 'count') {
        counts.push(name);
        return;
      }

      countOnly = false;
      let m = map[mname];
      if (!m) {
        m = map[mname] = [];
        m.field = field;
        measures.push(m);
      }
      m.push(createMeasure(op, name));
    }
  });

  if (counts.length || measures.length) {
    self.cell = cell(measures, counts, countOnly);
  }

  self.inputs = Object.keys(inputs);
}

const prototype = WindowState.prototype;

prototype.init = function () {
  this.windows.forEach(_ => _.init());
  if (this.cell) this.cell.init();
};

prototype.update = function (w, t) {
  const self = this;
  const cell = self.cell;
  const wind = self.windows;
  const data = w.data;
  const m = wind && wind.length;
  let j;

  if (cell) {
    for (j = w.p0; j < w.i0; ++j) cell.rem(data[j]);
    for (j = w.p1; j < w.i1; ++j) cell.add(data[j]);
    cell.set(t);
  }
  for (j = 0; j < m; ++j) wind[j].update(w, t);
};

function cell(measures, counts, countOnly) {
  let n;
  let a;
  let store;
  measures = measures.map(m => compileMeasures(m, m.field));

  const cell = {
    num: 0,
    agg: null,
    store: false,
    count: counts
  };

  if (!countOnly) {
    n = measures.length;
    a = cell.agg = Array(n);
    let i = 0;
    for (; i < n; ++i) a[i] = new measures[i](cell);
  }

  if (cell.store) {
    store = cell.data = new TupleStore();
  }

  cell.add = function (t) {
    cell.num += 1;
    if (countOnly) return;
    if (store) store.add(t);
    for (let i = 0; i < n; ++i) {
      a[i].add(a[i].get(t), t);
    }
  };

  cell.rem = function (t) {
    cell.num -= 1;
    if (countOnly) return;
    if (store) store.rem(t);
    for (let i = 0; i < n; ++i) {
      a[i].rem(a[i].get(t), t);
    }
  };

  cell.set = function (t) {
    let i;
    let n;

    // consolidate stored values
    if (store) store.values();

    // update tuple properties
    for (i = 0, n = counts.length; i < n; ++i) t[counts[i]] = cell.num;
    if (!countOnly) for (i = 0, n = a.length; i < n; ++i) a[i].set(t);
  };

  cell.init = function () {
    cell.num = 0;
    if (store) store.reset();
    for (let i = 0; i < n; ++i) a[i].init();
  };

  return cell;
}
