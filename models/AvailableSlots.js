const mongoose = require("mongoose");

const AvailableSlots = mongoose.model(
  "available_slots",
  new mongoose.Schema({
    available_time: String,
    available_date: String,
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    is_booked : Number,
    type_id : Number, // 1 For book by Patient & 2 Book by Doctor,
    country_dial_code : String,
    country_name : String,
    uatTime : Date
  },{
    timestamps : true
  }),"available_slots"
);

module.exports = AvailableSlots;
