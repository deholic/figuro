var fs = require('fs'),
  crypto = require('crypto'),
  mongolian = require('mongolian');

var server = new mongolian,
  db = server.db('figuro');

var images = db.collection('images'),
  statuses = db.collection('status');

exports.uploadImage = function (req, res) {
  if (!!req.files.media) {
    var md5 = crypto.createHash('md5');
    statuses.findOne({'instanceName': 'figuro'}, function(err, status) {
      var idx = 0;

      if(!status)
        statuses.insert({'instanceName': 'figuro', 'count': idx});

      var temp_path = req.files.media.path;
      var file_hashing = md5.update(idx + Date.now()).digest('hex');
      fs.rename(temp_path, './static/' + target_path);

      images.insert({
        'filename': req.files.media.name,
        'filetype': req.files.media.type,
        'message': req.body.message,
        'identifier': file_hashing
      });

      res.send({
        'url': app.host + '/static/' + file_hashing
      })
    })
  }
  else {
    res.send({});
  }
};
