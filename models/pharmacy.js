const mongoose = require('mongoose');

const Pharmacy = mongoose.Schema({
    pharmacy_name: String,
    email: { type: String, index: { unique: true, dropDups: true } },
    phone_no: String,
    address: String,
    manager_name: String,
    licence_number: String,
    country : String,
    region : String,
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }
}, {
    timestamps: true
});

module.exports = mongoose.model('pharmacy', Pharmacy);