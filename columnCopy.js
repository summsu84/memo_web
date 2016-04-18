var config = require('./config.json');
var db =require('monk')(config.db_connection_url);
var async = require('async');

var collectionName = 'memo';

function processBatch() {
	console.log('processBatch');
	var self = this;
    self.doBatch();
}

processBatch.prototype.doBatch = function () {
	console.log('doBatch');
    var self = this;
    var dbObj = db.get(collectionName);
    async.parallel([
        function (callback) {
//            dbObj.find({due_date: {$exists: true} },
	    dbObj.find({},
                function (err, result) {
                    callback(null, result);
                }
            );
        }
    ], function (err, results) {
        async.eachSeries(results[0], self.dataHandling, function (contents) {
            process.exit(1);
        });
    });
}

processBatch.prototype.dataHandling = function (resultObj, callback) {
    
    var resultArry = [];
    var rowObj = {};
    var tempId = '';
    var tempDt = '';
    var tempContents = '';

    async.waterfall([
        function (callback) {
            console.log('_id: ' + resultObj._id);
            tempId = resultObj._id;
//            tempDt = resultObj.due_date;
//            tempDt = tempDt.substring(6, 10) + '-' + tempDt.substring(0, 2) + '-' + tempDt.substring(3, 5);
//            if(tempDt.replace(/-/g, '').length == 0) {
//				tempDt = '';
//            }
            tempContents = resultObj.contents;
            console.log('due_date: ' + resultObj.due_date);
            console.log('due_date: ' + tempDt);
            console.log('title: ' + resultObj.title);

            callback(null, tempId, tempDt, tempContents);
        
        }, function (retrievedId, retrievedDate, retrievedContents, callback) {
            
            var updateCols = db.get(collectionName);
            
		    updateCols.update({
		        "_id": retrievedId
				    },
		        {
		            $set: {
//		                due_date: retrievedDate
				title: retrievedContents
		            }
		        },
		        function (err, doc) {
		            if (err) {
		                throw err;
		            } else {
		                callback(null);
		            }
		        }
		    );

		            
        }], function (err, results) {
            
            callback(null);
        }
    );
}

new processBatch();
