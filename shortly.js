var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({secret: "mark",
  resave: false,
  saveUninitialized: true}));

var createSession = function(req, res, newUser) {
  return req.session.regenerate(function() {
      req.session.user = newUser;
      res.redirect('/');
    });
};

var isLoggedIn = function(req, res) {
  return req.session ? !!req.session.user : false;
};

var checkUser = function(req, res, next){
  if (!isLoggedIn(req)){
    res.redirect('/login');
  } else {
    next();
  }
};

app.get('/', checkUser,
function(req, res) {
  res.render('index');
});

app.get('/create', checkUser,
function(req, res) {
  res.render('index');
});

app.get('/links', checkUser,
function(req, res) {
  if (sess.username) {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    }).catch(function(err){
      res.writeHead(404);
      res.send(err);
    });
  } else {
    res.redirect('login');
  }
});

app.post('/links', checkUser,
function(req, res) {
  var uri = req.body.url;
  if (!util.isValidUrl(uri)) {
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/signup', function(req, res){
  res.render('signup');
});

app.post('/signup', function(req,res){
  var getUserName = req.body.username;
  var getUserPassword = req.body.password;
  new User({username: getUserName})
    .fetch()
    .then(function (user){
      if (!user){
        var user = new User({
          username: getUserName,
          password: getUserPassword
        });
        user.save().then(function(user){
          console.log("USER: ", user);
          createSession(req, res, user);
        })
      }
    });
});

app.get('/login', function(req, res){
  res.render('login');
});

app.post('/login', function(req, res) {
  new User({username: req.body.username})
  .fetch()
  .then(function(model) {
    if (!model){
      res.redirect('/login');
    } else {
      model.comparePassword(req.body.password, function(response){
        if (response) {
          createSession(req, res, model);
        } else {
          res.redirect('/signup');
        }
      })
    }
  });
});

app.get('/logout', function(req, res){
  sess = req.session;
  sess.destroy(function(err) {
    if (err) {
      throw err;
    }
    res.redirect('/');
  })
})

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  console.log(req.params);
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

// app.get('/logout', function(req,res) {
//   console.log("logging out from a post");
//   req.session.destroy(function(err) {
//     if (err) {
//       throw err;
//     }
//     res.redirect('/');
//   });
// })

console.log('Shortly is listening on 4568');
app.listen(4568);
