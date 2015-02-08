var _ = require('lodash'); // to handle collections gracefully
var config = require('../config').templates; // pull in the pathing config file
var fs = require('fs'); // used to work with substack's module
var glob = require('glob'); // to dynamically read in all content md files
var gulp = require('gulp'); // because this is a gulp task. duh.
var HTMLtemplate = require('html-template'); // substack's html template implementation
var md = require('markdown-it')(); // to convert markdown to html
var source = require('vinyl-source-stream'); // used to convert substack's readStream to vinylStream

gulp.task('templates', function() {
  var contentFiles = glob.sync(config.contentSrc); // read in all content files in the repo

  var languages = _.uniq(_.map(contentFiles, function(str) { // extrapolate the languages from the content filepaths
    return str.split('/')[2];
  }));

  _.forEach(languages, function(lang) { // loop through languages to make separate folder outputs
    var templateJSON = require('../../content/' + lang + '/template.json'); // read in the template JSON file

    var templateFiles = _.where(contentFiles, function(str) { // return list of content files in this language alone
      return str.indexOf('./content/' + lang) > -1;
    });

    templateFilesInThisLang = _.map(templateFiles, function(str) { // expand the file list to include the extrapolated filename
      var obj = {};
      obj.srcPath = str;
      obj.filename = str.split('/');
      obj.filename = obj.filename[obj.filename.length - 1].split('.md')[0];
      return obj;
    });

    _.forEach(templateFilesInThisLang, function(file) { // iterate over the md files present in this language to apply the template to them
      var markdown = String(fs.readFileSync(file.srcPath)); // read in the md file, convert buffer to string
      var html = md.render(markdown); // convert md string to html string
      var thisFileJSON = _.cloneDeep(templateJSON); // clone in the template JSON object
      var finalJSON = {};
      _.forEach(thisFileJSON, function(value, key){
        finalJSON['[i18n-'+key+']'] = value;
      })
      finalJSON['[i18n-content]'] = html; // Attach md2html string to the interpolation object
      var htmlObj = HTMLtemplate(); // finally using that holder for the template stream
      i18nObj = htmlObj.template('i18n',{include:false}); // same
      var filepath = __dirname.split('gulp/tasks')[0] + 'source/templates/main.html'; // get the main template file location. There can be multiple, this is just a proof of concept
      var fileStream = fs.createReadStream(filepath) // pulling this code from substack's example on html-template
        .pipe(htmlObj)
      // .pipe(process.stdout)
        .pipe(source(file.filename + '.html')) // converting the readStream to a vinyl stream so gulp can write it back to the disk
        .pipe(gulp.dest('public_test/' + lang + '/')); // dump it in the appropriate language subfolder
      i18nObj.write(finalJSON); // write the interpolation JSON to the template
      i18nObj.end(); // saving? this is taken from substack too.
    });
  });
});