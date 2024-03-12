const { json } = require('express');
const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 *  Multiple types we are maintaing also when send data bundle the also send TYPE ID to handle which notification is coming
 *  Type ID 1 : Call related type
 *  Type ID 2 : When Remove from queue (If patient is in queue then our cron check patient is active of not 
 *              if not then remove from queue)
 *  Type ID 3 : Send Reminder (If patient is in queue then our cron heck patient is active of not 
 *              if not then send reminder to patient)
 * 
 */

const NotificationModel = mongoose.Schema({
    userId : {
        type:mongoose.Schema.Types.ObjectId,
        ref : "users"
    },
    title : String,
    body : String,
    messageId : String,
    status : Number,
    is_read : Number, //1 is unread notification and 2 is Read Notification
    type_id : Number
}, {
    timestamps : true
});
NotificationModel.plugin(mongoosePaginate);
module.exports = mongoose.model('notification', NotificationModel);