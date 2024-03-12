const mongoose = require('mongoose');

const userStatusLogTime = mongoose.Schema({
    user_status_log_id : { type: mongoose.Schema.Types.ObjectId, ref: 'user_status_logs' },
    online_time : String,
    offline_time : String,
    type : Number // 1 for online and 2 for offline
},
{
    timestamps : true
}
);

module.exports = mongoose.model('user_status_log_time', userStatusLogTime);