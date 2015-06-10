'use strict';

const Promise = require('bluebird');

function filterEmpty(value) {

  return value.trim() !== '';

}

module.exports = function(res) {

  return new Promise(function(resolve) {

    let m;
    const regex = /([A-Z])\s+(.+)(\n|$)/g;
    const uploads = [];
    const deletes = [];

    while (m = regex.exec(res)) {

      switch (m[1].toLowerCase()) {
        case 'd' :
        deletes.push(m[2]);
          break;
        default :
        uploads.push(m[2]);
      }

    }

    resolve({
      upload: uploads.filter(filterEmpty),
      delete: deletes.filter(filterEmpty)
    });

  });

};
