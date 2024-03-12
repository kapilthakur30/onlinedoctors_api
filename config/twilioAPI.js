const twilioClient = require('twilio')(process.env.TWILIO_API_KEY_SID, process.env.TWILIO_API_KEY_SECRET, { accountSid: process.env.TWILIO_ACCOUNT_SID });
const AccessToken = require('twilio').jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;

const generateTwilioCallToken = async (data) => {
    const identity = data.identity;
    const roomName = data.room;

    try {
        // See if the room exists already
        const roomList = await twilioClient.video.v1.rooms.list({ uniqueName: roomName, status: 'in-progress' });

        let room;

        if (!roomList.length) {
            // Call the Twilio video API to create the new Go room
            room = await twilioClient.video.v1.rooms.create({
                uniqueName: roomName,
                type: 'go'
            });
        } else {
            room = roomList[0];
        }

        // Create a video grant for this specific room
        const videoGrant = new VideoGrant({
            room: room.uniqueName,
        })

        // Create an access token
        const token = new AccessToken(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_API_KEY_SID,
            process.env.TWILIO_API_KEY_SECRET,
            { identity: identity }
        );

        // Add the video grant and the user's identity to the token
        token.addGrant(videoGrant);
        token.identity = identity;

        // Serialize the token to a JWT and return it to the client side
        // res.status(200).json({
        //     token: token.toJwt()
        // });
        const resp = {
            token: token.toJwt()
        }
        return resp;

    } catch (error) {
       return error;
    }
}

const sendSMS = async (data) => new Promise((resolve,reject) => {
    try{
        twilioClient.messages.create({
            body: data.body,
            from: process.env.TWILIO_API_PHONE_NUMBER,
            to: data.to
        }).then((message) => {
            const dataResp = {
                message: message
            }
            resolve(message);
            // return dataResp;
        }, (error) => {
            const dataErr = {
                error: error
            }
            reject(dataErr);
            // return dataErr;
        });
    }catch (error) {
        const resp = {
            error: error
        }
        return error;
    }
});

module.exports = {
    generateTwilioCallToken,
    sendSMS
}