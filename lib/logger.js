'use strict';


const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const chalk = require('chalk');
const strftime = require('strftime');


let logfile = '';
let hasError = false;


function logger() {

  const time = strftime('%H:%M:%S');
  const args = Array.prototype.slice.call(arguments);
  logfile += `[${time}] log: ${args.join(' ')}\n`;

  if (logger.level > 0) {

    console.log.apply(undefined, args);

  }

}

logger.spaced = function(spaces) {

  const time = strftime('%H:%M:%S');
  const args = Array.prototype.slice.call(arguments);
  logfile += `[${time}] log: ${args.slice(1, args.length).join(' ')}\n`;

  if (logger.level > 0) {

    args.splice(0, 1, ' '.repeat(spaces));
    console.log.apply(undefined, args);

  }

};

logger.debug = function() {

  const time = strftime('%H:%M:%S');
  const args = Array.prototype.slice.call(arguments);
  logfile += `[${time}] debug: ${args.join(' ')}\n`;

  if (logger.level > 1) {

    args.unshift(chalk.white(`[${time}] debug:`));
    console.log.apply(undefined, args);

  }

};

logger.error = function() {

  const time = strftime('%H:%M:%S');
  const args = Array.prototype.slice.call(arguments);
  logfile += `[${time}] error: ${args.join(' ')}\n`;

  hasError = true;

  if (logger.level > 1) {

    args.unshift(chalk.red(`[${time}] error:`));
    console.log.apply(undefined, args);

  }

};

logger.deprecated = function() {

  const time = strftime('%H:%M:%S');
  const args = Array.prototype.slice.call(arguments);
  logfile += `[${time}] deprecated: ${args.join(' ')}\n`;

  args.unshift(chalk.red(`[${time}] deprecated:`));
  console.log.apply(undefined, args);

};

logger.isDebug = function() {

  return logger.level === 2;

};

logger.writeLog = function() {

  const dest = path.join(process.cwd(), 'dploy.log');

  return fs.accessAsync(dest).then(function() {

    return fs.unlinkAsync(dest);

  }).catch(function() {

    // file was not found?
    // TODO treat this error properly

  }).finally(function() {

    if (hasError) {

      return fs.writeFileAsync(dest, chalk.stripColor(logfile));

    }

    return true;

  });

};


logger.level = 1;

module.exports = logger;
