const mongoose = require("mongoose");

const States = mongoose.model(
    "states",
    new mongoose.Schema({
        state_name: String,
    }), "states"
);

module.exports = States;