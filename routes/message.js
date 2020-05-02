'use strict'

var express = require('express');
var md_auth = require('../middlewares/authenticated');
var api = express.Router();
var MessageController = require('../controllers/message');

api.get('/prueba-message',md_auth.ensureAuth, MessageController.prueba);
api.post('/message', md_auth.ensureAuth, MessageController.saveMessage);
api.get('/my-messages/:page?', md_auth.ensureAuth, MessageController.getReceivedMessages);
api.get('/messages/:page?', md_auth.ensureAuth, MessageController.getEmittedMessages);
api.get('/unviewed-messages', md_auth.ensureAuth, MessageController.getUnviewedMessages);
api.get('/set-viewed-messages', md_auth.ensureAuth, MessageController.setViewedMessages);

module.exports = api;
