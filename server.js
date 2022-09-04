'use strict';

// config
const APP_PORT = 8080;

// import web server lib
import express from 'express';

// instantatiate a web server
const app = express();

// enable parse body
app.use(express.json());

// enable serving static file through public folder
app.use(express.static('public', ));

// start server
const server = app.listen(APP_PORT, () => {
	console.log(`portfolio is running on port - ${APP_PORT}`);
});