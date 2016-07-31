var concat = require('gulp-concat');
var del = require('del');
var fs = require('fs');
var ftp = require('vinyl-ftp');
var gulp = require('gulp');
var gutil = require('gulp-util');
var merge = require('merge-stream');
var runSequence = require('run-sequence');
var watch = require('gulp-watch');
var webserver = require('gulp-webserver');

var paths = {
    dest: {
        root: 'config/dist/',
        js: 'config/dist/js',
        css: 'config/dist/css',
        fonts: 'config/dist/fonts',
        html: 'config/dist/'
    },


    appFiles: {
        html: 'config/src/index.html',
        js: [
            'config/src/js/private/keyInfo.js',
            'config/src/js/utils.js',
            'config/src/js/main.js'
        ]
    },

    vendorFiles: {
        css: 'config/src/css/slate.min.css',
        fonts: 'config/src/fonts/*',
        js: [
            'config/src/js/libs/hmac-sha1.js',
            'config/src/js/libs/slate.min.js'
        ]
    },

    ftpConfig: 'ftp-config.json'
};

/**
 * Main Tasks
 */
gulp.task('default', false, function (cb) {
    runSequence('build', 'watch', 'webserver', cb);
});

/**
 * Watch task
 */
gulp.task('watch', false, function () {
    watch(paths.appFiles.js, function () {
        gulp.start('concatJS');
    });

    watch(paths.appFiles.html, function () {
        gulp.start('copy');
    });
});

/**
 * Build task
 */
gulp.task('build', false, function (cb) {
    runSequence('clean', ['concatJS', 'copy'], cb);
});

/**
 * Clean task
 */
gulp.task('clean', false, function () {
    return del([paths.dest.html]);
});

/**
 * Concat the JS files to dist
 */
gulp.task('concatJS', false, function () {
    var app = gulp.src(paths.appFiles.js);
    var vendor = gulp.src(paths.vendorFiles.js);

    return merge(app, vendor)
    .pipe(concat('main.js'))
    .pipe(gulp.dest(paths.dest.js));
});

/**
 * Copy
 */
gulp.task('copy', false, function () {
    var html = gulp.src(paths.appFiles.html)
        .pipe(gulp.dest(paths.dest.html));

    var css = gulp.src(paths.vendorFiles.css)
        .pipe(gulp.dest(paths.dest.css));

    var fonts = gulp.src(paths.vendorFiles.fonts)
        .pipe(gulp.dest(paths.dest.fonts));


    return merge(html, css, fonts);
});

/**
 * Spin up a web server
 */
gulp.task('webserver', function() {
  gulp.src(paths.dest.root)
    .pipe(webserver());
});

/**
 * Deploy
 */
gulp.task('deploy', function () {
    runSequence('build', 'upload');
});

/**
 * Upload to ftp
 */
gulp.task('upload', function () {
    var config = JSON.parse(fs.readFileSync(paths.ftpConfig));

	var conn = ftp.create({
		host: config.host,
		user: config.user,
		password: config.password,
		parallel: config.parallel,
		log: gutil.log
	});

    return gulp.src(paths.dest.root + '/**', { buffer: false })
        .pipe(conn.newer(config.webroot)) // only upload newer files
        .pipe(conn.dest(config.webroot));
});