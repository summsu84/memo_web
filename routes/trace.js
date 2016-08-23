var express = require('express');
var router = express.Router();
var perPage = 5;
var url = require('url');
var async = require('async');

var ObjectID = require('mongodb').ObjectID;

router.get('/', ensureAuthenticated, function (req, res, next) {
    res.render('trace', {
        "title": 'trace'
    });
});

function ensureAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/users/login');
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

Date.isLeapYear = function (year) {
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
};

Date.getDaysInMonth = function (year, month) {
    return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};

Date.prototype.isLeapYear = function () {
    return Date.isLeapYear(this.getFullYear());
};

Date.prototype.getDaysInMonth = function () {
    return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
};

Date.prototype.addMonths = function (value) {
    var n = this.getDate();
    this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
    return this;
};

function calculateDate(date, unit, val) {

    if (unit == 'day') {
        return addDays(date, val);
    } else if (unit == 'week') {
        return addDays(date, val * 7);
    } else if (unit == 'month') {
        return date.addMonths(val);
    } else if (unit == 'year') {
        return date.addMonths(val * 13);
    }

}

function zeroPad(num, places) {
  var zero = places - num.toString().length + 1;
  return Array(+(zero > 0 && zero)).join("0") + num;
}

function convertDateFormat(date) {
    //return zeroPad(date.getMonth() + 1, 2) + '/' + zeroPad(date.getDate(), 2) + '/' + date.getFullYear()
    return date.getFullYear() + '-' + zeroPad(date.getMonth() + 1, 2) + '-' + zeroPad(date.getDate(), 2);
}

router.post('/complete', ensureAuthenticated, function (req, res, next) {
    var selId = req.body.sel_id;

    var db = req.db;
    var traceMaster = db.get('trace');
    traceMaster.update({
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
                // res.location('/trace');
                // res.redirect('/trace');
                searchHandler(req, res, next);
            }
        }
        );

});

router.post('/cancelComplete', ensureAuthenticated, function (req, res, next) {
    var selId = req.body.sel_id;

    var db = req.db;
    var traceMaster = db.get('trace');
    traceMaster.update({
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
                // res.location('/trace');
                // res.redirect('/trace');
                searchHandler(req, res, next);
            }
        }
        );
});

router.post('/searchDetail', ensureAuthenticated, function (req, res, next) {
    var db = req.db;
    var traceDtl = db.get('traceDtl');
    var searchQeury;
    var _id = req.body.trace_id === undefined ? '' : req.body.trace_id;
    var objectId = new ObjectID(_id);
    searchQeury = { "trace_id": objectId, 'reg_id': req.user.name };

    traceDtl.find(searchQeury, { sort: { done_bool: 1, due_date: -1 }, limit: 3 },
        function (err, returnData) {
            res.jsonp({
                "traceDtl": returnData
            });
        }
        );

});

function doJsonSearch(req, res, searchText, searchTags, pageNo, completeYn) {
    var db = req.db;
    var traceMaster = db.get('trace');
    var searchQeury;
    if (searchTags != 'All') {
        if (completeYn == 'y') {
            searchQeury = { "title": { "$regex": searchText }, "tags": searchTags, 'reg_id': req.user.name };
        } else {
            searchQeury = { "complete": { "$ne": 'y' }, "title": { "$regex": searchText }, "tags": searchTags, 'reg_id': req.user.name };
        }
    } else {
        if (completeYn == 'y') {
            searchQeury = { "title": { "$regex": searchText }, 'reg_id': req.user.name };
        } else {
            searchQeury = { "complete": { "$ne": 'y' }, "title": { "$regex": searchText }, 'reg_id': req.user.name };
        }
    }

    async.parallel([
        function (callback) {
            traceMaster.distinct('tags', {'reg_id': req.user.name}, function (err, categories) {
                callback(null, categories.sort());
            });
        },
        function (callback) {
            traceMaster.find(searchQeury, { sort: { rating: -1 }, skip: (pageNo - 1) * perPage, limit: perPage },
                function (err, returnData) {
                    callback(null, returnData);
                });
        },
        function(callback) {
            traceMaster.count(searchQeury,
                function (err, cnt) {
                    callback(null, cnt);
                });
        }
    ], function (err, results) {
        res.jsonp({
            "test_cols": results[1],
            'pageNo': pageNo,
            'keywords': results[0],
            'searchText': searchText,
            'total_cnt': results[2]
        });
    });

}

router.post('/search', ensureAuthenticated, function (req, res, next) {
    searchHandler(req, res, next);
});

function searchHandler(req, res, next) {
    var searchText = req.body.searchText === undefined ? '' : req.body.searchText;
    var pageNo = req.body.pageNo === undefined ? 1 : req.body.pageNo;
    var searchTags = req.body.searchTags === undefined ? 'All' : req.body.searchTags;
    var completeYn = req.body.completeYn === undefined ? 'y' : req.body.completeYn;
    doJsonSearch(req, res, searchText, searchTags, pageNo, completeYn);
}

var convertDate = function (d) {
  var year = d.getFullYear();
  var month = d.getMonth();
  var date = d.getDate();
  return year + '' +
      ((month + '').length != 2 ? '0' + (month + '') : month + '') +
      ((date + '').length != 2 ? '0' + (date + '') : date + '');
}

var getNextDuedate = function (d, unit, interval) {
    var nextDueDt = new Date(d);
    var currentDt = new Date();
    // if(convertDate(currentDt) < convertDate(nextDueDt)) {
    //     return null;
    // }
    while (convertDate(currentDt) >= convertDate(nextDueDt)) {
        nextDueDt = calculateDate(nextDueDt, unit, interval);
    }
    return nextDueDt;
}

router.post('/traceDone', ensureAuthenticated, function (req, res, next) {
    var selId = req.body.sel_id;
    var dtlId = req.body.dtl_id;

    var selDesc = req.body.sel_desc;
    var selDueDate = req.body.sel_due_date;
    var selIntervalVal = req.body.sel_interval_val;
    var selIntervalUnit = req.body.sel_interval_unit;

    var db = req.db;
    var traceDtl = db.get('traceDtl');

    async.parallel([
        function (callback) {
            traceDtl.update({
                "_id": dtlId
            },
                {
                    $set: {
                        "done_bool": true,
                        "done_date": new Date(),
                        "due_date": selDueDate,
                        "desc": selDesc
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
        function (callback) {
            traceDtl.insert({
                "trace_id": ObjectID(selId),
                "due_date": convertDateFormat(getNextDuedate(new Date(selDueDate), selIntervalUnit, selIntervalVal * 1)),
                "reg_date": new Date(),
                "done_bool": false,
                'reg_id': req.user.name
            }, function (err, test_cols) {
                if (err) {
                    res.send('There was an issue submitting the post');
                } else {
                    callback(null, "");
                }
            }
                );
        }
    ], function (err, results) {

        traceDtl.find({ trace_id: ObjectID(selId), 'reg_id': req.user.name }, { sort: { done_bool: 1, due_date: -1 }, limit: 3 },
            function (err, test_cols) {
                res.jsonp({
                    "traceDtl": test_cols
                });
            }
            );
    });

});

router.post('/save', ensureAuthenticated, function (req, res, next) {
    // get form values
    var selTitle = req.body.sel_title;
    var selTags = req.body.sel_tags;
    var selId = req.body.sel_id;
    var selRating = req.body.sel_rating;

    var selStartDate = req.body.sel_start_date;
    var selNoticeBool = req.body.sel_notice_bool;

    var selIntervalVal = req.body.sel_interval_val;
    var selIntervalUnit = req.body.sel_interval_unit;

    var db = req.db;
    var traceMaster = db.get('trace');
    var traceDtl = db.get('traceDtl');

    async.parallel([
        function (callback) {
            if (selId == '') {
                traceMaster.insert({
                    "title": selTitle,
                    "tags": selTags,
                    "start_date": selStartDate,
                    "reg_date": new Date(),
                    "edit_date": new Date(),
                    "notice_bool": selNoticeBool == "on" ? true : false,
                    "interval_val": selIntervalVal,
                    "interval_unit": selIntervalUnit,
                    "complete" : "n",
                    'reg_id': req.user.name,
                    "rating": selRating
                }, function (err, doc) {
                    if (err) {
                        res.send('There was an issue submitting the post');
                    } else {
                        callback(null, doc);
                    }
                });
            } else {
                traceMaster.update({
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
                            "interval_unit": selIntervalUnit,
                            "rating": selRating
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
    ], function (err, results) {

        if (selId == '') {
            traceDtl.insert({
                "trace_id": results[0]._id,
                "due_date": selStartDate,
                "reg_date": new Date(),
                "done_bool": false,
                'reg_id': req.user.name
            }, function (err, returnData) {
                if (err) {
                    res.send('There was an issue submitting the post');
                } else {
                    res.location('/trace');
                    res.redirect('/trace');
                }
            });
        } else {
            res.location('/trace');
            res.redirect('/trace');
        }

    });

});

module.exports = router;
