import { Spec } from 'vega';

export const spec: Spec = {
  $schema: 'https://vega.github.io/schema/vega/v5.json',
  height: 200,
  padding: 10,

  signals: [
    {
      name: 'width',
      update: "span(range('xscale'))",
    },
    {
      name: 'cursor',
      value: 'default',
      on: [
        {
          events: { marktype: 'rect', type: 'mousedown' },
          update: { value: 'default' },
        },
        {
          events: { marktype: 'rect', type: 'mouseover' },
          update: { value: 'ew-resize' },
        },
        {
          events: { marktype: 'rect', type: 'mouseout' },
          update: { value: 'default' },
        },
      ],
    },
  ],

  data: [
    {
      name: 'values',
      values: [
        { x: 0, y: 28 },
        { x: 1, y: 43 },
        { x: 2, y: 99 },
        { x: 3, y: 56 },
        { x: 4, y: 38 },
        { x: 5, y: 83 },
        { x: 6, y: 69 },
        { x: 7, y: 24 },
      ],
    },
  ],

  scales: [
    {
      name: 'xscale',
      type: 'band',
      range: { step: 40 },
      domain: { data: 'values', field: 'x' },
    },
    {
      name: 'yscale',
      type: 'linear',
      range: [{ signal: 'height' }, 0],
      domain: { data: 'values', field: 'y' },
      zero: true,
      nice: true,
    },
    {
      name: 'shapeScale',
      type: 'ordinal',
      domain: ['a', 'b', 'c', 'd', 'e', 'f'],
      range: ['circle', 'square', 'cross', 'diamond', 'triangle-up', 'triangle-down'],
    },
    {
      name: 'colorScale',
      type: 'ordinal',
      domain: ['a', 'b', 'c', 'd', 'e', 'f'],
      range: 'category',
    },
    {
      name: 'innerScale',
      type: 'ordinal',
      domain: ['alpha', 'beta'],
      range: ['circle', 'square'],
    },
  ],

  axes: [
    {
      scale: 'yscale',
      orient: 'left',
      tickCount: 5,
      grid: false,
      domain: true,
      title: 'Left Title',
    },
    {
      scale: 'yscale',
      orient: 'right',
      tickCount: 5,
      grid: true,
      domain: true,
      title: 'Right Title',
    },
    {
      scale: 'xscale',
      orient: 'top',
      grid: false,
      domain: true,
      title: 'Top Title',
    },
    {
      scale: 'xscale',
      orient: 'bottom',
      grid: true,
      domain: true,
      title: 'Bottom Title',
    },
  ],

  legends: [
    {
      shape: 'shapeScale',
      stroke: 'colorScale',
      title: 'Legend Right 1',
    },
    {
      shape: 'shapeScale',
      orient: 'left',
      title: 'Legend Left 1',
    },
    {
      shape: 'innerScale',
      orient: 'top-left',
      offset: 5,
      padding: 4,
      encode: {
        legend: {
          enter: {
            fill: { value: '#fff' },
            fillOpacity: { value: 0.5 },
            stroke: { value: '#888' },
            cornerRadius: { value: 4 },
          },
        },
      },
    },
    {
      shape: 'innerScale',
      orient: 'top-right',
      offset: 5,
      padding: 4,
      encode: {
        legend: {
          enter: {
            fill: { value: '#fff' },
            fillOpacity: { value: 0.5 },
            stroke: { value: '#888' },
            cornerRadius: { value: 4 },
          },
        },
      },
    },
    {
      shape: 'innerScale',
      orient: 'bottom-left',
      offset: 6,
      padding: 4,
      encode: {
        legend: {
          enter: {
            fill: { value: '#fff' },
            fillOpacity: { value: 0.5 },
            stroke: { value: '#888' },
            cornerRadius: { value: 4 },
          },
        },
      },
    },
    {
      shape: 'innerScale',
      orient: 'bottom-right',
      offset: 6,
      padding: 4,
      encode: {
        legend: {
          interactive: true,
          enter: {
            cursor: { value: 'crosshair' },
            fill: { value: '#fff' },
            fillOpacity: { value: 0.5 },
            stroke: { value: '#888' },
            cornerRadius: { value: 4 },
          },
          update: {
            stroke: { value: '#888' },
          },
          hover: {
            stroke: { value: '#f8f' },
          },
        },
      },
    },
  ],

  marks: [
    {
      type: 'rect',
      from: { data: 'values' },
      encode: {
        enter: {
          x: { scale: 'xscale', field: 'x' },
          width: { scale: 'xscale', band: 1, offset: -1 },
          y: { scale: 'yscale', field: 'y' },
          y2: { scale: 'yscale', value: 0 },
          fill: { value: 'steelblue' },
          fillOpacity: { value: 0.5 },
          stroke: {
            color: {
              l: { value: 50 },
              a: { value: 100 },
              b: { value: -20 },
            },
          },
          cursor: { value: 'pointer' },
        },
        update: {
          strokeWidth: { value: 0 },
          zindex: { value: 0 },
        },
        hover: {
          strokeWidth: { value: 5 },
          zindex: { value: 1 },
        },
      },
    },
  ],
};
