const mongoose = require("mongoose");

const RefilDetails = mongoose.model(
  "refil_details",
  new mongoose.Schema({
    treatmentId: String,
    treatmentType: String,
    orderNumber: String,
    refilCount: Number,
    refilDateTime: Date,
    createdAt: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
  }),"refil_details"
);

module.exports = RefilDetails;