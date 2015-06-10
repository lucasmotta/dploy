'use strict';

const Promise = require('bluebird');
const files = require('map-files');
const each = require('lodash.foreach');
const path = require('path');
const logger = require('../logger');

module.exports = function(settings) {

  if (!Object.keys(settings.include).length || settings.catchup) {

    return Promise.resolve(settings);

  }

  const upload = [];

  logger.spaced(1, logger.chalk.yellow('Including files...'));

  each(settings.include, function(value, key) {

    const newFiles = files(key, { read: function(filepath) {

      return path.relative('', filepath);

    }});

    each(newFiles, function(filepath) {

      upload.push({
        local: filepath,
        remote: path.join(value, path.basename(filepath))
      });

    });

  });

  logger.spaced(3, logger.chalk.green(`[included ${upload.length} files]`));

  settings.queue.upload = settings.queue.upload.concat(upload);

  return Promise.resolve(settings);

};
