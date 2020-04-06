import { Spec } from 'vega';

export const spec: Spec = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  width: 850,
  height: 200,
  padding: 5,
  config: {
    signals: [{ name: 'baseFontSize', value: 14 }],
    title: {
      fontSize: { signal: 'baseFontSize + 2' },
    },
  },
  title: {
    text: "Font Size Steps and Weber's Law?",
    anchor: 'start',
    frame: 'group',
    orient: 'top',
    dy: 30,
  },
  data: [
    {
      name: 'sizes',
      values: [
        { size: 10 },
        { size: 11 },
        { size: 12 },
        { size: 14 },
        { size: 16 },
        { size: 18 },
        { size: 21 },
        { size: 24 },
        { size: 36 },
        { size: 48 },
        { size: 60 },
        { size: 72 },
      ],
    },
  ],
  scales: [
    {
      name: 'x',
      type: 'point',
      domain: { data: 'sizes', field: 'size' },
      range: 'width',
    },
    {
      name: 'y',
      domain: [10, 72],
      range: 'height',
      zero: false,
    },
    {
      name: 'logy',
      type: 'log',
      domain: [10, 72],
      range: 'height',
    },
    {
      name: 'dash',
      type: 'ordinal',
      domain: ['log', 'linear'],
      range: [[3, 3], []],
    },
  ],
  axes: [
    {
      orient: 'left',
      scale: 'y',
      offset: 5,
      values: [10, 20, 30, 40, 50, 60, 72],
      title: ['Font Size', '(Linear)'],
      titlePadding: 8,
    },
    {
      orient: 'right',
      scale: 'logy',
      offset: 5,
      title: ['Font Size', '(Log-Transformed)'],
      titlePadding: 8,
    },
    {
      orient: 'top',
      scale: 'x',
      offset: 5,
      labelFontSize: { field: 'value' },
      labelBaseline: 'alphabetic',
      labelPadding: 10,
    },
  ],
  legends: [
    {
      orient: 'bottom-right',
      offset: 5,
      strokeDash: 'dash',
      symbolStrokeColor: 'steelblue',
      symbolType: 'stroke',
      symbolSize: 250,
    },
  ],
  marks: [
    {
      type: 'line',
      from: { data: 'sizes' },
      encode: {
        update: {
          x: { scale: 'x', field: 'size' },
          y: { scale: 'y', field: 'size' },
          stroke: { value: 'steelblue' },
          strokeDash: { scale: 'dash', value: 'linear' },
          strokeWidth: { value: 2 },
        },
      },
    },
    {
      type: 'line',
      from: { data: 'sizes' },
      encode: {
        update: {
          x: { scale: 'x', field: 'size' },
          y: { scale: 'logy', field: 'size' },
          stroke: { value: 'steelblue' },
          strokeDash: { scale: 'dash', value: 'log' },
          strokeWidth: { value: 2 },
        },
      },
    },
  ],
};
