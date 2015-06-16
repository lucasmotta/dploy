'use strict';


const ProgressBar = require('progress');
const chalk = require('chalk');


module.exports = function(length, isDebug) {

  // if we are debugging, don't return the actual progress bar
  // otherwise it will mess up with the console
  if (isDebug || length <= 1) {

    return {
      tick: function() {

      }
    };

  }

  return new ProgressBar(`    :bar ${chalk.green(' → :file')}`, {
    total: length,
    width: 40,
    clear: true,
    complete: chalk.green('▓'),
    incomplete: chalk.grey('░')
  });

};
