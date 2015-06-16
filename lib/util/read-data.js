'use strict';

import Promise from 'bluebird';


export default function(res) {

  return new Promise((resolve, reject) => {

    if (typeof res === 'string') {

      resolve(res);

    } else {

      let data = '';

      res.on('data', (chunk) => data += chunk.toString());

      res.on('end', () => resolve(data));

      res.on('error', (err) => reject('err'));

    }

  });

};
