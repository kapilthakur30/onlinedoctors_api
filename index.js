require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const authorize = require('./middleware/authorize');
const mongoosePaginate = require('mongoose-paginate-v2');
const https = require('https');
const fs = require("fs");
const moment = require('moment-timezone');
const cron = require('./config/cron');
const path = require('path');
const {I18n}   = require('i18n');


const i18n = new I18n({
	locales : ['en', 'hi', 'ar'],
	directory : path.join(__dirname, 'lang'),
	defaultLocale : 'en'
});
/***
 *  en  : English
 *  hi  : Hindi
 *  ar  : Arabic
 *  ru  : Russian
 *  es  : Spanish
 *  prs : Dari
 */
var mongoConnectionString = process.env.MONGO_HOST + process.env.MONGO_DB;
mongoose
	.connect(mongoConnectionString, { useNewUrlParser: true  })
	.then(() => {
		// console.log('db connected');
	});

const app = new express();
app.use(express.json());
app.use(i18n.init);
// app.use(cors());

app.get("/", (req, res) => {
    res.send("<h1>Welcome to API Panel.</h1>")
});

const Auth = require('./routes/auth');
app.use('/api/auth', Auth);


const CallRecord = require('./routes/callRecord');
app.use('/api', authorize, CallRecord);

const User = require('./routes/user');

app.use('/api/user', authorize, User);




app.use(express.static("upload/images"));

app.use('/api/*', (req, res) => {
	res.status(404).json({error : "Api Not Exist"});
})
var privateKey = fs.readFileSync('./sslcert/privateKey.pem');
var certificate = fs.readFileSync('sslcert/fullchain.pem');
var credentials = {key: privateKey, cert: certificate};
if(process.env.NODE_ENV == 'production')
{
	var server = https.createServer(credentials, app).listen(process.env.NODE_PORT, () => {
		console.log(`Express is running on port https ${process.env.NODE_PORT}`);
	})
}else{
	app.listen(process.env.NODE_PORT, (error) => { if(!error) console.log('Port is running on 8001.')})
}
