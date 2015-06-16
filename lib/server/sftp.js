'use strict';

const Client = require('ssh2');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const isString = require('lodash.isstring');
const chalk = require('chalk');
const merge = require('lodash.merge');
const logger = require('../logger');
const fixSlash = require('../util/fixSlash');
const readData = require('../util/readData');


let server = null;
let connection = null;


module.exports = {

  connect(settings) {

    logger.spaced(1, chalk.yellow('Connecting to remote server...'));

    const options = settings.options;
    const config = merge(options, {
      host: settings.host,
      port: settings.port,
      username: settings.user,
      password: settings.pass
    });

    return new Promise(function(resolve, reject) {

      server = new Client();
      server.on('error', function(err) {

        logger.error(err);
        reject(new Error(err));

      });
      server.on('ready', function() {

        server.sftp(function(err, con) {

          if (err) {

            logger.error(err);
            return reject(new Error(err));

          }

          connection = con;
          logger.spaced(3, chalk.green('[connected]'));
          resolve(settings);

        });

      });
      server.connect(config);

    });

  },


  disconnect(settings) {

    return new Promise(function(resolve) {

      if (!server) {

        return resolve(settings);

      }

      logger.debug(`Disconnecting from ${chalk.white(settings.target)}...`);

      server.on('end', function() {

        connection = null;
        server = null;
        logger.debug(`Disconnected from ${chalk.white(settings.target)}`);
        resolve(settings);

      });
      server.end();

    });

  },


  get(remotePath) {

    return new Promise(function(resolve, reject) {

      connection.readFile(fixSlash(remotePath), 'utf-8', function(err, res) {

        if (err) {

          return reject(new Error(err));

        }

        readData(res)
          .then(resolve)
          .catch(reject);

      });

    });

  },


  put(localPath, remotePath) {

    if (isString(localPath) && !fs.existsSync(localPath)) {

      return Promise.reject({
        local: localPath,
        remote: remotePath,
        reason: 'file not found'
      });

    }

    return new Promise(function(resolve, reject) {

      connection.fastPut(localPath, fixSlash(remotePath), function(err) {

        if (err) {

          return reject({
            local: localPath,
            remote: remotePath,
            reason: err
          });

        }

        resolve({
          local: isString ? localPath : '',
          remote: remotePath
        });

      });

    });

  },


  delete(remotePath) {

    return new Promise(function(resolve, reject) {

      connection.unlink(fixSlash(remotePath), function(err) {

        if (err && err.code !== 550) {

          return reject({
            remote: remotePath,
            reason: err
          });

        }

        resolve({ remote: remotePath });

      });

    });

  },


  mkdir(remotePath) {

    if (remotePath === null || remotePath === '.') {

      return Promise.resolve({ remote: remotePath });

    }

    return new Promise(function(resolve, reject) {

      server.exec(`mkdir -p ${fixSlash(remotePath)}`, function(err, stream) {

        if (err) {

          return reject({
            remote: remotePath,
            reason: err
          });

        }

        stream.on('end', function() {

          stream.end();
          stream.destroy();

          resolve({ remote: remotePath });

        });

      });

    });

  }

};
