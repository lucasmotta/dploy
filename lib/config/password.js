'use strict';

const Promise = require('bluebird');
const fs = Promise.promisifyAll(require('fs'));
const prompt = require('inquirer').prompt;
const untildify = require('untildify');
const logger = require('../logger');


function password(settings) {

  if (settings.pass) {

    logger.debug('Password:', 'using password from config file');

    return Promise.resolve(settings);

  }

  logger.debug('Password:', 'no password set');

  return password.load(settings).then(password.ask);

}


/*
 * Load the `privateKey` or `publicKey` if you have it on your settings
*/
password.load = function(settings) {

  const sshKey = settings.privateKey || settings.publicKey;
  const keyType = settings.privateKey ? 'privateKey' : 'publicKey';

  if (!sshKey) {

    logger.debug('Password:', 'no privateKey or publicKey set');
    return Promise.resolve(settings);

  }

  logger.debug('Password:', `Loading ${logger.chalk.white(keyType)}`);

  return new Promise(function(resolve) {

    if (sshKey && settings.scheme === 'sftp') {

      fs.readFileAsync(untildify(sshKey)).then(function(content) {

        logger.debug('Password:', `Loaded ${logger.chalk.white(keyType)}.`);
        settings[keyType] = content;

      }).catch(function(err) {

        logger.error('Password:', `Could not load keyType ${logger.chalk.white(sshKey)}.`);
        logger(err.message);


      }).finally(function() {

        resolve(settings);

      });

    }

  });

};


password.ask = function(settings) {

  if (settings.privateKey || settings.publicKey || settings.pass) {

    return Promise.resolve(settings);

  }

  const questions = [{
    type: 'password',
    name: 'password',
    message: 'Enter the password'
  }];

  logger.debug('Password:', 'prompt user for password');

  return new Promise(function(resolve) {

    prompt(questions, function(answers) {

      settings.pass = answers.password;
      resolve(settings);

    });

  });

};


module.exports = password;
