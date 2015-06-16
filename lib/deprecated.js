'use strict';

import chalk from 'chalk';
import logger from './logger';
import Promise from 'bluebird';


export default function(settings) {

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
