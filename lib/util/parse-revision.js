'use strict';


export default function(revision) {

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

      revision.on('data', (chunk) => body += chunk);

      revision.on('end', () => {

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
