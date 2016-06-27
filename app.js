var request = require('request');
var cookie = require('cookie');
var express = require('express');
var bodyParser = require('body-parser');


var app = express();

const OCTANE_SERVER = 'https://hackathon.almoctane.com';
const SHAREDSPACE_ID = 1001;
const WORKSPACE_ID = 2005;

// create the cookie jar that is needed for authentication
var requestor = request.defaults({
    jar: true,
    baseUrl: OCTANE_SERVER,
    json: true,
    // if running from within HPE you will need to set a proxy.  Change according to nearest proxy
    proxy: 'http://web-proxy.il.hpecorp.net:8080'
});

// The phases mapping can be determined per workspace and the assumption that whoever define DoD logic is familiar with the phases
// This is the code to get the phases mapping to id since we later use the phase.id
 
/* requestor.get('/phases/', function (error, message, phases) {
		
	var phasesMap = [];
	phases.data.forEach(function (phase){
			
		if (phase.entity == 'story' || phase.entity == 'defect'){
				
			phasesMap.push({entity:phase.entity, id:phase.id, name: phase.name})
		}			
	});
		
	console.log(phasesMap);	
});		 */

var phases = [ { entity: 'defect', id: 2113, name: 'New' },
  { entity: 'story', id: 2134, name: 'New' },
  { entity: 'defect', id: 2114, name: 'Opened' },
  { entity: 'story', id: 2135, name: 'In Progress' },
  { entity: 'defect', id: 2115, name: 'Fixed' },
  { entity: 'story', id: 2136, name: 'In Testing' },
  { entity: 'defect', id: 2117, name: 'Proposed Closed' },
  { entity: 'story', id: 2137, name: 'Done' },
  { entity: 'defect', id: 2116, name: 'Closed' },
  { entity: 'defect', id: 2118, name: 'Deferred' },
  { entity: 'defect', id: 2119, name: 'Duplicate' },
  { entity: 'defect', id: 2120, name: 'Rejected' } ];
  
/* requestor.get('/list_nodes/', function (error, message, values) {
		
	var valuesMap = [];
	values.data.forEach(function (value){
			
		if(value.logical_name.toString().indexOf('severity') > -1 ){valuesMap.push({name: value.name, logical_name: value.logical_name, id:value.id});}	
	});
		
		console.log(valuesMap);	
});			 */
  
var severities = [ { name: 'Low', logical_name: 'list_node.severity.low', id: 2354 },
  { name: 'Medium', logical_name: 'list_node.severity.medium',id: 2355 },
  { name: 'High',logical_name: 'list_node.severity.high',id: 2356 },
  { name: 'Very High',logical_name: 'list_node.severity.very_high',id: 2357 },
  { name: 'Urgent',logical_name: 'list_node.severity.urgent',id: 2358 }];

var FeatureDoD = function(requestor, callback) {
	
	this.callback = callback;
	
	this.requestor = requestor;
	
	this.feature = {};
}
		
FeatureDoD.prototype.getFeature =  function (featureId) {
		
		var feature = this.feature;
		var callback = this.callback;
		
		feature.id = featureId;
		
		feature.userStories = {count:0, inProgress:0, inTesting:0, done:0};		
		feature.defects = {count:0, medium:0, regression:0, high:0, critical:0};
		
		this.requestor.get('/work_items?query="parent EQ {id EQ '+featureId+'}"', function (error, message, workItems) {
		
			
			// Go over all the user stories and defect and set the numbers of the important metrics that we will use to define of the feature is done 
			workItems.data.forEach(function (workItem) {
				
				// IF its a user story we want to know how many user stories we have in each phase i.e. new and in progress, in testing and done 
				if ('story' == workItem.subtype ) {
					
					feature.userStories.count++;
					
					//console.log("User story phase: "+ workItem.phase.id)
					
					switch (workItem.phase.id) { case 2136: feature.userStories.inTesting++; break; case 2137: feature.userStories.done++; break; default: feature.userStories.inProgress++;  }
				
				//	for defect we need to know both sevirity and phase 			
				} else {
										
					// If this is an open defect (based on the phases fix table above)
					if (workItem.phase.id == 2114 || workItem.phase.id == 2113){
						
						feature.defects.count++;
						
						switch (workItem.severity.id) { case 2354: feature.defects.medium++; break; case 2355: feature.defects.medium++; break; case 2356: feature.defects.high++; break; default: feature.defects.critical++}
					
						if (workItem.regression) { feature.defects.regression++;}
						
						//console.log(workItem.severity);
						
					}					
				}
								
			});	

			console.log(feature);
			callback(feature);
			
		});	
	}

FeatureDoD.prototype.applyUserStoryDone = function(userStoryId) {
		
		var instance = this;
		
		console.log("applyUserStoryDone received user story id: "+userStoryId);
		
		this.requestor.get('/work_items/'+userStoryId, function (error, message, userStory) {
		
			//Get the feature ID
			console.log(userStory);
			console.log("USER STORY FEATURE ID: "+userStory.parent.id);
			instance.getFeature(userStory.parent.id);
		});	
}

	//var userStory = getUserStory(2207);



/**
 * Use to log in. Returns the HPSSO_COOKIE_CSRF header which needs to be reused with all communication to the server
 * @param requestor The request object used for HTTP
 * @param callback The callback that will be called once login is successful
 * @returns {*}
 */
function initFeatureDoD(requestor, userStoryId, callback) {

  var HPSSO_COOKIE_CSRF = null;

  requestor.post({
    uri: '/authentication/sign_in',
    body: {
      //user: 'hackathon@user',
      //password: 'Mission-impossible'
      /**
       * alternatively you can use API key like this
       * client_id: '', // put API KEY here
       * client_secret: '' // PUT API SECRET HERE
       */
	   client_id: 'Ruly_glxzd4wnj7r42aq423lgemv4j', // put API KEY here
       client_secret: '-b04ebe67efbe882B' // PUT API SECRET HERE
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
	
	var featureDoD = new FeatureDoD(requestor, callback);
		
    featureDoD.applyUserStoryDone(userStoryId);

  });  
}


app.get('/applyDoD', function (req, res) {
	
	console.log("Received User Story ID: "+req.query.userStoryId)

	initFeatureDoD(requestor, req.query.userStoryId, function(feature){
		res.send(feature);
	} );
	
})

var server = app.listen(8081, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("Example app listening at http://%s:%s", host, port)

})