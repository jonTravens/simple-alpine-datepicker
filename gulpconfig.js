module.exports = {
    config: {
      tailwindjs: "./tailwind.config.js",
    },
    paths: {
      root: "./",
      src: {
        base: "./src",
        css 
        : "./src/**/css",
        js  : "./src/**/js",
        img : "./src/**/img",
      },
      dist: {
        base: "./public",
        css : "./public/**/css",
        js  : "./public/**/js",
        img : "./public/**/img",
      },
      build: {
        base: "./public",
        css : "./public/**/css",
        js  : "./public/**/js",
        img : "./public/**/img",
      },
    },
};
