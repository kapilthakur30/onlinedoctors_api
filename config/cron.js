var cron = require('node-cron');
const calls = require('../models/calls');
const { sendPushNotification } = require('./sendPushNotification');


var CallReminder = cron.schedule('* * * * *', async (req, res) => {
    console.log('This is my cron that is written in config cron file & its running a task every minute');
    const data = await calls.findOne({
      createdAt : { $gte: new Date().toISOString().split('T')[0] },
      status : 1,
      type : 1
    })
    if(data.is_active == 2)
    {
      if(data.is_reminder && data.is_reminder == 1)
      {
        const sendReminder = await calls.findOneAndUpdate(
          {
            _id : data._id
          },
          {
            $set: {
              status : 6,
              is_callback : 1
            }
          });
          const bodyData = {
            title: res.__('PATIENT_NOT_RESPONDING'),
            body: res.__('MOVING_FORWARD_PATIENT'),
            icon: 'myicon', //Default Icon
            sound: 'mysound', //Default sound
          }

          const bodyDataStore = {
            title: 'Patient is not Responding.',
            body: 'Moving Forward with another Patient'
          }

          const NotifyData = {
            type : "Remove from Queue",
            type_id : 2
          }
        const type = 2;
        const NotificationTrigger = await sendPushNotification(data.patientId, bodyData, NotifyData, type, bodyDataStore);
        return res.send();
      }else{
        const sendReminder = await calls.findOneAndUpdate(
        {
          _id : data._id
        },
        {
          $set: {
            is_reminder : 1
          }
        });
        const bodyData = {
          title: res.__('DOCTOR_WAITING'),
          body: res.__('START_CALL_WITH_DOCTOR'),
          icon: 'myicon', //Default Icon
          sound: 'mysound', //Default sound
        }

        const bodyDataStore = {
          title: 'Doctor Waiting',
          body: 'Open the app and start the call with doctor',
        }

        const NotifyData = {
          type : "Doctor Waiting.",
          type_id : 3
        }
      const type = 4;
      const NotificationTrigger = await sendPushNotification(data.patientId, bodyData, NotifyData,type,bodyDataStore);
        return res.send();
      }
    }
}, {
  scheduled: false
});

CallReminder.stop();

