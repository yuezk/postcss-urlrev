'use strict';

var fs = require('fs');
var path = require('path');
var url = require('url');
var http = require('http');
var https = require('https');
var crypto = require('crypto');

var postcss = require('postcss');

/**
 * Return `true` if the given path is http/https
 *
 * @param  {String}  filePath - path
 * @return {Boolean}
 */

function isRemotePath(filePath) {
    return /^(?:https?:)?\/\//.test(filePath);
}

function normalizeUrl(url) {
    return /^\/\//.test(url) ? 'http:' + url : url;
}

/**
 * Return `true` if the given filePath is an absolute url
 *
 * @param  {String}  filePath - path
 * @return {Boolean}
 */

function isAbsolutePath(filePath) {
    return /^\/(?!\/)/.test(filePath);
}

/**
 * Whether or not the url should be inluded
 *
 * @param  {Object} meta - url meta info
 * @param  {Object} opts - options
 * @return {Boolean}
 */

function validUrl(meta, opts) {
    // ignore hashes or data uris
    if (meta.value.indexOf('data:') === 0 || meta.value.indexOf('#') === 0) {
        return false;
    }

    if (!opts.absolutePath && isAbsolutePath(meta.value)) {
        return false;
    }

    // do not handle the http/https urls if `includeRemote` is false
    if (!opts.includeRemote && isRemotePath(meta.value)) {
        return false;
    }

    return true;
}

/**
 * Get all `url()`s, and return the meta info
 *
 * @param  {String} value - decl.value
 * @param  {Object} opts  - options
 * @return {Array}        - the urls
 */

function getUrls(value, opts) {
    var reg = /url\((\s*)(['"]?)(.+?)\2(\s*)\)/g;
    var match;
    var urls = [];

    while ((match = reg.exec(value)) !== null) {
        var meta = {
            source: match[0],
            before: match[1],
            quote: match[2],
            value: match[3],
            after: match[4]
        };
        if (validUrl(meta, opts)) {
            urls.push(meta);
        }
    }
    return urls;
}

/**
 * Get the absolute path of the url, relative to the basePath
 *
 * @param  {String} str          - the url
 * @param  {String} relativePath - the relative path
 * @param  {String} absolutePath - the absolute path
 * @return {String}              - the full path to the file
 */

function getResourcePath(str, relativePath, absolutePath) {
    var pathname = url.parse(str).pathname;
    var filePath;

    if (isRemotePath(str)) {
        filePath = str;
    } else if (isAbsolutePath(str)) {
        filePath = path.join(absolutePath, pathname);
    } else {
        filePath = path.resolve(relativePath, pathname);
    }
    return Promise.resolve(filePath);
}

/**
 * Get the hash value of the remote resource
 *
 * @param  {String} file - the remote path
 * @return {Promise}     - the Promise
 */

function getRemoteFileHash(file) {
    return new Promise(function (resolve, reject) {
        var client = /^https/.test(file) ? https : http;
        client.get(normalizeUrl(file), function (res) {
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

/**
 * Get the hash value of the local resource
 *
 * @param  {String} file - the local path
 * @return {Promise}     - the Promise
 */

function getLocalFileHash(file) {
    return new Promise(function (resolve, reject) {
        fs.readFile(file, function (err, contents) {
            if (err) return reject(err);
            resolve(crypto.createHash('md5').update(contents).digest('hex'));
        });
    });
}

/**
 * Get the hash function
 *
 * @param  {Object} opts - the options
 * @return {Function}    - the hash function
 */

function getHash(opts) {
    /**
     * Get the hash of the given path
     *
     * @param  {String} filePath - the file path
     * @return {Promise}         - the Promise
     */

    return function hashFunction(filePath) {
        if (typeof opts.hashFunction === 'function') {
            return opts.hashFunction(filePath, path.basename(filePath));
        }
        if (isRemotePath(filePath)) {
            return getRemoteFileHash(filePath);
        }
        return getLocalFileHash(filePath);
    };
}

/**
 * Generate a url() creator based on the url meta info and the options.
 * The creator receive a hash as its parameter
 *
 * @param  {Object} meta - the url meta info
 * @param  {Object} opts - the options
 * @return {Function}    - the url creator
 */

function createUrl(meta, opts) {
    return function (hash) {
        meta.value = opts.replacer(meta.value, hash);
        return 'url(' +
            meta.before +
            meta.quote +
            meta.value +
            meta.quote +
            meta.after +
        ')';
    };
}

/**
 * Generate a default replacer based on the hashLength parameter
 *
 * @param  {Number} hashLength - the hash length
 * @return {Function}          - the replacer function
 */

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

/**
 * Process the single `url()` pattern
 *
 * @param  {String} relativePath - the relativePath relative to
 * @param  {Object} opts         - the options
 * @return {Promise}             - the Promise
 */

function processUrl(relativePath, opts) {
    return function (meta) {
        return getResourcePath(meta.value, relativePath, opts.absolutePath)
            .then(getHash(opts))
            .then(createUrl(meta, opts))
            .then(function (newUrl) {
                meta.newUrl = newUrl;
                return meta;
            });
    };
}

/**
 * Replace the raw value's `url()` segment to the new value
 *
 * @param  {String} raw - the raw value
 * @return {String}     - the new value
 */

function repalceUrls(raw) {
    return function (urls) {
        urls.forEach(function (item) {
            raw = raw.replace(item.source, item.newUrl);
        });

        return raw;
    };
}

/**
 * The error handler
 *
 * @param  {Object} result - the postcss result object
 * @param  {Object} decl   - the postcss declaration
 * @return {Function}      - the error handler
 */

function handleError(result, decl) {
    return function (err) {
        result.warn(err.message || err, {node: decl});
    };
}

/**
 * Process one declaration
 *
 * @param  {Object} result - the postcss result object
 * @param  {Object} decl   - the postcss declaration
 * @param  {String} from   - source
 * @param  {Object} opts   - the plugin options
 * @return {Promise}       - the Promise
 */

function processDecl(result, decl, from, opts) {
    var inputfile = decl.source && decl.source.input && decl.source.input.file;
    var dirname = inputfile ? path.dirname(inputfile) : path.dirname(from);
    var relativePath = opts.basePath || opts.relativePath || dirname;
    var actions = getUrls(decl.value, opts).map(processUrl(relativePath, opts));

    return Promise.all(actions)
        .then(repalceUrls(decl.value))
        .then(function (newValue) {
            decl.value = newValue;
        })
        .catch(handleError(result, decl));
}

module.exports = postcss.plugin('postcss-urlrev', function (opts) {
    opts = opts || {};
    opts.replacer = opts.replacer || defaultReplacer(opts.hashLength);

    return function (css, result) {
        var from = result.opts.from ?
            path.resolve(result.opts.from) :
            '.';

        var actions = [];
        css.walkDecls(function (decl) {
            if (decl.value && decl.value.indexOf('url(') > -1) {
                actions.push(processDecl(result, decl, from, opts));
            }
        });

        return Promise.all(actions);
    };
});
