var tape = require('tape'),
    parse = require('../');

tape('Parser parses Vega specs', function(test) {
  var spec = {
    "signals": [
      {"name": "width", "init": 500},
      {"name": "height", "init": 300},
      {"name": "xfield", "init": "x"}
    ],
    "data": [
      {
        "name": "table",
        "values": [
          {"x": 1,  "y": 28}, {"x": 2,  "y": 43},
          {"x": 3,  "y": 81}, {"x": 4,  "y": 19}
        ]
      }
    ],
    "scales": [
      {
        "name": "xscale",
        "type": "band",
        "range": [0, {"signal": "width"}],
        "domain": {"data": "table", "field": {"signal": "xfield"}}
      },
      {
        "name": "yscale",
        "type": "linear",
        "range": [{"signal": "height"}, 0],
        "domain": {"data": "table", "field": "y"}
      }
    ]
  };

  var dfs = parse.vega(spec);

  test.equal(dfs.length, 11);
  test.deepEqual(dfs.map(function(o) { return o.type; }),
    ['Operator', 'Operator', 'Operator', 'Collect', 'Field',
     'Aggregate', 'Collect', 'Values', 'Scale', 'Extent', 'Scale']);

  test.end();
});

tape('Parser parses Vega specs with multi-domain scales', function(test) {
  var spec = {
    "data": [
      {
        "name": "table",
        "values": [
          {"x": 1,  "y": 6}, {"x": 2,  "y": 7},
          {"x": 3,  "y": 8}, {"x": 4,  "y": 5}
        ]
      }
    ],
    "scales": [
      {
        "name": "ofield",
        "type": "band",
        "range": [0, 1],
        "domain": {"data": "table", "field": ["x", "y"]}
      },
      {
        "name": "odomain",
        "type": "band",
        "range": [0, 1],
        "domain": [
          {"data": "table", "field": "x"},
          {"data": "table", "field": "y"}
        ]
      }
/* Multi-domain not yet supported for quantitative scales
      {
        "name": "qfield",
        "type": "linear",
        "range": [0, 1],
        "domain": {"data": "table", "field": ["x", "y"]}
      },
      {
        "name": "qdomain",
        "type": "linear",
        "range": [0, 1],
        "domain": [
          {"data": "table", "field": "x"},
          {"data": "table", "field": "y"}
        ]
      }
*/
    ]
  };

  var dfs = parse.vega(spec);

  test.equal(dfs.length, 13);
  test.deepEqual(dfs.map(function(o) { return o.type; }),
    ['Collect', 'Aggregate', 'Collect', 'Aggregate', 'Collect',
     'Aggregate', 'Collect', 'Values', 'Scale',
     'Aggregate', 'Collect', 'Values', 'Scale']);

  test.end();
});
