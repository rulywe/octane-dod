module.exports = {
    featureDoD: function (requestor, callback, logic) {
        return new FeatureDoD(requestor, callback, logic);
    }

};


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

    var phaseId =  this.feature.isDoD == 1 ? 2133 : 2131;

    console.log("UPDATING FEATURE ID: "+this.feature.id+" , PHASE ID: "+phaseId);

    this.requestor({url: '/work_items/' + this.feature.id, method: 'PUT',json: {phase: { type: 'phase', id: phaseId }},function(error, message, response) {
        
            console.log("Error: "+error+" , message: "+message+" , response: "+response);
    }});



}


FeatureDoD.prototype.getFeature = function (featureId) {

    var that = this;
    var feature = that.feature;

    that.feature.id = featureId;

    that.feature.userStories = { count: 0, inProgress: 0, inTesting: 0, done: 0 };
    that.feature.defects = { count: 0, medium: 0, regression: 0, high: 0, critical: 0 };

    that.requestor.get('/work_items?query="parent EQ {id EQ ' + featureId + '}"', function (error, message, workItems) {


        // Go over all the user stories and defect and set the numbers of the important metrics that we will use to define of the feature is done 
        workItems.data.forEach(function (workItem) {

            // IF its a user story we want to know how many user stories we have in each phase i.e. new and in progress, in testing and done 
            if ('story' == workItem.subtype) {

                feature.userStories.count++;

                //console.log("User story phase: "+ workItem.phase.id)

                switch (workItem.phase.id) { case 2136: feature.userStories.inTesting++; break; case 2137: feature.userStories.done++; break; default: feature.userStories.inProgress++; }

                //	for defect we need to know both sevirity and phase 			
            } else {

                // If this is an open defect (based on the phases fix table above)
                if (workItem.phase.id == 2114 || workItem.phase.id == 2113) {

                    feature.defects.count++;

                    switch (workItem.severity.id) { case 2354: feature.defects.medium++; break; case 2355: feature.defects.medium++; break; case 2356: feature.defects.high++; break; default: feature.defects.critical++ }

                    if (workItem.regression) { feature.defects.regression++; }

                    //console.log(workItem.severity);

                }
            }

        });



        var isDoD = false;

        try {
            isDoD = eval(that.logic);
        } catch (e) {
            console.log(e);
        }

        console.log("Feature DOD: " + isDoD);

        feature.isDoD = isDoD;
        
        that.updateFeature();

       

        console.log(feature);

        that.callback(feature);

    });
}

FeatureDoD.prototype.applyUserStoryDone = function (userStoryId) {

    var instance = this;

    console.log("applyUserStoryDone received user story id: " + userStoryId);

    this.requestor.get('/work_items/' + userStoryId, function (error, message, userStory) {

        //Get the feature ID
        //console.log(userStory);
        //console.log("USER STORY FEATURE ID: "+userStory.parent.id);
        instance.getFeature(userStory.parent.id);
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

var phases = [{ entity: 'defect', id: 2113, name: 'New' },
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
    { entity: 'defect', id: 2120, name: 'Rejected' }];

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
