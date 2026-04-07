var express = require('express');
var router = express.Router();

// middleware cek login
function cekLogin(req, res, next){
  if(req.session.user){
    next();
  } else {
    res.redirect('/auth/login');
  }
}

router.get('/', cekLogin, function(req,res){
  res.render('dashboard', {
    user: req.session.user
  });
});

module.exports = router;
