const mongoose = require("mongoose");

const Treatments = mongoose.model(
    "treatments",
    new mongoose.Schema({
        treatment_name: String,
        treatment_status: String,
        treatment_sort_order: Boolean,
        treatment_table_name: String
    }), "treatments"
);

module.exports = Treatments;