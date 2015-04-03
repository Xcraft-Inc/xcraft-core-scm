'use strict';

var xProcess = require ('xcraft-core-process');

exports.clone = function (uri, destPath, callback) {
  var args = [
    'clone',
    '--depth', '1',
    uri,
    destPath
  ];

  xProcess.spawn ('git', args, {}, callback);
};
