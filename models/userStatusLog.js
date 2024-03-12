const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const userStatusLogSchema = mongoose.Schema({
    userId : { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    date : { type: Date, required: true },
    duration : String,
    type : Number, // 1 for online and 2 for offline
    in_call : Number,
    country_dial_code : String
},
{
    timestamps : true
}
);

userStatusLogSchema.plugin(mongoosePaginate);
var userStatusLog = (mongoose.model("user_status_log", userStatusLogSchema));
module.exports = userStatusLog;