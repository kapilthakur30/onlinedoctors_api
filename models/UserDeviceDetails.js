const mongoose = require('mongoose');

const UserLoginDetails = mongoose.Schema({
    userId : {
        type:mongoose.Schema.Types.ObjectId,
        ref : "users"
    },
    login_device_type : Number,
    login_device_name : String,
    fcm_device_token : String,
}, { timestamps : true});

module.exports = mongoose.model('user_device_details', UserLoginDetails);