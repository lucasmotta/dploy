'use strict';


const isEqual = require('lodash.isequal');
const Promise = require('bluebird');

let service = null;


module.exports = {

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
        reason: 'No changes found'
      });

    }

    return Promise.resolve(settings);

  },


  getFiles(settings) {

    return service.getFiles(settings);

  }

};
