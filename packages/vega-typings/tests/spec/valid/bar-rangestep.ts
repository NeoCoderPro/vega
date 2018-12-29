import { Spec } from 'vega';

// https://vega.github.io/editor/#/examples/vega/bar-chart
const spec: Spec = {
  "$schema": "https://vega.github.io/schema/vega/v4.json",
  "height": 200,
  "padding": 5,

  "signals": [
    {
      "name": "step", "value": 20,
      "bind": {"input": "range", "min": 0, "max": 40, "step": 1}
    },
    {
      "name": "inner", "value": 0.1,
      "bind": {"input": "range", "min": 0, "max": 1}
    },
    {
      "name": "outer", "value": 0.1,
      "bind": {"input": "range", "min": 0, "max": 1}
    },
    {
      "name": "count", "value": 10,
      "bind": {"input": "range", "min": 0, "max": 20, "step": 1}
    },
    {
      "name": "round", "value": false,
      "bind": {"input": "checkbox"}
    },
    {
      "name": "width",
      "update": "ceil(step * bandspace(count, inner, outer))"
    }
  ],

  "data": [
    {
      "name": "table",
      "values": [
        {"u": 1,  "v": 91}, {"u": 2,  "v": 55},
        {"u": 3,  "v": 43}, {"u": 4,  "v": 28},
        {"u": 5,  "v": 81}, {"u": 6,  "v": 53},
        {"u": 7,  "v": 19}, {"u": 8,  "v": 87},
        {"u": 9,  "v": 52}, {"u": 10, "v": 48},
        {"u": 11, "v": 24}, {"u": 12, "v": 49},
        {"u": 13, "v": 87}, {"u": 14, "v": 66},
        {"u": 15, "v": 17}, {"u": 16, "v": 27},
        {"u": 17, "v": 68}, {"u": 18, "v": 16},
        {"u": 19, "v": 49}, {"u": 20, "v": 15}
      ],
      "transform": [
        { "type": "filter", "expr": "datum.u <= count" }
      ]
    }
  ],

  "scales": [
    {
      "name": "xscale",
      "type": "band",
      "range": {"step": {"signal": "step"}},
      "paddingInner": {"signal": "inner"},
      "paddingOuter": {"signal": "outer"},
      "round": {"signal": "round"},
      "domain": {"data": "table", "field": "u"}
    },
    {
      "name": "yscale",
      "type": "linear",
      "range": "height",
      "domain": [0, 100],
      "zero": true,
      "nice": true
    }
  ],

  "axes": [
    {"orient": "bottom", "scale": "xscale", "offset": 4},
    {"orient": "left", "scale": "yscale", "offset": 4}
  ],

  "marks": [
    {
      "type": "rect",
      "from": {"data": "table"},
      "encode": {
        "enter": {
          "y": {"scale": "yscale", "field": "v"},
          "y2": {"scale": "yscale", "value": 0},
          "fill": {"value": "steelblue"}
        },
        "update": {
          "x": {"scale": "xscale", "field": "u"},
          "width": {"scale": "xscale", "band": 1}
        }
      }
    }
  ]
};
