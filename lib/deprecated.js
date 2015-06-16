'use strict';


const Promise = require('bluebird');
const logger = require('./logger');
const chalk = require('chalk');


module.exports = function(settings) {

  const keys = [
    'privateKey',
    'publicKey',
    'passphrase',
    'secure',
    'secureOptions'
  ];

  // get all deprecated options being used on your settings
  const used = keys.filter(function(key) {

    return settings.hasOwnProperty(key);

  });

  // add the deprecated options to the new `options` parameter
  // and delete the deprecated ones
  used.forEach(function(key) {

    settings.options[key] = settings[key];
    delete settings[key];

  });

  // display a message if there's deprecated options being used
  if (used.length) {

    logger.deprecated('the following options are deprecated:', chalk.white(used.join(', ')));

  }

  return Promise.resolve(settings);

};
