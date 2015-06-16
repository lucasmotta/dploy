'use strict';

import fs from 'fs';


export default function(file) {

  try {

    let res = fs.lstatSync(file).isFile();
    return res ? true : false;

  } catch(e) {

    return false;

  }

  return false;

};
