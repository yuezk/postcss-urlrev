# postcss-urlrev

> [PostCSS] plugin for css url revision, inspired by [postcss-url]

[![Build Status][ci-img]][ci]


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

```sh
npm install --save-dev postcss-urlrev
```

## Usage

```js
var urlrev = require('postcss-urlrev');
postcss(urlrev({ /* options */ }))
```

## Options

### basePath

Type: `string`  
Default: `the css file's folder`

The `basePath` is used to calculate the absolute path of the url resource. 
By default, the value is the folder path of the css source file. If your should
set this value based on your environment.

### includeRemote

Type: `boolean`  
Default: `false`

If you set it to `true`, it will handle the remote url, request the remote 
resource and calculate the md5 hash.

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
[ci-img]:       https://travis-ci.org/yuezk/postcss-urlrev.svg
[ci]:           https://travis-ci.org/yuezk/postcss-urlrev
[postcss-url]:  https://github.com/postcss/postcss-url
[MIT]:          LICENSE
