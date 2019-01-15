'use strict';

const watt = require('gigawatts');
const xSubst = require('xcraft-core-subst');

const gitClone = watt(function*(err, resp, dest, uri, ref, destPath, next) {
  if (err) {
    throw err;
  }

  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    parser: 'git',
    resp,
  });

  const fs = require('fs');

  const args = ['clone', '--progress', '--recursive', uri, dest];
  yield xProcess.spawn('git', args, {}, next);

  if (!fs.existsSync(destPath)) {
    return 'nothing cloned';
  }

  if (!ref) {
    ref = 'master';
  }

  yield xProcess.spawn('git', ['checkout', ref], {cwd: dest}, next);
  yield xProcess.spawn(
    'git',
    ['submodule', 'update', '--init', '--recursive'],
    {cwd: dest},
    next
  );
});

exports.clone = watt(function*(uri, ref, destPath, resp, next) {
  yield xSubst.wrap(
    destPath,
    resp,
    (err, dest, next) => gitClone(err, resp, dest, uri, ref, destPath, next),
    next
  );
});
