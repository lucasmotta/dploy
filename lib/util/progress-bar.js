'use strict';


const ProgressBar = require('progress');
const chalk = require('chalk');


module.exports = function(length) {

  return new ProgressBar(`    :bar ${chalk.green(' → :file')}`, {
    total: length,
    width: 40,
    clear: true,
    complete: chalk.green('▓'),
    incomplete: chalk.grey('░')
  });

};
