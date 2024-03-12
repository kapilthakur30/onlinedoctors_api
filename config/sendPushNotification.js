const UserDeviceDetails = require("../models/UserDeviceDetails");
const notification = require("../models/Notification");
const FCM = require('fcm-node');


const saveUserDeviceDetail = async (data) => {
    
    const {userId, fcm_device_token, login_device_type, login_device_name} = data;

    const verifyDetails = await UserDeviceDetails.findOne({
        userId : userId
    });
    if(verifyDetails)
    {
        const UpdateDeviceDetail = await UserDeviceDetails.updateOne(
            {
                _id : verifyDetails._id
            },
            {
                $set : {
                    fcm_device_token : fcm_device_token,
                    login_device_type : login_device_type,
                    login_device_name : login_device_name
                }
            }
        )
        return true;
    }
    const deviceModel = new UserDeviceDetails({userId, fcm_device_token, login_device_type, login_device_name});
    const deviceDetail = await deviceModel.save();
    if(deviceDetail._id)
    {
        return true;
    }else{
        return false;
    }

}

const sendPushNotification = async (userId, bodyData, NotifyData, Type, bodyDataStore) => {
    const serverKey = process.env.SERVER_KEY;
    if(!serverKey)
    {
        return { message : "something wen wrong"}
    }

    var fcm = new FCM(serverKey);
    var push_token = await UserDeviceDetails.find({
        userId : userId
    });

    var reg_ids = [];
    push_token.forEach(token => {
        reg_ids.push(token.fcm_device_token)
    });
    var data = "";
    if(reg_ids.length > 0)
    {
        var pushMessage = { // this may vary according to the message type(single recipient, multicast, topic)
            registration_ids:reg_ids,
            content_available: true,
            mutable_content: true,
            notification: bodyData,
            data: NotifyData
        }
        fcm.send(pushMessage, async function(err, response){
            if(err)
            {
                console.log("Something went wrong", err);
                return false;
            }
            var responseData = await JSON.parse(response);
            const notificationData = {
                userId : userId,
                title : bodyDataStore.title,
                body : bodyDataStore.body,
                messageId : responseData.success ? responseData.results[0].message_id : "",
                status : responseData.success ? 1 : 2,
                type_id : Type,
                is_read : 1
            }
            const NotifyModel = new notification(notificationData)
            const dataSave = await NotifyModel.save();
            if(responseData.success)
            {
                return {
                    'message' : "Notification push successfully",
                    'data' : responseData
                };
            }else{
                return {
                    'message' : "Something went wrong"
                };
            }
        })
    }
    return data;
}

/**
 * Here we can send the notificatin without notification object
 * @param {*} userId 
 * @param {*} bodyData 
 * @param {*} NotifyData 
 * @param {*} Type 
 * @returns 
 */

const sendSecondPushNotification = async (userId, bodyData, NotifyData, Type, bodyDataStore) => {
    const serverKey = process.env.SERVER_KEY;
    if(!serverKey)
    {
        return { message : "something wen wrong"}
    }

    var fcm = new FCM(serverKey);
    var push_token = await UserDeviceDetails.find({
        userId : userId
    });

    var reg_ids = [];
    push_token.forEach(token => {
        reg_ids.push(token.fcm_device_token)
    });
    var data = "";
    if(reg_ids.length > 0)
    {
        var pushMessage = { // this may vary according to the message type(single recipient, multicast, topic)
            registration_ids:reg_ids,
            content_available: true,
            mutable_content: true,
            data: NotifyData
        }
        fcm.send(pushMessage, async function(err, response){
            if(err)
            {
                console.log("Something went wrong", err);
                return false;
            }
            var responseData = await JSON.parse(response);
            const notificationData = {
                userId : userId,
                title : bodyDataStore.title,
                body : bodyDataStore.body,
                messageId : responseData.success ? responseData.results[0].message_id : "",
                status : responseData.success ? 1 : 2,
                type_id : Type,
                is_read : 1
            }
            const NotifyModel = new notification(notificationData)
            const dataSave = await NotifyModel.save();
            if(responseData.success)
            {
                return {
                    'message' : "Notification push successfully",
                    'data' : responseData
                };
            }else{
                return {
                    'message' : "Something went wrong"
                };
            }
        })
    }
    return data;
}

module.exports = {
    saveUserDeviceDetail,
    sendPushNotification,
    sendSecondPushNotification
}

