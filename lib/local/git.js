'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const path = require('path');
const trimLeft = require('lodash.trimleft');
const logger = require('../logger');
const spawn = require('../util/spawn');
const parseDiff = require('../util/parseDiff');


function loadSubmodules() {

  const name = '.gitmodules';
  const regex = /path\s=\s(.*)/g;

  return fs.accessAsync(name).then(function() {

    return fs.readFileAsync(name, 'utf-8').then(function(res) {

      let m;
      const results = [];

      while (m = regex.exec(res)) {

        results.push(m[1]);

      }

      return results;

    });

  });

}


function readSubmodules(submodules) {

  const actions = submodules.map(function(value) {

    return function() {

      return spawn('git', '-C', value, 'rev-parse', 'HEAD').then(function(res) {

        let obj = {};
        obj[value] = res;
        return obj;

      });

    };

  });

  return Promise.reduce(actions, function(values, action) {

    return action().then(function(value) {

      values.push(value);
      return values;

    });

  }, []);

}


let git = {

  getRevision(settings) {

    logger.spaced(1, logger.chalk.yellow('Retrieving local revision file...'));

    return new Promise(function(resolve, reject) {

      spawn('git', 'rev-parse', 'HEAD').then(function(res) {

        logger.spaced(3, logger.chalk.green(`[${res}]`));
        settings.hash.local = res;

        if (settings.submodules) {

          loadSubmodules().then(readSubmodules).then(function(modules) {

            let result = {};
            modules.forEach(function(item) {

              let key = Object.keys(item)[0];
              result[key] = item[key];
              logger.spaced(3, logger.chalk.green(`[${key}: ${item[key]}]`));

            });

            settings.submodulesHash.local = result;

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
        const actions = keys.map(function(value) {

          return function() {

            if (settings.submodulesHash.remote.hasOwnProperty(value)) {

              return git.compare(settings, value);

            }

            return git.all(settings, value);

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

    let prefix = submodule ? `${submodule}/` : '';
    let localHash = settings.hash.local;
    let remoteHash = settings.hash.remote;
    let promise;

    if (submodule) {

      logger.spaced(1, logger.chalk.yellow(`Checking modified files on ${logger.chalk.underline(submodule)}...`));

      localHash = settings.submodulesHash.local[submodule];
      remoteHash = settings.submodulesHash.remote[submodule];
      promise = spawn('git', '-C', submodule, 'diff', '--name-status', remoteHash, localHash);

    } else {

      logger.spaced(1, logger.chalk.yellow(`Checking modified files...`));
      promise = spawn('git', 'diff', '--name-status', localHash, remoteHash);

    }

    return promise.then(parseDiff).then(function(queue) {

      let out = '';
      out += logger.chalk.green(`[found ${queue.upload.length} files to upload]`);
      out += logger.chalk.red(` [found ${queue.delete.length} files to delete]`);

      logger.spaced(3, out);

      queue.upload.forEach(function(item) {

        settings.queue.upload.push({
          local: path.join(prefix, item),
          remote: path.join(prefix, trimLeft(item, settings.path.local))
        });

      });

      queue.delete.forEach(function(item) {

        settings.queue.delete.push({
          local: path.join(prefix, item),
          remote: path.join(prefix, trimLeft(item, settings.path.local))
        });

      });

      return settings;

    });

  },


  all(settings, submodule) {

    if (!submodule && settings.hash.remote) {

      return Promise.resolve(settings);

    }

    let prefix = submodule ? `${submodule}/` : '';
    let promise;

    if (submodule) {

      logger.spaced(1, logger.chalk.yellow(`Listing all your files on ${logger.chalk.underline(submodule)}...`));

      promise = spawn('git', '-C', submodule, 'ls-tree', '-r', '--name-only', 'HEAD');

    } else {

      logger.spaced(1, logger.chalk.yellow(`Listing all your files...`));
      promise = spawn('git', 'ls-tree', '-r', '--name-only', 'HEAD');

    }

    return promise.then(function(res) {

      let m;
      let remote;
      const regex = /(.+)/g;
      const upload = [];

      while (m = regex.exec(res)) {

        upload.push({
          local: path.join(prefix, m[1]),
          remote: path.join(prefix, trimLeft(m[1], settings.path.local))
        });

      }

      logger.spaced(3, logger.chalk.green(`[found ${upload.length} files to upload]`));

      settings.queue.upload = settings.queue.upload.concat(upload);

      return settings;

    });

  }

};


module.exports = git;
