'use strict';


const fs = require('fs');


module.exports = function(file) {

  try {

    let res = fs.lstatSync(file).isFile();
    return res ? true : false;

  } catch(e) {

    return false;

  }

  return false;

};
