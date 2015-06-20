'use strict';

import chalk from 'chalk';
import logger from './logger';
import Promise from 'bluebird';


export default function(settings) {

  let unused = ['branch', 'slots'];
  let map = [
    { old: 'check', new: 'confirm' }
  ];
  let opts = [
    'privateKey',
    'publicKey',
    'passphrase',
    'secure',
    'secureOptions'
  ];

  opts = opts.filter((key) => settings.hasOwnProperty(key)).map((key) => {

    settings.options[key] = settings[key];
    delete settings[key];
    return key;

  });

  unused = unused.filter((key) => settings.hasOwnProperty(key)).map((key) => {

    delete settings[key];
    return key;

  });

  map = map.filter((key) => settings.hasOwnProperty(key.old)).map((key) => {

    settings[key.new] = settings[key.old];
    delete settings[key.old];
    return `${key.old}=${key.new}`;

  });

  if (opts.length) {

    logger.deprecated(`the following options should be set inside the 'options' parameter: ${chalk.white(opts.join(', '))}`);

  }

  if (unused.length) {

    logger.deprecated(`the following options are not being used anymore: ${chalk.white(unused.join(', '))}`);

  }

  if (map.length) {

    logger.deprecated(`the following options have different names now: ${chalk.white(map.join(', '))}`);

  }

  return Promise.resolve(settings);

}
