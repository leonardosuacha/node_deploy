'use strict'


var mongoose = require('mongoose');
var app = require('./app');
//var port = 3800;

//require("dotenv").config();

require('dotenv').config({ path: 'variables.env'});
console.log(process.env.DB_URL);

//conect DB
mongoose.Promise = global.Promise;
mongoose.connect(process.env.DB_URL)
    .then(() => {
      console.log('Conexión exitosa.');

      const host = process.env.HOST || '0.0.0.0';
      const port = process.env.PORT || 3000;
     
      app.listen(port,host,  () => {
        console.log('Server corriendo en http://localhost:3800');
      });

    })
    .catch(err => console.log(err));

/*    mongoose.connect('mongodb://localhost:27017/mean_social', { useMongoClient: true })
        .then(() => {
          console.log('Conexión exitosa.');

          app.listen(port, () => {
            console.log('Server corriendo en http://localhost:3800');
          });

        })
        .catch(err => console.log(err));
*/
