/**
 * Created with JetBrains WebStorm.
 * User: dehol
 * Date: 12. 10. 29.
 * Time: 오전 11:03
 * To change this template use File | Settings | File Templates.
 */
var figuro = figuro || {};
var _ = require('underscore')
  , fs = require('fs')
  , crypto = require('crypto')
  , mongolian = require('mongolian');

var server = new mongolian,
  db = server.db('figuro');

var images = db.collection('images'),
  statuses = db.collection('status');

_.extend(figuro, {
  "host": "http://localhost:3000",
  "staticPath": "./static/",
  "imgDirName": "img"
});

String.format = function() {
  var i=0;
  var string = (typeof(this) == "function" && !(i++)) ? arguments[0] : this;

  for (; i < arguments.length; i++)
    string = string.replace(/\{\d+?\}/, arguments[i]);

  return string;
};

figuro.initialize = function() {
  if(!fs.existsSync(figuro.staticPath)) {
    fs.mkdirSync(figuro.staticPath);
    fs.mkdirSync(String.format("{0}{1}", figuro.staticPath, figuro.imgDirName));
  }
  statuses.findOne({'instanceName': 'figuro'}, function(err, status) {
    if(!status) statuses.insert({'instanceName': 'figuro', 'count': 0});
  });
};

figuro.getUploadedImage = function(req, res) {
  // send dummy file
  fs.readFile(String.format('{0}/{1}/{2}', figuro.staticPath, figuro.imgDirName, "3939.jpeg"), function(err, data) {
    if(!err) {
      res.set('Content-Type', 'image/jpeg');
      res.send(data);
    }
  });
};

figuro.uploadImage = function (req, res) {
  console.log(req);
  if (!!req.files.media) {
    var md5 = crypto.createHash('md5');
    statuses.findOne({'instanceName': 'figuro'}, function(err, status) {
      var temp_path = req.files.media.path;
      var file_hashing = md5.update(String.format("{0}", status.count + Date.now())).digest('hex');
      var imageItem = {
        'extension': req.files.media.name.split('.')[1],
        'filetype': req.files.media.type,
        'message': req.body.message,
        'identifier': file_hashing
      };
      fs.rename(temp_path, String.format('{0}/{1}/{2}', figuro.staticPath, figuro.imgDirName, generateIdentifier(imageItem)));
      images.save(imageItem, function(err, result) {
        if(!err) {
          res.send({'url': String.format('{0}/{1}/{2}', figuro.host, figuro.imgDirName, generateIdentifier(imageItem))});
        }
        else {
          res.error('500', 'Internal server error');
        }
      });
    })
  }
  else {
    res.error('400', 'Parameter missing');
  }
};

function generateIdentifier(item) {
  return String.format('{0}.{1}', item.identifier, item.extension);
}

function generateHashValue(str) {

}

module.exports = figuro;