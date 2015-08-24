var fs = require('fs');
var path = require('path');
var postcss = require('postcss');
var expect  = require('chai').expect;
var express = require('express');
var plugin = require('../');
require('mocha');

var app = express();
var server;
app.use(express.static(path.join(__dirname, 'fixtures')));

// md5 images/test.png => e19ac7dee652fdbcbaa7cf7f3b998fa1
// md5 images/test.svg => 7647d178899148ad0a37527990d14754
// md5 images/postcss.png => fc586a14d21f0db23f8d2dc58e62ff6c
// md5 test-local.css => 85c1934d3ceb0ae4c4b7f6f3814a79c9

var test = function (input, output, opts, done) {
    var css = fs.readFileSync(input, 'utf-8');
    var expected = fs.readFileSync(output, 'utf-8');

    postcss([plugin(opts)])
        .process(css, { from: input })
        .then(function (result) {
            expect(result.css).to.eql(expected);
            expect(result.warnings()).to.be.empty;
            done();
        }).catch(function (error) {
            done(error);
        });
};

before(function (done) {
    server = app.listen(10010, function () {
        var host = server.address().address;
        var port = server.address().port;
        console.log('Test server listening at http://%s:%s', host, port);

        done();
    });
});

after(function () {
    server.close();
});

describe('postcss-urlrev', function () {
    it(
        'should add the local file\'s md5 hash to the end of the url',
        function (done) {
            var input = 'test/fixtures/test-local.css';
            var output = 'test/fixtures/expected/test-local.css';
            test(input, output, { }, done);
        }
    );

    it(
        'should skip the data uri',
        function (done) {
            var input = 'test/fixtures/test-datauri.css';
            var output = 'test/fixtures/expected/test-datauri.css';
            test(input, output, { }, done);
        }
    );

    it(
        'should skip the absolute path',
        function (done) {
            var input = 'test/fixtures/test-absolute.css';
            var output = 'test/fixtures/expected/test-absolute.css';
            test(input, output, { }, done);
        }
    );

    it(
        'should append the hash to the end of the url if ' +
        'other parameter already exists in the querystring',
        function (done) {
            var input = 'test/fixtures/test-append-hash.css';
            var output = 'test/fixtures/expected/test-append-hash.css';
            test(input, output, { }, done);
        }
    );

    it(
        'should replace the value of `v`, if ' +
        '`v` already exists in the query string',
        function (done) {
            var input = 'test/fixtures/test-replace-hash.css';
            var output = 'test/fixtures/expected/test-replace-hash.css';
            test(input, output, { }, done);
        }
    );

    it(
        'should add custom hash when the `opts.replacer` is specified',
        function (done) {
            var input = 'test/fixtures/test-replacer.css';
            var output = 'test/fixtures/expected/test-replacer.css';
            var replacer = function (url, hash) {
                return url + '?' + hash;
            };
            test(input, output, { replacer: replacer }, done);
        }
    );

    it(
        'should handle the remote url if the `opts.includeRemote` is specified',
        function (done) {
            var input = 'test/fixtures/test-remote.css';
            var output = 'test/fixtures/expected/test-remote.css';
            test(input, output, { includeRemote: true }, done);
        }
    );

    it(
        'should substitude the hash if the `opts.hashLength` is specified',
        function (done) {
            var input = 'test/fixtures/test-hash-length.css';
            var output = 'test/fixtures/expected/test-hash-length.css';
            test(input, output, { hashLength: 22 }, done);
        }
    );

    it(
        'should append empty hash when the `opts.hashLength` is less than zero',
        function (done) {
            var input = 'test/fixtures/test-hash-length-zero.css';
            var output = 'test/fixtures/expected/test-hash-length-zero.css';
            test(input, output, { hashLength: -1 }, done);
        }
    );

    it(
        'should append full hash if the `opts.hashLength` ' +
        'is greater than the length of hash',
        function (done) {
            var input = 'test/fixtures/test-hash-length-max.css';
            var output = 'test/fixtures/expected/test-hash-length-max.css';
            test(input, output, { hashLength: 100 }, done);
        }
    );

    it(
        'should not affect other value in the background property',
        function (done) {
            var input = 'test/fixtures/test-url-other.css';
            var output = 'test/fixtures/expected/test-url-other.css';
            test(input, output, { }, done);
        }
    );

    it(
        'should append hash to each url() in the background property',
        function (done) {
            var input = 'test/fixtures/test-multi-url.css';
            var output = 'test/fixtures/expected/test-multi-url.css';
            test(input, output, { }, done);
        }
    );
});
