const mongoose = require("mongoose");

const DoctorPatientRelation = mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    patient_name : String,
    doctor_name : String,
    patient_phone: String,
    doctor_phone: String
  },{
    timestamps : true
  });

module.exports = mongoose.model('doctor_patient_relations', DoctorPatientRelation);