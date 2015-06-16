'use strict';

const Promise = require('bluebird');
const files = require('map-files');
const each = require('lodash.foreach');
const chalk = require('chalk');
const path = require('path');
const logger = require('../logger');

module.exports = function(settings) {

  const hasInclude = Object.keys(settings.include).length > 0;
  const upload = [];

  if (!hasInclude || !settings.includeFiles || settings.catchup) {

    return Promise.resolve(settings);

  }

  logger.spaced(1, chalk.yellow('Including files...'));

  each(settings.include, function(value, key) {

    const newFiles = files(key, { read: function(filepath) {

      return path.relative('', filepath);

    }});

    each(newFiles, function(filepath) {

      upload.push({
        local: filepath,
        remote: path.join(value, path.basename(filepath)),
        included: true
      });

    });

  });

  logger.spaced(3, chalk.green(`[included ${upload.length} files]`));

  settings.queue.upload = settings.queue.upload.concat(upload);

  return Promise.resolve(settings);

};
