'use strict';

import _fs from 'fs';
import chalk from 'chalk';
import Promise from 'bluebird';
import logger from '../logger';
import {prompt} from 'inquirer';
import untildify from 'untildify';

const fs = Promise.promisifyAll(_fs);


export function load(settings) {

  const options = settings.options;
  const sshKey = options.privateKey || options.publicKey;
  const keyType = options.privateKey ? 'privateKey' : 'publicKey';

  if (!sshKey) {

    logger.debug('Password:', 'no privateKey or publicKey set');
    return Promise.resolve(settings);

  }

  logger.debug('Password:', `Loading ${chalk.white(keyType)}`);

  return new Promise((resolve) => {

    if (sshKey && settings.scheme === 'sftp') {

      fs.readFileAsync(untildify(sshKey)).then((content) => {

        logger.debug('Password:', `Loaded ${chalk.white(keyType)}.`);
        settings.options[keyType] = content;

      }).catch((err) => {

        logger.error('Password:', `Could not load keyType ${chalk.white(sshKey)}.`);
        logger(err.message);


      }).finally(() => resolve(settings));

    }

  });

}


export function ask(settings) {

  const options = settings.options;

  if (options.privateKey || options.publicKey || settings.pass) {

    return Promise.resolve(settings);

  }

  const questions = [{
    type: 'password',
    name: 'password',
    message: 'Enter the password'
  }];

  logger.debug('Password:', 'prompt user for password');

  return new Promise((resolve) => {

    prompt(questions, (answers) => {

      settings.pass = answers.password;
      resolve(settings);

    });

  });

}


export default function(settings) {

  if (settings.pass) {

    logger.debug('Password:', 'using password from config file');

    return Promise.resolve(settings);

  }

  logger.debug('Password:', 'no password set');

  return load(settings).then(ask);

}
