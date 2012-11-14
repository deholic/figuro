/**
 * Created with JetBrains WebStorm.
 * User: deholic
 * Date: 12. 11. 10.
 * Time: 오전 9:38
 * To change this template use File | Settings | File Templates.
 */
var _ = require("underscore");

var responseGenerator = function(responseCode, additionalMessage) {
  var responseCodes = {
    "404": {
      "statusCode": 404,
      "statusMessage": "Not Found",
      "redirectPage": ""
    },
    "500": {
      "statusCode": 404,
      "statusMessage": "",
      "redirectPage": ""
    }
  };

  return _.extend(responseCodes[responseCode], { "additionalMessage" : additionalMessage });
};

module.export = responseGenerator;