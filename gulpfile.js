/**
 *   Gulp with TailwindCSS - An CSS Utility framework build setup with SCSS
 *   Author : Manjunath G
 *   URL : manjumjn.com | lazymozek.com
 *   Twitter : twitter.com/manju_mjn
 **/

/*
  Usage:
  1. npm install //To install all dev dependencies of package
  2. npm run dev //To start development and server for live preview
  3. npm run prod //To generate minifed files for live server
*/

const { src, dest, task, watch, series, parallel } = require("gulp");
const options = require("./gulpconfig"); //paths and other options from config.js
const clean = require("gulp-clean"); //For Cleaning build/dist for fresh export
const postcss = require("gulp-postcss"); //For Compiling tailwind utilities with tailwind config
const concat = require("gulp-concat"); //For Concatinating js,css files
const uglify = require("gulp-terser"); //To Minify JS files
const cleanCSS = require("gulp-clean-css"); //To Minify CSS files
const purgecss = require("gulp-purgecss"); // Remove Unused CSS from Styles
const logSymbols = require("log-symbols"); //For Symbolic Console logs :) :P

//Development Tasks
function devHTML() {
  return src('src/**/*.html').pipe(
    dest(options.paths.dist.base)
  );
}

function devStyles() {
  const tailwindcss = require("tailwindcss");
  return src('src/**/*.css')
    .pipe(dest(options.paths.src.base))
    .pipe(postcss([tailwindcss(options.config.tailwindjs)]))
    .pipe(dest(options.paths.dist.base));
}

function devScripts() {
  return src(['src/**/*.js'])
    .pipe(dest(options.paths.dist.base));
}
function devLang() {
  return src(['src/**/lang/*.json'])
    .pipe(dest(options.paths.dist.base));
}

function devImages() {
  return src('src/**/*/*.{png|jpg|jpeg|svg')
    .pipe(dest(options.paths.dist.base)
  );
}

function watchFiles() {
  watch(
    'src/**/*.{html,php}',
    series(devHTML, devStyles)
  );
  watch(
    [options.config.tailwindjs, 'src/**/*.css'],
    series(devStyles)
  );
  watch('src/**/*.js', devScripts);
  watch('src/**/lang/*.json', devLang);
  watch('src/**/*', devImages);
  console.log("\n\t" + logSymbols.info, "Watching for Changes..\n");
}

function devClean() {
  console.log(
    "\n\t" + logSymbols.info,
    "Cleaning dist folder for fresh start.\n"
  );
  return src(options.paths.dist.base, { read: false, allowEmpty: true }).pipe(
    clean()
  );
}

//Production Tasks (Optimized Build for Live/Production Sites)
function prodHTML() {
  return src('src/**/*.{html,php}').pipe(
    dest(options.paths.build.base)
  );
}

function prodStyles() {
  return src(`${options.paths.dist.base}/**/*`)
    .pipe(
      purgecss({
        content: ["src/**/*.{html,js,php}"],
        defaultExtractor: (content) => {
          const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
          const innerMatches =
            content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
          return broadMatches.concat(innerMatches);
        },
      })
    )
    .pipe(cleanCSS({ compatibility: "ie8" }))
    .pipe(dest(options.paths.build.base));
}

function prodScripts() {
  return src([
    'src/**/*.js',
  ])
    .pipe(uglify())
    .pipe(dest(options.paths.build.base));
}

function prodImages() {
  return src(options.paths.src.img + "/**/*")
    .pipe(dest(options.paths.build.base));
}

function prodClean() {
  console.log(
    "\n\t" + logSymbols.info,
    "Cleaning build folder for fresh start.\n"
  );
  return src(options.paths.build.base, { read: false, allowEmpty: true }).pipe(
    clean()
  );
}

function buildFinish(done) {
  console.log(
    "\n\t" + logSymbols.info,
    `Production build is complete. Files are located at ${options.paths.build.base}\n`
  );
  done();
}

exports.default = series(
  devClean, // Clean Dist Folder
  parallel(devStyles, devScripts, devLang, devImages, devHTML), //Run All tasks in parallel
//   livePreview, // Live Preview Build
  watchFiles // Watch for Live Changes
);

exports.prod = series(
  prodClean, // Clean Build Folder
  parallel(prodStyles, prodScripts, prodImages, prodHTML), //Run All tasks in parallel
  buildFinish
);
