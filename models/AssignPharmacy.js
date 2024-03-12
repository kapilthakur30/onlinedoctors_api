const mongoose = require('mongoose');

const AssignPharmacy = mongoose.Schema({
    user_id : {type : mongoose.Schema.Types.ObjectId, ref : 'user'},
    pharmacy_id : {type: mongoose.Schema.Types.ObjectId, ref : "pharmacy"},
    assignedBy : { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
}, { 
    timestamps: true 
});

module.exports = mongoose.model('patient-pharmacy', AssignPharmacy);