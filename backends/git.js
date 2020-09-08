'use strict';

const watt = require('gigawatts');
const xSubst = require('xcraft-core-subst');

const gitCache = watt(function* (xProcess, resp, remote, next) {
  resp.log.info(`add / update ${remote} in cache`);
  yield xProcess.spawn('git', ['cache', 'add', remote], {}, next);
  yield xProcess.spawn('git', ['cache', 'update', remote], {}, next);
});

const updateCache = watt(function* (xProcess, resp, args, dest, next) {
  const remotes = [];

  yield xProcess.spawn('git', args, {cwd: dest}, next, (row) =>
    remotes.push(row.replace(/^submodule.*url/, '').trim())
  );

  for (const remote of remotes) {
    gitCache(xProcess, resp, remote, next.parallel());
  }
  yield next.sync();
});

const gitClone = watt(function* (
  err,
  resp,
  dest,
  {uri, ref, out, externals},
  next
) {
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

  let args = ['clone', '--jobs', '4', '--progress'];

  if (process.env.GIT_CACHE_DIR) {
    args.push('--reference');
    args.push(process.env.GIT_CACHE_DIR);
  }

  args.push(uri);
  args.push(dest);
  yield xProcess.spawn('git', args, {}, next);

  if (!fs.existsSync(out)) {
    return 'nothing cloned';
  }

  /* Checkout the right reference */

  if (!ref) {
    ref = 'master';
  }

  yield xProcess.spawn('git', ['checkout', ref], {cwd: dest}, next);
  yield xProcess.spawn(
    'git',
    ['rev-parse', 'HEAD'],
    {cwd: dest},
    next,
    (_ref) => (ref = _ref.trim())
  );

  /* Update all submodules */

  const hasSubmodules =
    externals && fs.existsSync(path.join(dest, './.gitmodules'));

  if (process.env.GIT_CACHE_DIR && hasSubmodules) {
    yield xProcess.spawn('git', ['submodule', 'init'], {cwd: dest}, next);

    const args = ['config', '--get-regexp', 'submodule\\..*\\.url'];
    yield updateCache(xProcess, resp, args, dest);
  }

  if (hasSubmodules) {
    args = ['submodule', 'update', '--jobs', '4', '--init', '--recursive'];

    if (process.env.GIT_CACHE_DIR) {
      args.push('--reference');
      args.push(process.env.GIT_CACHE_DIR);
    }

    yield xProcess.spawn('git', args, {cwd: dest}, next);

    if (process.env.GIT_CACHE_DIR) {
      const args = [
        'submodule',
        '--quiet',
        'foreach',
        '--recursive',
        'git config --get-regexp submodule\\..*\\.url || true',
      ];
      yield updateCache(xProcess, resp, args, dest);
    }
  }

  return ref;
});

exports.clone = watt(function* (options, resp, next) {
  return yield xSubst.wrap(
    options.out,
    resp,
    (err, dest, next) => gitClone(err, resp, dest, options, next),
    next
  );
});

exports.remoteRef = watt(function* (remote, refname, resp, next) {
  let ref = null;

  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    parser: 'git',
    resp,
  });

  yield xProcess.spawn(
    'git',
    ['ls-remote', '-q', remote, refname],
    {},
    next,
    (_ref) => (ref = _ref.trim().split(/[ \t]+/)[0])
  );

  return ref;
});
