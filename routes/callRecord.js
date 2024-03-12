const express = require("express");
const router = express.Router();
const calls = require('../models/calls');
const userStatusLog = require("../models/userStatusLog");
const { sendPushNotification, sendSecondPushNotification } = require("../config/sendPushNotification");
const User = require("../models/User");
const { generateTwilioCallToken, sendSMS } = require("../config/twilioAPI");
const { verifyCallback } = require("../config/common");
const UserLoginDetails = require("../models/UserLoginDetails");
const twilioClient = require('twilio')(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, { accountSid: process.env.TWILIO_ACCOUNT_SID });
const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;


router.post('/call-swipe', async (req, res) => {
    const { type } = req.body;

    if (!type) {
        return res.status(400).json({ error: res.__('FILLED_ALL_PROPERTY') })
    }

    const { patientId, start_time, status } = req.body;

    const country_dial_code =  req.getUserProfile.country_dial_code;

    if (!patientId || !start_time || !status) {
        return res.status(400).json({ error: res.__('FILLED_ALL_PROPERTY') })
    }

    var verifyData = await calls.findOne({ 
            createdAt : { $gte: new Date().toISOString().split('T')[0] },
            patientId : patientId,
            status : status
    });
    if(!verifyData){
        const is_callback = 0;
        const is_active = 1;
        const callModel = new calls({ patientId, start_time, status, type, country_dial_code, is_callback, is_active });

        try {
    
            const datas = await callModel.save();
            return res.status(200).json({ message: res.__('CALL_SWIPE_SUCESSFUL'), data: datas });
        }
        catch (error) {
            return res.status(400).json({ error: error });
        }
    }else{
        return res.status(200).json({ message: res.__('CALL_SWIPE_SUCESSFUL'), data: verifyData });
    }
})

/**
 *   First when patient swipe the call the we use swipe-call API
 *   After that on frontend side search doctor if doctor is free then send call to doctor
 *   with hit this API.
 * 
 */
router.put('/patient-initiate-call/:id', async (req, res) => {
    const {doctorId, status, roomId } = req.body;

    if (!doctorId || !status || !roomId) {
        return res.status(400).json({ error: res.__('FILLED_ALL_PROPERTY') })
    }
    try {
        const datas = await calls.findOneAndUpdate({
            _id :  req.params.id
        },
        {
            $set : {
                doctorId : doctorId,
                status   : status,
                roomId   : roomId
            }
        }, {new : true});
        if (datas._id) {
            const getPatient = await User.findById(datas.patientId);
            var fullName = `${getPatient.firstName} ${getPatient.lastName}`;
            const bodyData = {
                title: res.__('CALLING'),
                body: `${fullName} ${res.__('IS_CALLING')}`,
                icon: 'myicon', //Default Icon
                sound: 'mysound', //Default sound
            }

            const bodyDataStore = {
                title: 'Calling...',
                body: `${fullName} is calling`
            }

            const NotifyData = {
                callId: datas._id,
                patientId: datas.patientId,
                patientName: `${fullName}`,
                doctorId: doctorId,
                roomId: roomId,
                type_id : 1
            }
            const type = 1;
            const NotificationTrigger = await sendSecondPushNotification(doctorId, bodyData, NotifyData,type,bodyDataStore);
        }
        const doctorBusy = await userStatusLog.updateOne(
            {
                userId: doctorId,
                //date: { $gte: new Date().toISOString().split('T')[0] }
            },
            {
                $set: { in_call: 1 }
            }
        )
        return res.status(200).json({ message: res.__('CALL_INITIATE'), data: datas });
    }
    catch (error) {
        return res.status(400).json({ error: error });
    }

});


/**
 *  Here we can maintain the initial call  
 * but if doctor cut the call then we maintain the status as a missed calls.
 * 
 */
router.post('/doctor-initiate-call', async (req, res) => {
    const { type, is_callback } = req.body;
    const {patientId, doctorId, status, roomId} = req.body;
    if (!doctorId || !patientId || !status || !roomId) {
        return res.status(400).json({ error: res.__('FILLED_ALL_PROPERTY') })
    }
    const verifyLogin = await UserLoginDetails.findOne({
        userId : patientId,
        is_login : 1
    }).sort( { "createdAt": -1 } );
    if(!verifyLogin){
        return res.status(400).json({ message: res.__('PATIENT_NOT_AVAILABLE') });
    }
    if(is_callback && is_callback == 1)
    {
        const {callback_time, id } = req.body;
        if(!id || !doctorId || !callback_time || !status || !roomId)
        {
            return res.status(400).json({ error: res.__('FILLED_ALL_PROPERTY') });
        }

        var datas = await calls.findOneAndUpdate(
            {
                "_id" : id
            },
            {
                $set : {
                    doctorId : doctorId,
                    roomId : roomId,
                    status : status,
                    callback_time : callback_time
                }
            },
            {
                new : true
            }
        );
    }else{
        if (!type) {
            return res.status(400).json({ error: res.__('FILLED_ALL_PROPERTY') })
        }
    
        const {start_time } = req.body;
    
        const country_dial_code =  req.getUserProfile.country_dial_code;
    
        if (!start_time) {
            return res.status(400).json({ error: res.__('FILLED_ALL_PROPERTY') })
        }

        const is_callback = 0;
        const is_active = 1;
    
        const callModel = new calls({ doctorId, patientId, start_time, status, type, roomId, country_dial_code, is_callback, is_active });
        
        var datas = await callModel.save();
    }
    try {   
        if (datas._id) {
            const getDoctor = await User.findById(datas.doctorId);
            var fullName = `${getDoctor.firstName} ${getDoctor.lastName}`;
            const bodyData = {
                title: res.__('CALLING'),
                body: `${fullName} ${res.__('IS_CALLING')}`,
                icon: 'myicon', //Default Icon
                sound: 'mysound', //Default sound
            }

            const bodyDataStore = {
                title: 'Calling...',
                body: `${fullName} is calling`,
            }

            const NotifyData = {
                callId: datas._id,
                doctorId: datas.doctorId,
                doctorName: `${fullName}`,
                patientId: datas.patientId,
                roomId: datas.roomId,
                type_id : 1
            }
            const type = 1;
            const NotificationTrigger = await sendSecondPushNotification(datas.patientId, bodyData, NotifyData,type,bodyDataStore);
        }

        return res.status(200).json({ message: res.__('CALL_INITIATE'), data: datas });
    }
    catch (error) {
        return res.status(400).json({ error: error });
    }
});

/**
 *   Here We can update the status  or another data as per next step
 *   1. if doctor pick the call then set status Inbound call with status, doctorID, end time and duration
 *   2. If Doctor cut the call then set status Dropped Call with doctorID & status.
 */
 router.put('/update-call/:id', async (req, res) => {
    const { status, end_time } = req.body;
    if (status) {
        try {
            const callData = await calls.findById(req.params.id);
            if (callData) {
                const startTime = callData.start_time;
                var minsdiff = "";
                var timeStart = new Date("01/01/2007 " + startTime);
                var timeEnd = new Date("01/01/2007 " + end_time);
                console.log(timeStart);
                var minsdiff = Math.abs(timeEnd - timeStart);
                minsdiff = minsdiff / 60 / 1000;
                const data = await calls.updateOne(
                    { _id: req.params.id },
                    {
                        $set:
                        {
                            status: status,
                            end_time: end_time,
                            duration: minsdiff
                        }
                    });
                const doctorBusy = await userStatusLog.updateOne(
                    {
                        userId: callData.doctorId,
                        //date: { $gte: new Date().toISOString().split('T')[0] }
                    },
                    {
                        $set: { in_call: 0 }
                    }
                )
                res.status(200).json({ message: res.__('STATUS_UPDATE'), data: await calls.findById(req.params.id) })
            }
            else {
                res.status(400).json({ message: res.__('ERROR_WENT_WRONG') });
            }
        } catch (error) {
            return res.status(400).json({ error: error });
        }
    } else {
        res.send(400).json({ message: res.__('STATUS_REQUIRED') });
    }
})

/**
 * Twilio Access token generate 
 * while creating room and start the call
 * 
 */
router.post('/token', async (req, res) => {
    if (!req.body.identity || !req.body.room) {
        return res.status(400);
    }
    const data = {
        identity : req.body.identity,
        room : req.body.room
    };
    // Get the user's identity and the room name from the request
    const response = await generateTwilioCallToken(data);
    res.send(response);
});

router.post('/call-status/:id', async (req, res) => {
    const { doctorId, status } = req.body;
    if (!doctorId) {
        res.status(400).json({ error: res.__('DOCTORID_REQUIRED') });
    }
    const type = 1;// Call related notification
    switch (status) {
        case 2:
            const droppedCallUpdate = await calls.findOneAndUpdate(
                {
                    _id: req.params.id
                },
                {
                    $set: { status: status }
                }
            );
            const getDoctorDroped = await User.findById(doctorId);
            var fullName = `${getDoctorDroped.firstName} ${getDoctorDroped.lastName}`;
            const bodydroppedData = {
                title: res.__('CALL_IS_ACCEPTED'),
                body: `${fullName} ${ res.__('IS_ACCEPTED_CALL') }`,
                icon: 'myicon', //Default Icon
                sound: 'mysound', //Default sound
            }

            const bodyDataStore2 = {
                title : "Call is Accepted...",
                body  : `${fullName} is Accepted your call`
            }

            const NotifyDatadropped = {
                doctorId: doctorId,
                patientId: droppedCallUpdate.patientId,
                doctorName: `${fullName}`,
                status: status
            }
           
            const NotificationTriggerDropped = await sendPushNotification(doctorId, bodydroppedData, NotifyDatadropped.doctorId,type, bodyDataStore2);
            res.status(200).json({ message: res.__('DROPED_CALL_SETUP') });
            break;
        case 3:
            const callUpdate = await calls.findOneAndUpdate(
                {
                    "_id": req.params.id
                },
                {
                    $set: { status: status }
                }
            );
            if(req.getUserProfile.userType == 'USER')
            {
                const getPatient = await User.findById(callUpdate.patientId);
                var fullName = `${getPatient.firstName} ${getPatient.lastName}`;
                const bodyData = {
                    title: res.__('CALL_REJECTED'),
                    body: `${fullName} ${res.__('REJECTED_CALL_CONECT_ANOTHER')}`,
                    icon: 'myicon', //Default Icon
                    sound: 'mysound', //Default sound
                }
    
                const bodyDataStore3 = {
                    title : "Call is Rejected...",
                    body  : `${fullName} is Rejected your call`
                }
    
                const NotifyData = {
                    patientId: callUpdate.patientId,
                    doctorName: `${fullName}`,
                    status: status
                }
                const NotificationTrigger = await sendPushNotification(doctorId, bodyData, NotifyData,type, bodyDataStore3);
            }else{
                const getDoctor = await User.findById(doctorId);
                var fullName = `${getDoctor.firstName} ${getDoctor.lastName}`;
                const bodyData = {
                    title: res.__('CALL_REJECTED'),
                    body: `${fullName} ${res.__('REJECTED_CALL_CONECT_ANOTHER')}`,
                    icon: 'myicon', //Default Icon
                    sound: 'mysound', //Default sound
                }
    
                const bodyDataStore3 = {
                    title : "Call is Rejected...",
                    body  : `${fullName} is Rejected your call`
                }
    
                const NotifyData = {
                    patientId: callUpdate.patientId,
                    doctorName: `${fullName}`,
                    status: status
                }
                const NotificationTrigger = await sendPushNotification(callUpdate.patientId, bodyData, NotifyData,type, bodyDataStore3);
            }
          
            const doctorBusy = await userStatusLog.updateOne(
                {
                    userId: doctorId,
                    //date: { $gte: new Date().toISOString().split('T')[0] }
                },
                {
                    $set: { in_call: 0 }
                }
            )
            res.status(200).json({ message: res.__('CALL_REJECTION_UPDATE') });
            break;
        case 4:
            const callAcceptUpdate = await calls.findOneAndUpdate(
                {
                    _id: req.params.id
                },
                {
                    $set: { status: status }
                }
            );
            
            const getDoctorAccept = await User.findById(doctorId);
            var fullName = `${getDoctorAccept.firstName} ${getDoctorAccept.lastName}`;
            const bodyacceptedData = {
                title: res.__('CALL_IS_ACCEPTED'),
                body: `${fullName} ${res.__('IS_ACCEPTED_CALL')}`,
                icon: 'myicon', //Default Icon
                sound: 'mysound', //Default sound
            }

            const bodyDataStore4 = {
                title : "Call is Accepted...",
                body  : `${fullName} is Accepted your call`
            }

            const NotifyDataAccepted = {
                patientId: callAcceptUpdate.patientId,
                doctorName: `${fullName}`,
                status: status
            }
            const NotificationTriggerAccepted = await sendPushNotification(callAcceptUpdate.patientId, bodyacceptedData, NotifyDataAccepted,type, bodyDataStore4);
            res.status(200).json({ message: res.__('CALL_ACCEPT_SUCESSFUL') });
            break;
        case 6:
            const missedCallUpdate = await calls.findOneAndUpdate(
                {
                    _id: req.params.id
                },
                {
                    $set: { status: status }
                }
            );
            res.status(200).json({ message: res.__('MISSED_CALL_CREATED') });
            break;

        default:
            res.status(400).json({ message: res.__('STATUS_REQUIRED') });
    }
})

/**
 * Status 1 for get waiting patient list
 * Status 2 for gettting dropped call patient list
 * Status 6 for getting missed call patient list
 */

router.post('/patient-list', async (req, res) => {
    const {status} = req.body;
    // var currentDate = new Date();
    // currentDate.setHours(0, 0, 0, 0);
    if(status){
        // const callsData = await calls.aggregate([
        //     {
        //         $match : {
        //             status : status,
        //             createdAt: {
        //                 $gte: currentDate, // Greater than or equal to the start of the current date
        //                 $lt: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000) // Less than the start of the next date
        //             }
        //         }
        //     },
        //     {
        //         $group: {
        //             _id: "$patientId",
        //             firstId: { $first: "$_id"  }, // Get the first _id for each patientId
        //         }
        //     },
        //     {
        //         $project: {
        //             _id: "$firstId"
        //         }
        //     }
        // ]);
 
        // const inQuery = [];
        // callsData.map(function (item, key) {
        //     inQuery[key] = item._id
        // })
        const data = await calls.find({
            status : status,
            createdAt : { $gte :  new Date().toISOString().split('T')[0]}
        }).populate("patientId", {firstName : 1, lastName : 1}).populate("doctorId", {firstName : 1, lastName : 1})
        
        // const callsData = await calls.find({
        //     status : status,
        //     createdAt : { $gte: new Date().toISOString().split('T')[0] }
        // }).populate("patientId", {firstName : 1, lastName : 1}).populate("doctorId", {firstName : 1, lastName : 1});
        if(callsData)
        {
            res.status(200).json({message : res.__('PATIENT_LIST'), data});
        }else{
            res.status(200).json({message : res.__('PATIENT_LIST'), data : []});
        }
    }else{
        res.status(400).json({error : res.__('STATUS_REQUIRED')});
    }
});


router.get("/send-sms", async (req, res) => {
    const randNumber = Math.floor(100000 + Math.random() * 900000);
    
    const data = {
        body : 'Your OnlineDoctors ID code is: '+randNumber+'. Do not share it with anyone.',
        to : '+919914633885'
    }
    const smsSend = await sendSMS(data);
    res.send(smsSend);
   //sendSMS(data)
   //.then((message) => {res.send(message)}, (error) => {res.send(error)});
});

router.put("/callback/:id", async (req, res) => {
    const verify = await verifyCallback(req.getUserProfile._id);
    if(verify == 0)
    {
        const data = await calls.findOneAndUpdate(
            {
                _id : req.params.id
            },
            {
                $set : {
                    is_callback :  1,
                    status      :  6
                }
            }
        );

        return res.status(200).json({message : res.__('CALLBACK_SET')});
    }else{
        const data = await calls.updateOne(
            {
                _id : req.params.id
            },
            {
                $set : {
                    status :  7
                }
            }
        );

        return res.status(400).json({error : res.__('ALREADY_IN_CALLBACK')});
    } 
});

router.get('/callback-list', async (req, res) => { 
    var baseUrl = req.protocol + '://' + req.get('host')+'/';
    const lists = await calls.find({
        createdAt : { $gte: new Date().toISOString().split('T')[0] },
        status : 6,
        is_callback : 1
    }).populate('patientId', {firstName : 1, lastName : 1, email : 1, profile : 1});

    var data = [];
    const usersWithBaseURL = lists.map((list, index) => {
          const populatedProfile = list.patientId.profile;
          if(populatedProfile)
          {
            var splitProfile = populatedProfile.split("/");
            list.patientId.profile = `${baseUrl}${splitProfile[3]}`;
          }
          data[index] = list;
    });

    res.status(200).json({message : res.__('CALLBACK_LIST'), data})
});

router.put('/active-status/:id', async (req, res) => {
    const data = await calls.findOneAndUpdate(
        {
            _id : req.params.id
        },
        {
            $set : {
                is_active : req.body.is_active
            }
        },
        {
            new : true
        }
    );

    if(data)
    {
        res.status(200).json({meessage : res.__('CALL_STATUS_CHANGED')});
    }else{
        res.status(400).json({error : res.__('ERROR_WENT_WRONG')});
    }
})

module.exports = router;