'use strict';

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var path = require('path');
var url = require('url');
var http = require('http');
var https = require('https');
var crypto = require('crypto');

var postcss = require('postcss');

function getUrlMeta(string) {
    var reg = /url\((\s*)(['"]?)(.+?)\2(\s*)\)/;
    var match = reg.exec(string);

    return {
        source: match[0],
        before: match[1],
        quote: match[2],
        value: match[3],
        after: match[4],
        parsed: url.parse(match[3])
    };
}

function isRemotePath(filePath) {
    return /^https?:\/\//.test(filePath);
}

function getResourcePath(str, dirname) {
    var filePath;

    if (isRemotePath(str)) {
        filePath = str;
    } else {
        filePath = path.resolve(dirname, url.parse(str).pathname);
    }
    return Promise.resolve(filePath);
}

function getRemoteFileHash(file) {
    return new Promise(function (resolve, reject) {
        var client = /^https/.test(file) ? https : http;
        client.get(file, function (res) {
            var md5 = crypto.createHash('md5');

            res.on('data', function (chunk) {
                md5.update(chunk);
            });

            res.on('end', function () {
                resolve(md5.digest('hex'));
            });
        }).on('error', reject);
    });
}

function getLocalFileHash(file) {
    return fs.readFileAsync(file).then(function (contents) {
        return crypto.createHash('md5').update(contents).digest('hex');
    });
}

function getHash() {
    return function (filepath) {
        if (isRemotePath(filepath)) {
            return getRemoteFileHash(filepath);
        }
        return getLocalFileHash(filepath);
    };
}

function createUrl(urlMeta, opts) {
    return function (hash) {
        urlMeta.value = opts.replacer(urlMeta.value, hash);
        return 'url(' +
            urlMeta.before +
            urlMeta.quote +
            urlMeta.value +
            urlMeta.quote +
            urlMeta.after +
        ')';
    };
}

function defaultReplacer(hashLength) {
    hashLength = Math.max(0, hashLength || 10);

    return function (str, hash) {
        var urlObj = url.parse(str, true);
        var length = Math.min(hashLength, hash.length);

        urlObj.query.v = hash.slice(0, length);
        delete urlObj.search;

        return url.format(urlObj);
    };
}


function processDecl(result, decl, from, opts) {
    var inputfile = decl.source && decl.source.input && decl.source.input.file;
    var dirname = inputfile ? path.dirname(inputfile) : path.dirname(from);
    var urlMeta = getUrlMeta(decl.value);

    // ignore absolute urls, hashes or data uris
    if (urlMeta.value.indexOf('/') === 0 ||
        urlMeta.value.indexOf('data:') === 0 ||
        urlMeta.value.indexOf('#') === 0
    ) {
        return Promise.resolve();
    }

    // do not handle the http/https urls if `includeRemote` is false
    if (!opts.includeRemote && isRemotePath(urlMeta.value)) {
        return Promise.resolve();
    }

    return getResourcePath(urlMeta.value, dirname)
        .then(getHash())
        .then(createUrl(urlMeta, opts))
        .then(function (newUrl) {
            decl.value = newUrl;
        });
}

module.exports = postcss.plugin('postcss-urlrev', function (opts) {
    opts = opts || {};
    opts.replacer = opts.replacer || defaultReplacer(opts.hashLength);

    return function (css, result) {
        var from = result.opts.from
            ? path.resolve(result.opts.from)
            : '.';

        var actions = [];
        css.eachDecl(function (decl) {
            if (decl.value && decl.value.indexOf('url(') > -1) {
                actions.push(processDecl(result, decl, from, opts));
            }
        });

        return Promise.all(actions);
    };
});
