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
  images.findOne({'identifier': req.params.identifier}, function(db_err, status) {
    if(!db_err) {
      fs.readFile(String.format('{0}/{1}/{2}', figuro.staticPath, figuro.imgDirName, generateIdentifier(status)), function (fs_err, data) {
        if (!fs_err) {
          res.set('Content-Type', 'image/jpeg');
          res.send(data);
        }
      });
    }
    else res.error('404', 'identifier is not defined');
  });
};

figuro.uploadImage = function (req, res) {

  var temp_path = req.files.media.path;
  var imageItem = {
    'extension': req.files.media.name.split('.')[1],
    'filetype': req.files.media.type,
    'message': req.body.message,
    'timestamp': Date.now()
  };

  var calls = {
    getInstanceStatus: function() {
      if (!!req.files.media) statuses.findOne({'instanceName': 'figuro'}, calls.setImageIndex);
      else res.error('400', 'Parameter missing');
    },
    setImageIndex: function(err, status) {
      statuses.findAndModify({
        query: { 'instanceName': 'figuro' },
        update: { $inc: {'count': 1} }
      }, calls.storeImage);
    },
    storeImage: function(err, result) {
      imageItem.identifier = generateHashValue(result.count);
      fs.rename(temp_path, String.format('{0}/{1}/{2}', figuro.staticPath, figuro.imgDirName, generateIdentifier(imageItem)));
      images.save(imageItem, calls.sendResponse);
    },
    sendResponse: function(err, result) {
      console.log(result);
      if(!err) res.send({'url': String.format('{0}/{1}', figuro.host, result.identifier)});
      else res.error('500', 'Internal server error');
    }
  };

  calls.getInstanceStatus();
};

function generateIdentifier(item) {
  return String.format('{0}_{1}.{2}', item.timestamp, item.identifier, item.extension);
}

function generateHashValue(integerValue) {
  if((typeof integerValue) == "number")
    return integerValue.toString(16);
  else
    return null;
}

module.exports = figuro;