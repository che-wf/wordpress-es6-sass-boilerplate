import gulp from 'gulp';
import gulploadplugins from 'gulp-load-plugins';
import yargs from 'yargs';
import browserSync from 'browser-sync';
import browserify from 'browserify';
import babelify from 'babelify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import path from 'path';
import del from 'del';
import notifier from 'node-notifier';

const DEST_FOLDER = 'public/wp-content/themes/my-theme';
const DEV_URL = 'http://wordpress.test';

const $ = gulploadplugins({
  lazy: true
});

const argv = yargs.argv;

function handleError(error) {
  $.util.log('⚠️ ⚠️ ⚠️');
  $.util.log($.util.colors.magenta(error.message));
  if(error.codeFrame) {
    $.util.log(error.codeFrame);
  }
  const fileName = error.filename || error.file;
  notifier.notify({
    title: `Error: ${fileName.split('/').pop()}`,
    message: error.message.split(':').slice(1)
  });
  this.emit('end');
}

// SASS Styles
gulp.task('styles', () => {
  return gulp.src([
    'src/vendor/**/*.css',
    'src/sass/*.scss'
  ])
    .pipe($.changed('.tmp/styles', { extension: '.css' }))
    .pipe($.if(!argv.production, $.sourcemaps.init()))
    .pipe($.sassVariables({
       $production: (argv.production == true)
     }))
    .pipe($.sass({
      precision: 10
    }).on('error', handleError))
    .pipe($.autoprefixer())
    .pipe(gulp.dest('.tmp'))
    // Concatenate and minify styles if production mode (via gulp styles --production)
    .pipe($.if('*.css' && argv.production, $.cleanCss()))
    .pipe($.if(!argv.production, $.sourcemaps.write()))
    .pipe(gulp.dest(`${DEST_FOLDER}/css`))
    .pipe(browserSync.stream())
    .pipe($.size({title: 'styles.css'}));
});

// Scripts - app.js is the main entry point, you have to import all required files and modules
gulp.task('scripts', () => {
  return browserify({
    entries: 'src/js/app.js',
    debug: true
  })
    .transform('babelify', { presets: ['es2015'] })
    .bundle()
      .on('error', handleError)
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe($.if(!argv.production, $.sourcemaps.init({ loadMaps: true })))
    .pipe($.if(argv.production, $.uglify()))
      .on('error', handleError)
    .pipe($.if(!argv.production, $.sourcemaps.write()))
    .pipe(gulp.dest(`${DEST_FOLDER}/js`))
    .pipe($.size({title: 'app.js'}));
});

// a task that ensures the `scripts` task is complete before reloading browsers
gulp.task('scripts-reloader', ['scripts'], (done) => {
  browserSync.reload();
  done();
});

gulp.task('static', () => {
  return gulp.src('src/**/*.{html,php,jpg,jpeg,png,gif,webp,mp4,svg,ico,eot,ttf,woff,woff2,otf}').pipe(gulp.dest(DEST_FOLDER));
});

// Browser-Sync
gulp.task('serve', ['styles', 'scripts', 'static'], () => {
  browserSync({
    notify: false,
    proxy: DEV_URL,
    snippetOptions: {
      ignorePaths: 'wordpress/wp-admin/**'
    }
  });

  gulp.watch(['src/sass/**/*.{scss,css}'], ['styles']);
  gulp.watch(['src/js/**/*.js'], ['scripts-reloader']);
  gulp.watch(['src/**/*.{html,php,jpg,jpeg,png,gif,webp,mp4,svg,ico,eot,ttf,woff,woff2,otf}'], ['static']).on('change', (event) => {
    browserSync.reload();
    if(event.type === 'deleted') {
      let filePathFromSrc = path.relative(path.resolve('src'), event.path);
      let destFilePath = path.resolve(DEST_FOLDER, filePathFromSrc);
      console.log(`deleting ${destFilePath}...`);
      del.sync(destFilePath);
    }
  });
});

gulp.task('build', ['styles', 'scripts', 'static']);
