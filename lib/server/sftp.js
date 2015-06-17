'use strict';

import _fs from 'fs';
import chalk from 'chalk';
import Client from 'ssh2';
import Promise from 'bluebird';
import logger from '../logger';
import merge from 'lodash.merge';
import isString from 'lodash.isstring';
import fixSlash from '../util/fix-slash';
import readData from '../util/read-data';

const fs = Promise.promisifyAll(_fs);


let server = null;
let connection = null;


export default {

  connect(settings) {

    logger.spaced(1, chalk.yellow('Connecting to remote server...'));

    const options = settings.options;
    const config = merge(options, {
      host: settings.host,
      port: settings.port,
      username: settings.user,
      password: settings.pass
    });

    return new Promise((resolve, reject) => {

      server = new Client();
      server.on('error', (err) => {

        logger.error(err);
        reject(new Error(err));

      });
      server.on('ready', () => {

        server.sftp((err, con) => {

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

    return new Promise((resolve) => {

      if (!server) {

        return resolve(settings);

      }

      logger.debug(`Disconnecting from ${chalk.white(settings.target)}...`);

      server.on('end', () => {

        connection = null;
        server = null;
        logger.debug(`Disconnected from ${chalk.white(settings.target)}`);
        resolve(settings);

      });
      server.end();

    });

  },


  get(remotePath) {

    return new Promise((resolve, reject) => {

      connection.readFile(fixSlash(remotePath), 'utf-8', (err, res) => {

        if (err) {

          return reject(new Error(err));

        }

        readData(res).then(resolve).catch(reject);

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

      if (localPath instanceof Buffer) {

        const buff = localPath;
        const stream = connection.createWriteStream(remotePath);
        stream.on('error', () => reject());
        stream.on('finish', () => resolve());
        stream.write(buff);
        return stream.end();

      }

      connection.fastPut(localPath, fixSlash(remotePath), (err) => {

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

      connection.unlink(fixSlash(remotePath), (err) => {

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

    let str = '';
    const actions = remotePath.split('/').map((val) => {

      const folder = str += val + '/';

      return () => {

        return new Promise(function(resolve, reject) {

          connection.opendir(folder, (openErr) => {

            if (openErr) {

              return connection.mkdir(folder, (mkErr) => {

                return mkErr ? reject() : resolve();

              });

            }

            resolve();

          });

        });

      };

    });

    return Promise.reduce(actions, ((_, action) => action()), null);

  }

};
