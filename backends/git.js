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

  xFs.mkdir (mountDir);

  async.series ([
    function (callback) {
      subst = new Subst (mountDir);
      subst.mount (callback);
    },

    function (callback) {
      var args = [
        'clone',
        '--progress',
        '--recursive',
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
    },

    function (callback) {
      var args = [
        'submodule',
        'update',
        '--init',
        '--recursive'
      ];

      xProcess.spawn ('git', args, {cwd: destPath}, callback);
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
