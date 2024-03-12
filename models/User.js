const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const User = new mongoose.Schema({
    email: {type: String, index: {unique: true, dropDups: true}},
    password: String,
    firstName: String,
    lastName: String,
    phone: {type: String, index: {unique: true}},
    country_name : String,
    country_dial_code : String,
    city : String,
    dob: String,
    gender: String,
    userType: String,
    referral_code: String,
    sms_notification: Boolean,
    dosespotid: String,
    profile : String,
    otp : String,
    is_verified : Boolean,
    address : String
},
{
  timestamps : true
});

let parseJSON = {
      _id : this._id,
      firstName : this.firstName
}

User.pre("save", async function(next){
     if(this.isModified('password'))
     {
       this.password = await bcrypt.hash(this.password, 12);
     }
     next();
});

User.pre(["updateOne"], async function(next){
  const data = this.getUpdate();
    if (data.$set.password) {
      data.$set.password = await bcrypt.hash(data.$set.password, 12);
    }
  next();
})

module.exports = mongoose.model('users', User);