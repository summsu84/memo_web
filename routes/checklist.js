var express = require('express');
var router = express.Router();
var perPage = 5;
var url = require('url');
var async = require('async');

var ObjectID = require('mongodb').ObjectID;

router.get('/', function (req, res, next) {
    res.render('checklist', {
        "title": 'checklist'
    });
});

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

var DateUtil = {};

DateUtil.isLeapYear = function (year) { 
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)); 
};

DateUtil.getDaysInMonth = function (year, month) {
    return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};

DateUtil.prototype.isLeapYear = function () { 
    return Date.isLeapYear(this.getFullYear()); 
};

DateUtil.prototype.getDaysInMonth = function () { 
    return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
};

DateUtil.prototype.addMonths = function (value) {
    var n = this.getDate();
    this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
    return this;
};

function calculateDate(date, unit, val) {
    
    if(unit == 'day') {
        return addDays(date, val);
    } else if(unit == 'week') {
        return addDays(date, val * 7);    
    } else if(unit == 'month') {
        return DateUtil.prototype.addMonths(val);
    } else if(unit == 'year') {
        return DateUtil.prototype.addMonths(val * 12);    
    }
    
}

router.post('/complete', function (req, res, next) {
    var selId = req.body.sel_id;

    var db = req.db;
    var test_cols = db.get('checklist');
    test_cols.update({
            "_id": selId
        },
            {
                $set: {
                    "complete": 'y'
                }
            },
            function (err, doc) {
                if (err) {
                    throw err;
                } else {
                    // req.flash('success', 'Comment Added');
                    // res.location('/checklist');
                    // res.redirect('/checklist');
                    searchHandler(req, res, next);
                }
            }
            );
    
});

router.post('/cancelComplete', function (req, res, next) {
    var selId = req.body.sel_id;

    var db = req.db;
    var test_cols = db.get('checklist');
    test_cols.update({
            "_id": selId
        },
            {
                $set: {
                    "complete": 'n'
                }
            },
            function (err, doc) {
                if (err) {
                    throw err;
                } else {
                    // req.flash('success', 'Comment Added');
                    // res.location('/checklist');
                    // res.redirect('/checklist');
                    searchHandler(req, res, next);
                }
            }
            );
});

router.post('/searchDetail', function (req, res, next) {
    var db = req.db;
    var test_cols = db.get('checklistDtl');
    var searchQeury;
    var _id = req.body.chklst_id === undefined ? '' : req.body.chklst_id;
    var objectId = new ObjectID(_id);
    searchQeury = {"chklst_id": objectId};
    
    test_cols.find(searchQeury, { sort: { due_date: -1 }, limit: 3 },
        function (err, test_cols) {
            res.jsonp({
                        "chklstDtl": test_cols
                    });
        }
    );
    
});

function doJsonSearch(req, res, searchText, searchTags, pageNo, completeYn) {
    var db = req.db;
    var test_cols = db.get('checklist');
    var searchQeury;
    if(searchTags != 'All') {
        if(completeYn == 'y') {
            searchQeury = {"title": { "$regex": searchText }, "tags": searchTags };
        } else {
            searchQeury = {"complete": {"$ne": 'y'}, "title": { "$regex": searchText }, "tags": searchTags };
        }            
    } else {
        if(completeYn == 'y') {
            searchQeury = {"title": { "$regex": searchText } };
        } else {
            searchQeury = {"complete": {"$ne": 'y'}, "title": { "$regex": searchText } };
        }
    }

    async.parallel([
        function(callback) {
            test_cols.distinct('tags', function (err, categories) {
                callback(null, categories.sort());
            });
        },
        function(callback) {
            test_cols.find(searchQeury, { sort: { edit_date: -1 }, skip: (pageNo - 1) * perPage, limit: perPage },
                function (err, test_cols) {
                    callback(null, test_cols);
                });
        }
    ], function(err, results) {
        res.jsonp({
                        "test_cols": results[1],
                        'pageNo': pageNo,
                        'keywords': results[0],
                        'searchText': searchText
                    });
    });
    
}

router.post('/search', function (req, res, next) {
    searchHandler(req, res, next);
});

function searchHandler(req, res, next) {
    var searchText = req.body.searchText === undefined ? '' : req.body.searchText;
    var pageNo = req.body.pageNo === undefined ? 1 : req.body.pageNo;
    var searchTags = req.body.searchTags === undefined ? 'All' : req.body.searchTags;
    var completeYn = req.body.completeYn === undefined ? 'y' : req.body.completeYn;    
    doJsonSearch(req, res, searchText, searchTags, pageNo, completeYn);
}



router.post('/chklstDone', function (req, res, next) {
    var selId = req.body.sel_id;
    var dtlId = req.body.dtl_id;
    
    var selIntervalVal = req.body.sel_interval_val;
    var selIntervalUnit = req.body.sel_interval_unit;
    
    var db = req.db;
    var checklistDtl = db.get('checklistDtl');

    async.parallel([
        function(callback) {
            checklistDtl.update({
                "_id": dtlId
            },
                {
                    $set: {
                        "done_bool": true,
                        "done_date": new Date()
                    }
                },
                function (err, doc) {
                    if (err) {
                        throw err;
                    } else {
                        callback(null, "");
                    }
                }
            );
            
        },
        function(callback) {
            checklistDtl.insert({
                    "chklst_id": selId,
                    "due_date": calculateDate(Date(), selIntervalUnit, selIntervalVal),
                    "reg_date": new Date(),
                    "done_bool": false
                }, function (err, test_cols) {
                    if (err) {
                        res.send('There was an issue submitting the post');
                    } else {
                        callback(null, "");
                    }
                }
            );     
            
            
        }
    ], function(err, results) {
        
        checklistDtl.find({chklst_id: ObjectID(selId)}, { sort: { due_date: -1 }, limit: 3 },
            function (err, test_cols) {
                res.jsonp({
                        "chklstDtl": test_cols
                    });
            }
        );
    });
    
});

router.post('/save', function (req, res, next) {
    // get form values
    var selTitle = req.body.sel_title;
    var selTags = req.body.sel_tags;
    var selId = req.body.sel_id;
    
    var selStartDate = req.body.sel_start_date;
    var selNoticeBool = req.body.sel_notice_bool;
    
    var selIntervalVal = req.body.sel_interval_val;
    var selIntervalUnit = req.body.sel_interval_unit;
    
    var db = req.db;
    var test_cols = db.get('checklist');
    var checklistDtl = db.get('checklistDtl');

    async.parallel([
        function(callback) {
            if (selId == '') {
                test_cols.insert({
                    "title": selTitle,
                    "tags": selTags,
                    "start_date": selStartDate,
                    "reg_date": new Date(),
                    "edit_date": new Date(),
                    "notice_bool": selNoticeBool == "on" ? "true" : "false",
                    "interval_val": selIntervalVal,
                    "interval_unit": selIntervalUnit
                }, function (err, doc) {
                    if (err) {
                        res.send('There was an issue submitting the post');
                    } else {
                        callback(null, doc);
                    }
                });
            } else {
                test_cols.update({
                    "_id": selId
                },
                    {
                        $set: {
                            "title": selTitle,
                            "tags": selTags,
                            "start_date": selStartDate,
                            "reg_date": new Date(),
                            "edit_date": new Date(),
                            "notice_bool": selNoticeBool == "on" ? true : false,
                            "interval_val": selIntervalVal,
                            "interval_unit": selIntervalUnit
                        }
                    },
                    function (err, doc) {
                        if (err) {
                            throw err;
                        } else {
                            callback(null, "");
                        }
                    }
                );
            }
        }
    ], function(err, results) {
        
        if (selId == '') {
            checklistDtl.insert({
                    "chklst_id": results[0]._id,
                    "due_date": selStartDate,
                    "reg_date": new Date(),
                    "done_bool": false
                }, function (err, test_cols) {
                    if (err) {
                        res.send('There was an issue submitting the post');
                    } else {
                        res.location('/checklist');
                        res.redirect('/checklist');
                    }
                }
            );                
        } else {
            res.location('/checklist');
            res.redirect('/checklist');
        }
        
    });
    
});

module.exports = router;
