const mongoose = require('mongoose');

const MedicalRecords = mongoose.Schema({
    userId :{
        type:mongoose.Schema.Types.ObjectId,
        ref:'users'
    },
    doctorId : {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'users'
    },
    file : String,
    title : String,
    description : String,
    type_id : Number,
    /**
     *  1 For Past Record
     *  2 For Lab Test
     *  3 For Prescription
     *  4 For Notes
     */
    status : Number
},{
    timestamps : true
})

module.exports = mongoose.model('medical_records', MedicalRecords);