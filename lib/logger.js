'use strict';

const chalk = require('chalk');
const strftime = require('strftime');

function logger() {

  if (logger.level > 0) {

    const args = Array.prototype.slice.call(arguments);
    console.log.apply(undefined, args);

  }

}

logger.spaced = function(spaces) {

  if (logger.level > 0) {

    const args = Array.prototype.slice.call(arguments);
    args.splice(0, 1, ' '.repeat(spaces));
    console.log.apply(undefined, args);

  }

};

logger.debug = function() {

  if (logger.level > 1) {

    const args = Array.prototype.slice.call(arguments);
    args.unshift(chalk.white(`[${strftime('%H:%M:%S')}] debug:`));
    console.log.apply(undefined, args);

  }

};

logger.error = function() {

  if (logger.level > 1) {

    const args = Array.prototype.slice.call(arguments);
    args.unshift(chalk.red(`[${strftime('%H:%M:%S')}] error:`));
    console.log.apply(undefined, args);

  }

};

logger.level = 2;
logger.chalk = chalk;

module.exports = logger;
