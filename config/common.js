const calls = require("../models/calls");

function timeConvert(n) {
    var num = n;
    var hours = (num / 60);
    var rhours = Math.floor(hours);
    var minutes = (hours - rhours) * 60;
    var rminutes = Math.round(minutes);
    return num + " minutes = " + rhours + " hour(s) and " + rminutes + " minute(s).";
}

const slotsCounter = async (data) => new Promise((resolve, reject) => {
    try{
        var arr = {};
        var count = data.reduce((p, c) => {
            var name = c.available_date;
            if (!p.hasOwnProperty(name)) {
            p[name] = 0;
            }
            p[name]++;
            return p;
        }, {});
        var countsExtended = Object.keys(count).map(k => {
            return {date: k, count: count[k]}; });
        countsExtended.forEach((item, index) => {
            arr[item.date] = [];
            var counter = 0;
            data.forEach((list, key, object) => {
                if(item.date == list.available_date)
                {
                    arr[item.date][counter] = list;
                    counter++;
                }
                // else{
                //     object.splice(index, arr[item.date][key]);
                // }                
            })
            // for(var i = 0; i < data.length; i++)
            // {
            //     if(item.date === data[i].available_date)
            //     {
            //         arr[item.date][i] = data[i] != null ? data[i] : '';
            //     }else{
            //         // continue;
            //         arr[item.date][i] = {};
            //     }
            // }
        })
        return resolve(arr);
    }catch(error) {
        reject(error);
    }
    
});

const verifyCallback = async (userId) => {
    const call = await calls.countDocuments(
        {
            createdAt : { $gte: new Date().toISOString().split('T')[0] },
            status    : 6,
            is_callback : 1, 
            patientId : userId
        }
    );
    return call;
}

module.exports = {
    slotsCounter,
    verifyCallback
}