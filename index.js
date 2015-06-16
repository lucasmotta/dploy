'use strict';

const Promise = require('bluebird');
const minimist = require('minimist');
const logger = require('./lib/logger');
const config = require('./lib/config');
const deploy = require('./lib/deploy');


const args = minimist(process.argv.slice(2), {
  alias: {
    'catchup': ['c'],
    'help': ['h'],
    'version': ['v'],
    'includeFiles': ['i', 'include', 'include-files'],
  }
});


const dploy = {

  init(settings) {

    let envs = settings ? [settings] : config(args);

    if (!settings) {

      logger.level = args.debug ? 2 : 1;
      logger.level = args.silent ? 0 : logger.level;

    }

    const actions = envs.map(function(value) {

      return dploy.start(value);

    });

    Promise.reduce(actions, function(_, action) {

      return action();

    }, null).then(logger.writeLog);

  },

  start(settings) {

    return function() {

      return deploy(settings);

    };

  }
};


module.exports = dploy.init;
