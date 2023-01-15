const mix = require('laravel-mix');
// require('laravel-mix-tailwind');

/*
 |--------------------------------------------------------------------------
 | Mix Asset Management
 |--------------------------------------------------------------------------
 |
 | Mix provides a clean, fluent API for defining some Webpack build steps
 | for your Laravel application. By default, we are compiling the Sass
 | file for the application as well as bundling up all the JS files.
 |
 */

$postCssPlugins = [
];

mix
    .copyDirectory('resources/images', 'public/images')

    .js('src/js/**/*.js', 'public/js')
    .postCss('src/css/**/*.css', 'public/css')
    .copy('src/js/**/*.json', 'public/js')
    .copy('src/**/*.html', 'public/');

    // .webpackConfig(require('./webpack.config'));

mix.options({
    postCss: [
        require('postcss-preset-env'),
        require('tailwindcss'),
    ]
});

//     // .disableSuccessNotifications()
//     .tailwind()
//     .webpackConfig({
//         resolve: {
//             modules: [
//                 'node_modules',
//                 path.resolve(__dirname, 'vendor/laravel/spark/resources/js')
//             ]
//         }
//     });

// if (!mix.inProduction()) {
//     mix.copyDirectory('resources/js/librairies', 'public/js/librairies');
// }

// if (mix.inProduction()) {
//     mix.version()
// }
