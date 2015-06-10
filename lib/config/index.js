'use strict';

const files = require('map-files');
const merge = require('lodash.merge');
const yaml = require('yamljs');
const logger = require('../logger');

const DEFAULTS = {
  diff: 'git',
  scheme: 'ftp',
  port: 21,
  secure: false,
  secureOptions: {},
  revision: '.rev',
  path: {
    local: '',
    remote: './'
  },
  exclude: [],
  include: {},
  map: {},
  submodules: false,
  hash: { local: null, remote: null },
  submodulesHash: { local: {}, remote: {} },
  queue: { upload: [], delete: [] },
  createdFolders: []
};

var file;


function getTarget(target) {

  if (!file) {

    const configs = files('dploy.{yaml,yml,json}', { cwd: process.cwd() });

    logger.debug('Looking for a dploy config file...');

    if (configs.hasOwnProperty('dploy')) {

      try {

        file = yaml.parse(configs.dploy.content);
        logger.debug(`Found ${logger.chalk.white('dploy.yaml')}.`);

      } catch (e) {

        file = JSON.parse(configs.dploy.content);
        logger.debug(`Found ${logger.chalk.white('dploy.json')}`);

      }

    }

  }

  if (file.hasOwnProperty(target)) {

    logger.debug(`Parsing config for ${logger.chalk.white(target)}`);
    file[target].target = target;
    return file[target];

  }

  throw new Error(`The target "${target}" could not be found on your config.`);

}


module.exports = function(args) {

  const configs = [];

  args._.forEach(function(target) {

    configs.push(merge({}, DEFAULTS, getTarget(target), args));

  });

  return configs;

};
