'use strict';

const Promise = require('bluebird');
const path = require('path');
const chalk = require('chalk');
const trimLeft = require('lodash.trimleft');
const isString = require('lodash.isstring');
const logger = require('../logger');
const spawn = require('../util/spawn');
const parseDiff = require('../util/parseDiff');
const submodules = require('./submodules');


let git = {

  getRevision(settings) {

    logger.spaced(1, chalk.yellow('Retrieving local revision file...'));

    return new Promise(function(resolve, reject) {

      spawn('git', 'rev-parse', 'HEAD').then(function(res) {

        logger.spaced(3, chalk.green(`[${res}]`));
        settings.hash.local = res;

        if (settings.submodules) {

          submodules.parse(settings.submodules).then(function(modules) {

            let hashes = {};
            modules.forEach(function(item) {

              let key = Object.keys(item)[0];
              hashes[key] = item[key];
              logger.spaced(3, chalk.green(`[${key}: ${item[key].hash}]`));

            });

            settings.submodulesHash.local = hashes;

          }).finally(function() {

            resolve(settings);

          });

        } else {

          resolve(settings);

        }

      }).catch(function(err) {

        logger.error(err);
        reject(err);

      });

    });

  },


  getFiles(settings) {

    if (settings.catchup) {

      return Promise.resolve(settings);

    }

    return git.compare(settings).then(git.all).then(function() {

      if (settings.submodules) {

        const keys = Object.keys(settings.submodulesHash.local);
        const actions = keys.map(function(key) {

          return function() {

            if (settings.submodulesHash.remote.hasOwnProperty(key)) {

              return git.compare(settings, key);

            }

            return git.all(settings, key);

          };

        });

        return Promise.reduce(actions, function(_, action) {

          return action();

        }, null);

      }

      return settings;

    });

  },


  compare(settings, submodule) {

    if (!submodule && !settings.hash.remote) {

      return Promise.resolve(settings);

    }

    const subHashes = settings.submodulesHash;
    let localPrefix = submodule || '';
    let remotePrefix = submodule ? subHashes.local[submodule].dest : '';

    let localHash = settings.hash.local;
    let remoteHash = settings.hash.remote;
    let promise;

    if (!isString(remotePrefix) || remotePrefix === '*') {

      remotePrefix = submodule || '';

    }

    if (submodule) {

      logger.spaced(1, chalk.yellow(`Checking modified files on ${chalk.underline(submodule)}...`));

      localHash = settings.submodulesHash.local[submodule].hash;
      remoteHash = settings.submodulesHash.remote[submodule].hash;
      promise = spawn('git', '-C', submodule, 'diff', '--name-status', remoteHash, localHash);


    } else {

      logger.spaced(1, chalk.yellow(`Checking modified files...`));
      promise = spawn('git', 'diff', '--name-status', remoteHash, localHash);

    }

    return promise.then(parseDiff).then(function(queue) {

      let out = '';
      out += chalk.green(`[found ${queue.upload.length} files to upload]`);
      out += chalk.red(` [found ${queue.delete.length} files to delete]`);

      logger.spaced(3, out);

      queue.upload.forEach(function(item) {

        settings.queue.upload.push({
          local: path.join(localPrefix, item),
          remote: path.join(remotePrefix, trimLeft(item, settings.path.local))
        });

      });

      queue.delete.forEach(function(item) {

        settings.queue.delete.push({
          local: path.join(localPrefix, item),
          remote: path.join(remotePrefix, trimLeft(item, settings.path.local))
        });

      });

      return settings;

    });

  },


  all(settings, submodule) {

    if (!submodule && settings.hash.remote) {

      return Promise.resolve(settings);

    }

    const subHashes = settings.submodulesHash;
    let localPrefix = submodule || '';
    let remotePrefix = submodule ? subHashes.local[submodule].dest : '';
    let promise;

    if (!isString(remotePrefix) || remotePrefix === '*') {

      remotePrefix = submodule || '';

    }


    if (submodule) {

      logger.spaced(1, chalk.yellow(`Listing all your files on ${chalk.underline(submodule)}...`));

      promise = spawn('git', '-C', submodule, 'ls-tree', '-r', '--name-only', 'HEAD');

    } else {

      logger.spaced(1, chalk.yellow(`Listing all your files...`));
      promise = spawn('git', 'ls-tree', '-r', '--name-only', 'HEAD');

    }

    return promise.then(function(res) {

      let m;
      const regex = /(.+)/g;
      const upload = [];

      while (m = regex.exec(res)) {

        upload.push({
          local: path.join(localPrefix, m[1]),
          remote: path.join(remotePrefix, trimLeft(m[1], settings.path.local))
        });

      }

      logger.spaced(3, chalk.green(`[found ${upload.length} files to upload]`));

      settings.queue.upload = settings.queue.upload.concat(upload);

      return settings;

    });

  }

};


module.exports = git;
