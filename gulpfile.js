/**
 * gulpfile.js - Swirl
 * Licensed under GPL-3.0.
 * Copyright (C) 2015 Karim Alibhai.
 **/

'use strict';

var gulp = require('gulp'),
    babel = require('gulp-babel'),
    sourcemaps = require('gulp-sourcemaps'),
    browserify = require('gulp-browserify'),
    uglify = require('gulp-uglify'),
    rename = require('gulp-rename');

gulp.task('default', function () {
    return gulp.src('swirl.js')
            .pipe(sourcemaps.init())
                .pipe(babel())
                .pipe(browserify())
                .pipe(uglify())
                .pipe(rename('swirl.min.js'))
            .pipe(sourcemaps.write('.'))
            .pipe(gulp.dest('.'));
});

gulp.task('watch', ['default'], function () {
    gulp.watch('swirl.js', ['default']);
});
