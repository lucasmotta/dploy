'use strict';

const files = require('map-files');
const merge = require('lodash.merge');
const yaml = require('yamljs');
const each = require('lodash.forEach');
const chalk = require('chalk');
const logger = require('../logger');

let file;
const DEFAULTS = {
  diff: 'git',
  scheme: 'ftp',
  port: null,
  revision: '.rev',
  check: true,
  path: {
    local: '',
    remote: './'
  },
  options: {},
  exclude: [],
  include: {},
  map: {},
  submodules: false,
  hash: { local: null, remote: null },
  submodulesHash: { local: {}, remote: {} },
  queue: { upload: [], delete: [] },
  createdFolders: []
};

function getTarget(target) {

  if (!file) {

    const configs = files('dploy.{yaml,yml,json}', { cwd: process.cwd() });

    logger.debug('Looking for a dploy config file...');

    if (configs.hasOwnProperty('dploy')) {

      try {

        file = yaml.parse(configs.dploy.content);
        logger.debug(`Found ${chalk.white('dploy.yaml')}.`);

      } catch (e) {

        file = JSON.parse(configs.dploy.content);
        logger.debug(`Found ${chalk.white('dploy.json')}`);

      }

    }

  }

  if (file.hasOwnProperty(target)) {

    logger.debug(`Parsing config for ${chalk.white(target)}`);
    file[target].target = target;
    return file[target];

  }

  throw new Error(`The target "${target}" could not be found on your config.`);

}


module.exports = function(args) {

  const configs = [];
  const deleteKeys = ['include', 'include-files', 'i', 'h', 'v', 'c'];

  each(deleteKeys, function(key) {

    delete args[key];

  });

  each(args._, function(target) {

    configs.push(merge({}, DEFAULTS, getTarget(target), args));

  });

  return configs;

};
