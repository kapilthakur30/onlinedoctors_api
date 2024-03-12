const mongoose = require("mongoose");

const Admin = mongoose.model(
  "admins",
  new mongoose.Schema({
    email: String,
    password: String,
    user_type: String,
    first_name: String,
    last_name: String
  })
);

module.exports = Admin;