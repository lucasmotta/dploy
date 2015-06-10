'use strict';

const spawn = require('child_process').spawn;
const Promise = require('bluebird');


module.exports = function() {

  const args = Array.prototype.slice.call(arguments);
  const cmd = args[0];

  return new Promise(function(resolve, reject) {

    let data = '';
    const run = spawn(cmd, args.slice(1));

    run.on('close', function() {

      resolve(data.toString().replace(/(^\s*\n)|(\s*\n$)/g, ''));

    });

    run.on('error', function(err) {

      reject(err.toString());

    });

    run.stdout.on('data', function(buffer) {

      data += buffer;

    });

    run.stderr.on('data', function(buffer) {

      reject(buffer.toString());

    });

  });

};
