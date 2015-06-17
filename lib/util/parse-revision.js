'use strict';


function parse(revision) {

  let json;

  try {

    json = JSON.parse(revision);

  } catch (e) {

    json = { hash: revision.replace(/[\W]/g, '') };

  }

  return json;

};


export default function(revision) {

  return new Promise(function(resolve) {

    let json;
    let body = '';

    if (typeof revision === 'string') {

      resolve(parse(revision));

    } else {

      revision.on('data', (chunk) => body += chunk);

      revision.on('end', () => resolve(parse(body)));

    }

  });


};
