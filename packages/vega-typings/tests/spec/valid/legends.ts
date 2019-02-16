import { Spec } from 'vega';

// https://vega.github.io/editor/#/examples/vega/bar-chart
export const spec: Spec = {
  "$schema": "https://vega.github.io/schema/vega/v4.json",
  "width": 0,
  "height": 0,
  "padding": 5,

  "config": {
    "legend": {
      "gradientDirection": "horizontal",
      "gradientLength": 100
    }
  },

  "scales": [
    {
      "name": "sequence",
      "type": "linear",
      "range": {"scheme": "viridis"},
      "domain": [0, 100]
    },
    {
      "name": "stops",
      "type": "linear",
      "range": ["#f00", "#a44", "#666", "#4a4", "#0f0"],
      "domain": [-100, -35, 0, 35, 100]
    }
  ],

  "legends": [
    {
      "type": "gradient",
      "fill": "sequence",
      "orient": "left",
      "title": "Gradient",
      "offset": 0
    },
    {
      "type": "gradient",
      "stroke": "stops",
      "orient": "left",
      "title": "Multi-Stop",
      "offset": 0
    },
    {
      "type": "symbol",
      "stroke": "sequence",
      "orient": "right",
      "title": "Sequence",
      "encode": {
        "symbols": {
          "interactive": true,
          "update": {"fill": {"value": "transparent"}},
          "hover": {"fill": {"value": "#ccc"}}
        },
        "labels": {
          "interactive": true,
          "update": {"fill": {"value": "#000"}, "fontWeight": {"value": null}},
          "hover": {"fill": {"value": "firebrick"}, "fontWeight": {"value": "bold"}}
        }
      }
    },
    {
      "type": "symbol",
      "fill": "stops",
      "orient": "right",
      "title": "Stops",
      "values": [-100, -35, 0, 35, 100]
    }
  ]
};
