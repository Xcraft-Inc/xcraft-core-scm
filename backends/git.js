'use strict';

const watt = require('gigawatts');
const xSubst = require('xcraft-core-subst');

const updateCache = watt(function*(xProcess, resp, args, dest, next) {
  const remotes = [];

  yield xProcess.spawn('git', args, {cwd: dest}, next, row =>
    remotes.push(row.replace(/^submodule.*url/, '').trim())
  );

  for (const remote of remotes) {
    resp.log.info(`add / update ${remote} in cache`);
    yield xProcess.spawn('git', ['cache', 'add', remote], {}, next);
    yield xProcess.spawn('git', ['cache', 'update', remote], {}, next);
  }
});

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
  const path = require('path');

  /* Clone the main repository */

  if (process.env.GIT_CACHE_DIR) {
    yield xProcess.spawn('git', ['cache', 'init'], {}, next);

    resp.log.info(`add / update ${uri} in cache`);
    yield xProcess.spawn('git', ['cache', 'add', uri], {}, next);
    yield xProcess.spawn('git', ['cache', 'update', uri], {}, next);
  }

  let args = ['clone', '--progress'];

  if (process.env.GIT_CACHE_DIR) {
    args.push('--reference');
    args.push(process.env.GIT_CACHE_DIR);
  }

  args.push(uri);
  args.push(dest);
  yield xProcess.spawn('git', args, {}, next);

  if (!fs.existsSync(destPath)) {
    return 'nothing cloned';
  }

  /* Checkout the right reference */

  if (!ref) {
    ref = 'master';
  }

  yield xProcess.spawn('git', ['checkout', ref], {cwd: dest}, next);

  /* Update all submodules */

  const hasSubmodules = fs.existsSync(path.join(dest, './.gitmodules'));

  if (process.env.GIT_CACHE_DIR && hasSubmodules) {
    yield xProcess.spawn('git', ['submodule', 'init'], {cwd: dest}, next);

    const args = ['config', '--get-regexp', 'submodule\\..*\\.url'];
    yield updateCache(xProcess, resp, args, dest);
  }

  args = ['submodule', 'update', '--init', '--recursive'];

  if (process.env.GIT_CACHE_DIR) {
    args.push('--reference');
    args.push(process.env.GIT_CACHE_DIR);
  }

  yield xProcess.spawn('git', args, {cwd: dest}, next);

  if (process.env.GIT_CACHE_DIR && hasSubmodules) {
    const args = [
      'submodule',
      '--quiet',
      'foreach',
      '--recursive',
      'git config --get-regexp submodule\\..*\\.url || true',
    ];
    yield updateCache(xProcess, resp, args, dest);
  }
});

exports.clone = watt(function*(uri, ref, destPath, resp, next) {
  yield xSubst.wrap(
    destPath,
    resp,
    (err, dest, next) => gitClone(err, resp, dest, uri, ref, destPath, next),
    next
  );
});
