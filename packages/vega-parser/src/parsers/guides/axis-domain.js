import {Bottom, Top, one, zero} from './constants';
import guideMark from './guide-mark';
import {lookup} from './guide-util';
import {addEncoders} from '../encode/util';
import {RuleMark} from '../marks/marktypes';
import {AxisDomainRole} from '../marks/roles';

export default function(spec, config, userEncode, dataRef) {
  var _ = lookup(spec, config),
      orient = spec.orient,
      encode, enter, update, u, u2, v;

  encode = {
    enter: enter = {opacity: zero},
    update: update = {opacity: one},
    exit: {opacity: zero}
  };

  addEncoders(encode, {
    stroke:           _('domainColor'),
    strokeCap:        _('domainCap'),
    strokeDash:       _('domainDash'),
    strokeDashOffset: _('domainDashOffset'),
    strokeWidth:      _('domainWidth'),
    strokeOpacity:    _('domainOpacity')
  });

  if (orient === Top || orient === Bottom) {
    u = 'x';
    v = 'y';
  } else {
    u = 'y';
    v = 'x';
  }
  u2 = u + '2';

  enter[v] = zero;
  update[u] = enter[u] = position(spec, 0);
  update[u2] = enter[u2] = position(spec, 1);

  return guideMark({
    type: RuleMark,
    role: AxisDomainRole,
    from: dataRef,
    encode
  }, userEncode);
}

function position(spec, pos) {
  return {scale: spec.scale, range: pos};
}
