'use strict';

import path from 'path';
import chalk from 'chalk';
import Promise from 'bluebird';
import logger from '../logger';
import spawn from '../util/spawn';
import submodules from './submodules';
import trimLeft from 'lodash.trimleft';
import isString from 'lodash.isstring';
import parseDiff from '../util/parse-diff';


let git = {

  getRevision(settings) {

    logger.spaced(1, chalk.yellow('Retrieving local revision file...'));

    return new Promise((resolve, reject) => {

      spawn('git', 'rev-parse', 'HEAD').then((res) => {

        logger.spaced(3, chalk.green(`[${res}]`));
        settings.hash.local = res;

        if (settings.submodules) {

          submodules.parse(settings.submodules).then((modules) => {

            let hashes = {};
            modules.forEach((item) => {

              let key = Object.keys(item)[0];
              hashes[key] = item[key];
              logger.spaced(3, chalk.green(`[${key}: ${item[key].hash}]`));

            });

            settings.submodulesHash.local = hashes;

          }).finally(() => resolve(settings));

        } else {

          resolve(settings);

        }

      }).catch((err) => {

        logger.error(err);
        reject(err);

      });

    });

  },


  getFiles(settings) {

    if (settings.catchup) {

      return Promise.resolve(settings);

    }

    return git.compare(settings).then(git.all).then(() => {

      if (settings.submodules) {

        const keys = Object.keys(settings.submodulesHash.local);
        const actions = keys.map((key) => {

          return () => {

            if (settings.submodulesHash.remote.hasOwnProperty(key)) {

              return git.compare(settings, key);

            }

            return git.all(settings, key);

          };

        });

        return Promise.reduce(actions, (_, action) => {

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

    return promise.then(parseDiff).then((queue) => {

      let out = '';
      out += chalk.green(`[found ${queue.upload.length} files to upload]`);
      out += chalk.red(` [found ${queue.delete.length} files to delete]`);

      logger.spaced(3, out);

      queue.upload.forEach((item) => {

        settings.queue.upload.push({
          local: path.join(localPrefix, item),
          remote: path.join(remotePrefix, trimLeft(item, settings.path.local))
        });

      });

      queue.delete.forEach((item) => {

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

    return promise.then((res) => {

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


export default git;
