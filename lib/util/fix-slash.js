'use strict';

import path from 'path';


export default function(file) {

  return path.normalize(file).replace(/\\+/g, '/');

}
