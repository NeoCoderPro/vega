import { Spec } from 'vega';

export const spec: Spec = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  width: 960,
  height: 500,
  autosize: 'none',

  data: [
    {
      name: 'unemp',
      url: 'data/unemployment.tsv',
      format: { type: 'tsv', parse: 'auto' }
    },
    {
      name: 'counties',
      url: 'data/us-10m.json',
      format: { type: 'topojson', feature: 'counties' },
      transform: [
        { type: 'lookup', from: 'unemp', key: 'id', fields: ['id'], values: ['rate'] },
        { type: 'filter', expr: 'datum.rate != null' }
      ]
    }
  ],

  projections: [
    {
      name: 'projection',
      type: 'albersUsa'
    }
  ],

  scales: [
    {
      name: 'color',
      type: 'quantize',
      domain: [0, 0.15],
      range: { scheme: 'blues', count: 9 }
    }
  ],

  legends: [
    {
      fill: 'color',
      orient: 'bottom-right',
      title: 'Unemployment',
      format: '0.1%'
    }
  ],

  marks: [
    {
      type: 'shape',
      from: { data: 'counties' },
      encode: {
        enter: { tooltip: { signal: "format(datum.rate, '0.1%')" } },
        update: { fill: { scale: 'color', field: 'rate' } },
        hover: { fill: { value: 'red' } }
      },
      transform: [{ type: 'geoshape', projection: 'projection' }]
    }
  ]
};
