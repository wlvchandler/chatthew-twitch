const tmi = require('tmi.js');
const util = require('./util');
require('dotenv').config();

const chat_client = new tmi.Client({
    identity: {
        username: 'the_chatthew',
        password: process.env.TOKEN
    },
    channels: [ 'jaahska' ]
});

chat_client.connect().then(()=>{
    console.log(util.TupleLogString({connected: "Y"}, util.loglevel.info, tag='chat'));
}).catch(err => {
    console.log("chat_client.error: Could not connect to chat");
    console.log(err);
});



function onMessage(channel, tags, message, self) {
    if (self || !message.startsWith('!')) return;
    console.log(message);
}


module.exports = { chat_client, onMessage };

