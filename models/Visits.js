const mongoose = require('mongoose');

const Visits = mongoose.Schema({
    userID :{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user'
    },
    doctorID : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'user'
    },
    treatment_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'treatments'
    },
    appointment_date : Date,
    fees : Number,
    status : Number
},{
    timestamps : true
})

module.exports = mongoose.model('visits', Visits);