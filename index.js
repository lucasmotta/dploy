'use strict';

import Promise from 'bluebird';
import minimist from 'minimist';
import logger from './lib/logger';
import config from './lib/config';
import deploy from './lib/deploy';


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

    const actions = envs.map((value) => dploy.start(value));

    Promise.reduce(actions, (_, action) => {

      return action();

    }, null).then(logger.writeLog);

  },

  start(settings) {

    return () => deploy(settings);

  }
};


export default dploy.init;
