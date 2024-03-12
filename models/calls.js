const mongoose = require('mongoose');

/**
 *  Status
 *   1 : Innitiate Call  / waiting Call,  // Patient call the doctor but no one pick the call or patient cut the call 
 *   2 : Dropped Call, // Droped call basically if doctor cut the call if busy or offline -- REMOVED STATUS
 *   3 : Call Rejection, // Number of incoming calls & Outgoing call Rejected -- REMOVED STATUS
 *   4 : Call Accept, // Number of incoming calls & Outgoing call Accepted
 *   5 : Call Completion, // Total number of call completion between patient and doctor
 *   6 : Missed Call -- REMOVED STATUS
 * 
 * CHANGED STATUS
 *   1 : Maintain Call Queue  / waiting Call,  // Patient call the doctor but no one pick the call or patient cut the call 
 *   2 : Dropped Call, // Droped call basically if doctor cut the call if busy or offline -- REMOVED STATUS
 *   3 : Doctor Searched complete, // Number of incoming calls & Outgoing call Rejected -- REMOVED STATUS
 *   4 : Call Accept, // Number of incoming calls & Outgoing call Accepted
 *   5 : Call Completion, // Total number of call completion between patient and doctor
 *   6 : CALL BACK -- CHANGED IT
 *   7 : Remove from STACK 
 * 
 * 
 *   TYPE
 *     1: Inbound Calls
 *     2: Outbound Calls
 */
const calls = mongoose.model(
    "calls",
    new mongoose.Schema({
        patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
        appointmentId : { type: mongoose.Schema.Types.ObjectId, ref: 'available_slots' },
        start_time : String,
        end_time : String,
        duration : String,
        roomId : String,
        type : Number, //1 for Inbound Call and 2 for Outbound Call.
        status :  Number,
        country_dial_code : String,
        is_callback : Number,
        callback_time : String,
        is_active : Number, // 1 Means Call is active and 2 Means In active,
        is_reminder : Number
    },
    {
        timestamps: true 
    }
    ), "calls"
);

module.exports = calls;