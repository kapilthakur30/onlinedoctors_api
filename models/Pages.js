const mongoose = require('mongoose');

const PagesModel = mongoose.Schema({
    title : String,
    description : String,
    type : Number
},{
    timestamps : TRUE
})

module.exports = mongoose.model('pages', PagesModel);