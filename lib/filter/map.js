'use strict';

import path from 'path';
import chalk from 'chalk';
import mm from 'micromatch';
import files from 'map-files';
import Promise from 'bluebird';
import logger from '../logger';
import each from 'lodash.foreach';


export default function(settings) {

  if (!Object.keys(settings.map).length || settings.catchup) {

    return Promise.resolve(settings);

  }

  const upload = [];

  logger.spaced(1, chalk.yellow('Mapping files...'));

  each(settings.map, (value, key) => {

    settings.queue.upload.forEach((file) => {

      if (mm.isMatch(file.local, key)) {

        const newFiles = files(value, { read: (filepath) => {

          return path.relative('', filepath);

        }});

        each(newFiles, (filepath) => {

          if (upload.indexOf(filepath) < 0) {

            upload.push(filepath);

          }

        });

      }

    });

  });

  logger.spaced(3, chalk.green(`[mapped ${upload.length} files]`));

  upload.forEach((item) => {

    settings.queue.upload.push({
      local: item,
      remote: item.replace(settings.path.local, ''),
      mapped: true
    });

  });

  return Promise.resolve(settings);

};
