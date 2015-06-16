'use strict';

import path from 'path';
import chalk from 'chalk';
import files from 'map-files';
import Promise from 'bluebird';
import logger from '../logger';
import each from 'lodash.foreach';


export default function(settings) {

  const hasInclude = Object.keys(settings.include).length > 0;
  const upload = [];

  if (!hasInclude || !settings.includeFiles || settings.catchup) {

    return Promise.resolve(settings);

  }

  logger.spaced(1, chalk.yellow('Including files...'));

  each(settings.include, (value, key) => {

    const newFiles = files(key, { read: (filepath) => {

      return path.relative('', filepath);

    }});

    each(newFiles, (filepath) => {

      upload.push({
        local: filepath,
        remote: path.join(value, path.basename(filepath)),
        included: true
      });

    });

  });

  logger.spaced(3, chalk.green(`[included ${upload.length} files]`));

  settings.queue.upload = settings.queue.upload.concat(upload);

  return Promise.resolve(settings);

};
