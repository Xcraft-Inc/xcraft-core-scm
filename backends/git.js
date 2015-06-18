'use strict';

var xProcess  = require ('xcraft-core-process') ();
var xFs       = require ('xcraft-core-fs');
var xPath     = require ('xcraft-core-path');
var xPlatform = require ('xcraft-core-platform');
var Subst     = require ('xcraft-core-subst');

exports.clone = function (uri, ref, destPath, callback) {
  var async = require ('async');
  var fs    = require ('fs');
  var path  = require ('path');

  var subst = null;
  var mountDir = path.dirname (destPath);
  var mountDest = '';

  xFs.mkdir (mountDir);

  var gitBin  = 'git' + xPlatform.getExecExt ();
  var gitPath = path.dirname (xPath.isIn (gitBin).location);

  /* FIXME: like for etc/path, we should have an etc/env in order to load all
   * environment variables installed by a package. GIT_EXEC_PATH should be
   * deployed in an etc/env/bootstrap+git.json file.
   */
  var env = process.env;
  if (xPlatform.getOs () !== 'win') {
    env.GIT_EXEC_PATH = path.join (gitPath, '../libexec/git-core');
  }

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

      xProcess.spawn ('git', args, {env: env}, callback);
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

      xProcess.spawn ('git', args, {env: env, cwd: mountDest}, callback);
    },

    function (callback) {
      var args = [
        'submodule',
        'update',
        '--init',
        '--recursive'
      ];

      xProcess.spawn ('git', args, {env: env, cwd: mountDest}, callback);
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
