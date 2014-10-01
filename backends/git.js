'use strict';

var zogProcess = require ('xcraft-core-process');

exports.clone = function (uri, destPath, callbackDone) {
  var args = [
    'clone',
    uri,
    destPath
  ];

  zogProcess.spawn ('git', args, callbackDone);
};
