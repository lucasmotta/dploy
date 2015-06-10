'use strict';

const Promise = require('bluebird');
const mm = require('micromatch');
const files = require('map-files');
const each = require('lodash.foreach');
const path = require('path');
const logger = require('../logger');

module.exports = function(settings) {

  if (!Object.keys(settings.map).length || settings.catchup) {

    return Promise.resolve(settings);

  }

  const upload = [];

  logger.spaced(1, logger.chalk.yellow('Mapping files...'));

  each(settings.map, function(value, key) {

    settings.queue.upload.forEach(function(file) {

      if (mm.isMatch(file.local, key)) {

        const newFiles = files(value, { read: function(filepath) {

          return path.relative('', filepath);

        }});

        each(newFiles, function(filepath) {

          if (upload.indexOf(filepath) < 0) {

            upload.push(filepath);

          }

        });

      }

    });

  });

  logger.spaced(3, logger.chalk.green(`[mapped ${upload.length} files]`));

  upload.forEach(function(item) {

    settings.queue.upload.push({
      local: item,
      remote: item.replace(settings.path.local, ''),
      mapped: true
    });

  });

  return Promise.resolve(settings);

};
