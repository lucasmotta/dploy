'use strict';

module.exports = function(revision) {

  return new Promise(function(resolve) {

    let json;
    let body = '';

    if (typeof revision === 'string') {

      try {

        json = JSON.parse(revision);

      } catch (e) {

        json = { hash: revision.replace(/[\W]/g, '') };

      }

      resolve(json);

    } else {

      revision.on('data', function(chunk) {

        body += chunk;

      });

      revision.on('end', function() {

        try {

          json = JSON.parse(body);

        } catch (e) {

          json = { hash: body.replace(/[\W]/g, '') };

        }

        resolve(json);

      });

    }

  });


};
