const mongoose = require('mongoose');

const UserLoginDetails = mongoose.Schema({
    userId : {
        type:mongoose.Schema.Types.ObjectId,
        ref : "users"
    },
    login_device_type : Number,
    login_device_name : String,
    _token : String,
    is_login : Number,
}, { timestamps : true});

module.exports = mongoose.model('user_login_details', UserLoginDetails);