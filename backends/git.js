'use strict';

const watt = require('gigawatts');
const xSubst = require('xcraft-core-subst');
const path = require('path');
const fse = require('fs-extra');

const gitProc = (xProcess) =>
  watt(function* (args, cwd, next) {
    if (!next) {
      next = cwd;
      cwd = null;
    }
    yield xProcess.spawn(
      'git',
      ['-c', 'core.longpaths=true', ...args],
      cwd ? {cwd} : {},
      next
    );
  });

const gitCache = watt(function* (git, resp, remote) {
  resp.log.info(`add / update ${remote} in cache`);
  yield git(['cache', 'add', remote]);
  yield git(['cache', 'update', remote]);
});

const updateCache = watt(function* (xProcess, git, resp, args, dest, next) {
  const remotes = [];

  yield xProcess.spawn('git', args, {cwd: dest}, next, (row) =>
    remotes.push(row.replace(/^submodule.*url/, '').trim())
  );

  for (const remote of remotes) {
    gitCache(git, resp, remote, next.parallel());
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

  const git = gitProc(xProcess);

  /* Clone the main repository */

  if (process.env.GIT_CACHE_DIR) {
    yield git(['cache', 'init']);

    resp.log.info(`add / update ${uri} in cache`);
    yield git(['cache', 'add', uri]);
    yield git(['cache', 'update', uri]);
  }

  let args = ['clone', '--jobs', '4', '--progress'];

  if (process.env.GIT_CACHE_DIR) {
    args.push('--reference');
    args.push(process.env.GIT_CACHE_DIR);
  }

  args.push(uri);
  args.push(dest);
  yield git(args);

  if (!fse.existsSync(dest)) {
    return 'nothing cloned';
  }

  /* Checkout the right reference */

  if (!ref) {
    ref = 'master';
  }

  yield git(['checkout', ref], dest);
  yield xProcess.spawn(
    'git',
    ['-c', 'core.longpaths=true', 'rev-parse', 'HEAD'],
    {cwd: dest},
    next,
    (_ref) => (ref = _ref.trim())
  );

  /* Update all submodules */

  const hasSubmodules =
    externals && fse.existsSync(path.join(dest, './.gitmodules'));

  if (process.env.GIT_CACHE_DIR && hasSubmodules) {
    yield git(['-c', 'core.longpaths=true', 'submodule', 'init'], dest);

    const args = ['config', '--get-regexp', 'submodule\\..*\\.url'];
    yield updateCache(xProcess, git, resp, args, dest);
  }

  if (hasSubmodules) {
    args = ['submodule', 'update', '--jobs', '4', '--init', '--recursive'];

    if (process.env.GIT_CACHE_DIR) {
      args.push('--reference');
      args.push(process.env.GIT_CACHE_DIR);
    }

    yield git(args, dest);

    if (process.env.GIT_CACHE_DIR) {
      const args = [
        'submodule',
        '--quiet',
        'foreach',
        '--recursive',
        'git config --get-regexp submodule\\..*\\.url || true',
      ];
      yield updateCache(xProcess, git, resp, args, dest);
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
    ['-c', 'core.longpaths=true', 'ls-remote', '-q', remote, refname],
    {},
    next,
    (_ref) => (ref = _ref.trim().split(/[ \t]+/)[0])
  );

  return ref;
});
