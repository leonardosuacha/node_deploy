'use strict'

var moment = require('moment');
var mongoosePagination = require("../libraries/pagination");
var Message = require('../models/message');
var User = require('../models/user');
var Follow = require('../models/follow');


function prueba(req, res){
  return res.status(200).send({ message: 'MessageController' });
}


// enviar mensaje
function saveMessage(req, res){
  var params = req.body;

  if(!params.text || !params.receiver){
    return res.status(200).send({ message: 'Envía los datos necesarios' });
  }

  var message = new Message();
  message.emitter = req.user.sub;
  message.receiver = params.receiver;
  message.text = params.text;
  message.created_at = moment().unix();
  message.viewed = 'false';

  message.save((err, messageStored) => {
    if(err) return res.status(500).send({ message: 'Error en la petición' });

    if(!messageStored) return res.status(404).send({ message: 'Error al enviar el mensaje' });

    return res.status(200).send({ message: messageStored });
  });
}


// recibir mensajes
function getReceivedMessages(req, res){
  var userId = req.user.sub;

  var page = 1;
  if(req.params.page){
    page = req.params.page;
  }

  var itemsPerPage = 5;

  Message.find({receiver: userId}).sort('-created_at').populate('emitter', 'name surname _id nick image').paginate(page, itemsPerPage, (err, messages, total) => {
    if(err) return res.status(500).send({ message: 'Error en la petición' });

    if(!messages) return res.status(404).send({ message: 'No hay mensajes para mostrar' });

    return res.status(200).send({
      total: total,
      pages: Math.ceil(total/itemsPerPage),
      messages
    });

  });
}


function getEmittedMessages(req, res){
  var userId = req.user.sub;

  var page = 1;
  if(req.params.page){
    page = req.params.page;
  }

  var itemsPerPage = 5;

  Message.find({emitter: userId}).sort('-created_at').populate('emitter receiver', 'name surname _id nick image').paginate(page, itemsPerPage, (err, messages, total) => {
    if(err) return res.status(500).send({ message: 'Error en la petición' });

    if(!messages) return res.status(404).send({ message: 'No hay mensajes para mostrar' });

    return res.status(200).send({
      total: total,
      pages: Math.ceil(total/itemsPerPage),
      messages
    });

  });
}


// ver mensajes no vistos
function getUnviewedMessages(req, res){
  var userId = req.user.sub;

  Message.count({reveiver: userId, viewed: 'false'}).exec((err, count) => {
    if(err) return res.status(500).send({ message: 'Error en la petición' });

    return res.status(200).send({ 'unviewed': count });
  });
}


// dejar vistos
function setViewedMessages(req, res){
  var userId = req.user.sub;

  Message.update({receiver:userId, viewed:'false'}, {viewed:'true'}, {"multi": true}, (err,messageUpdated) => {
    if(err) return res.status(500).send({message: 'Error en la petición.' });
    return res.status(200).send({
      messages: messageUpdated
    });
  });
}



module.exports = {
  prueba,
  saveMessage,
  getReceivedMessages,
  getEmittedMessages,
  getUnviewedMessages,
  setViewedMessages
}
