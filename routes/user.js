const express = require("express");
const userStatusLog = require("../models/userStatusLog");
const userStatusLogTime = require("../models/UserStatusLogTime");
const User = require("../models/User");
const Notification = require("../models/Notification");
const multer = require('multer');
const faq = require('../models/faq');
const AvailableSlots = require('../models/AvailableSlots');
const path = require('path');
const { slotsCounter } = require("../config/common");
const { sendPushNotification } = require("../config/sendPushNotification");
const calls = require("../models/calls");
const DoctorPatientRelation = require("../models/DoctorPatientRelation");
const MedicalRecords = require("../models/MedicalRecords");
const userDepedent = require("../models/userDependent");
const pharmacy = require("../models/pharmacy");
const router = express.Router();

/**
 * Maintain the Doctor's status when Online & Offline
 * when type 1 then mark online else 2 is offline
 */

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (_req, file, cb) {
        // Allowed ext
        const filetypes = /jpeg|jpg|png/;
        // Check ext
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        } else {
            return cb("Error", false);
        }
    }
});

router.post("/user-status", async (req, res) => {
    const { userId, date, online_time, type } = req.body;
    const in_call = 0;
    var country_dial_code = '';
    if (req.getUserProfile.country_dial_code) {
        country_dial_code = req.getUserProfile.country_dial_code;
    }
    if (!userId || !date || !online_time || !type) {
        return res.status(400).json({ error: res.__('FILLED_ALL_PROPERTY') })
    }
    const verifyLog = await userStatusLog.findOneAndUpdate(
        {
            userId: userId,
            // date: { $gte: new Date(date).toISOString().split('T')[0] }
        },
        {
            $set: { type: type }
        },
        { new: true }
    );
    if (verifyLog) {
        const logTimedata = {
            user_status_log_id: verifyLog._id,
            online_time: online_time,
            type: type
        };
        const logTime = new userStatusLogTime(logTimedata);
        const dataLogTime = await logTime.save();
        return res.status(200).json({ message: res.__('ONLINE_MARK'), data: verifyLog });
    } else {
        const userStatusLogModel = new userStatusLog({ userId, date, type, in_call, country_dial_code });

        try {
            const data = await userStatusLogModel.save();
            if (data._id) {
                const logTimedata = {
                    user_status_log_id: data._id,
                    online_time: online_time,
                    type: type
                };
                const logTime = new userStatusLogTime(logTimedata);
                const dataLogTime = await logTime.save();

                if (dataLogTime) {
                    return res.status(200).json({ message: res.__('ONLINE_MARK'), data: data });
                } else {
                    return res.status(400).json({ message: res.__('ERROR_WENT_WRONG') });
                }
            } else {
                return res.status(400).json({ message: res.__('ERROR_WENT_WRONG') });
            }
        }
        catch (error) {
            return res.status(400).json({ error: error });
        }
    }
});

router.put("/user-status/:id", async (req, res) => {
    const { offline_time, type, date } = req.body;

    if (!offline_time || !type || !date) {
        return res.status(400).json({ error: res.__('FILLED_ALL_PROPERTY') })
    }
    if(!req.params.id)
    {
        return res.status(400).json({ error: res.__('FILLED_ALL_PROPERTY') })
    }
    try {
        let currDate = new Date(date).toISOString().split('T')[0];
        const logTimeData = {
            offline_time: offline_time,
            type: type
        };
        const logTime = await userStatusLogTime.findOneAndUpdate(
            {
                user_status_log_id: req.params.id,
                type: 1
            },
            {
                $set: logTimeData
            }
        );
        var minsdiff = "";
        var timeStart = new Date("01/01/2007 " + logTime.online_time);
        var timeEnd = new Date("01/01/2007 " + offline_time);
        var minsdiff = Math.abs(timeEnd - timeStart);
        minsdiff = minsdiff / 60 / 1000;
        const getlastDuration = await userStatusLog.findOne({
            _id: req.params.id
        }, {
            'duration': 1
        });
        if (getlastDuration.duration) {
            var minsdiff = parseFloat(minsdiff) + parseFloat(getlastDuration.duration);
        }
        const logreqBody = {
            duration: minsdiff,
            type: type
        };
        const datas = await userStatusLog.updateOne(
            {
                _id: req.params.id
            },
            {
                $set: logreqBody
            });
        return res.status(200).json({ message: res.__('OFFLINE_MARK'), data: datas });
    }
    catch (error) {
        return res.status(400).json({ error: error });
    }
});

/**
 *  Type 1 is Online and 2 is for offline
 *  Get the list from the online status
 */
router.get('/online-doctor-list', (req, res, next) => {
    const pageNumber = req.query.page || 1; // Get the current page number from the query parameters
    const pageSize = 1; // Number of items per page
    userStatusLog.paginate({ type: 1, country_dial_code: req.getUserProfile.country_dial_code }, { page: pageNumber, limit: pageSize, populate: { path: "userId" } }, (err, result) => {
        // date: { $gte: new Date().toISOString().split('T')[0] }, Remove Date checks
        if (err) {
            console.log(err);
            return res.status(500).json({ message: res.__('ERROR_WHILE_FETCHING_USER') });
        }
        const { docs, totalDocs, limit, page, totalPages } = result;
        res.status(200).json({ message: res.__('DOCTOR_ACTIVE'), data: docs, totalDocs, limit, page, totalPages });
    });
});

/**
 * Getting profile as per given ID. 
 */
router.get('/profile', async (req, res) => {
    var baseUrl = req.protocol + '://' + req.get('host') + '/';
    if (req.getUserProfile) {
        let data = req.getUserProfile;
        if (data.profile) {
            var splitProfile = data.profile.split("/");
            data.profile = `${baseUrl}${splitProfile[3]}`;
        }
        res.status(200).json({ message: res.__('USER_PROFILE'), data: data })
    } else {
        res.status(400).json({ message: res.__('ERROR_WENT_WRONG') });
    }

    // let data = await User.findById(req.params.id);
    // res.send(data);
});

/**
 *  :id Get _id for the user and will share the profile by ID
 */

router.get("/user-profile/:id", async (req, res) => {
    const data = await User.findById(req.params.id);
    var baseUrl = req.protocol + '://' + req.get('host') + '/';
    if (data) {
        var profile = "";
        if (data.profile) {
            var splitProfile = data.profile.split("/");
            profile = `${baseUrl}${splitProfile[3]}`;
        }
        const response = {
            _id: data._id,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            state: data.state,
            gender: data.gender,
            profile: profile
        }
        // delete data.password;
        res.status(200).json({ message: res.__('USER_PROFILE'), data: response });
    } else {
        res.status(400).json({ message: res.__('NO_USER_FOUND') });
    }
})

router.put('/update-profile', upload.single('profile'), async (req, res) => {
    // const uploadSingleImage = upload.single('profile');
    // uploadSingleImage(req, res, async function (err) {
    // if(err)
    // {
    //    return res.status(400).json({error : "Only JPEG, JPG and PNG Images are allowed"});
    // }
    const userDetail = req.getUserProfile;
    var baseUrl = req.protocol + '://' + req.get('host') + '/';

    if (userDetail) {
        let phone = req.body.phone;
        const { firstName, lastName, address, country } = req.body;

        let country_dial_code = userDetail.country_dial_code;
        let country_name = userDetail.country;
        if (phone) {
            if (!country) {
                res.status(400).json({ error: res.__('COUNTRY_CODE_REQUIRED') });
                return;
            }

            let splitCountry = country.split('-');
            if (splitCountry[0]) {
                country_dial_code = splitCountry[0];
                country_name = splitCountry[1];
            }
        } else {
            phone = userDetail.phone;
        }

        let profile = userDetail.profile;
        if (typeof (req.file) != "undefined") {
            profile = `/upload/images/${req.file.filename}`;
        }
        const data = await User.findOneAndUpdate({

            _id: userDetail._id
        },
            {
                $set: { firstName, lastName, profile, address, phone, country_dial_code, country_name }
            }

            , { new: true });
        if (data.profile) {
            var splitProfile = data.profile.split("/");
            data.profile = `${baseUrl}${splitProfile[3]}`;
        }
        if(firstName || lastName || phone && userDetail.userType == 'USER')
        {
            await DoctorPatientRelation.updateOne(
                {
                    patientId : userDetail._id
                },
                {
                    $set : {patient_name : firstName+ ' '+ lastName, phone : phone}
                }
            );
        }
        res.status(200).json({ message: res.__('PROFILE_UPDATED'), data });
    }
    // });
})

/**
 *  Get all notification list as per login user
 *  Default set page = 1 and PageSize (Means coming data in per page) = 10
 */

router.get('/notification-list', async (req, res) => {
    const type_id = req.query.type_id;
    if (type_id) {
        const pageNumber = req.query.page || 1; // Get the current page number from the query parameters
        const pageSize = 10; // Number of items per page
        if (req.getUserProfile) {
            Notification.paginate({ userId: req.getUserProfile._id, type_id: type_id }, { page: pageNumber, limit: pageSize, sort: { createdAt: -1 } }, async (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).json({ message: res.__('ERROR_WHILE_FETCHING_USER') });
                }
                var unreadNotification = await Notification.find({ userId: req.getUserProfile._id, is_read: 1 });
                var count = unreadNotification.reduce((p, c) => {
                    var name = c.type_id;
                    if (!p.hasOwnProperty(name)) {
                        p[name] = 0;
                    }
                    p[name]++;
                    return p;
                }, {});
                var countsExtended = Object.keys(count).map(k => {
                    return {
                        type_id: k,
                        count: count[k]
                    };
                });
                var callUnreadCount = 0;
                // var messageUnreadCount = 0;
                // var appointmentUnreadCount = 0;
                // if (countsExtended) {
                //     countsExtended.map(function (item) {
                //         console.log(item.count);
                //         switch (item.type_id) {
                //             case '1':
                //                 callUnreadCount = item.count;
                //                 break;
                //             case '2':
                //                 messageUnreadCount = item.count;
                //                 break;
                //             case '3':
                //                 appointmentUnreadCount = item.count;
                //                 break;
                //             default:
                //         }
                //     })
                // }
                // callUnreadCount, messageUnreadCount, appointmentUnreadCount
                const { docs, totalDocs, limit, page, totalPages } = result;
                var data = [];
                docs.map(function (item, key) {
                    if(item.title === 'Appointment Booked')
                    {
                        var array = item.body.split(" ");
                        var bodymsg = res.__("APPOINTMENT_BOOKED_BODY")+''+array[4]
                    }else{
                        var bodymsg = res.__(item.body);
                    }
                    data[key] = {
                        _id : item._id,
                        userId : item.userId,
                        title : res.__(item.title),
                        body  : bodymsg,
                        status : item.status,
                        is_read : item.is_read,
                        type_id : item.type_id,
                        createdAt : item.createdAt,
                        updatedAt : item.updatedAt
                    }
                })
                res.status(200).json({ message: res.__('NOTIFICATION_LIST'), data, totalDocs, limit, page, totalPages  });
            });
        } else {
            res.status(400).json({ error: res.__('ERROR_WENT_WRONG') });
        }
    } else {
        res.status(400).json({ error: res.__('TYPE_REQUIRED') });
    }
});

/**
 *   FAQ List share 
 */

router.get('/faq', (req, res) => {
    faq.find({ status: 1 }).then((data) => {
        res.status(200).json({ message: res.__('FAQ_LIST'), data });
    }).catch((err) => {
        res.status(400).json({ error: err });
    })
})

/**
 *    Get Avaialble slots list
 */
router.get('/slots', async (req, res) => {
    const date = new Date();
    const currDate = date.toISOString().split('T')[0];
    date.setDate(date.getDate() + 6);
    const data = await AvailableSlots.find({ "available_date": { $gte: currDate, $lte: date.toISOString().split('T')[0] } }).sort({ available_date: 1 });
    let arr = [];
    if (data) {
        slotsCounter(data).then((resp) => {
            const SlotData = resp;
            res.status(200).json({ message: res.__('SLOTS_LIST'), SlotData });
        }).catch((err) => {
            res.send(err);
        })
    } else {
        const SlotData = {};
        res.status(400).json({ error: res.__('NO_SLOTS_FOUND'), SlotData });
    }

})

/**
 *    Get Avaialble slots as per date
 */
router.post('/date-slots', async (req, res) => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    var currDate = date.toISOString().split('T')[0];
    if (req.body.date) {
        currDate = req.body.date;
    }
    const data = await AvailableSlots.find({ "available_date": currDate, country_dial_code : req.getUserProfile.country_dial_code }).sort({ available_date: 1 });
    // var data = [];
    data.map(function (item, key) {
        var slotTime = item.available_date +' '+ item.available_time;
        // var date = new Date(slotTime);
        // var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
        //         date.getUTCDate(), date.getUTCHours(),
        //         date.getUTCMinutes(), date.getUTCSeconds());
        data[key].uatTime = slotTime
    })
    
    
    // const utcTime = new Date(new Date().toUTCString());
    // console.log(utcTime);
    res.status(200).json({ message: res.__('SLOTS_LIST'), date: currDate, data });

})

/**
 * Unread Notification changed to read status
 */
router.put('/mark-read/:id', async (req, res) => {
    const data = await Notification.findOneAndUpdate({
        _id: req.params.id
    },
        {
            $set: {
                is_read: 2
            }
        }, { new: true });
    if (data) {
        res.status(200).json({ message: res.__('UPDATE_SUCESSFUL'), data })
    } else {
        res.status(400).json({ error: res.__('NO_RECORD_FOUND') });
    }
});

router.put('/book-appointment/:id', async (req, res) => {
    const {type_id, date} = req.body;
    if(!type_id || !date)
    {
        return res.status(400).json({error : res.__('FILLED_ALL_PROPERTY')});
    }
    const verifyAppointment = await AvailableSlots.findOne({
        patientId: req.body.patientid,
        available_date : req.body.date
    });
    if(verifyAppointment)
    {
        return res.status(400).json({error : res.__('TODAY_APPOINTMENT_ALREADY_BOOKED')});
    }

    if(type_id == 1)
    {   
        var data = await AvailableSlots.findOneAndUpdate(
            {
                _id: req.params.id
            },
            {
                $set: {
                    patientId: req.body.patientid,
                    is_booked: 2,
                    type_id : req.body.type_id
                }
            },
            { new: true }
        );
    }else{
        var data = await AvailableSlots.findOneAndUpdate(
            {
                _id: req.params.id
            },
            {
                $set: {
                    patientId : req.body.patientid,
                    doctorId  :  req.getUserProfile._id,
                    is_booked : 2,
                    type_id   : req.body.type_id
                }
            },
            { new: true }
        ).populate('patientId').populate('doctorId');
        const bodyData = {
            title : res.__('APPOINTMENT_BOOKED_NOTIFICATION'),
            body  : `${res.__('APPOINTMENT_SCHEDULED_NOTIFICATION')} ${data.available_date}` ,
            icon  : 'myicon', //Default Icon
            sound : 'mysound', //Default sound
        }

        // const bodyDataStore = {
        //     title : "Appointment Booked",
        //     body  : `Appointment is scheduled on ${data.available_date}` ,
        // }

        const type = 3;
        const NotifyData = {
            type : "Appointment Book",
            type_id : 4 //App side appointment notification check
        }
        const NotificationTrigger = await sendPushNotification(req.getUserProfile._id, bodyData, NotifyData,type);

        const verify = await DoctorPatientRelation.findOne(
            {
                patientId : data.patientId._id,
                doctorId : data.doctorId._id
            }
        );
        if(!verify)
        {
            const doctorPatientModel = new DoctorPatientRelation({
                doctorId : data.doctorId._id,
                patientId : data.patientId._id,
                patient_name : data.patientId.firstName+' '+data.patientId.lastName,
                doctor_name : data.doctorId.firstName+' '+data.doctorId.lastName
            })
    
            const modelSave = await doctorPatientModel.save();
        }
    }
    if(data)
    {
        var slotTime = data.available_date +' '+ data.available_time;
        var SlotDate = new Date(slotTime);
        var now_utc = Date.UTC(SlotDate.getUTCFullYear(), SlotDate.getUTCMonth(),
                        SlotDate.getUTCDate(), SlotDate.getUTCHours(),
                        SlotDate.getUTCMinutes(), SlotDate.getUTCSeconds());
        data.uatTime = new Date(now_utc)
        const bodyData = {
            title : res.__('APPOINTMENT_BOOKED_NOTIFICATION'),
            body  : `${res.__('APPOINTMENT_SCHEDULED_NOTIFICATION')} ${data.available_date}` ,
            icon  : 'myicon', //Default Icon
            sound : 'mysound', //Default sound
        }
        // const bodyDataStore = {
        //     title : "Appointment Booked",
        //     body  : `Appointment is scheduled on ${data.available_date}` ,
        // }
        const type = 3;
        const NotifyData = {
            type : "Appointment Book",
            type_id : 4 //App side appointment notification check
        }
        const NotificationTrigger = await sendPushNotification(req.body.patientId, bodyData, NotifyData,type);
       
        res.status(200).json({message : res.__('APPOINTMENT_BOOKED_NOTIFICATION'), data})
    }else{
        res.status(400).json({error : res.__('NO_SLOTS_FOUND')});
    }
});

router.get('/patient-list', async (req, res) => {
    const data = await User.find({
        userType : 'USER',
        country_dial_code : req.getUserProfile.country_dial_code
    }, {
        firstName : 1,
        lastName : 1,
        email : 1,
        phone : 1
    });
    res.status(200).json({message : res.__('PATIENT_LIST'), data})
})

router.get('/doctor-list', async (req, res) => {
    const data = await User.find({
        userType : 'DOCTOR',
        country_dial_code : req.getUserProfile.country_dial_code
    }, {
        firstName : 1,
        lastName : 1,
        email : 1,
        phone : 1
    });
    res.status(200).json({message : res.__('DOCTOR_LIST'), data})
})

router.get('/appointment-list', async (req, res) => {
    const date = new Date();
    const currDate = date.toISOString().split('T')[0];
    date.setDate(date.getDate() + 30);
    const dateSecond = new Date();
    dateSecond.setDate(dateSecond.getDate() - 1);
    const previousDate = dateSecond.toISOString().split('T')[0]
    let PastDate = new Date();
    PastDate.setDate(PastDate.getDate() - 30);
    PastDate = PastDate.toISOString().split('T')[0];
    var baseUrl = req.protocol + '://' + req.get('host')+'/';
    if(req.getUserProfile.userType == 'DOCTOR')
    {
        var upcomingData = await AvailableSlots.find({
            available_date : {$gte: currDate, $lte: date.toISOString().split('T')[0]},
            doctorId : req.getUserProfile._id,
            is_booked : 2
        }).populate('patientId', {firstName : 1, lastName : 1, email : 1, profile : 1});
        var pastData = await AvailableSlots.find({
            available_date : {$gte: PastDate, $lte: previousDate},
            doctorId : req.getUserProfile._id,
            is_booked : 2
        }).populate('patientId', {firstName : 1, lastName : 1, email : 1, profile : 1});;
    }else{
        var upcomingData = await AvailableSlots.find({
            available_date : {$gte: currDate, $lte: date.toISOString().split('T')[0]},
            patientId : req.getUserProfile._id,
            is_booked : 2
        });
        var pastData = await AvailableSlots.find({
            available_date : {$gte: PastDate, $lte: previousDate},
            patientId : req.getUserProfile._id,
            is_booked : 2
        });
    }
    upcomingData.map(function (item, key) {
        var slotTime = item.available_date +' '+ item.available_time;
        // var date = new Date(slotTime);
        // var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
        //         date.getUTCDate(), date.getUTCHours(),
        //         date.getUTCMinutes(), date.getUTCSeconds());
        upcomingData[key].uatTime = slotTime;
        const populatedfile = item.patientId.profile;
        console.log(populatedfile);
        if(populatedfile)
        {
          var splitProfile = populatedfile.split("/");
          item.patientId.profile = `${baseUrl}${splitProfile[3]}`;
        }
    })

    pastData.map(function (item, key) {
        var slotTime = item.available_date +' '+ item.available_time;
        // var date = new Date(slotTime);
        // var now_utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(),
        //         date.getUTCDate(), date.getUTCHours(),
        //         date.getUTCMinutes(), date.getUTCSeconds());
        pastData[key].uatTime = slotTime
        const populatedfile = item.patientId.profile;
        console.log(populatedfile);
        if(populatedfile)
        {
          var splitProfile = populatedfile.split("/");
          item.patientId.profile = `${baseUrl}${splitProfile[3]}`;
        }
    })
    let data = {
        
        upcomingAppointment : upcomingData,
        pastAppointment : pastData
    }
    res.status(200).json({message : res.__('BOOKING_SLOTS_LIST'), data})
})

router.get('/appointment/:id', async (req, res) => {
    const data = await AvailableSlots.findById(req.params._id);
    res.status(200).json({message : res.__('BOOKING_SLOTS_LIST'), data})
})

/***
 * 
 *   Missed Call data getting from calls table
 *   This data show on patient side on the Notification page in call tab
 */
router.get('/missed-call', async (req, res) => {
     const date = new Date();
     const currDate = date.toISOString().split('T')[0];
     date.setDate(date.getDate() - 90);
     if(req.getUserProfile.userType == 'DOCTOR')
     {
        var data = await calls.find({createdAt : {$gte: date.toISOString().split('T')[0], $lte: currDate}, status : 6,doctorId : req.getUserProfile._id}).populate("patientId", {firstName : 1, lastName : 1});
     }else{
        var data = await calls.find({createdAt : {$gte: date.toISOString().split('T')[0], $lte: currDate}, status : 6,patientId : req.getUserProfile._id}).populate("doctorId", {firstName : 1, lastName : 1});
     }
     
     res.status(200).json({message : res.__('MISSED_CALL_DATA'), data});
});

router.get("/doctor-patients-list", async (req, res) => {
    var baseUrl = req.protocol + '://' + req.get('host')+'/';
    if(req.query.search)
    {
        const regexPattern = new RegExp(`.*${req.query.search}.*`, 'i'); // Case-insensitive regex
        var users = await User.find({
            country_dial_code : req.getUserProfile.country_dial_code, userType : "USER",
            $or : [
                { firstName : {$regex: regexPattern}}, 
                { phone     : {$regex: regexPattern}}
            ]});

    }else{
        var users = await User.find({country_dial_code : req.getUserProfile.country_dial_code, userType : "USER"});
    }
    var usersData = [];
    const usersWithBaseURL = users.map((user, index) => {
          const populatedProfile = user.profile;
          if(populatedProfile)
          {
            var splitProfile = populatedProfile.split("/");
            user.profile = `${baseUrl}${splitProfile[3]}`;
          }
          usersData[index] = user;
    });
    // const data = await AvailableSlots.aggregate([
    //     {
    //         $lookup: 
    //             {
    //                 from : "users", 
    //                 localField : "patientId",
    //                 foreignField : "_id",
    //                 as : "patientId"
    //             }
    //     },
    //     {
    //         $match: {
    //             "patientId.firstName" : { $regex: /S/i}
    //         }
    //     },
    //     {
    //         $group: {
    //             _id: null,
    //             patientIds: { $addToSet: "$patientId" }
    //           // Add any additional fields you want to include in the result
    //         }
    //     },
    //     {
    //         $project: {
    //             _id: 0,
    //             patientIds: 1
    //         }
    //       }
    // ]
    //     );
    res.status(200).json({message : res.__('PATIENT_LIST'), usersData});
});
// will add in the date in the queue MAIN POINT
router.get('/counter-guide', async (req,res) => {
    const date = new Date();
    const onlineDoctorCount = await userStatusLog.countDocuments(
        {
            //date : { $gte: new Date(date).toISOString().split('T')[0] },
            country_dial_code : req.getUserProfile.country_dial_code,
            type : 1
        }
    );
    const getPatient = await calls.find({
        createdAt : { $gte: new Date().toISOString().split('T')[0] },
        country_dial_code : req.getUserProfile.country_dial_code,
        type : 1,
        status : 1
    });
    const getDropped = await calls.countDocuments({
        createdAt : { $gte: new Date().toISOString().split('T')[0] },
        country_dial_code : req.getUserProfile.country_dial_code,
        type : 1,
        status : 2
    });

    var getQueueCount = 0;
    if(req.getUserProfile.userType == 'USER')
    {
        for(var i = 0 ; i < getPatient.length; i++)
        {
            if(req.getUserProfile._id.toString().replace(/ObjectId\("(.*)"\)/, "$1") === getPatient[i].patientId.toString().replace(/ObjectId\("(.*)"\)/, "$1"))
            {
                  getQueueCount = i + 1;
                  break;
            }
        }
    }   

    const getCallBackCount = await calls.countDocuments({
        createdAt : { $gte: new Date().toISOString().split('T')[0] },
        country_dial_code : req.getUserProfile.country_dial_code,
        status : 6
    });

    const counterStack = {
        onlineDoctorCount : onlineDoctorCount,
        patientCount : getPatient.length,
        waitingTime : getQueueCount * 15,
        queuewaitingTime : getPatient.length * 15,
        patientQueueCount : getQueueCount,
        droppedCallCount : getDropped,
        callBackCount : getCallBackCount
    }
    res.status(200).json({message : res.__('COUNTER_GUIDE'), counterStack})
});

router.get('/home', async (req,res) => {
    const data =  await Notification.countDocuments(
        {
         userId   : req.getUserProfile._id,
         is_read  : 1,
         type_id  : 3
        }
    );
    
    const homeBucket = {
        is_notification : data > 0 ? true : false
    }
    if(req.getUserProfile.userType == 'DOCTOR'){
        const OnlineAvailable =  await userStatusLog.findOne(
            {
             userId   : req.getUserProfile._id,
             type  : 1,
             //date  : { $gte: new Date().toISOString().split('T')[0] }
            }
        );
        if(!OnlineAvailable)
        {
            homeBucket.is_online = false;
            homeBucket.onlineID  = '';
        }else{
            homeBucket.is_online = true;
            homeBucket.onlineID  = OnlineAvailable._id
        }
    }
   
    res.status(200).json({homeBucket});
});

router.post('/upload-lab-test', async (req, res ) => {
    const UploadProfileFile = upload.single('file');
    var baseUrl = req.protocol + '://' + req.get('host') + '/';
    UploadProfileFile(req, res, async function (err) {
        if(err)
        {
            return res.status(400).json({error : res.__('IMAGE_FORMAT')});
        }
        /**
         *  Type 1 for Past API
         *  Type 2 for Lab Test Record
         */
        const { title, description, type_id } = req.body;
        const userId  = req.getUserProfile._id;
        let file   = '';
        if(typeof(req.file) != "undefined")
        {
             file   = `/upload/images/${req.file.filename}`;
        }
        if(!title || !description || !file){
            return res.status(400).json({error : res.__('FILLED_ALL_PROPERTY')});
        }
        const { status } = 1;

        const medicalRecordModel = new MedicalRecords({
            title,
            description,
            type_id,
            userId,
            file,
            status
        });
        const data = await medicalRecordModel.save();

        if(data)
        {
            data.file = `${baseUrl}${req.file.filename}`;
            res.status(200).json({message : res.__('UPLOAD_SUCESSFUL'), data});
        }else{
            res.status(400).json({error : res.__('ERROR_WENT_WRONG')});
        }
    });
})

router.get('/lab-list', async (req, res) => {
    const { typeId } = req.query;
    if(!typeId)
    {
        return res.status(400).json({error : res.__('FILLED_ALL_PROPERTY')});
    }
    const data =  await MedicalRecords.find({userId : req.getUserProfile._id, type_id : typeId});
    var baseUrl = req.protocol + '://' + req.get('host') + '/';
    var labData = [];
    const usersWithBaseURL = data.map((item, index) => {
          const populatedfile = item.file;
          if(populatedfile)
          {
            var splitProfile = populatedfile.split("/");
            item.file = `${baseUrl}${splitProfile[3]}`;
          }
          labData[index] = item;
    });

    res.status(200).json({message : res.__('LAB_TEST_RECORD'), labData})
});

router.post('/upload-prescription', async (req, res ) => {
    const UploadProfileFile = upload.single('file');
    var baseUrl = req.protocol + '://' + req.get('host') + '/';
    UploadProfileFile(req, res, async function (err) {
        if(err)
        {
            return res.status(400).json({error : res.__('IMAGE_FORMAT')});
        }
         /**
         *  Type 3 for Prescription API
         *  Type 4 for Notes Record
         */
        const { title, description, userId, type_id } = req.body;
        const doctorId  = req.getUserProfile._id;
        let file   = '';
        if(typeof(req.file) != "undefined")
        {
            file   = `/upload/images/${req.file.filename}`;
        }
        if(!title || !description || !userId){
            return res.status(400).json({error : res.__('FILLED_ALL_PROPERTY')});
        }
        const { status } = 1;

        const medicalRecordModel = new MedicalRecords({
            title,
            description,
            doctorId,
            type_id,
            userId,
            file,
            status
        });
        const data = await medicalRecordModel.save();

        if(data)
        {
            if(req.file){
                data.file = `${baseUrl}${req.file.filename}`;
            }
            res.status(200).json({message : res.__('UPLOAD_SUCESSFUL'), data});
        }else{
            res.status(400).json({error : res.__('ERROR_WENT_WRONG')});
        }
    });
});

router.post("/patient-medical-records", async (req, res) => {
    
    const {patientId, typeId} = req.body;
    /**
     * Only type_id 2 (Lab Test) and 4 (Notes) is applicable for this api
     * when type_id 1 and 2 then no need to filter doctorID but when type ID 4 and 3 coming then identify doctorID
     */
    
    if(!typeId || !patientId)
    {
        return res.status(400).json({error : res.__('FILLED_ALL_PROPERTY')});
    }

    if(typeId == 3 || typeId == 4)
    {
        var data = await MedicalRecords.find({
            userId : patientId,
            doctorId : req.getUserProfile._id,
            type_id : typeId
        });
    }else{
        var data = await MedicalRecords.find({
            userId : patientId,
            type_id : typeId
        });
    }
    
    var baseUrl = req.protocol + '://' + req.get('host') + '/';
    var labData = [];
    const usersWithBaseURL = data.map((item, index) => {
          const populatedfile = item.file;
          if(populatedfile)
          {
            var splitProfile = populatedfile.split("/");
            item.file = `${baseUrl}${splitProfile[3]}`;
          }
          labData[index] = item;
    });

    res.status(200).json({ message : res.__('DATA_LIST'), data});
});

router.put('/medical-record-update/:id', async (req, res) => {
    const UploadProfileFile = upload.single('file');
    var baseUrl = req.protocol + '://' + req.get('host') + '/';
    UploadProfileFile(req, res, async function (err) {
        if(err)
        {
            return res.status(400).json({error : res.__('IMAGE_FORMAT')});
        }

        const {title, description} = req.body;

        const updatedData = {
            title,
            description
        }
        if(req.file)
        {
            const file  = `/upload/images/${req.file.filename}`;
            updatedData.file = file;
        }
        const data = await MedicalRecords.findOneAndUpdate({
            _id : req.params.id
        },
        {
            $set : updatedData
        },{new : true}
        );
        if(req.file)
        {
            data.file = `${baseUrl}${req.file.filename}`
        }else{
            const populatedfile = data.file;
            var splitProfile = populatedfile.split("/");
            data.file = `${baseUrl}${splitProfile[3]}`;
        }
        
        res.status(200).json({message : res.__('UPDATE_SUCESSFUL'), data});
        
    });
});


router.post("/add-dependent", async (req, res) => {
    const UploadProfileFile = upload.single('file');
    var baseUrl = req.protocol + '://' + req.get('host') + '/';
    const validateDependent = await userDepedent.countDocuments({
        userId : req.getUserProfile._id
    });
    if(validateDependent < 4)
    {
        UploadProfileFile(req, res, async function (err) {
            if(err)
            {
                return res.status(400).json({error : res.__('IMAGE_FORMAT')});
            }
    
    
            const {firstName, lastName, dob, relation, gender} = req.body;
    
            const userId = req.getUserProfile._id;
    
            if(!firstName || !lastName || !dob || !relation || !gender)
            {
                return res.status(400).json({error : res.__('FILLED_ALL_PROPERTY')});
            }
    
            let file   = '';
            if(typeof(req.file) != "undefined")
            {
                file   = `/upload/images/${req.file.filename}`;
            }
    
            const userDependentModel = new userDepedent({
                userId,
                firstName,
                lastName,
                dob,
                relation,
                gender,
                file
            });
            const data = await userDependentModel.save();
    
            if(data)
            {
                if(req.file){
                    data.file = `${baseUrl}${req.file.filename}`;
                }
                res.status(200).json({message : res.__('UPLOAD_SUCESSFUL'), data});
            }else{
                res.status(400).json({error : res.__('ERROR_WENT_WRONG')});
            }
    
        });
    }else{
        res.status(400).json({error : res.__('EXCEED_MAXIMUM_LIMIT')});
    }
});

router.get("/dependent-list/:id", async (req, res) => {
    var baseUrl = req.protocol + '://' + req.get('host')+'/';
    const dependents = await userDepedent.find({
        userId : req.params.id
    });

    var usersDependent = [];
    const usersWithBaseURL = dependents.map((user, index) => {
          const populatedProfile = user.file;
          if(populatedProfile)
          {
            var splitProfile = populatedProfile.split("/");
            user.file = `${baseUrl}${splitProfile[3]}`;
          }
          usersDependent[index] = user;
    });

    res.status(200).json({message : res.__('DEPENDENT_LIST'), usersDependent});
});

router.put('/update-dependent/:id', async (req, res) => {
    const updateFile = upload.single('file');
    var baseUrl = req.protocol+ '://'+ req.get('host') + '/';
    updateFile(req, res, async function(err) {
        if(err)
        {
            return res.status(400).json({error : res.__('IMAGE_FORMAT')});    
        }

        const {firstName, lastName, dob, relation, gender} = req.body;

        const updatedData = {
            firstName,
            lastName,
            dob,
            relation,
            gender
        }
        if(req.file)
        {
            const file  = `/upload/images/${req.file.filename}`;
            updatedData.file = file;
        }
        const data = await  userDepedent.findOneAndUpdate(
            {
                _id : req.params.id
            },
            {
                $set : updatedData
            },
            {
                new : true
            }
        )
        if(data.file)
        {
            var splitFile = data.file.split("/");
            data.file = `${baseUrl}${splitFile[3]}`; 
        }
        res.status(200).json({message : res.__('UPDATE_SUCESSFUL'), data});
    })
});

router.delete('/dependent/:id', async (req, res) => {
    const data = await userDepedent.deleteOne({
        _id : req.params.id
    });
    if(data.acknowledged)
    {
        res.status(200).json({message : res.__('DELETED_SUCESS')});
    }else{
        res.status(400).json({error : res.__('ERROR_WENT_WRONG')});
    }
});

router.get('/my-visits', async (req, res) => {
    const data = await calls.find({
        patientId : req.getUserProfile._id,
        status : 5
    }).populate('doctorId', {firstName : 1, lastName : 1}).sort( { "createdAt": -1 } );

    res.status(200).json({message : res.__('VISIT_LIST'), data});
})

router.post('/add-pharmacy', async (req, res) => {
    let {pharmacy_name, email, phone_no, address, manager_name, licence_number, country} = req.body;
    if(!pharmacy_name, !email, !address)
    {
        res.status(400).json({error : res.__('FILLED_ALL_PROPERTY')})
    }
    console.log(phone_no);
    phone_no = !phone_no ? "null" : phone_no;
    manager_name = !manager_name ? "null" : manager_name;
    licence_number = !licence_number ? "null" : licence_number;
    country = !country ? "null" : country;
    let created_by = req.getUserProfile._id;
    const data = {
        pharmacy_name,
        email,
        phone_no,
        address,
        manager_name,
        licence_number,
        country,
        created_by
    }
    try{
        const model = new pharmacy(data);
        const modelSave = await model.save();
    
        if(modelSave)
        {
            res.status(200).json({message : res.__('ADD_SUCESSFUL'), modelSave});
        }else{
            res.status(400).json({error : res.__('ERROR_WENT_WRONG')});
        }
    }catch(err)
    {
        if(err.keyValue)
        {
            if(Object.keys(err.keyValue)[0] == 'email')
            {
                return res.status(400).json({error : res.__('EMAIL_ALREADY_EXIST')});
            }else{
                return res.status(400).json({error : err});
            }
        }else{
            return res.status(400).json({error : err});
        }
    }
   

});

router.get('/pharmacy-list', async (req, res) => {
    const datas = await pharmacy.find({
        created_by : req.getUserProfile._id
    });
    res.status(200).json({message : res.__('PHARMACY_LIST'), datas})
})

router.put('/update-pharmacy/:id', async (req, res) => {
    const id = req.params.id;
    if(!id)
    {
        res.status(400).json({error : res.__('ID_REQUIRED')});
    }
    let {pharmacy_name, email, phone_no, address} = req.body;

    const updateField = {
        pharmacy_name,
        email,
        phone_no,
        address
    }
    const updatePharmacy = await pharmacy.updateOne(
        {
            _id : id
        },{
            $set : updateField
        }
        );
    if(updatePharmacy)
    {
        res.status(200).json({message : res.__('UPDATE_SUCESSFUL')})
    }else{
        res.status(400).json({error : res.__('ERROR_WENT_WRONG')})
    }
})

module.exports = router