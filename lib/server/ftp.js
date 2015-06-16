'use strict';

import _fs from 'fs';
import Client from 'ftp';
import chalk from 'chalk';
import Promise from 'bluebird';
import logger from '../logger';
import merge from 'lodash.merge';
import isString from 'lodash.isstring';
import fixSlash from '../util/fix-slash';

const fs = Promise.promisifyAll(require('fs'));


let connection = null;


export default {

  connect(settings) {

    logger.spaced(1, chalk.yellow('Connecting to remote server...'));

    const options = settings.options;
    const config = merge({ secure: false, secureOptions: {} }, options, {
      host: settings.host,
      port: settings.port,
      user: settings.user,
      password: settings.pass
    });

    return new Promise((resolve, reject) => {

      connection = new Client();
      connection.on('error', (err) => {

        logger.error(err);
        reject(new Error(err));

      });
      connection.on('ready', () => {

        logger.spaced(3, chalk.green('[connected]'));
        resolve(settings);

      });
      connection.connect(config);

    });

  },


  disconnect(settings) {

    return new Promise((resolve) => {

      if (!connection) {

        return resolve(settings);

      }

      logger.debug(`Disconnecting from ${chalk.white(settings.target)}...`);

      connection.on('end', () => {

        connection = null;
        logger.debug(`Disconnected from ${chalk.white(settings.target)}`);
        resolve(settings);

      });
      connection.end();

    });

  },


  get(remotePath) {

    return new Promise((resolve, reject) => {

      connection.get(fixSlash(remotePath), (err, res) => {

        if (err) {

          return reject(new Error(err));

        }
        resolve(res);

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

    return new Promise((resolve, reject) => {

      connection.put(localPath, fixSlash(remotePath), (err) => {

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

    return new Promise((resolve, reject) => {

      connection.delete(fixSlash(remotePath), (err) => {

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

    return new Promise((resolve, reject) => {

      connection.mkdir(fixSlash(remotePath), true, (err) => {

        if (err) {

          return reject({
            remote: remotePath,
            reason: err
          });

        }

        resolve({ remote: remotePath });

      });

    });

  }

};
