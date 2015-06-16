'use strict';

const strftime = require('strftime');
const chalk = require('chalk');
const parseError = require('./util/parseError');
const deprecated = require('./deprecated');
const password = require('./config/password');
const server = require('./server');
const local = require('./local');
const logger = require('./logger');
const filter = require('./filter');

module.exports = function(settings) {

  const startAt = new Date();

  logger(
    chalk.magenta(`→ ${settings.target}:`),
    chalk.white('Start deployment')
  );

  return deprecated(settings)
    .then(password)
    .then(server.connect)
    .then(server.getRevision)
    .then(local.getRevision)
    .then(local.checkRevisions)
    .then(local.getFiles)
    .then(filter)
    .then(server.createFolders)
    .then(server.deleteQueue)
    .then(server.uploadQueue)
    .then(server.uploadRevision)
    .then(server.disconnect)
    .catch(function(err) {

      parseError(err);

      return server.disconnect(settings);

    }).then(function() {

      const ellapsed = new Date(Math.abs(new Date() - startAt));
      const time = strftime('%M:%S:%L', ellapsed);

      logger.spaced(1, chalk.bold.magenta(`done`), chalk.white(`in ${time}`));
      console.log(chalk.bold.magenta(`  ▔▔▔`));

    });

};
