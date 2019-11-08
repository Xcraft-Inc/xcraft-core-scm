'use strict';

const watt = require('gigawatts');
const xSubst = require('xcraft-core-subst');

const svnCheckout = watt(function*(
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
    resp,
  });

  const fs = require('fs');

  /* Checkout the repository */

  if (!ref) {
    ref = 'HEAD';
  }

  let args = ['checkout', '--revision', ref];

  if (!externals) {
    args.push('--ignore-externals');
  }

  args.push(uri);
  args.push(dest);
  yield xProcess.spawn('svn', args, {}, next);

  if (!fs.existsSync(out)) {
    return 'nothing checked out';
  }

  /* Retrieve the revision */

  yield xProcess.spawn(
    'svn',
    ['info', '--show-item', 'revision'],
    {cwd: dest},
    next,
    _ref => (ref = _ref.trim())
  );

  return ref;
});

exports.clone = watt(function*(options, resp, next) {
  return yield xSubst.wrap(
    options.out,
    resp,
    (err, dest, next) => svnCheckout(err, resp, dest, options, next),
    next
  );
});

exports.remoteRef = watt(function*(remote, refname, resp, next) {
  let ref = null;

  const xProcess = require('xcraft-core-process')({
    logger: 'xlog',
    resp,
  });

  yield xProcess.spawn(
    'svn',
    ['info', '--show-item', 'revision'],
    {},
    next,
    _ref => (ref = _ref.trim())
  );

  return ref;
});
