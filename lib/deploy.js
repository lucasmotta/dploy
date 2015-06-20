'use strict';

import chalk from 'chalk';
import local from './local';
import server from './server';
import logger from './logger';
import filter from './filter';
import strftime from 'strftime';
import deprecated from './deprecated';
import password from './config/password';
import parseError from './util/parse-error';


export default function(settings) {

  const startAt = new Date();

  logger(chalk.magenta(`→ ${settings.target}:`), chalk.white('Start deployment'));

  return deprecated(settings)
    .then(password)
    .then(server.connect)
    .then(server.getRevision)
    .then(local.getRevision)
    .then(local.checkRevisions)
    .then(local.getFiles)
    .then(filter)
    .then(local.confirm)
    .then(server.createFolders)
    .then(server.deleteQueue)
    .then(server.uploadQueue)
    .then(server.uploadRevision)
    .then(server.disconnect)
    .catch((err) => {

      parseError(err);

      return server.disconnect(settings);

    }).then(() => {

      const ellapsed = new Date(Math.abs(new Date() - startAt));
      const time = strftime('%M:%S:%L', ellapsed);

      logger.spaced(1, chalk.bold.magenta(`done`), chalk.white(`in ${time}`));
      console.log(chalk.bold.magenta(`  ▔▔▔`));

    });

}
