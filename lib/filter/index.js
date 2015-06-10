'use strict';

const map = require('./map');
const include = require('./include');
const exclude = require('./exclude');
const duplicated = require('./duplicated');

const filter = function(settings) {

  return map(settings).then(exclude).then(duplicated);

}

filter.map = map;
filter.include = include;
filter.exclude = exclude;
filter.duplicated = duplicated;

module.exports = filter;
