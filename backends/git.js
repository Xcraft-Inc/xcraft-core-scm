'use strict';

var moduleName = 'scm/git';

var xProcess  = require ('xcraft-core-process') ({
  logger: 'xlog',
  parser: 'git',
  mod:    moduleName,
  events: true
});
var xSubst    = require ('xcraft-core-subst');

exports.clone = function (uri, ref, destPath, callback) {
  var async = require ('async');
  var fs    = require ('fs');

  xSubst.wrap (destPath, function (err, dest, callback) {
    if (err) {
      callback (err);
      return;
    }

    async.series ([
      function (callback) {
        var args = [
          'clone',
          '--progress',
          '--recursive',
          uri,
          dest
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

        xProcess.spawn ('git', args, {cwd: dest}, callback);
      },

      function (callback) {
        var args = [
          'submodule',
          'update',
          '--init',
          '--recursive'
        ];

        xProcess.spawn ('git', args, {cwd: dest}, callback);
      }
    ], callback);
  }, callback);
};
