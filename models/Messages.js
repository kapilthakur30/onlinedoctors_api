const mongoose = require("mongoose");

const Messages = mongoose.model(
  "messages",
  new mongoose.Schema({
    senderId: String,
    receiverId: String,
    message: String,
    status: Boolean,
    messageDate: { type : Date, default: Date.now }
  })
);

module.exports = Messages;