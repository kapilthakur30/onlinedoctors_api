const mongoose = require("mongoose");

const Country = mongoose.model(
    "country",
    new mongoose.Schema({
        name: String,
        dial_code : String,
        code : String
    }), "country"
);

module.exports = Country;