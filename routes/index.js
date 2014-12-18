var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'nlight' });
});

/* GET about page. */
router.get('/about', function(req, res) {
  res.render('about', { title: 'nlight' });
});

/* GET carousel page. */
router.get('/carousel', function(req, res) {
	res.render('carousel');
});

module.exports = router;
