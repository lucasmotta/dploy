'use strict';

import isError from 'lodash.iserror';
import chalk from 'chalk';
import logger from '../logger';


export default function(error) {

  if (isError(error)) {

    logger.error(error.toString());

  } else if (error.hasOwnProperty('reason')) {

    logger.spaced(1, chalk.blue(error.reason));

  } else {

    try {

      logger.error(JSON.stringify(error));

    } catch (err) {

      logger.error('Unknown error');

    }

  }

};
