'use strict';

var xProcess = require ('xcraft-core-process');

exports.clone = function (uri, destPath, callbackDone) {
  var args = [
    'clone',
    uri,
    destPath
  ];

  xProcess.spawn ('git', args, callbackDone);
};
