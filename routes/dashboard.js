var express = require('express');
var router = express.Router();

// middleware cek login
function cekLogin(req, res, next){
  if(req.session.user){
    next();
  } else {
    res.redirect('/users/login'); // Rute login yang ini salah seharusnya /auth/login
  }
}

// --- HAPUS ATAU KOMENTARI BAGIAN INI ---
/* 
router.get('/', cekLogin, function(req,res){
  res.render('dashboard', {
    user: req.session.user
  });
});
*/
// ---------------------------------------

module.exports = router;