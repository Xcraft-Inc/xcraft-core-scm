'use strict';

const watt = require('gigawatts');
const path = require('path');
const fse = require('fs-extra');

class OnceByDay {
  #day = {};

  constructor(index) {
    return (func) => {
      const self = this;
      return watt(function* (...args) {
        const id = args[index];
        if (self._try(id)) {
          yield func(...args);
        }
      });
    };
  }

  _try(id) {
    const day = new Date().getDate();
    if (this.#day[id] !== day) {
      this.#day[id] = day;
      return true;
    }
    return false;
  }
}

const gitProc = (xProcess) =>
  watt(
    function* (next, args, cwd, stdout) {
      yield xProcess.spawn(
        'git',
        ['-c', 'core.longpaths=true', ...args],
        cwd ? {cwd} : {},
        next,
        stdout
      );
    },
    {prepend: true}
  );

const gitCache = new OnceByDay(2)(
  watt(function* (git, resp, remote) {
    resp.log.info(`add / update ${remote} in cache`);
    yield git(['cache', 'add', remote]);
    yield git(['cache', 'update', remote]);
  })
);

const updateCache = watt(function* (git, resp, args, dest, next) {
  const remotes = [];

  yield git(
    args,
    dest,
    (row) => remotes.push(row.replace(/^submodule.*url/, '').trim()),
    next
  );

  for (const remote of remotes) {
    gitCache(git, resp, remote, next.parallel());
  }

  try {
    yield next.sync();
  } catch (ex) {
    resp.log.warn('git-cache error, continue...', ex.stack || ex.message || ex);
  }
});

const gitClone = watt(function* (resp, dest, {uri, ref, externals}, next) {
  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    parser: 'git',
    resp,
  });

  const git = gitProc(xProcess);

  /* Clone the main repository */

  try {
    if (process.env.GIT_CACHE_DIR) {
      yield git(['cache', 'init']);
      yield gitCache(git, resp, uri);
    }
  } catch (ex) {
    resp.log.warn('git-cache error, continue...', ex.stack || ex.message || ex);
  }

  let args = ['clone', '--jobs', '2', '--progress'];

  if (process.env.GIT_CACHE_DIR) {
    args.push('--reference-if-able');
    args.push(process.env.GIT_CACHE_DIR);
  }

  args.push(uri);
  args.push(dest);
  yield git(args);

  if (!fse.existsSync(dest)) {
    return 'nothing cloned';
  }

  yield git(['config', '--local', 'core.longpaths', 'true'], dest);

  /* Checkout the right reference */

  if (!ref) {
    ref = 'master';
  }

  yield git(['checkout', ref], dest);
  yield git(['rev-parse', 'HEAD'], dest, (_ref) => (ref = _ref.trim()), next);

  /* Update all submodules */

  const hasGitmodules = fse.existsSync(path.join(dest, './.gitmodules'));
  const hasSubmodules = externals && hasGitmodules;

  if (process.env.GIT_CACHE_DIR && hasGitmodules) {
    yield git(['submodule', 'init'], dest);

    const args = ['config', '--get-regexp', 'submodule\\..*\\.url'];
    yield updateCache(git, resp, args, dest);
  }

  if (hasSubmodules) {
    args = ['submodule', 'update', '--jobs', '2', '--init', '--recursive'];

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
      yield updateCache(git, resp, args, dest);
    }
  }

  return ref;
});

exports.clone = watt(function* (options, resp) {
  const xcraftConfig = require('xcraft-core-etc')(null, resp).load('xcraft');

  let res;
  const tmp = fse.mkdtempSync(path.join(xcraftConfig.tempRoot, 'git-'));
  try {
    res = yield gitClone(resp, tmp, options);
    fse.moveSync(tmp, options.out);
  } finally {
    fse.removeSync(tmp);
  }

  return res;
});

exports.remoteRef = watt(function* (remote, refname, resp, next) {
  let ref = null;

  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    parser: 'git',
    resp,
  });

  const git = gitProc(xProcess);

  yield git(
    ['ls-remote', '-q', remote, refname],
    null,
    (_ref) => (ref = _ref.trim().split(/[ \t]+/)[0]),
    next
  );

  return ref;
});

exports.localRef = watt(function* (location, resp, next) {
  let ref = null;

  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    parser: 'git',
    resp,
  });

  const git = gitProc(xProcess);

  yield git(
    ['rev-parse', 'HEAD'],
    location,
    (_ref) => (ref = _ref.trim()),
    next
  );

  return ref;
});
