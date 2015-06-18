'use strict';

import chalk from 'chalk';
import mm from 'micromatch';
import Promise from 'bluebird';
import logger from '../logger';
import isRealFile from '../util/is-real-file';


export default function(settings) {

  // first remove all the files that should not be uploaded
  // like the dploy.yaml, .rev or folders that aren't inside the path.local
  settings.queue.upload = settings.queue.upload.filter((file) => {

    const isFile = isRealFile(file.local);
    const isDPLOY = /dploy\.(yaml|json|log)/g.test(file.local);

    if (file.mapped || file.included || file.submodule) {

      return true;

    }

    if (isDPLOY || !isFile || file.local === settings.revision) {

      return false;

    }

    return file.local.startsWith(settings.path.local);

  });


  if (!settings.exclude.length || settings.catchup) {

    return Promise.resolve(settings);

  }

  logger.spaced(1, chalk.yellow('Excluding files...'));

  const exclude = settings.exclude;
  const uploads = settings.queue.upload.filter((file) => {

    return exclude.every((match) => {

      return !mm.isMatch(file.local, match, { dot: true });

    });


  });

  const deletes = settings.queue.delete.filter((file) => {

    return exclude.every((match) => {

      return !mm.isMatch(file.local, match, { dot: true });

    });


  });

  const diff = settings.queue.upload.length - uploads.length;

  logger.spaced(3, chalk.green(`[excluded ${diff} files]`));

  settings.queue.upload = uploads;
  settings.queue.delete = deletes;

  return Promise.resolve(settings);

}
