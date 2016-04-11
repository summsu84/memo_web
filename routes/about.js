var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', ensureAuthenticated, function(req, res, next) {
   res.render('about', { title: 'About' });
});

router.get('/register', function(req, res, next) {
    res.send('respond with a resource');
});

function ensureAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/users/login');
}

router.post('/register2', function(req, res, next) {
    // Get form values
    // var name = req.body.name;

    // form validation
    // req.checkBody('name', 'Name field is required').notEmpty();
    // req.checkBody('name', 'Name field is required').notEmpty();

    // check for errors
    var errors = req.validationErrors();

    if(errors) {
        res.render('register', {
           errors: errors
        });
    } else {
        // var
    }

    req.flash('success', 'You are now registered and may log in');

});

module.exports = router;
