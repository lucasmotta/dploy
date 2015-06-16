'use strict';

import ProgressBar from 'progress';
import chalk from 'chalk';


export default function(length, isDebug) {

  // if we are debugging, don't return the actual progress bar
  // otherwise it will mess up with the console
  if (isDebug || length <= 1) {

    return {
      tick: () => {}
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
