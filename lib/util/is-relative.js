'use strict';

import path from 'path';


export default function(a, b) {

  const res = path.relative(a, b);
  return res.indexOf('..') === 0 || a === b;

}
