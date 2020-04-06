const tape = require('tape');
const util = require('vega-util');
const vega = require('vega-dataflow');
const xf = require('../');
const changeset = vega.changeset;
const Collect = require('vega-transforms').collect;
const CrossFilter = xf.crossfilter;
const ResolveFilter = xf.resolvefilter;

tape('Crossfilter filters tuples', function (t) {
  const data = [
    {a: 1, b: 1, c: 0},
    {a: 2, b: 2, c: 1},
    {a: 4, b: 4, c: 2},
    {a: 3, b: 3, c: 3}
  ];

  const a = util.field('a');
  const b = util.field('b');
  const df = new vega.Dataflow();
  const r1 = df.add([0, 5]);
  const r2 = df.add([0, 5]);
  const c0 = df.add(Collect);
  const cf = df.add(CrossFilter, {fields: [a, b], query: [r1, r2], pulse: c0});
  const f1 = df.add(ResolveFilter, {ignore: 2, filter: cf, pulse: cf});
  const o1 = df.add(Collect, {pulse: f1});
  const f2 = df.add(ResolveFilter, {ignore: 1, filter: cf, pulse: cf});
  const o2 = df.add(Collect, {pulse: f2});
  const fn = df.add(ResolveFilter, {ignore: 0, filter: cf, pulse: cf});
  const on = df.add(Collect, {pulse: fn});

  // -- add data
  df.pulse(c0, changeset().insert(data)).run();
  t.equal(o1.value.length, 4);
  t.equal(o2.value.length, 4);
  t.equal(on.value.length, 4);

  // -- update single query
  df.update(r2, [1, 2]).run();
  t.equal(o1.value.length, 4);
  t.equal(o2.value.length, 2);
  t.equal(on.value.length, 2);

  // -- update multiple queries
  df.update(r1, [1, 3]).update(r2, [3, 4]).run();
  t.equal(o1.value.length, 3);
  t.equal(o2.value.length, 2);
  t.equal(on.value.length, 1);

  // -- remove data
  df.pulse(c0, changeset().remove(data.slice(0, 2))).run();
  t.equal(o1.value.length, 1);
  t.equal(o2.value.length, 2);
  t.equal(on.value.length, 1);

  // -- remove more data
  df.pulse(c0, changeset().remove(data.slice(-2))).run();
  t.equal(o1.value.length, 0);
  t.equal(o2.value.length, 0);
  t.equal(on.value.length, 0);

  // -- add data back
  df.pulse(c0, changeset().insert(data)).run();
  t.equal(o1.value.length, 3);
  t.equal(o2.value.length, 2);
  t.equal(on.value.length, 1);

  // -- modify non-indexed values
  df.pulse(c0, changeset().modify(data[0], 'c', 5).modify(data[3], 'c', 5)).run();
  t.equal(o1.value.length, 3);
  t.equal(o2.value.length, 2);
  t.equal(on.value.length, 1);
  t.equal(o1.pulse.materialize().mod.length, 2);
  t.equal(o2.pulse.materialize().mod.length, 1);
  t.equal(on.pulse.materialize().mod.length, 1);

  t.end();
});

tape('Crossfilter consolidates after remove', function (t) {
  const data = [
    {a: 1, b: 1, c: 0},
    {a: 2, b: 2, c: 1},
    {a: 4, b: 4, c: 2},
    {a: 3, b: 3, c: 3}
  ];

  const a = util.field('a');
  const b = util.field('b');
  const df = new vega.Dataflow();
  const r1 = df.add([0, 3]);
  const r2 = df.add([0, 3]);
  const c0 = df.add(Collect);
  const cf = df.add(CrossFilter, {fields: [a, b], query: [r1, r2], pulse: c0});

  // -- add data
  df.pulse(c0, changeset().insert(data)).run();

  // -- remove data
  df.pulse(c0, changeset().remove(data.slice(0, 2))).run();

  // crossfilter consolidates after removal
  // this happens *after* propagation completes

  // were dimensions appropriately remapped?
  cf._dims.map(function (dim) {
    t.equal(dim.size(), 2);

    const idx = dim.index();
    t.equal(idx[0], 1);
    t.equal(idx[1], 0);
  });

  // was the filter state appropriately updated?
  const d = cf.value.data();
  const curr = cf.value.curr();
  t.equal(cf.value.size(), 2);
  t.equal(d[0], data[2]);
  t.equal(d[1], data[3]);
  t.equal(curr[0], (1 << 2) - 1); // first filter should fail all
  t.equal(curr[1], 0); // second filter should pass all

  t.end();
});
