'use strict';

const Promise = require('bluebird');
const each = require('lodash.foreach');
const spawn = require('../util/spawn');

module.exports = {

  parse(submodules) {

    const actions = [];

    each(submodules, function(dest, submodule) {

      actions.push(function() {

        return spawn('git', '-C', submodule, 'rev-parse', 'HEAD')
        .then(function(res) {

          let obj = {};
          obj[submodule] = { hash: res, dest: dest };
          return obj;

        });

      });

    });

    return Promise.reduce(actions, function(values, action) {

      return action().then(function(value) {

        values.push(value);
        return values;

      });

    }, []);

  }

};
