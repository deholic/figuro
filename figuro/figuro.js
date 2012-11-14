
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
  , request = require('request')
  , im = require('imagemagick')
  , oauth = require('oauth').OAuth;

/**
 * OAuth consumer information
 * @type {Object}
 * @private
 */
var oAuth = {
  "env": {
    "product": {
      "consumer_key":"qJITTf0NVqWJQTnpDfQvw",
      "consumer_secret":"kDN5mQA9wEumo52rjfYRnIEUOJ7h7ooIHHvMzskrNA"
    },
    "test": {
      "consumer_key":"sSRRnLfVcT5ryx4OAifbRQ",
      "consumer_secret":"XPOHvF5G2NBcSe6eRc6X0vMqPcYM98NZXsnA0nBA"
    },
    "request_token_URL":"https://api.twitter.com/oauth/request_token",
    "access_token_URL":"https://api.twitter.com/oauth/access_token",
    "authorize_URL":"https://api.twitter.com/oauth/authorize",
    "oauth_version":"1.0",
    "hash_version":"HMAC-SHA1"
  },
  "oAuthObject":null,
  "generateOAuthObject":function (isProductionServer) {
    if (!this.oAuthObject)
      this.oAuthObject = new oauth(
        this.env.request_token_URL,
        this.env.access_token_URL,
        isProductionServer ? this.env.product.consumer_key : this.env.test.consumer_key,
        isProductionServer ? this.env.product.consumer_secret : this.env.test.consumer_secret,
        this.env.oauth_version,
        null,
        this.env.hash_version
      );
    return this.oAuthObject;
  }
};

// mongodb server objects
var server = new mongolian,
  db = server.db('figuro');

// mongodb collection objects
var Images = db.collection('Images')
  , Statuses = db.collection('status')
  , Users = db.collection('user');

_.extend(figuro, {
  "siteName": "(De)Pot",
  "siteDescription": "Just store your photos!",
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

/**
 * Initialize application
 */
figuro.initialize = function() {
  if(!fs.existsSync(figuro.staticPath)) {
    fs.mkdirSync(figuro.staticPath);
    fs.mkdirSync(String.format("{0}{1}", figuro.staticPath, figuro.imgDirName));
  }
  Statuses.findOne({'instanceName': 'figuro'}, function(err, status) {
    if(!status) Statuses.insert({'instanceName': 'figuro', 'count': 0});
  });
};

/**
 * Send image viewer page
 * @param req
 * @param res
 */
figuro.getImagePage = function(req, res) {
  Images.findOne({'identifier': req.params.identifier}, function(db_err, status) {
    if(!db_err && !!status) {
      status.filepath = generateStaticFileName(status);
      status.siteName = figuro.siteName;
      status.siteDescription = figuro.siteDescription;
      console.log(status);
      res.render('image_viewer', status);
    }
    else res.send(404, 'identifier is not defined');
  });
};

/**
 * Send original image
 * @param req
 * @param res
 */
figuro.getUploadedImage = function(req, res) {
  Images.findOne({'identifier': req.params.identifier}, function(db_err, status) {
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

/**
 * Store image from Tweetbot
 * @param req
 * @param res
 */
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
      if(!err && !!body) imageItem.uploader = JSON.parse(body);
      calls.getInstanceStatus();
    },
    getInstanceStatus: function() {
      if (!!req.files.media) Statuses.findOne({'instanceName': 'figuro'}, calls.setImageIndex);
      else res.send(400, 'Parameter missing');
    },
    setImageIndex: function(err, status) {
      Statuses.findAndModify({
        query: { 'instanceName': 'figuro' },
        update: { $inc: {'count': 1} }
      }, function(err, result) {
        imageItem.identifier = generateHashValue(result.count);
        var staticFileName = String.format('{0}/{1}/{2}', figuro.staticPath, figuro.imgDirName, generateIdentifier(imageItem));
        fs.rename(temp_path, staticFileName);
        calls.getImageExif(staticFileName);
      });
    },
    getImageExif: function(fileName) {
      im.identify(fileName, function(err, metadata) {
        imageItem.metadata = metadata;
        Images.save(imageItem, calls.sendResponse);
      });
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

/**
 *
 * @param req
 * @param res
 */
figuro.deleteImage = function (req, res) {
  if(!!req.params.identifier) {
    Images.remove({"id": req.params.identifier}, function(err, status) {
      if(!err) res.send({ "status": "ok" });
    });
  }
  else {
    res.send(404, "identifier is not found");
  }
};

/**
 * Redirect user to twitter OAuth page
 * @param req
 * @param res
 */
figuro.signWithTwitter = function (req, res) {
  var oa = oAuth.generateOAuthObject(false);
  oa.getOAuthRequestToken(function(err, oauth_token, oauth_token_secret, results) {
    if(err) {
      console.log(err);
      res.send(500, "err");
    } else {
      req.session.oauth_request_token = oauth_token;
      req.session.oauth_request_secret = oauth_token_secret;
      res.redirect(oAuth.env.authorize_URL + '?oauth_token=' + oauth_token);
    }
  });
};

figuro.processOAuth = function(req, res) {
  var oa = oAuth.generateOAuthObject(false);
  var proc = {
    getAccessToken: function(err, access_token, access_token_secret, results) {
      if(!err) {
        req.session.oauth_access_token = access_token;
        req.session.oauth_access_token_secret = access_token_secret;
        oa.get(
          "https://api.twitter.com/1.1/account/verify_credentials.json",
          req.session.oauth_access_token,
          req.session.oauth_access_token_secret,
          proc.getUserData
        );
      }
      else res.send(500, results);
    },
    getUserData: function(err, data, response) {
      if(!err) {
        // TODO: User data handling
        var parsed = JSON.parse(data);
        var beStored = {
          "id": parsed.id,
          "access_token": req.session.oauth_access_token,
          "access_token_secret": req.session.oauth_access_token_secret
        };

        Users.findOne({"id": parsed.id}, function(err, result) {
          if(!err && !result) {
            Users.save(beStored, function(err){
              if(!err) res.redirect('/');
            });
          }
          else {
            req.session.twitter_id = result.id;
            res.redirect('/');
          }
        });

      }
    }
  };

  oa.getOAuthAccessToken(
    req.session.oauth_request_token,
    req.session.oauth_request_secret,
    req.param.oauth_verifier,
    proc.getAccessToken
  );
};

var generateIdentifier = function(item) {
  return String.format('{0}_{1}.{2}', item.timestamp, item.identifier, item.extension);
}

var generateHashValue = function(integerValue) {
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