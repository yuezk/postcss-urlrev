# postcss-urlrev

> [PostCSS] plugin for css url revision, inspired by [postcss-url]

[![Build Status][ci-img]][ci]
[![Coverage Status][co-img]][co]


```css
/* Input example */
.foo {
    background: url(images/test.png) 0 0 no-repeat;
}
```

```css
/* Output example */
.foo {
    background: url(images/test.png?v=e19ac7dee6) 0 0 no-repeat;
}
```

## Install

For `postcss 6.x`

```sh
npm install --save-dev postcss-urlrev
```

and for `postcss 5.x`

```sh
npm install --save-dev postcss-urlrev@1.x
```

## Usage

```js
var urlrev = require('postcss-urlrev');
postcss(urlrev({ /* options */ }))
```

## Options

### relativePath

Type: `string`  
Default: `the css file's folder`

The `relativePath` is used to calculate the absolute path of the url resource. 
By default, the value is the folder path of the css source file. You should
set this value based on your environment.

### absolutePath

Type: `string`  
Default: `undefined`

The `absolutePath` is used to calculate the absolute path of the url resources that have an absolute path, f.ex. `/images/test.png`. 
If `absolutePath` is not set, absolute url's will be skipped, as the full path to the resource cannot be resolved.

### includeRemote

Type: `boolean`  
Default: `false`

If you set it to `true`, it will handle the remote url, request the remote 
resource and calculate the md5 hash.

### hashFunction(filename, baseName)

Type: `function`  
Default: `undefined`

If specified, it will use the `hashFunction` to generate hash strings.

The function accepts two parameters:
 - `filename`: the absolute file path. (e.g. `/path/to/test.png`)
 - `baseName`: the base name of the file. (e.g. `test.png`)

### replacer(url, hash)

Type: `function`  
Default: `defaultReplacer(url, hash)`

It will receive the `url` and `hash` as its parameter, you can specify a 
function to handle the url manually.

A `replacer` example:

```js
function replacer(url, hash) {
    return url + '?' + hash;
}
```


### hashLength

Type: `number`  
Default: `10`

The length of the hash string, the default value is `10`. That's enough!


## [Changelog](CHANGELOG.md)

## License

[MIT]

[PostCSS]:      https://github.com/postcss/postcss
[co-img]:       https://coveralls.io/repos/github/yuezk/postcss-urlrev/badge.svg?branch=master
[co]:           https://coveralls.io/github/yuezk/postcss-urlrev?branch=master
[ci-img]:       https://travis-ci.org/yuezk/postcss-urlrev.svg
[ci]:           https://travis-ci.org/yuezk/postcss-urlrev
[postcss-url]:  https://github.com/postcss/postcss-url
[MIT]:          LICENSE
