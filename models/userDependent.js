const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const userDepedentSchema = mongoose.Schema({
    userId : { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    firstName : String,
    lastName : String, 
    dob: String,
    relation: String,
    gender : String,
    file : String
},
{
    timestamps : true
}
);

userDepedentSchema.plugin(mongoosePaginate);
var userDepedent = (mongoose.model("user_depedent", userDepedentSchema));
module.exports = userDepedent;