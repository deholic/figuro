/**
 * Created with JetBrains WebStorm.
 * User: dehol
 * Date: 12. 10. 29.
 * Time: 오전 11:03
 * To change this template use File | Settings | File Templates.
 */
var figuro = figuro || {};

// Node Modules
var _ = require('underscore')
  , fs = require('fs')
  , mongolian = require('mongolian')
  , request = require('request');

// mongodb server objects
var server = new mongolian,
  db = server.db('figuro');

// mongodb collection objects
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

figuro.getImagePage = function(req, res) {
  images.findOne({'identifier': req.params.identifier}, function(db_err, status) {
    if(!db_err && !!status) {
      status.filepath = generateStaticFileName(status);
      console.log(status);
      res.render('image_viewer', status);
    }
  });
};

figuro.getUploadedImage = function(req, res) {
  images.findOne({'identifier': req.params.identifier}, function(db_err, status) {
    if(!db_err && !!status) {
      fs.readFile(String.format('{0}/{1}/{2}', figuro.staticPath, figuro.imgDirName, generateIdentifier(status)), function (fs_err, data) {
        if (!fs_err) {
          res.set('Content-Type', status.filetype);
          res.send(data);
        }
      });
    }
    else res.send(404, 'identifier is not defined');
  });
};

figuro.uploadImage = function (req, res) {

  if(!req.body || !req.files.media) {
    res.send(400, 'Parameter missing');
    return;
  }

  var temp_path = req.files.media.path;
  var imageItem = {
    'extension': req.files.media.name.split('.')[1],
    'filetype': req.files.media.type,
    'message': req.body.message,
    'timestamp': Date.now()
  };

  var calls = {
    requestFromTwitter: function() {
      request.get({
        url: req.headers['x-auth-service-provider'],
        headers: {
          'Host':'api.twitter.com',
          'Accept':'*/*',
          'Connection':'close',
          'User-Agent':req.headers['user-agent'],
          'Authorization':req.headers['x-verify-credentials-authorization']
        }
      }, calls.getUploaderInformation);
    },
    getUploaderInformation: function(err, response, body) {
      if(!err && !!body) {
        var bodyJSON = JSON.parse(body);
        imageItem.uploader = {
          'name': bodyJSON.name,
          'screen_name': bodyJSON.screen_name,
          'id': bodyJSON.id
        };
      }
      calls.getInstanceStatus();
    },
    getInstanceStatus: function() {
      if (!!req.files.media) statuses.findOne({'instanceName': 'figuro'}, calls.setImageIndex);
      else res.send(400, 'Parameter missing');
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
      else res.send(500, 'Internal server error');
    }
  };

  if(!!req.headers['x-auth-service-provider'])
    calls.requestFromTwitter();
  else
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

var generateStaticFileName = function(status) {
  if(!status) return null;
  else return String.format('{0}/img/{1}', figuro.host, generateIdentifier(status));
};

module.exports = figuro;