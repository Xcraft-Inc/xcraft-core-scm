'use strict';

var zogProcess = require ('zogProcess');

exports.clone = function (uri, destPath, callbackDone) {
  var args = [
    'clone',
    uri,
    destPath
  ];

  zogProcess.spawn ('git', args, callbackDone);
};
