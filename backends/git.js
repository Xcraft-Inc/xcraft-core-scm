'use strict';

var xProcess = require ('xcraft-core-process') ();
var xFs      = require ('xcraft-core-fs');
var Subst    = require ('xcraft-core-subst');

exports.clone = function (uri, ref, destPath, callback) {
  var async = require ('async');
  var fs    = require ('fs');
  var path  = require ('path');

  var subst = null;
  var mountDir = path.dirname (destPath);
  var mountDest = '';

  xFs.mkdir (mountDir);

  async.series ([
    function (callback) {
      subst = new Subst (mountDir);
      subst.mount (function (err, drive) {
        if (err) {
          callback (err);
          return;
        }

        mountDest = path.join (drive, path.basename (destPath));
        callback ();
      });
    },

    function (callback) {
      var args = [
        'clone',
        '--progress',
        '--recursive',
        uri,
        mountDest
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

      xProcess.spawn ('git', args, {cwd: mountDest}, callback);
    },

    function (callback) {
      var args = [
        'submodule',
        'update',
        '--init',
        '--recursive'
      ];

      xProcess.spawn ('git', args, {cwd: mountDest}, callback);
    },

    function (callback) {
      if (!subst) {
        callback ();
        return;
      }

      subst.umount (callback);
    }
  ], callback);
};
