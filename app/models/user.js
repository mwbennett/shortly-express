var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

  initialize: function() {
    this.on('creating', function(model, attrs, options){
      model.set('username', model.attributes.username);
      bcrypt.genSalt(10, function(err, salt) {
        if (err){
          throw err;
        }
        bcrypt.hash(model.attributes.password, salt, null, function(err, hash) {
          if (err){
            throw err;
          }
          model.set('password', hash);
        });
      });
    });
  }
});




module.exports = User;
