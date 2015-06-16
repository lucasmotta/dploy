'use strict';

import chalk from 'chalk';
import Promise from 'bluebird';
import uniq from 'lodash.uniq';
import logger from '../logger';


export default function(settings) {

  let diff = 0;
  const uploads = uniq(settings.queue.upload, 'remote');
  const deletes = uniq(settings.queue.delete, 'remote');

  if (uploads.length !== settings.queue.upload) {

    diff += settings.queue.upload.length - uploads.length;

  }

  if (deletes.length !== settings.queue.delete) {

    diff += settings.queue.delete.length - deletes.length;

  }

  if (diff > 0) {

    logger.spaced(1, chalk.yellow('Removing possible duplications...'));
    logger.spaced(3, chalk.green(`[${diff} files removed]`));

  }

  return Promise.resolve(settings);

};
