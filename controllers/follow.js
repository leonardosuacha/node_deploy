'use strict'

//var path = require('path');
//var fs = require('fs');
var mongoosePagination = require("../libraries/pagination");

var User = require('../models/user');
var Follow = require('../models/follow');


// Seguir a un usuario
function saveFollow(req, res){
  var params = req.body;
  var follow = new Follow();

  follow.user = req.user.sub;
  follow.followed = params.followed;

  follow.save((err, followStored) => {
    if(err) return res.status(500).send({ message: 'Error guardando el seguimiento.'});

    if(!followStored) return res.status(404).send({ message: 'El seguimiento no se ha guardado.'});

    return res.status(200).send({ follow: followStored })
  });
}


// Dejar de seguir un usuario
function deleteFollow(req, res){
  var userId = req.user.sub;
  var followId = req.params.id;

  Follow.find({ 'user': userId, 'followed': followId}).remove((err) =>{
    if(err) return res.status(500).send({ message: 'Error al dejar de seguir.' });

    return res.status(200).send({ message: 'El follow se ha eliminado.' });
  });

}


// Listar lista de follows
function getFollowingUsers(req, res){
  var userId = req.user.sub;

  if(req.params.id && req.params.page){
    userId = req.params.id;
  }

  var page = 1;
  if(req.params.page){
    page = req.params.page;
  }else{
    page = req.params.id;
  }

  var itemsPerPage = 4;

  Follow.find({ user: userId}).populate({ path: 'followed'}).paginate(page, itemsPerPage, (err, follows, total) => {
    if(err) return res.status(500).send({ message: 'Error en el servidor.' });

    if(!follows) return res.status(404).send({ message: 'No sigues a ningún usuario.' });

    followUserIds(req.user.sub).then((value) => {
      return res.status(200).send({
        total: total,
        pages: Math.ceil(total/itemsPerPage),
        follows,
        users_following: value.following,
        users_follow_me: value.followed
      });
    });
  });

}


async function followUserIds(user_id){
  try {
      var following = await await Follow.find({"user": user_id}).select({ '_id':0, '__v':0, 'user':0}).exec()
          .then((following) => {
            var follows_clean = [];

            following.forEach((following) => {
              follows_clean.push(following.followed);
            });
            //console.log(follows_clean);
            return follows_clean;
          })
          .catch((err)=>{
              return handleerror(err);
          });
      var followed = await Follow.find({"followed": user_id}).select({ '_id':0, '__v':0, 'followed':0}).exec()
          .then((followed) => {
            var follows_clean = [];

            followed.forEach((followed) => {
              follows_clean.push(followed.user);
            });
            //console.log(following);
            return follows_clean;
          })
          .catch((err)=>{
              return handleerror(err);
          });
      return {
          following: following,
          followed: followed
      }
  } catch(e){
      console.log(e);
  }
  /*
  var following = await Follow.find({"user": user_id}).select({ '_id':0, '__v':0, 'user':0}).exec((err, follows) => {
    console.log(follows);
    var follows_clean = [];

    follows.forEach((follows) => {
      follows_clean.push(follows.followed);
    });
    //console.log(follows_clean);
    return follows_clean;

  });
  var followed = await Follow.find({"followed": user_id}).select({ '_id':0, '__v':0, 'followed':0}).exec((err, follows) => {

    var follows_clean = [];

    follows.forEach((follows) => {
      follows_clean.push(follows.user);
    });
    //console.log(following);
    return follows_clean;
  });
  //console.log(following);
  //console.log(followed);

  */
  return {
    following: following,
    followed: followed
  }

}





// Listar usuarios que me siguen
function getFollowedUsers(req, res){
  var userId = req.user.sub;

  if(req.params.id && req.params.page){
    userId = req.params.id;
  }

  var page = 1;
  if(req.params.page){
    page = req.params.page;
  }else{
    page = req.params.id;
  }

  var itemsPerPage = 4;

  Follow.find({ followed: userId}).populate('user').paginate(page, itemsPerPage, (err, follows, total) => {
    if(err) return res.status(500).send({ message: 'Error en el servidor.' });

    if(!follows) return res.status(404).send({ message: 'No te sigue ningún usuario.' });

    followUserIds(req.user.sub).then((value) => {
      return res.status(200).send({
        total: total,
        pages: Math.ceil(total/itemsPerPage),
        follows,
        users_following: value.following,
        users_follow_me: value.followed
      });
    });
  });

}


// Listar follows sin paginar
function getMyFollows(req, res){
  var userId = req.user.sub;

  var find = Follow.find({user: userId});
  if (req.params.followed) {
    find = Follow.find({followed: userId});
  }

  find.populate('user followed').exec((err, follows) => {
    if(err) return res.status(500).send({ message: 'Error en el servidor.' });

    if(!follows) return res.status(404).send({ message: 'No sigues a ningún usuario.' });

    return res.status(200).send({follows});
  });
}



module.exports = {
  saveFollow,
  deleteFollow,
  getFollowingUsers,
  getFollowedUsers,
  getMyFollows
}
