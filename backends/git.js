'use strict';

var xProcess = require ('xcraft-core-process') ();

exports.clone = function (uri, ref, destPath, callback) {
  var async = require ('async');
  var fs    = require ('fs');

  async.series ([
    function (callback) {
      var args = [
        'clone',
        '--recursive',
        '--depth', '1',
        uri,
        destPath
      ];

      xProcess.spawn ('git', args, {}, callback);
    },

    function (callback) {
      if (!fs.existsSync (destPath)) {
        callback ('nothing cloned');
        return;
      }

      if (!ref) {
        ref = 'master';
      }

      var args = [
        'checkout',
        ref
      ];

      xProcess.spawn ('git', args, {cwd: destPath}, callback);
    }
  ], callback);
};
