var path = require('path');

module.exports = function(file) {

  return path.normalize(file).replace(/\\+/g, '/');

};
