'use strict';

const Client = require('ftp');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const logger = require('../logger');
const fixSlash = require('../util/fixSlash');


var connection = null;


module.exports = {

  connect(settings) {

    logger.spaced(1, logger.chalk.yellow('Connecting to remote server...'));

    const config = {
      host: settings.host,
      port: settings.port,
      user: settings.user,
      password: settings.pass,
      secure: settings.secure,
      secureOptions: settings.secureOptions
    };

    return new Promise(function(resolve, reject) {

      connection = new Client();
      connection.on('error', function(err) {

        logger.error(err);
        reject(new Error(err));

      });
      connection.on('ready', function() {

        logger.spaced(3, logger.chalk.green('[connected]'));
        resolve(settings);

      });
      connection.connect(config);

    });

  },


  disconnect(settings) {

    logger.debug(`Disconnecting from ${logger.chalk.white(settings.target)}...`);

    return new Promise(function(resolve) {

      connection.on('end', function() {

        logger.debug(`Disconnected from ${logger.chalk.white(settings.target)}`);
        resolve(settings);

      });
      connection.end();

    });

  },


  get(remotePath) {

    return new Promise(function(resolve, reject) {

      connection.get(fixSlash(remotePath), function(err, res) {

        if (err) {

          return reject(new Error(err));

        }
        resolve(res);

      });

    });

  },


  put(localPath, remotePath) {

    // TODO remove this testing part
    return new Promise(function(resolve, reject) {

      var fn = Math.random() > 0.1 ? resolve : reject;

      setTimeout(function() {

        fn({
          local: localPath,
          remote: remotePath
        });

      }, 50);

    });

    const isString = typeof localPath === 'string';

    if (isString && !fs.existsSync(localPath)) {

      return Promise.reject({
        local: localPath,
        remote: remotePath,
        reason: 'file not found'
      });

    }

    return new Promise(function(resolve, reject) {

      connection.put(localPath, fixSlash(remotePath), function(err) {

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

    // TODO remove this testing part
    return new Promise(function(resolve, reject) {

      var fn = Math.random() > 0.1 ? resolve : reject;

      setTimeout(function() {

        fn({
          remote: remotePath
        });

      }, 50);

    });

    return new Promise(function(resolve, reject) {

      connection.delete(fixSlash(remotePath), function(err) {

        if (err) {

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

    // TODO remove this testing part
    return new Promise(function(resolve, reject) {

      var fn = Math.random() > 0.1 ? resolve : reject;

      setTimeout(function() {

        fn({
          remote: remotePath
        });

      }, 50);

    });

    if (remotePath === null || remotePath === '.') {

      return Promise.resolve({ remote: remotePath });

    }

    return new Promise(function(resolve, reject) {

      connection.mkdir(fixSlash(remotePath), true, function(err) {

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
