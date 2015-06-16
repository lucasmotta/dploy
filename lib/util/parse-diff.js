'use strict';

import Promise from 'bluebird';


function filterEmpty(value) {

  return value.trim() !== '';

}

export default function(res) {

  return new Promise((resolve) => {

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
