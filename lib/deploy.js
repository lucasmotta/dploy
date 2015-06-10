'use strict';

const password = require('./config/password');
const server = require('./server');
const local = require('./local');
const logger = require('./logger');
const filter = require('./filter');

module.exports = function(settings) {

  logger(
    logger.chalk.magenta(`→ ${settings.target}:`),
    logger.chalk.white('Start deployment')
  );

  return password(settings)
    .then(server.connect)
    .then(server.getRevision)
    .then(local.getRevision)
    .then(local.getFiles)
    .then(filter)
    .then(server.createFolders)
    .then(server.deleteQueue)
    .then(server.uploadQueue)
    .then(server.uploadRevision)
    .then(server.disconnect);

};
