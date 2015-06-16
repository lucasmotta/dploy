'use strict';


const isError = require('lodash.iserror');
const chalk = require('chalk');
const logger = require('../logger');


module.exports = function(error) {

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
