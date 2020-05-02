'use strict'

var bcrypt = require('bcrypt-nodejs');
var mongoosePagination = require("../libraries/pagination");
var fs = require('fs');
var path = require('path');

var User = require('../models/user');
var jwt = require('../services/jwt');
var Follow = require('../models/follow');
var Publication = require('../models/publication');


function home(req, res){
  res.status(200).send({
    message: 'Home Page'
  })
}


function pruebas(req, res){
  console.log(req.body);
  res.status(200).send({
    message: 'Test Page'
  })
}


// Registro de usuarios
function saveUser(req, res){
  var params = req.body;
  var user = new User();
  if (params.name && params.surname && params.nick && params.email && params.password){
    user.name = params.name;
    user.surname = params.surname;
    user.nick = params.nick;
    user.email = params.email;
    user.role = 'ROLE_USER';
    user.image = null;

    // evita duplicar datos por campos descritos en $or
    User.find({ $or: [
                      {email: user.email.toLowerCase()},
                      {nick: user.nick.toLowerCase()}
    ]}).exec((err, users) => {
      if(err) return res.status(500).send({ message: 'Error en la petición de usuarios.'});

      if(users && users.length > 0) {
        return res.status(200).send({ message: 'El usuario ya existe'});
      }else{
        // guardar datos si no existen en la DB
        bcrypt.hash(params.password, null, null, (err, hash) => {
          user.password = hash;

          user.save((err, userStored) => {
            if(err) return res.status(500).send({ message: 'Error al guardar usuario'});
            if(userStored){
              res.status(200).send({ user: userStored })
            }else{
              res.status(404).send({ message: 'No se ha registrado el usuario.'})
            }
          })
        });

      }
    });


  }else{
    res.status(200).send({
      message: 'Enviar todos los campos necesarios!'
    })
  }

}


// Login de usuarios
function loginUser(req, res){
  var params = req.body;

  var email = params.email;
  var password = params.password;

  User.findOne({email: email}, (err, user) => {
    if(err) return res.status(500).send({ message: 'Se ha producido un error.'});

    if(user){
      bcrypt.compare(password, user.password, (err, check) => {
        if(check){
          if (params.gettoken) {
            //generar token
            return res.status(200).send({
              token: jwt.createToken(user)
            })
          }else{
            //devuelve user
            user.password = undefined;
            return res.status(200).send({user});
          }

        }else{
          return res.status(500).send({ message: 'El usuario no se ha podido autenticar.'});
        }
      });
    }else{
      return res.status(404).send({ message: 'El usuario no existe.'});
    }
  });

}


// Captar datos de un usuario
function getUser(req, res){
    var userId = req.params.id;

    User.findById(userId, (err, user) => {
      if(err) return res.status(500).send({ message: 'Error en la petición.' });

      if(!user) return res.status(404).send({ message: 'El usuario no existe.' });

      followThisUser(req.user.sub, userId).then((value) => {
        user.password = undefined;
        return res.status(200).send({
          user,
          following: value.following,
          followed: value.followed
        });

      });

    });
}


async function followThisUser(identity_user_id, user_id){
    try {
        var following = await Follow.findOne({ user: identity_user_id, followed: user_id}).exec()
            .then((following) => {
                return following;
            })
            .catch((err)=>{
                return handleerror(err);
            });
        var followed = await Follow.findOne({ user: user_id, followed: identity_user_id}).exec()
            .then((followed) => {
                return followed;
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
}


// Obtener todos los usuarios
function getUsers(req, res){
  var identity_user_id = req.user.sub;

  var page = 1;
  if(req.params.page){
    page = req.params.page;
  }

  var itemsPerPage = 5;
  User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
    if(err) return res.status(500).send({ message: 'Error en la petición.' });

    if(!users) return res.status(404).send({ message: 'No hay usuarios disponibles.' });

    followUserIds(identity_user_id).then((value) => {
      //console.log(value);
      return res.status(200).send({
        users,
        users_following: value.following,
        users_follow_me: value.followed,
        total,
        pages: Math.ceil(total/itemsPerPage) //numero de páginas a mostrar
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


// Obtener cantidad de follows
function getCounters(req, res){
  var userId = req.user.sub;

  if(req.params.id){
    userId = req.params.id;
  }

  getCountFollow(userId).then((value) => {
    return res.status(200).send(value);
  });
}


async function getCountFollow(user_id){
  var following = await Follow.count({ "user": user_id }).exec()
    .then((count) => {
      return count;
    })
    .catch((err) => {
      return handleError(err);
    });

  var followed = await Follow.count({ "followed": user_id }).exec()
    .then((count) => {
      return count;
    })
    .catch((err) => {
      return handleError(err);
    });

    var publications = await Publication.count({ "user": user_id}).exec()
      .then((count) => {
        return count;
      })
      .catch((err) =>{
        return handleError(err);
      });

  return {
    following: following,
    followed: followed,
    publications: publications
  }
}


// Actualizar datos de usuario
function updateUser(req, res){
    var userId = req.params.id;
    var update = req.body;

    //sacar pw
    delete update.password;

    if(userId != req.user.sub){
      return res.status(500).send({ message: 'No tienes permisos para actualizar los datos del usuario' });
    }

    User.find({ $or: [
                      {email: update.email.toLowerCase()},
                      {nick: update.nick.toLowerCase()}
    ]}).exec((err, users) => {
      var user_isset = false;
      users.forEach((user) =>{
        if(user && user._id != userId) user_isset = true;

      });
      if(user_isset) return res.status(404).send({ message: 'Los datos ya existen' });

      User.findByIdAndUpdate(userId, update, {new: true}, (err, userUpdated) => { //new true manda el objeto actualizado (userUpdated)
        if(err) return res.status(500).send({ message: 'Error en la petición' });

        if(!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });

        return res.status(200).send({ user: userUpdated });
      });

    });

}


// Subir imagen/avatar
function uploadImage(req, res){
  var userId = req.params.id;

  if(req.files){
    var file_path = req.files.image.path;
    var file_split = file_path.split('\/');
    var file_name = file_split[2];
    var ext_split = file_name.split('\.');
    var file_ext = ext_split[1];

    if(userId != req.user.sub){
      return removeFilesOfUpload(res, file_path, 'No tienes permisos para subir archivo.');
    }

    if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){
      User.findByIdAndUpdate(userId, {image: file_name}, {new:true}, (err, userUpdated) => {
        if(err) return res.status(500).send({ message: 'Error en la petición' });

        if(!userUpdated) return res.status(404).send({ message: 'No se ha podido actualizar el usuario' });

        return res.status(200).send({ user: userUpdated });
      });
    }else {
      return removeFilesOfUpload(res ,file_path ,'Extensión no válida.');
    }

  }else{
    return res.status(200).send({ message: 'No se ha subido una imagen.' });
  }

}


// Eliminar imagen subida
function removeFilesOfUpload(res, file_path, message){
  fs.unlink(file_path, (err) => {
    return res.status(200).send({ message: message });
  });
}


// Obtener imagen de usuario
function getImageFile(req, res){
  var image_file = req.params.imageFile;
  var path_file = './uploads/users/'+image_file;

  fs.exists(path_file, (exists) => {
    if(exists) {
      res.sendFile(path.resolve(path_file));
    }else{
      res.status(200).send({ message: 'No existe imagen...'});
    }
  });

}



module.exports = {
  home,
  pruebas,
  saveUser,
  loginUser,
  getUser,
  getUsers,
  getCounters,
  updateUser,
  uploadImage,
  getImageFile
}
