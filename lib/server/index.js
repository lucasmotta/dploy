'use strict';

import path from 'path';
import chalk from 'chalk';
import Promise from 'bluebird';
import logger from '../logger';
import each from 'lodash.foreach';
import isRelative from '../util/is-relative';
import progressBar from '../util/progress-bar';
import parseRevision from '../util/parse-revision';


let service = null;


export default {

  connect(settings) {

    service = require(`./${settings.scheme}`);
    return service.connect(settings);

  },


  disconnect(settings) {

    if (!service) {

      return Promise.resolve(settings);

    }

    return service.disconnect(settings);

  },


  getRevision(settings) {

    if (settings.catchup) {

      return Promise.resolve(settings);

    }

    const remotePath = path.join(settings.path.remote, settings.revision);

    logger.spaced(1, chalk.yellow('Retrieving the remote revision file...'));

    return new Promise((resolve) => {

      service.get(remotePath).then(parseRevision).then((obj) => {

        settings.hash.remote = obj.hash;
        settings.createdFolders = obj.createdFolders || [];
        settings.submodulesHash.remote = obj.submodules || {};

        logger.spaced(3, chalk.green(`[${settings.hash.remote}]`));

        each(settings.submodulesHash.remote, (n, key) => {

          logger.spaced(3, chalk.green(`[${key}: ${n.hash}`));

        });

      }).catch(() => {

        logger.spaced(3, chalk.green('[first deployment]'));
        logger.debug('the remote revision file couldn\'t be found – it\'s probably your first dploy.');

      }).finally(() => resolve(settings));

    });

  },


  deleteQueue(settings) {

    if (settings.queue.delete.length === 0 || settings.catchup) {

      return Promise.resolve(settings);

    }

    logger.spaced(1, chalk.yellow('Deleting files...'));

    const actions = [];
    const result = {
      success: [],
      fail: []
    };
    const bar = progressBar(settings.queue.upload.length, logger.isDebug());

    settings.queue.delete.forEach((file) => {

      actions.push(() => {

        bar.tick({ 'file': file.local });

        return service.delete(path.join(settings.path.remote, file.remote)).then((res) => {

          logger.debug('File deleted:', chalk.white(`${file.remote}`));
          result.success.push(res);

        }).catch((res) => {

          logger.debug('File not deleted:', chalk.white(`${file.remote}`));
          result.fail.push(res);

        });

      });

    });

    return Promise.reduce(actions, (_, action) => {

      return action();

    }, null).then(() => {

      logger.spaced(3, chalk.green(`[${result.success.length} files deleted]`), chalk.red(`[${result.fail.length} failed to be deleted]`));

      return settings;

    });

  },


  uploadQueue(settings) {

    if (settings.queue.upload.length === 0 || settings.catchup) {

      return Promise.resolve(settings);

    }

    logger.spaced(1, chalk.yellow('Uploading files...'));

    const actions = [];
    const result = {
      success: [],
      fail: []
    };
    const bar = progressBar(settings.queue.upload.length, logger.isDebug());

    settings.queue.upload.forEach((file) => {

      actions.push(() => {

        bar.tick({ 'file': file.local });

        return service.put(file.local, path.join(settings.path.remote, file.remote)).then((res) => {

          logger.debug('File uploaded:', chalk.white(`${file.local} → ${file.remote}`));
          result.success.push(res);

        }).catch((res) => {

          logger.error('File not uploaded:', chalk.white(`${file.local} → ${file.remote}`), res.reason);
          result.fail.push(res);

        });

      });

    });

    return Promise.reduce(actions, (_, action) => {

      return action();

    }, null).then(() => {

      logger.spaced(3, chalk.green(`[${result.success.length} completed]`), chalk.red(`[${result.fail.length} failed]`));

      if (result.fail.length) {

        result.fail.forEach((file) => {

          logger.spaced(3, chalk.red(`× [${file.local} → ${file.local}]`));

        });

      }

      return settings;

    });

  },


  uploadRevision(settings) {

    if (settings.catchup) {

      logger.spaced(1, chalk.yellow('Catching up the revision...'));

    } else {

      logger.spaced(1, chalk.yellow('Uploading revision file...'));

    }

    const remotePath = path.join(settings.path.remote, settings.revision);
    const buffer = new Buffer(JSON.stringify({
      hash: settings.hash.local,
      createdFolders: settings.createdFolders,
      submodules: settings.submodulesHash.local
    }));

    return new Promise((resolve) => {

      service.put(buffer, remotePath).then(() => {

        logger.spaced(3, chalk.green('[revision uploaded]'));
        resolve(settings);

      }).catch((err) => {

        logger.spaced(3, chalk.red('[error uploading the revision file]'));
        logger.error(err);
        resolve(settings);

      });

    });

  },


  createFolders(settings) {

    if (settings.queue.upload.length === 0 || settings.catchup) {

      return Promise.resolve(settings);

    }

    const actions = [];
    const result = {
      success: [],
      fail: []
    };

    const paths = settings.queue.upload.map((file) => {

      return path.dirname(file.remote);

    }).filter((item, i, self) => {

      // remove duplicated items
      return self.indexOf(item) === i && item !== '.';

    }).filter((item) => {

      // don't include if the folder was created already
      return settings.createdFolders.indexOf(item) === -1;

    }).filter((item, i, self) => {

      return self.every((match) => isRelative(item, match));

    });

    if (!paths.length) {

      return Promise.resolve(settings);

    }

    // create the root folder if it's the first upload
    if (!settings.createdFolders.length) {

      paths.unshift('');

    }

    logger.spaced(1, chalk.yellow('Creating folders...'));

    const bar = progressBar(paths.length, logger.isDebug());

    paths.forEach((folder) => {

      actions.push(() => {

        bar.tick({ 'file': chalk.gray(settings.path.remote + '/') + chalk.green(folder )});

        return service.mkdir(path.join(settings.path.remote, folder))
          .then((file) => {

            result.success.push(file);
            logger.debug('Folder created:', chalk.white(folder));
            settings.createdFolders.push(folder);

          }).catch((file) => {

            result.fail.push(file);
            logger.debug('Error creating folder:', chalk.white(folder));

          }

        );

      });

    });

    return Promise.reduce(actions, (_, action) => {

      return action();

    }, null).then(() => {

      logger.spaced(3, chalk.green(`[${result.success.length} folders created]`), chalk.red(`[${result.fail.length} folders failed to be created]`));

      return settings;

    });

  }

};
