const mongoose = require('mongoose');

const Faq = mongoose.Schema({
    question : String,
    answer : String,
    status : Number
}, { 
    timestamps: true 
});

module.exports = mongoose.model('faqs', Faq);