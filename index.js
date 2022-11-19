require('dotenv').config();

const tmi = require('tmi.js');
const mariadb = require('mariadb');
const axios = require('axios');

const io = require('./comm');
const db = require('./sql');
const util = require('./util');


const { app } = require('./handler');
const { chat_client } = require('./chat');

const BASE_URL = 'https://api.twitch.tv/helix';

function get_chat_list() {
    const chat_list_url = 'https://tmi.twitch.tv/group/user/jaahska/chatters';
    var chat = null;
    axios.get(chat_list_url).then(res => {
	chat = res;
	console.log(`statusCode: ${res.status}`);
	console.log(res['data']['chatters']['viewers']);
    }).catch(error => {
	console.error(error);
    });
    return chat;
}

function isPositiveInteger(str) {
  if (typeof str !== 'string') {
    return false;
  }
  const num = Number(str);
  if (Number.isInteger(num) && num > 0) {
    return true;
  }
  return false;
}


async function getUserPoints(id) {
    var points = null;
    try {
	const rows = await db.query('select points from users where id=?',[id]);
	points = rows[0]['points'];
    } catch (err) {
	console.log(err);
    }
    return new Promise((resolve, reject) => {
	resolve(points);
    });
}

async function updateUserPoints(id, points) {
    var success = true;
    try {
	const rows = await db.query('update users set points=? where id=?;',[points,id]);
    } catch (err) {
        console.log(err);
	success = false;
    }
    return new Promise((resolve, reject) => {
	if (success) {
            resolve();
	} else {
	    reject();
	}
    });
}

async function lurk(channel, uid, username) {
    console.log(`select lurk from user_messages where id=${uid}`);
    let lurk_msg = [
	`lol don't care bye ${username}`,
	`fine. and STAY OUT, ${username} >:(`,
	`thanks ${username}, very cool!`
    ][util.getRandomInt(0,2)];
    let mean_msg;
    try {
	const lurkq = await db.query("select lurk from user_messages where id=?", [uid]);
	if (Object.keys(lurkq).length) {
	    lurk_msg = lurkq[0]['lurk'];
	} else {
	    mean_msg = 'Am I being mean to you??? :((((( Set your own lurk message with !setlurk <your wonderful, special, unique message>';
	}
    } catch (err) {
	console.log(err);
    } finally {
	chat_client.say(channel, lurk_msg);
	if (mean_msg) {
	    chat_client.say(channel, mean_msg);
	}
    }
}

async function setlurk(tags, lurkmsg) {
    try {
	q = "replace into user_messages (id, lurk) values (?,?)";
	if (lurkmsg.toLowerCase() === 'none') {
	    q = 'delete from user_messages where id=?';
	}
	console.log(q);
	db.query(q, [tags['user-id'], lurkmsg]);
    } catch (err) {
	console.log(err);
    }
}


const twitch_params = {
    headers: {
        'Client-ID': process.env.CLIENT_ID,
        'Authorization': `Bearer ${process.env.TOKEN}`
    }
};

// TWITCH API GET REQUEST
async function twitch_http_get(resource, queries={}) {
    let data;
    let GET_URL;
    try {
	var qstr = Object.entries(queries).join('&').replaceAll(',','=');
	if (qstr.length) {
	    qstr = '?' + qstr;
	}
	GET_URL = `${BASE_URL}/${resource}${qstr}`;
	const GET_RES = await axios.get(GET_URL, twitch_params);
	data = GET_RES.data.data;
    } catch (err) {
	const errout = {
	    type    : 'GET',
	    status  : err.response.status,
	    error   : err.response.statusText,
	    url     : err.response.config.url,
	    message : err.response.data.message
	};
	throw util.TupleLogString(errout, util.loglevel.err, tag='http');
    }
    return data;
}

async function twitch_get_user(login) {
    const [user_info] = await twitch_http_get('users', {'login':login});
    if (!user_info) {
	throw `Could not retrieve user information (requested: ${login})`;
    }
    return user_info;
}

async function twitch_get_channel(id) {
    const [channel_info] = await twitch_http_get('channels', {'broadcaster_id':id});
    if (!channel_info) {
	throw `Could not retrieve channel information (requested: ${id})`;
    }
    return channel_info;
}

// Twitch Shoutout
async function shoutout(channel, so_user) {
    console.log(`chatthew.debug.shoutout: ${so_user}`);
    try {
	if (so_user[0] == '@') {
	    so_user = so_user.slice(1);
	}
	const [user_info] = await twitch_http_get('users', {'login' : so_user});
	const [channel_info] = await twitch_http_get('channels', {'broadcaster_id': user_info.id});
	const comp = [
	    'How grand!', 'Delightful! Just delightful.', 'Superb.',
	    "If you don't follow, I'll hunt you. It's free, you weirdo.", 'Wow!'
	];
	const last_streaming = `They were last streaming ${channel_info.game_name}. ${comp[util.getRandomInt(0,comp.length-1)]}`;
	if (!channel_info.game_name) {
	    last_streaming = '';
	}
	const follow = `FOLLOW ${user_info.display_name.toUpperCase()}! `.repeat(3);
	const threat = util.getRandomInt(0,1) ? '' : "Don't wanna get banned from this wonderful channel? ";
	chat_client.say(channel, `${threat}${follow} https://twitch.tv/${user_info.login} - ${last_streaming}`);
    } catch (err) {
	chat_client.say(channel, `Can't find any info on this so-called "${so_user}". Did you type something wrong? 👀`);
	console.log(`chatthew.error.shoutout shoutout:${so_user}`);
	console.log(err);
    }
}

// process commands
chat_client.on('message', (channel, tags, message, self) => {
    if (self || !message.startsWith('!')) return;
    
    const args = message.slice(1).split(/\s+/);
    const command = args.shift().toLowerCase(); 
    
    if (command === "vibe") {
	chat_client.say(channel, "wideVIBE wideVIBE wideVIBE wideVIBE");
    }

    if (command === "lurk"){
	lurk(channel, tags['user-id'], tags.username);
    }
    
    // SETLURK
    if (command === "setlurk"){
	setlurk(tags, args.join(' '));
    }

    if (command === "summon") {
	io.dispatch("mavis");
    }
        
    if (command === "so") {
	shoutout(channel, args.shift().toLowerCase());
    }

});

var first_recipient = null;

// simple text replies
chat_client.on('message', (channel, tags, message, self) => {
    if (self) return;

    if (message.startsWith('!')) {
	message = message.slice(1);
    }

    const args = message.split(' ');
    const command = args.shift().toLowerCase();
    const text_commands = {
	"mast" : `${tags.username} is at ${util.getRandomInt(0,100)}% goddamn mast dude`,
	"coom" : "oh god i'm cooming"
	//"bl4"  : "BL4 ('blood level 4') is the lowest level in bloodborne. No leveling allowed in this run"
    }

    if (Object.keys(text_commands).includes(command)) {
	chat_client.say(channel, text_commands[command]);
    }

    if (message == "first") {
	var firstmsg = null;
	if (first_recipient == null) {
	    first_recipient = tags.username;
	    firstmsg =  `Congratulations on being first, ${tags.username}`;
	} else if (tags.username != first_recipient) {
	    firstmsg = `Sorry, ${first_recipient} was faster than you`;
	}
	if (firstmsg) {
	    chat_client.say(channel, firstmsg);
	}
    }
});


async function addUser(info) {
    var msg = `chatthew.db_update user_add successful: ${info}`;
    try {
	await db.query("insert into users (id,loginName,displayName,role) values (?,?,?,?)", info);
    } catch (err) {
	msg = `chatthew_db_update user_add failed: ${info}\n${err}`;
    } finally {
	console.log(msg);
    }
}

const inChat = new Set();

chat_client.on('message', (channel, tags, message, self) => {
    if (self || tags.username == channel.slice(1)) return;

    // TODO: log chat message

    // check if first message today
    if (!inChat.has(tags['user-id'])) {
	chat_client.say(channel, `📢${tags.username.toUpperCase()}📢`);
	twitch_get_channel(tags['user-id']).then(info => {
	    if (info.game_name) {
		shoutout(channel, tags.username);
	    }
	}).catch(e => console.log(e));
	console.log(`adding ${tags['user-id']} to set and ${tags['username']} to bornWaiting`);
	inChat.add(tags['user-id']);
	//bornWaiting.push(tags['username']);
    }

    // add user to DB if doesn't already exist
    (async() => {
	try {
	    const rows = await db.query('select * from users where id=?',[tags['user-id']]);
	    if (!Object.keys(rows).length) {
    		const role = (tags['badges'] && Object.keys(tags['badges']).includes("broadcaster")) ? 'god' : ( tags['mod'] ? 'mod' : 'viewer');
		await addUser([tags['user-id'], tags['username'], tags['display-name'], role]);
	    }
	} catch (err) {
	    console.log(err);
	}
    })();

    // award points for message
    (async() => {
    	const on_msg_query = 'update users set messages=messages+1, points = points + ? where id=?';
	await db.query(on_msg_query, [util.getRandomInt(200,500), tags['user-id']]).catch( err => console.log(err) );
    })();
    
});

// TODO use promises instead of setInterval
// var bornWaiting = [];
// function UserIntro() {
//     if (bornWaiting.length > 0 && MainSocket) {
// 	user = bornWaiting.shift();
// 	console.log(`chatthew.user_intro ${user}`);
// 	io.emit("userIntro", user);
//     }
// }

// HOOKS
//update chat list every 15 seconds
//var hook_ChatList = setInterval(update_chat_list, 1000*15);
//var hook_borner = setInterval(borner, 6000);
// let hookid_UserIntro;
// (function hook_UserIntro(){
//     UserIntro();
//     hookid_UserIntro = setTimeout(hook_UserIntro, 6000);
// })();

(function hook_WIDEVIBE(){
    chat_client.say("#jaahska", "wideVIBE wideVIBE wideVIBE wideVIBE").catch(err => console.log(err));
    setTimeout(hook_WIDEVIBE, 60000*3);
})();


// Random Hooks  (TODO: Cleanup)
(function hook_ABUSEPSA(){
    chat_client.say("#jaahska", "jaahskSiren remember: it's okay to abuse this streamer! ").catch(err => console.log(err));
    setTimeout(hook_ABUSEPSA, 60000*5);
})();

(function hook_7TVPSA(){
    chat_client.say("#jaahska", "Set up 7TV to see all the emotes. It's free, quick, and easy (just like Jaska), no login necessary: https://7tv.app/").catch(err => console.log(err));
    setTimeout(hook_7TVPSA, 60000*5.45);
})();

// (function hook_7TVPSA(){
//     chat_client.say("#jaahska", "").catch(err => console.log(err));
//     setTimeout(hook_7TVPSA, 60000*5.45);
// })();

