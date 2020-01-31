import { Binding, Expr, OnEvent } from '.';

/**
 * @hide
 * // Hide from Vega-Lite schema (Since @hide isn't used by Vega, we can just add it here for now.)
 */
export interface SignalRef {
  signal: string;
}
export interface BaseSignal {
  name: string;
  description?: string;
  on?: OnEvent[];
}
export interface PushSignal extends BaseSignal {
  push: 'outer';
}
export interface NewSignal extends BaseSignal {
  value?: SignalValue;
  react?: boolean;
  update?: Expr;
  bind?: Binding;
}
export interface InitSignal extends BaseSignal {
  value?: SignalValue;
  init: Expr;
  bind?: Binding;
}
export type Signal = NewSignal | InitSignal | PushSignal;
export type SignalValue = any;
