# postcss-urlrev

[PostCSS] plugin for css url revision.

[![Build Status][ci-img]][ci]


```css
.foo {
    background: url(images/test.png);
}
```

```css
.foo {
    background: url(images/test.png?v=e19ac7dee6);
}
```

## Usage

```sh
npm install --save-dev postcss-urlrev
```

```js
postcss([ require('postcss-urlrev') ])
```

See [PostCSS] docs for examples for your environment.


## Options

### includeRemote

Type: `boolean`  
Default: `false`

If you set it to `true`, it will handle the remote url, request the remote resource
and calculate the md5 hash.

### replacer(url, hash)

Type: `function`  
Default: `defaultReplacer(url, hash)`

It will receive the `url` and `hash` as its parameter, you can specify a function to handle the url manually.

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


[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/yuezk/postcss-urlrev.svg
[ci]:      https://travis-ci.org/yuezk/postcss-urlrev
[MIT]:     LICENSE
