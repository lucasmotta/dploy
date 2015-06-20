'use strict';

import chalk from 'chalk';
import Promise from 'bluebird';
import logger from '../logger';
import {prompt} from 'inquirer';
import isEqual from 'lodash.isequal';


let service = null;


export default {

  getRevision(settings) {

    service = service || require('./' + settings.diff);
    return service.getRevision(settings);

  },


  checkRevisions(settings) {

    let sameHash = isEqual(settings.hash.local, settings.hash.remote);
    let sameSubmodules = settings.submodules ?
      isEqual(settings.submodulesHash.local, settings.submodulesHash.remote) :
      true;

    if (sameHash && sameSubmodules) {

      return Promise.reject({
        reason: 'No changes found between revisions'
      });

    }

    return Promise.resolve(settings);

  },


  getFiles(settings) {

    return service.getFiles(settings);

  },

  confirm(settings) {

    const queue = settings.queue;

    if (!settings.confirm || (!queue.upload.length && !queue.delete.length)) {

      return Promise.resolve(settings);

    }

    logger.spaced(1, chalk.yellow('Confirm the files that will be deployed:'));

    queue.upload.forEach((item) => {

      logger.spaced(3, `${chalk.white(item.local)} → ${chalk.green(item.remote)}`);

    });

    queue.delete.forEach((item) => {

      logger.spaced(3, `${chalk.white(item.local)} → ${chalk.red(settings.path.remote + '/' + item.remote)}`);

    });

    return new Promise((resolve, reject) => {

      const questions = [{
        type: 'confirm',
        name: 'confirm',
        default: true,
        message: 'Proceed with the deployment?'
      }];

      prompt(questions, (answers) => {

        if (answers.confirm) {

          return resolve(settings);

        }

        reject({
          reason: 'Deployment aborted by user'
        });

      });

    });

  }

};
