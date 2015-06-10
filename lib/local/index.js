'use strict';


let service = null;


module.exports = {

  getRevision(settings) {

    service = service || require('./' + settings.diff);
    return service.getRevision(settings);

  },


  getFiles(settings) {

    return service.getFiles(settings);

  }

};
