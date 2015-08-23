'use strict';

var moduleName = 'scm/git';

var xProcess  = require ('xcraft-core-process') ({
  logger: 'xlog',
  parser: 'git',
  mod:    moduleName,
  events: true
});
var xEnv      = require ('xcraft-core-env');
var xPlatform = require ('xcraft-core-platform');
var xSubst    = require ('xcraft-core-subst');

exports.clone = function (uri, ref, destPath, callback) {
  var async = require ('async');
  var fs    = require ('fs');
  var path  = require ('path');

  xSubst.wrap (destPath, function (err, dest, callback) {
    if (err) {
      callback (err);
      return;
    }

    var gitBin  = 'git' + xPlatform.getExecExt ();
    var gitPath = path.dirname (xEnv.var.path.isIn (gitBin).location);

    /* FIXME: like for etc/path, we should have an etc/env in order to load all
     * environment variables installed by a package. GIT_EXEC_PATH should be
     * deployed in an etc/env/torvalds+git.json file.
     */
    var env = process.env;
    if (xPlatform.getOs () !== 'win') {
      env.GIT_EXEC_PATH = path.join (gitPath, '../libexec/git-core');
      env.GIT_TEMPLATE_DIR = path.join (gitPath, '../share/git-core/templates');
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

        xProcess.spawn ('git', args, {env: env, cwd: dest}, callback);
      },

      function (callback) {
        var args = [
          'submodule',
          'update',
          '--init',
          '--recursive'
        ];

        xProcess.spawn ('git', args, {env: env, cwd: dest}, callback);
      }
    ], callback);
  }, callback);
};
