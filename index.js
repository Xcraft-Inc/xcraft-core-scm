'use strict';

var path = require ('path');
var xFs  = require ('xcraft-core-fs');

var backendsRoot = path.join (__dirname, 'backends');
var backends = {};

var backendsCmd = xFs.ls (backendsRoot, /\.js$/);

backendsCmd.forEach (function (cmd) {
  var cmdName = cmd.replace (/\.js$/, '');
  backends[cmdName] = require (path.join (backendsRoot, cmd));
});

module.exports = backends;
