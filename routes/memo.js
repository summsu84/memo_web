var express = require('express');
var router = express.Router();
var perPage = 5;
var url = require('url');
var async = require('async');
var ObjectID = require('mongodb').ObjectID;

router.get('/', ensureAuthenticated, function (req, res, next) {
    res.render('memo', {
        "title": 'Memo'
    });
});

function ensureAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/users/login');
}

router.post('/complete', ensureAuthenticated, function (req, res, next) {
    var selId = req.body.sel_id;

    var db = req.db;
    var test_cols = db.get('memo');
    test_cols.update({
            "_id": selId
        },
            {
                $set: {
                    "complete": true
                }
            },
            function (err, doc) {
                if (err) {
                    throw err;
                } else {
                    req.flash('success', 'post completed');
                    res.jsonp({
                                    "error_code": 0
                                });
                    // res.location('/memo');
                    // res.redirect('/memo');
                    // searchHandler(req, res, next);
                }
            }
            );

});

router.post('/cancelComplete', ensureAuthenticated, function (req, res, next) {
    var selId = req.body.sel_id;

    var db = req.db;
    var test_cols = db.get('memo');
    test_cols.update({
            "_id": selId
        },
            {
                $set: {
                    "complete": false
                }
            },
            function (err, doc) {
                if (err) {
                    throw err;
                } else {
                    req.flash('success', 'Cancel post completion');
                    res.jsonp({
                                    "error_code": 0
                                });
                    // res.location('/memo');
                    // res.redirect('/memo');
                    // searchHandler(req, res, next);
                }
            }
            );
});

function doJsonSearch(req, res, searchText, searchTags, curPage, completeBool) {
    var db = req.db;
    var test_cols = db.get('memo');
    var searchQeury;
    if(searchTags != 'All') {
        if(completeBool) {
            searchQeury = { "$or": [{"title": { "$regex": searchText }}, {"contents": { "$regex": searchText }}], "tags": searchTags, 'reg_id': req.user.name };
        } else {
            searchQeury = {"complete": {"$ne": true}, "$or": [{"title": { "$regex": searchText }}, {"contents": { "$regex": searchText }}], "tags": searchTags, 'reg_id': req.user.name };
        }
    } else {
        if(completeBool) {
            searchQeury = { "$or": [{"title": { "$regex": searchText }}, {"contents": { "$regex": searchText }}], 'reg_id': req.user.name };
        } else {
            searchQeury = {"complete": {"$ne": true}, "$or": [{"title": { "$regex": searchText }}, {"contents": { "$regex": searchText }}], 'reg_id': req.user.name };
        }
    }
    // var searchFields = {_id: 1, tags: 1, title: 1, edit_date: 1, contents: 0, reg_date: 0, complete: 0, due_date: 0, notice_bool: 0, reg_id: 0};
    var searchFields = {contents: 0, reg_date: 0, complete: 0, due_date: 0, notice_bool: 0, reg_id: 0};

    async.parallel([
        function(callback) {
            test_cols.distinct('tags', {'reg_id': req.user.name}, function (err, categories) {
                callback(null, categories.sort());
            });
        },
        function(callback) {
            test_cols.find(searchQeury, { fields: searchFields, sort: { edit_date: -1 }, skip: (curPage - 1) * perPage, limit: perPage },
                function (err, test_cols) {
                    callback(null, test_cols);
                });
        },
        function(callback) {
            test_cols.count(searchQeury,
                function (err, cnt) {
                    callback(null, cnt);
                });
        }
    ], function(err, results) {
        res.jsonp({
                        "test_cols": results[1],
                        'curPage': curPage,
                        'keywords': results[0],
                        'searchText': searchText,
                        'total_cnt': results[2]
                    });
    });

}

router.post('/search', ensureAuthenticated, function (req, res, next) {
    searchHandler(req, res, next);
});

router.post('/searchDetail', ensureAuthenticated, function (req, res, next) {
  var db = req.db;
  var test_cols = db.get('memo');
  var selId = new ObjectID(req.body.sel_id);

  test_cols.find({_id: selId},
      function (err, test_cols) {
          res.jsonp({
                          "detailObj": test_cols
                      });
      });

});

function searchHandler(req, res, next) {
    var searchText = req.body.searchText === undefined ? '' : req.body.searchText;
    var curPage = req.body.curPage === undefined ? 1 : req.body.curPage;
    var searchTags = req.body.searchTags === undefined ? 'All' : req.body.searchTags;
    var completeBool = req.body.completeBool === undefined ? false : req.body.completeBool;
    doJsonSearch(req, res, searchText, searchTags, curPage, completeBool);
}

router.post('/savePost', ensureAuthenticated, function (req, res, next) {
    // get form values
    var selContents = req.body.sel_contents;
    var selTitle = req.body.sel_title;
    var selTags = req.body.sel_tags;
    var selId = req.body.sel_id;

    var selDueDate = req.body.sel_due_date;
    var selNoticeBool = req.body.sel_notice_bool;

    var db = req.db;
    var test_cols = db.get('memo');

    if (selId == '') {
        test_cols.insert({
            "contents": selContents,
            "title": selTitle,
            "tags": selTags,
            "reg_date": new Date(),
            "edit_date": new Date(),
            "due_date": selDueDate,
            "notice_bool": selNoticeBool,
            "complete" : "n",
            'reg_id': req.user.name
        }, function (err, test_cols) {
            if (err) {
                res.send('There was an issue submitting the post');
            } else {
                // req.flash('success', 'Post Submitted');
                // res.jsonp({
                //                 "error_code": 0
                //             });
                // res.location('/memo');
                // res.redirect('/memo');
                searchHandler(req, res, next);
            }
        });
    } else {
        test_cols.update({
            "_id": selId
        },
            {
                $set: {
                    "contents": selContents,
                    "title": selTitle,
                    "tags": selTags,
                    "reg_date": new Date(),
                    "edit_date": new Date(),
                    "due_date": selDueDate,
                    "notice_bool": selNoticeBool
                }
            },
            function (err, doc) {
                if (err) {
                    throw err;
                } else {
                    //req.flash('success', 'Comment Added');
                    // res.jsonp({
                    //                 "error_code": 0
                    //             });
                    // // res.location('/posts/show/'+selId);
                    // // res.redirect('/posts/show/'+selId);
                    // res.location('/memo');
                    // res.redirect('/memo');
                    searchHandler(req, res, next);
                }
            }
            );
    }
});

module.exports = router;
