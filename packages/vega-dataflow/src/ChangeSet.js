import {ingest, tupleid} from './Tuple.js';
import {array, constant, isFunction} from 'vega-util';

export function isChangeSet(v) {
  return v && v.constructor === changeset;
}

export default function changeset() {
  const add = [],  // insert tuples
        rem = [],  // remove tuples
        mod = [],  // modify tuples
        remp = [], // remove by predicate
        modp = []; // modify by predicate
  let clean = null,
      reflow = false;

  return {
    constructor: changeset,
    insert(t) {
      const d = array(t), n = d.length;
      for (let i = 0; i < n; ++i) add.push(d[i]);
      return this;
    },
    remove(t) {
      const a = isFunction(t) ? remp : rem,
            d = array(t),
            n = d.length;
      for (let i = 0; i < n; ++i) a.push(d[i]);
      return this;
    },
    modify(t, field, value) {
      const m = {field: field, value: constant(value)};
      if (isFunction(t)) {
        m.filter = t;
        modp.push(m);
      } else {
        m.tuple = t;
        mod.push(m);
      }
      return this;
    },
    encode(t, set) {
      if (isFunction(t)) modp.push({filter: t, field: set});
      else mod.push({tuple: t, field: set});
      return this;
    },
    clean(value) {
      clean = value;
      return this;
    },
    reflow() {
      reflow = true;
      return this;
    },
    pulse(pulse, tuples) {
      const cur = {}, out = {};
      let i, n, m, f, t, id;

      // build lookup table of current tuples
      for (i = 0, n = tuples.length; i < n; ++i) {
        cur[tupleid(tuples[i])] = 1;
      }

      // process individual tuples to remove
      for (i = 0, n = rem.length; i < n; ++i) {
        t = rem[i];
        cur[tupleid(t)] = -1;
      }

      // process predicate-based removals
      for (i = 0, n = remp.length; i < n; ++i) {
        f = remp[i];
        tuples.forEach(t => {
          if (f(t)) cur[tupleid(t)] = -1;
        });
      }

      // process all add tuples
      for (i = 0, n = add.length; i < n; ++i) {
        t = add[i];
        id = tupleid(t);
        if (cur[id]) {
          // tuple already resides in dataset
          // if flagged for both add and remove, cancel
          cur[id] = 1;
        } else {
          // tuple does not reside in dataset, add
          pulse.add.push(ingest(add[i]));
        }
      }

      // populate pulse rem list
      for (i = 0, n = tuples.length; i < n; ++i) {
        t = tuples[i];
        if (cur[tupleid(t)] < 0) pulse.rem.push(t);
      }

      // modify helper method
      function modify(t, f, v) {
        if (v) {
          t[f] = v(t);
        } else {
          pulse.encode = f;
        }
        if (!reflow) out[tupleid(t)] = t;
      }

      // process individual tuples to modify
      for (i = 0, n = mod.length; i < n; ++i) {
        m = mod[i];
        t = m.tuple;
        f = m.field;
        id = cur[tupleid(t)];
        if (id > 0) {
          modify(t, f, m.value);
          pulse.modifies(f);
        }
      }

      // process predicate-based modifications
      for (i = 0, n = modp.length; i < n; ++i) {
        m = modp[i];
        f = m.filter;
        tuples.forEach(t => {
          if (f(t) && cur[tupleid(t)] > 0) {
            modify(t, m.field, m.value);
          }
        });
        pulse.modifies(m.field);
      }

      // upon reflow request, populate mod with all non-removed tuples
      // otherwise, populate mod with modified tuples only
      if (reflow) {
        pulse.mod = rem.length || remp.length
          ? tuples.filter(t => cur[tupleid(t)] > 0)
          : tuples.slice();
      } else {
        for (id in out) pulse.mod.push(out[id]);
      }

      // set pulse garbage collection request
      if (clean || clean == null && (rem.length || remp.length)) {
        pulse.clean(true);
      }

      return pulse;
    }
  };
}
