const express = require("express");
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Jwt = require('jsonwebtoken');
const UserLoginDetails = require("../models/UserLoginDetails");
const { saveUserDeviceDetail, sendPushNotification } = require("../config/sendPushNotification");
const {sendSMS} = require("../config/twilioAPI");
const multer = require('multer');
const path = require('path');
const Country = require("../models/country");
const calls = require("../models/calls");
const UserDeviceDetails = require("../models/UserDeviceDetails");
const AvailableSlots = require("../models/AvailableSlots");
const userStatusLog = require("../models/userStatusLog");
const JwtKey = process.env.PROJECT_NAME;

const storage = multer.diskStorage({
    destination : './upload/images',
    filename : (req, file, cb ) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5
    },
    fileFilter: (req, file, cb) => {
        // Allowed ext
        const filetypes = /jpeg|jpg|png/;
        // Check ext
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
         // Check mime
        if(extname){
            return cb(null, true);
        } else {
            return cb("Error", false);
        }
    }
})

router.get('/test-lang', (req,res) => {
    res.send({message : res.__('MESSAGE')});
})

router.post('/register', async (req, res) => {
    const UploadProfileFile = upload.single('profile');
    UploadProfileFile(req, res, async function (err) {
        if(err)
        {
           return res.status(400).json({error : res.__("IMAGE_FORMAT")});
        }

        const { firstName, lastName, email, password, userType, country, city, dob, gender, referral_code } = req.body;
        var phone = req.body.phone;
        var baseUrl = req.protocol + '://' + req.get('host') + '/';
        if(!email || !password || !firstName || !lastName || !phone || !userType || !country)
        {
            return res.status(400).json({error : res.__("FILLED_ALL_PROPERTY")});
        }
        let profile   = '';
        if(typeof(req.file) != "undefined")
        {
             profile   = `/upload/images/${req.file.filename}`;
        }
        let country_dial_code = "";
        let country_name = country;
        if(country)
        {
            let splitCountry = country.split('-');
            if(splitCountry[0])
            {
                country_dial_code = splitCountry[0];
                country_name = splitCountry[1];
            }
    
            phone = phone;
    
        }
        try{
            const userExist = await User.findOne({email, email});
            if(userExist)
            {
                return res.status(400).json({error : res.__("EMAIL_ALREADY_EXIST")});
            }
            const randNumber = Math.floor(100000 + Math.random() * 900000);
        
            const smsData = {
                body : 'Your OnlineDoctors ID code is: '+randNumber+'. Do not share it with anyone.',
                to : country_dial_code+''+phone
            }
            let otp = randNumber;
            let is_verified = false;
            const userModel = new User({firstName, lastName, email, password, phone, userType, country_name, country_dial_code,  city, dob, gender, referral_code, profile, otp, is_verified});
    
            const resp = await userModel.save();
            if (resp.profile) {
                var splitProfile = resp.profile.split("/");
                resp.profile = `${baseUrl}${splitProfile[3]}`;
            }
            const resData = {
                _id       : resp._id,
                firstName : resp.firstName,
                lastName  : resp.lastName,
                email     : resp.email,
                phone     : resp.phone,
                is_verified : resp.is_verified
            }
            sendSMS(smsData).then((message) =>{
                res.status(200).json({message : res.__("REGISTERD_SUCESSFULL"), data : resData});
            }, async (error) => {
                await User.deleteOne({_id : resp._id});
                res.status(400).json({message : res.__('VERIFY_NUMBER')});
            });
        }catch(err)
        {
            if(err.keyValue)
            {
                var keys = res.__('ERROR_WENT_WRONG')+Object.keys(err.keyValue)[0];
                return res.status(400).json({error : keys});
            }else{
                return res.status(400).json({error : err});
            }
        }
    });    
   
})

router.put('/verify-otp/:id', async (req,res)=> {
    var baseUrl = req.protocol + '://' + req.get('host') + '/';
    const { otp, userRole, login_device_type, login_device_name, fcm_device_token} = req.body;
    if(!otp || !userRole || !login_device_type || !login_device_name || !fcm_device_token)
    {
        return res.status(400).json({error : res.__('FILLED_ALL_PROPERTY')});
    }
    const data = await User.findOne({_id : res.params.id});
    if(data)
    {
        var timeStart = new Date(data.updatedAt);
        var timeEnd = new Date();
        var minsdiff = Math.abs(timeEnd - timeStart); 
        minsdiff = Math.trunc(minsdiff/60/1000);
        if(process.env.OTP_VERIFY_TIME >= minsdiff)
        {
            if(data.otp == otp)
            {
                const updateVerification = await User.findOneAndUpdate({
                    _id : req.params.id
                },
                { 
                    $set : {is_verified : true}
                }, {
                    new : true
                });
                var profile = '';
                if(data.profile)
                {
                    var splitProfile = updateVerification.profile.split("/");
                    profile = `${baseUrl}${splitProfile[3]}`;
                }
                const resp = {
                    'firstName' :  data.firstName,
                    'lastName' : data.lastName,
                    'email' : data.email,
                    'dob' : data.dob,
                    'profile' : profile,
                    'is_verified' : data.is_verified
                }
                Jwt.sign({data}, JwtKey, {expiresIn:"12h"}, async (err, token) => {
                    if(err)
                    {
                        return res.status(400).json({error : res.__('ERROR_WENT_WRONG')});
                    }
                    const tokenData = {
                        _token : token,
                        userId : data._id,
                        login_device_type : !req.body.login_device_type ? 1 : req.body.login_device_type,
                        login_device_name : !req.body.login_device_name ? "Redmi Note 1" : req.body.login_device_name,
                        is_login : 1
                    };
                    const tokenModel =  new UserLoginDetails(tokenData);
                    const dataToken = await tokenModel.save();
                    if(dataToken){
                        if(req.body.login_device_type != 3)
                        {
                            const deviceData = {
                                fcm_device_token : req.body.fcm_device_token,
                                userId : data._id,
                                login_device_type : !req.body.login_device_type ? 1 : req.body.login_device_type,
                                login_device_name : !req.body.login_device_name ? "Redmi Note 1" : req.body.login_device_name,
                            };
                            saveUserDeviceDetail(deviceData);
                        }
                        res.status(200).json({ message: res.__('VERIFIED_AND_LOGIN'), user_role: data.userType.toLowerCase(),userId : data._id, auth : token, data :resp });
                    }else{
                        res.status(400).json({ message: res.__('ERROR_WENT_WRONG') });
                    }
                })
            }else{
                res.status(400).json({error : res.__('INVALID_OTP')});
            }
        }else{
            res.status(400).json({error : res.__('OTP_EXPIRED')})
        }
    }else{
        res.status(400).json({error : res.__('NO_USER_FOUND')});
    }
})

router.post('/login', async (req, res) => {
    const data = await User.findOne({
        $or : [
            { email : req.body.email}, 
            { phone : req.body.email}
        ]
    });
    var baseUrl = req.protocol + '://' + req.get('host') + '/';
    if(data && req.body.userRole)
    {
        /**
         * Her We check userRole 
         * 2 for Patient & 3 For Doctor
         * 1 for Web.
         */
        if(data.userType == req.body.userRole)
        {
            var profile = '';
            if(data.profile)
            {
                var splitProfile = data.profile.split("/");
                profile = `${baseUrl}${splitProfile[3]}`;
            }
            const resp = {
                '_id'   : data._id,
                'firstName' :  data.firstName,
                'lastName' : data.lastName,
                'email' : data.email,
                'dob' : data.dob,
                'is_verified' : data.is_verified,
                'profile' : profile,
                'phone'   : data.phone
            }
            if(data.is_verified){
                const pass = await bcrypt.compare(req.body.password, data.password);
                if(pass)
                {   
                    
                    Jwt.sign({data}, JwtKey, {expiresIn:"30d"}, async (err, token) => {
                        if(err)
                        {
                            return res.status(400).json({error : res.__('ERROR_WENT_WRONG')});
                        }
                        const tokenData = {
                            _token : token,
                            userId : data._id,
                            login_device_type : !req.body.login_device_type ? 1 : req.body.login_device_type,
                            login_device_name : !req.body.login_device_name ? "Redmi Note 1" : req.body.login_device_name,
                            is_login : 1
                        };
                        const tokenModel =  new UserLoginDetails(tokenData);
                        const dataToken = await tokenModel.save();
                        if(dataToken){
                            if(req.body.login_device_type != 3)
                            {
                                const deviceData = {
                                    fcm_device_token : req.body.fcm_device_token,
                                    userId : data._id,
                                    login_device_type : !req.body.login_device_type ? 1 : req.body.login_device_type,
                                    login_device_name : !req.body.login_device_name ? "Redmi Note 1" : req.body.login_device_name,
                                };
                                saveUserDeviceDetail(deviceData);
                            }
                            res.status(200).json({ message: res.__('LOGIN'), user_role: data.userType.toLowerCase(),userId : data._id, auth : token, data :resp });
                        }else{
                            res.status(400).json({ error: res.__('ERROR_WENT_WRONG') });
                        }
                    })
                }else{
                    res.status(400).send({message : res.__('PASSWORD_MISMATCH')});
                }
            }else{
                res.status(400).send({message : res.__('ACCOUNT_VERIFY'), resp});
            }
        }else{
            res.status(400).send({message : res.__('UNAUTHORIZE_ROLE')});
        }
    }else{
        res.status(400).send({message : res.__('EMAIL_NOT_EXIST')});
    }
});

/**
 * When user is logout then mark the status is_login 2 
 * Means user is logout also updatedAt changed
 * CreatedAt is login time and updateAt is logout time
 * */

router.get("/logout/:id", async (req, res) => {
    const data = await UserLoginDetails.updateMany(
       {
         userId : req.params.id,
         is_login : 1
       },
       {
         $set : {
            is_login : 2
         }
       }
    ).sort( { "createdAt": -1 } );
    res.status(200).json({message : res.__('LOGOUT')});
});
/**
 *  Get Country list using IN query with country code
 *  */ 
router.get("/country-list", async (req, res) => {
    const data = await Country.find({ code : {$in : ['IN', 'CA', 'AE', 'SA', 'TJ','RU','KZ','US']}});
    if(data)
    {
        res.status(200).json({data});
    }else{
        res.status(400).json({message : res.__('ERROR_WENT_WRONG')})
    }
});

router.post("/resend-otp/:id", async (req,res) => {
    const {phone} = req.body;
    const randNumber = Math.floor(100000 + Math.random() * 900000);
    
   
    const data = await User.findOneAndUpdate({
        _id : req.params.id
    },{
        $set : {otp : randNumber}
    }, {new : true});
    const smsData = {
        body : 'Hi, your OnlineDoctors verification code is: '+randNumber+'. Do not share it with anyone.',
        to : data.country_dial_code+''+phone
    }
    if(data._id)
    {
        sendSMS(smsData);
        const respData = {
            _id : data._id,
            phone : data.phone,
            email : data.email
        }
        res.status(200).json({message : res.__('OTP_SEND'), respData});
    }else{
        res.status(400).json({error : res.__('ERROR_WENT_WRONG')});
    }
})

router.post("/send-notification", async (req, res) => {
    const {userId, payLoad, title, body} = req.body;
    const NotifyData = payLoad;
    const bodyData = {
        title : title,
        body : body,
        icon: 'myicon', //Default Icon
        sound: 'mysound', //Default sound
    }
    const type = 2;
    const sendNotification = await sendPushNotification(userId, bodyData, NotifyData, type, bodyData);
    res.status(200).json({"message" : res.__('NOTIFICATION_PUSH')});
})

router.get("/update", async (req, res) => {
    const data = await AvailableSlots.deleteMany(
       
    )
    // const data = await AvailableSlots.updateMany(
    //     { "country_dial_code": { $ne: null } },
    //     {
    //     $set : {
    //         country_dial_code : "+91",
    //         country_name : "India"
    //     }
    // });

    console.log(data);
});

router.post('/send-otp', async (req,res) => {
    const {phone} = req.body;
    if(email)
    {
        const data = await User.findOneAndUpdate(
            {
                phone : email
            },
            {
                $set : 
                {
                    otp : "123456"
                }
            },
            {
                fields :  {
                    phone : 1,
                    otp : 1
                },
                new : true
            }
        );
        if(data)
        {
            res.status(200).json({message : res.__('OTP_SEND'), data});
        }else{
            res.status(400).json({error : res.__('NO_USER_FOUND')});
        }   
    }else{
        res.status(400).json({error : res.__('PHONE_REQUIRED')});
    }
});

router.put('/forgot-password', async (req, res) => {
    const {_id, otp, password} = req.body;
    const data = await User.findById(_id);
    if(data)
    {
        if(data.otp == otp)
        {
            await User.updateOne(
                {
                    _id : _id
                },
                {
                    $set : {
                        password : password
                    }
                }
            )
            res.status(200).json({message : res.__('FORGOT_PASSWORD')});
        }else{
            res.status(400).json({error : res.__('INVALID_OTP')});
        }
    }else{
        res.status(400).json({error : res.__('FILLED_ALL_PROPERTY')});
    }
});

router.post("/login-otp", async (req, res) => {
    const {phone, userRole} = req.body;
    if(phone)
    {
        const data = await User.findOne({phone : phone});
        if(data)
        {
            if(data.userType == userRole){
                const randNumber = Math.floor(100000 + Math.random() * 900000);
        
            const smsData = {
                body : 'Your OnlineDoctors ID code is: '+randNumber+'. Do not share it with anyone.',
                to : data.country_dial_code+''+data.phone
            }
            let otp = randNumber;    
            const resp = await User.updateOne({
                _id : data._id
            },
            {
                $set : {
                    otp : randNumber
                }
            });
            try{
                const smsSend = await sendSMS(smsData);
            }catch(error)
            {
                console.log(error)
            }
           
            const respData = {
                _id : data._id,
                phone : data.phone,
                email : data.email
            }
            res.status(200).json({message : res.__('OTP_SEND'), respData});
            }else{
                req.status(400).json({error : res.__('UNAUTHORIZE_ROLE')});
            }
        }else{
            req.status(400).json({error : res.__('NO_USER_FOUND')});
        }
    }else{
        res.status(400).json({error : res.__('PHONE_REQUIRED')});
    }
});

router.post("/verify-login-otp", async (req, res) => {
    const { otp, phone, _id} = req.body;
    if(!otp || !phone || !_id)
    {
        return res.status(400).json({error : res.__('FILLED_ALL_PROPERTY')});
    }
    const data = await User.findOne({phone : phone, _id : _id});
    try {
        if(data)
        {
            var timeStart = new Date(data.updatedAt);
            var timeEnd = new Date();
            var minsdiff = Math.abs(timeEnd - timeStart); 
            minsdiff = Math.trunc(minsdiff/60/1000);
            if(process.env.OTP_VERIFY_TIME >= minsdiff)
            {
                if(data.otp == otp)
                {
                    var profile = '';
                    if(data.profile)
                    {
                        var splitProfile = data.profile.split("/");
                        profile = `${baseUrl}${splitProfile[3]}`;
                    }
                    const resp = {
                        'firstName' :  data.firstName,
                        'lastName' : data.lastName,
                        'email' : data.email,
                        'dob' : data.dob,
                        'profile' : profile
                    }
                    Jwt.sign({data}, JwtKey, {expiresIn:"12h"}, async (err, token) => {
                        if(err)
                        {
                            return res.status(400).json({error : res.__('ERROR_WENT_WRONG')});
                        }
                        const tokenData = {
                            _token : token,
                            userId : data._id,
                            login_device_type : !req.body.login_device_type ? 1 : req.body.login_device_type,
                            login_device_name : !req.body.login_device_name ? "Redmi Note 1" : req.body.login_device_name,
                            is_login : 1
                        };
                        const tokenModel =  new UserLoginDetails(tokenData);
                        const dataToken = await tokenModel.save();
                        if(dataToken){
                            if(req.body.login_device_type != 3)
                            {
                                const deviceData = {
                                    fcm_device_token : req.body.fcm_device_token,
                                    userId : data._id,
                                    login_device_type : !req.body.login_device_type ? 1 : req.body.login_device_type,
                                    login_device_name : !req.body.login_device_name ? "Redmi Note 1" : req.body.login_device_name,
                                };
                                saveUserDeviceDetail(deviceData);
                            }
                            res.status(200).json({ message: res.__('LOGIN'), user_role: data.userType.toLowerCase(),userId : data._id, auth : token, data :resp });
                        }else{
                            res.status(400).json({ message: res.__('ERROR_WENT_WRONG') });
                        }
                    })
                }else{
                    res.status(400).json({error : res.__('INVALID_OTP')});
                }
            }else{
                res.status(400).json({error : res.__('OTP_EXPIRED')})
            }
        }else{
            res.status(400).json({error : res.__('NO_USER_FOUND')});
        }
    }
    catch (error)
    {
        return res.status(400).json({error : error});
    }
  
})

module.exports = router;