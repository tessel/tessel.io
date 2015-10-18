var fs = require('fs');
var gulp = require('gulp');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var streamify = require('gulp-streamify');
var nodemon = require('gulp-nodemon');
var browserify = require('browserify');
var livereload = require('gulp-livereload');
var awspublish = require("gulp-awspublish");
var shell = require('gulp-shell');
var hash = require('gulp-hash');
var env = require('gulp-env');
var ini = require('ini');

try {
  var aws = JSON.parse(fs.readFileSync('./aws.json'));
} catch (e) {
  console.error('WARNING: aws.json empty. See https://www.npmjs.com/package/gulp-s3')
  var aws = null;
}

var foundation = "./bower_components/foundation";

var paths = {
  styles: ['./scss/*.scss'],
  scripts: {
    browserify: ["./public/scripts/browserify/*.js"],
    vendor: [
        foundation + "/js/vendor/jquery.js",
        foundation + "/js/vendor/*.js",
        foundation + "/js/foundation.min.js",
        "./bower_components/jquery.transit/jquery.transit.js",
        "./bower_components/slick-carousel/slick/slick.js"
      ]
      // foundation: [foundation + "/js/foundation/foundation.abide.js", foundation + "/js/foundation/foundation.topbar.js"]
  },
  resources: [
    "./bower_components/slick-carousel/slick/ajax-loader.gif",
    "./bower_components/slick-carousel/slick/fonts/*",
  ],
};

gulp.task('watch', function() {
  livereload.listen();
  gulp.watch(paths.styles, ['styles']);
  gulp.watch(paths.scripts.browserify, ['browserify']);
  gulp.watch(paths.scripts.vendor, ['concat']);
});

gulp.task('livereload', livereload)

gulp.task('images-compress', function () {
  var mozjpeg = require('imagemin-mozjpeg');
  return gulp.src('./images/**/*.jpg')
    .pipe(mozjpeg()())
    .pipe(gulp.dest('./images/'));
});

gulp.task('images-upload-cached', function () {
  if (!aws) {
    return console.error('WARNING: No aws.json credentials found, skipping.')
  }
  // create a new publisher
  var publisher = awspublish.create(aws);
  var headers = {
     'Cache-Control': 'max-age=315360000, no-transform, public'
   };
  return gulp.src('./images/**/*.hash*.*')
    .pipe(publisher.publish(headers))
    .pipe(awspublish.reporter());
});

gulp.task('images-upload-transient', function(){
  if (!aws) {
    return console.error('WARNING: No aws.json credentials found, skipping.')
  }
  // create a new publisher
  var publisher = awspublish.create(aws);
  var max_age = 1000 * 60 * 60; // cache for one hour.
  var headers = {
     'Cache-Control': 'max-age=' + max_age + ', no-transform, public'
  };
  return gulp.src('./images/**/!(*.hash*)')
    .pipe(publisher.publish(headers))
    .pipe(awspublish.reporter());
});

gulp.task('images-hash', function(){
  return gulp.src('./images/**/!(*hash-*)')
    .pipe(hash({
        "template": "<%= name %>.hash-<%= hash %><%= ext %>"
    }))
    .pipe(gulp.dest('./images'))
});


gulp.task('images-download', function(){
  if (!aws) {
    return console.error('WARNING: No aws.json credentials found, skipping.')
  }
  return gulp.src('')
      .pipe(shell(["aws s3 sync s3://" + aws.bucket + " ./images"]));
});

gulp.task('images', ['images-compress', 'images-upload']);
gulp.task('images-upload', ['images-hash', 'images-upload-cached', 'images-upload-transient']);

gulp.task('browserify', function() {
  browserify("./public/scripts/browserify/index.js")
    .bundle(function (err) {
      err && console.error('[error]', err.message);
    })
    .pipe(source('landing.js'))
    .pipe(gulp.dest('build/public/scripts/'))
    .pipe(rename('landing.min.js'))
    .pipe(streamify(uglify({
      drop_console: true,
    })))
    .pipe(gulp.dest('build/public/scripts/'))
    .pipe(livereload())
});

gulp.task('concat', function() {
  gulp.src(paths.scripts.vendor)
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('build/public/scripts/'))
    .pipe(rename('vendor.min.js'))
    .pipe(streamify(uglify({
      drop_console: true,
    })))
    .pipe(gulp.dest('build/public/scripts/'))
});

gulp.task('styles', function() {
  gulp.src('./scss/*.scss')
    .pipe(sass({
      errLogToConsole: true,
      includePaths: ["bower_components/foundation/scss/"]
    }))
    .pipe(gulp.dest('build/public/stylesheets/'))
    .pipe(livereload());

  gulp.src(paths.resources)
    .pipe(gulp.dest('build/public/stylesheets'))
});

gulp.task('set-env', function () {
  try {
    var source = ini.parse(fs.readFileSync(__dirname + '/.env', 'utf-8'));
  } catch (e) {
    var source = {};
  }

  source.NODE_ENV = process.env.NODE_ENV || 'development';

  env({
    vars: source,
  });
});

gulp.task('nodemon', ['set-env'], function() {
  nodemon({
      script: 'index.js',
      ext: 'jade js json',
      ignore: [
        'assets/',
        'facets/*/test/',
        'node_modules/',
        'test/',
      ],
      stdout: true,
    })
    .on('restart', function(file){
      console.log(file + " changed restarting");
      livereload(file);
    })
    .on('readable', function() {
      this.stdout
        // .pipe(bistre({time: true}))
        .pipe(process.stdout);
      this.stderr
        // .pipe(bistre({time: true}))
        .pipe(process.stderr);
    });
});

gulp.task('build', ['styles', 'concat', 'browserify']);
gulp.task('dev', ['build', 'nodemon', 'watch']);
gulp.task('default', ['build']);
