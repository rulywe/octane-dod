var request = require('request');
var cookie = require('cookie');
var express = require('express');
var bodyParser = require('body-parser');
var featureDoDLib = require('./FeatureDoD');


var app = express();

const OCTANE_SERVER = 'https://hackathon.almoctane.com';
const SHAREDSPACE_ID = 1001;
const WORKSPACE_ID = 2037;

// create the cookie jar that is needed for authentication
var requestor = request.defaults({
  jar: true,
  baseUrl: OCTANE_SERVER,
  json: true,
  // if running from within HPE you will need to set a proxy.  Change according to nearest proxy
  //proxy: 'http://web-proxy.il.hpecorp.net:8080'
});


var DOD_LOGIC = { doneLogic: 'Total_Stories == Done_Stories & Total_Defects == 0', progressLogic: 'any' };



/**
 * Use to log in. Returns the HPSSO_COOKIE_CSRF header which needs to be reused with all communication to the server
 * @param requestor The request object used for HTTP
 * @param callback The callback that will be called once login is successful
 * @returns {*}
 */
function initFeatureDoD(requestor, userStoryId, isProgress, callback) {

  var HPSSO_COOKIE_CSRF = null;

  requestor.post({
    uri: '/authentication/sign_in',
    body: {
      user: 'ruly@hpe.com',
      password: 'Yoav0705'
      /**
       * alternatively you can use API key like this
       * client_id: '', // put API KEY here
       * client_secret: '' // PUT API SECRET HERE
       */
      // client_id: 'Ruly_glxzd4wnj7r42aq423lgemv4j', // put API KEY here
      //  client_secret: '-b04ebe67efbe882B' // PUT API SECRET HERE
    }
  }, function (error, response) {
    if (error) {
      console.error(error);
      // do something with error...
      return;
    }
    var cookies = response.headers['set-cookie'];
    if (cookies) {
      cookies.forEach(function (value) {
        var parsedCookie = cookie.parse(value);
        if (parsedCookie.HPSSO_COOKIE_CSRF) {
          HPSSO_COOKIE_CSRF = parsedCookie.HPSSO_COOKIE_CSRF;
        }
      });
    } else {
      // problem getting cookies; something happened
    }

    requestor = requestor.defaults({
      baseUrl: (OCTANE_SERVER + '/api/shared_spaces/' + SHAREDSPACE_ID + '/workspaces/' + WORKSPACE_ID),
      headers: {
        'HPSSO_HEADER_CSRF': HPSSO_COOKIE_CSRF,
        'HPSSO-HEADER-CSRF': HPSSO_COOKIE_CSRF
      }
    });

    var featureDoD = featureDoDLib.featureDoD(requestor, callback, DOD_LOGIC);

    isProgress ? featureDoD.applyUserStoryProgress(userStoryId) : featureDoD.applyUserStoryDone(userStoryId);

  });
}

// Create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.post('/setdodlogic', urlencodedParser, function (req, res) {

  var dodLogic = { doneLogic: req.body.dodLogic, progressLogic: req.body.moveToInProgress };

  console.log(dodLogic);

  DOD_LOGIC = dodLogic;

  res.end("DoD Logic is set");

});

app.get('/dodtest', function (req, res) {

  initFeatureDoD(requestor, req.query.userStoryId, false, function (feature) {
    res.send(feature);
  });

});

app.get('/progresstest', function (req, res) {

  initFeatureDoD(requestor, req.query.userStoryId, true, function (feature) {
    res.send(feature);
  });

});

app.post('/dodcall',  function (req, res) {

  var body;
  req.on('data', function (data) {
    body += data;

     console.log(body);
    
  });

  var workItemId = 3203;

 

  //if (req.body.entityId) { var workItemId = req.body.entityId };

  initFeatureDoD(requestor, workItemId, false, function (feature) {
    res.send(feature);
  });
});

app.post('/progresscall', urlencodedParser, function (req, res) {

  var workItemId = 3203;

  console.log(req.body);

  if (req.body.entityId) { var workItemId = req.body.entityId };

  initFeatureDoD(requestor, workItemId, true, function (feature) {
    res.send(feature);
  });


});

app.get('/dodsetting', function (req, res) {
  res.sendFile(__dirname + '/OctaneDODSetting.html');
})

var server = app.listen(3333, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})