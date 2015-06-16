'use strict';

import Promise from 'bluebird';
import each from 'lodash.foreach';
import spawn from '../util/spawn';

export default {

  parse(submodules) {

    const actions = [];

    each(submodules, (dest, sub) => {

      actions.push(() => {

        return spawn('git', '-C', sub, 'rev-parse', 'HEAD').then((hash) => {

          let obj = {};
          obj[sub] = { hash, dest };
          return obj;

        });

      });

    });

    return Promise.reduce(actions, (values, action) => {

      return action().then((value) => {

        values.push(value);
        return values;

      });

    }, []);

  }

};
