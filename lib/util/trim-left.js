'use strict';


export default function(value, trim = '\s') {

  const reg = new RegExp(`^${trim}`);
  return value.replace(reg, '');

}
