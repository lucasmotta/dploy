'use strict';


const Promise = require('bluebird');
const logger = require('../logger');
const mm = require('micromatch');


module.exports = function(settings) {

  if (!settings.exclude.length || settings.catchup) {

    return Promise.resolve(settings);

  }

  logger.spaced(1, logger.chalk.yellow('Excluding files...'));

  const exclude = settings.exclude;
  const upload = settings.queue.upload.filter(function(file) {

    const startWith = file.local.startsWith(settings.path.local);
    const isDPLOY = /dploy\.(yaml|json)/g.test(file.local);

    if (file.mapped) {

      return true;

    }

    if (isDPLOY || file.local === settings.revision) {

      return false;

    }

    return startWith && exclude.every(function(match) {

      return !mm.isMatch(file.local, match, { dot: true });

    });


  });

  const diff = settings.queue.upload.length - upload.length;

  logger.spaced(3, logger.chalk.green(`[excluded ${diff} files]`));

  settings.queue.upload = upload;

  return Promise.resolve(settings);

};
