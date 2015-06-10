'use strict';

const Promise = require('bluebird');
const path = require('path');
const each = require('lodash.foreach');
const trimLeft = require('lodash.trimleft');
const chalk = require('chalk');
const logger = require('../logger');
const parseRevision = require('../util/parseRevision');
const progressBar = require('../util/progress-bar');


var service = null;

module.exports = {

  connect(settings) {

    service = require(`./${settings.scheme}`);
    return service.connect(settings);

  },


  disconnect(settings) {

    return service.disconnect(settings);

  },


  getRevision(settings) {

    if (settings.catchup) {

      return Promise.resolve(settings);

    }

    const remotePath = path.join(settings.path.remote, settings.revision);

    logger.spaced(1, chalk.yellow('Retrieving the remote revision file...'));
    logger.debug(`service.get("${remotePath}")`);


    return new Promise(function(resolve) {

      service.get(remotePath).then(parseRevision).then(function(obj) {

        settings.hash.remote = obj.hash;
        settings.createdFolders = obj.createdFolders || [];
        settings.submodulesHash.remote = obj.submodules || {};

        logger.spaced(3, chalk.green(`[${settings.hash.remote}]`));

        each(settings.submodulesHash.remote, function(n, key) {

          logger.spaced(3, chalk.green(`[${key}: ${n}`));

        });

      }).catch(function() {

        logger.spaced(3, chalk.green('[first deployment]'));
        logger.debug('the remote revision file couldn\'t be found – it\'s probably your first dploy.');

      }).finally(function() {

        resolve(settings);

      });

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
    const bar = progressBar(settings.queue.upload.length);

    settings.queue.delete.forEach(function(file) {

      actions.push(function() {

        bar.tick({ 'file': file.local });

        return service.delete(path.join(settings.path.remote, file.remote)).then(function(file) {

          logger.debug('File deleted:', chalk.white(`${file.remote}`));
          result.success.push(file);

        }).catch(function(file) {

          logger.debug('File not deleted:', chalk.white(`${file.remote}`));
          result.fail.push(file);

        });

      });

    });

    return Promise.reduce(actions, function(_, action) {

      return action();

    }, null).then(function() {

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
    const bar = progressBar(settings.queue.upload.length);

    settings.queue.upload.forEach(function(file) {

      actions.push(function() {

        bar.tick({ 'file': file.local });

        return service.put(file.local, path.join(settings.path.remote, file.remote)).then(function(file) {

          logger.debug('File uploaded:', chalk.white(`${file.local} → ${file.remote}`));
          result.success.push(file);

        }).catch(function(file) {

          logger.error('File not uploaded:', chalk.white(`${file.local} → ${file.remote}`));
          result.fail.push(file);

        });

      });

    });

    return Promise.reduce(actions, function(_, action) {

      return action();

    }, null).then(function() {

      logger.spaced(3, chalk.green(`[${result.success.length} completed]`), chalk.red(`[${result.fail.length} failed]`));

      if (result.fail.length) {

        result.fail.forEach(function(file) {

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

    return new Promise(function(resolve, reject) {

      service.put(buffer, remotePath).then(function() {

        logger.spaced(3, chalk.green('[revision uploaded]'));
        resolve(settings);

      }).catch(function(err) {

        logger.spaced(3, chalk.red('[error uploading the revision file]'));
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
    const paths = settings.queue.upload.map(function(file) {

      return path.dirname(file.remote);

    }).filter(function(item, i, self) {

      // remove duplicated items
      return self.indexOf(item) === i && item !== '.';

    }).filter(function(item) {

      // don't include if the folder was created already
      return settings.createdFolders.indexOf(item) === -1;

    }).filter(function(item, i, self) {

      let len = self.length;

      while (len--) {

        if (item === self[len]) {

          continue;

        }

        if (self[len].indexOf(item) === 0) {

          return false;

        }

      }

      return true;

    });

    if (!paths.length) {

      return Promise.resolve(settings);

    }

    logger.spaced(1, chalk.yellow('Creating folders...'));

    paths.forEach(function(folder) {

      actions.push(function() {

        return service.mkdir(path.join(settings.path.remote, folder))
          .then(function(file) {

            result.success.push(file);
            logger.debug('Folder created:', chalk.white(folder));
            settings.createdFolders.push(folder);

        }).catch(function(file) {;

          result.fail.push(file);
          logger.debug('Error creating folder:', chalk.white(folder));

        });

      });

    });

    return Promise.reduce(actions, function(_, action) {

      return action();

    }, null).then(function() {

      logger.spaced(3, chalk.green(`[${result.success.length} folders created]`), chalk.red(`[${result.fail.length} folders failed to be created]`));

      return settings;

    });

  }

};
