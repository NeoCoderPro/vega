import * as transforms from '../transforms/index';
import {isObject, isString} from 'vega-util';
import {parse, context} from 'vega-runtime';
import {rgb, lab, hcl, hsl} from 'd3-color';

function scale(name, ctx) {
  var s = isString(name) ? ctx.scales[name]
    : isObject(name) && name.signal ? ctx.signals[name.signal]
    : undefined;
  return s && s.value;
}

function functions(fn, ctx) {
  fn.rgb = rgb;
  fn.lab = lab;
  fn.hcl = hcl;
  fn.hsl = hsl;

  fn.scale = function(name, value) {
    var s = scale(name, ctx);
    return s ? s(value) : undefined;
  };

  fn.scaleInvert = function(name, value) {
    var s = scale(name, ctx);
    // TODO: handle varied scale inversion methods
    return s ? s.invert(value) : undefined;
  };

  fn.scaleCopy = function(name) {
    var s = scale(name, ctx);
    return s ? s.copy() : undefined;
  };

  fn.indata = function(name, field, value) {
    var index = ctx.data['index:' + field];
    return index ? !!index.value.get(value) : undefined;
  };

  return ctx;
}

export default function(view, spec) {
  var fn = {},
      ctx = context(view, transforms, fn);
  return parse(spec, functions(fn, ctx));
}
