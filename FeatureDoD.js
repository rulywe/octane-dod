module.exports = {
    featureDoD: function (requestor, callback, logic) {
        return new FeatureDoD(requestor, callback, logic);
    }

};

const FEATURE_DONE_PHASE = 3030;
const FEATURE_INPROGRESS_PHASE = 3028;
const FEATURE_NEW_PHASE = 3027;


var FeatureDoD = function (requestor, callback, logic) {

    this.callback = callback;

    this.requestor = requestor;

    this.logic = logic;

    this.feature = {};
}




FeatureDoD.prototype.updateFeature = function(){

    var comment = this.feature.isDoD ? "Feature is done based on DoD logic: "+this.logic : "Feature is not done based on DoD logic: "+this.logic;

    this.requestor.get('/work_items/' + this.feature.id, function (error, message, feature) {

        //Get the feature ID
        console.log(feature);
        //console.log("USER STORY FEATURE ID: "+userStory.parent.id);
        //instance.getFeature(userStory.parent.id);
    });

    

    console.log("UPDATING FEATURE ID: "+this.feature.id+" , PHASE ID: "+this.feature.newPhase);

    this.requestor({url: '/work_items/' + this.feature.id, method: 'PUT',json: {phase: { type: 'phase', id: this.feature.newPhase }},function(error, message, response) {
        
            console.log("Error: "+error+" , message: "+message+" , response: "+response);
    }});

    var comment = {
        "data": [{
            "author": { "id": 3041, "type": "workspace_user" },
            "text": "<html><body>"+this.feature.comment+"</body></html>",
            "owner_work_item": { "id": this.feature.id, "type": "work_item" }
        }]
    };

    this.requestor.post({ url: '/comments', body: comment }, function (error, message, comments) {
        console.log('CREATED COMMENTS');
        comments.data.forEach(function (retComment) {
            console.log('id: ' + retComment.id);
        });
    });


}


FeatureDoD.prototype.getFeature = function (featureId, logicHandler) {

    var that = this;
    var feature = that.feature;

    that.feature.id = featureId;

    that.feature.userStories = { count: 0, inNew:0, inProgress: 0, inTesting: 0, done: 0 };
    that.feature.defects = { count: 0, medium: 0, regression: 0, high: 0, critical: 0 };

    

    that.requestor.get('/work_items?query="parent EQ {id EQ ' + featureId + '}"', function (error, message, workItems) {


        // Go over all the user stories and defect and set the numbers of the important metrics that we will use to define of the feature is done 
        workItems.data.forEach(function (workItem) {

            // IF its a user story we want to know how many user stories we have in each phase i.e. new and in progress, in testing and done 
            if ('story' == workItem.subtype) {

                feature.userStories.count++;

                //console.log("User story phase: "+ workItem.phase.id)

                switch (workItem.phase.id) { case 3031: feature.userStories.inNew++;  break; case 3033: feature.userStories.inTesting++; break; case 3034: feature.userStories.done++; break; default: feature.userStories.inProgress++; }

                //	for defect we need to know both sevirity and phase 			
            } else {

                // If this is an open defect (based on the phases fix table above)
                if (workItem.phase.id == 3010 || workItem.phase.id == 3011) {

                    feature.defects.count++;

                    switch (workItem.severity.id) { case 5170: feature.defects.medium++; break; case 5171: feature.defects.medium++; break; case 5172: feature.defects.high++; break; default: feature.defects.critical++ }

                    if (workItem.regression) { feature.defects.regression++; }

                    //console.log(workItem.severity);

                }
            }

        });

        logicHandler(feature, that.logic)

        that.updateFeature();

       

        console.log(feature);

        that.callback(feature);

    });
}

FeatureDoD.prototype.applyUserStoryDone = function (userStoryId) {

    var instance = this;

    console.log("applyUserStoryDone received user story id: " + userStoryId);

    this.requestor.get('/work_items/' + userStoryId, function (error, message, userStory) {

        console.log("USER STORY FEATURE ID: "+userStory.parent.id);
        instance.getFeature(userStory.parent.id, function(feature,dodLogic){

            var Total_Stories = feature.userStories.count;
            var InProgress_Stories = feature.userStories.inProgress + feature.userStories.inNew;
            var InTesting_Stories = feature.userStories.inTesting;
            var Done_Stories = feature.userStories.done;
            var Total_Defects = feature.defects.count;
            var Medium_Defects = feature.defects.medium;
            var High_Defects = feature.defects.high;
            var Critical_Defects = feature.defects.critical;
            var Regression_Defects = feature.defects.regression;

            var isDoD = false;

            try {
                isDoD = eval(dodLogic.doneLogic);
            } catch (e) {
                console.log(e);
            }

            console.log("Feature DOD: " + isDoD);

            feature.isDoD = isDoD;
            feature.comment =isDoD ? "DoD Ruler decided that the Feature is done based on the logic: " + dodLogic.doneLogic : "DoD Ruler decided that the Feature is not done based on the logic: " + dodLogic.doneLogic;

            feature.newPhase =  feature.isDoD == 1 ? FEATURE_DONE_PHASE : FEATURE_INPROGRESS_PHASE;

        });
    });
}

FeatureDoD.prototype.applyUserStoryProgress = function (userStoryId){

    var that = this;

    this.requestor.get('/work_items/' + userStoryId, function (error, message, userStory) {
        
        console.log("USER STORY FEATURE ID: "+userStory.parent.id);
        that.getFeature(userStory.parent.id, function(feature,dodLogic){

            if ("any" == dodLogic.progressLogic){

                feature.newPhase = feature.userStories.inProgress+feature.userStories.inTesting+feature.userStories.done > 0 ? FEATURE_INPROGRESS_PHASE : FEATURE_NEW_PHASE;
                feature.comment = feature.newPhase == FEATURE_INPROGRESS_PHASE ? "DoD Ruler decided that the Feature is moving to In Progress phase because at least one user story is in Progress phase" : "DoD Ruler decided that the Feature is in New phase because all User stories are in New phase"
            } else {

                feature.newPhase = feature.userStories.inNew == 0 ?  FEATURE_INPROGRESS_PHASE : FEATURE_NEW_PHASE;
                feature.comment = feature.newPhase == FEATURE_INPROGRESS_PHASE ? "DoD Ruler decided that the Feature is moving to In Progress phase  because all  user stories are in In Progress phase" : "DoD Ruler decided that the Feature is in New phase because at least one User story is in New phase"

            }
        });
    });


}


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

var phases = [ { entity: 'defect', id: 3010, name: 'New' },
  { entity: 'story', id: 3031, name: 'New' },
  { entity: 'defect', id: 3011, name: 'Opened' },
  { entity: 'story', id: 3032, name: 'In Progress' },
  { entity: 'defect', id: 3012, name: 'Fixed' },
  { entity: 'story', id: 3033, name: 'In Testing' },
  { entity: 'defect', id: 3014, name: 'Proposed Closed' },
  { entity: 'story', id: 3034, name: 'Done' },
  { entity: 'defect', id: 3013, name: 'Closed' },
  { entity: 'defect', id: 3015, name: 'Deferred' },
  { entity: 'defect', id: 3016, name: 'Duplicate' },
  { entity: 'defect', id: 3017, name: 'Rejected' } ]

/* requestor.get('/list_nodes/', function (error, message, values) {
		
	var valuesMap = [];
	values.data.forEach(function (value){
			
		if(value.logical_name.toString().indexOf('severity') > -1 ){valuesMap.push({name: value.name, logical_name: value.logical_name, id:value.id});}	
	});
		
		console.log(valuesMap);	
});			 */

var severities = [{ name: 'Low', logical_name: 'list_node.severity.low', id: 2354 },
    { name: 'Medium', logical_name: 'list_node.severity.medium', id: 2355 },
    { name: 'High', logical_name: 'list_node.severity.high', id: 2356 },
    { name: 'Very High', logical_name: 'list_node.severity.very_high', id: 2357 },
    { name: 'Urgent', logical_name: 'list_node.severity.urgent', id: 2358 }];
