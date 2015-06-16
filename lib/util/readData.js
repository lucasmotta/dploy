'use strict';


const Promise = require('bluebird');


module.exports = function(res) {

  return new Promise(function(resolve, reject) {

    if (typeof res === 'string') {

      resolve(res);

    } else {

      let data = '';

      res.on('data', function(chunk) {

        data += chunk.toString();

      });

      res.on('end', function() {

        resolve(data);

      });

      res.on('error', function(err) {

        reject(err);

      });

    }

  });

};
