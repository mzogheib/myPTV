var concat = require('gulp-concat');
var del = require('del');
var gulp = require('gulp');
var merge = require('merge-stream');
var runSequence = require('run-sequence');
var watch = require('gulp-watch');

var paths = {
    dest: {
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
    }
};

/**
 * Main Tasks
 */
gulp.task('default', ['build', 'watch']);

/**
 * Watch task
 */
gulp.task('watch', ['build'], function () {
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

// Concat the JS files to dist
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