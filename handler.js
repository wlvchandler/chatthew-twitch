require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const db = require('./sql');

const app = express();
const port = process.env.ESUBPORT;

// Notification request headers
const TWITCH_MESSAGE_ID = 'Twitch-Eventsub-Message-Id'.toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP = 'Twitch-Eventsub-Message-Timestamp'.toLowerCase();
const TWITCH_MESSAGE_SIGNATURE = 'Twitch-Eventsub-Message-Signature'.toLowerCase();
const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type'.toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';
const HMAC_PREFIX = 'sha256=';

// Need raw message body for signature verification
app.use(express.raw({
    type: 'application/json'
}));

// Primary Endpoint for eventsub
app.post('/', (req, res) => {
    let secret = getSecret();
    let message = getHmacMessage(req);
    let hmac = HMAC_PREFIX + getHmac(secret, message);

    if (true === verifyMessage(hmac, req.headers[TWITCH_MESSAGE_SIGNATURE])) {
        let notification = JSON.parse(req.body);

        if  (MESSAGE_TYPE_NOTIFICATION === req.headers[MESSAGE_TYPE]) {
	    const event_info = notification.event;
            const ts = new Date().toISOString();

            const broadcaster_keys = ['broadcaster_user_id', 'broadcaster_user_login', 'broadcaster_user_name'];
            const user_keys = ['user_id', 'user_login', 'user_name'];

            let broadcaster_s = null;
            let user_s = null;

            if (broadcaster_keys.every(key => Object.keys(event_info).includes(key))) {
                broadcaster_s = `${event_info.broadcaster_user_name}.${event_info.broadcaster_user_login}.${event_info.broadcaster_user_id}`;
            }

            if (user_keys.every(key => Object.keys(event_info).includes(key))) {
                if (!event_info.is_anonymous) {
                    user_s = `${event_info.user_name}.${event_info.user_login}.${event_info.user_id}`;
                }
            }

            //// EVENT HANDLERS : TODO: clean up into functions w/ map
            // STREAM ONLINE
            if (notification.subscription.type == "stream.online") {
                const t = new Date(event_info.started_at).toJSON().slice(0,19).replace('T',' ');
                console.log(`event:stream.online  at:${event_info.started_at}  channel:${broadcaster_s}  user:${user_s}`);

                (async() => {
                    var msg = 'chatthew.db_update stream_online successful';
                    try {
                        await db.query("insert into stream (start_time) values (?)", [t]);
                    } catch (err) {
                        msg = `chatthew.db_update stream online failed: ${err}`
                    } finally {
                        console.log(msg);
                    }
                })();
            }

	                // STREAM OFFLINE
            if (notification.subscription.type == "stream.offline") {
                console.log(`event:stream.offline at:${ts} channel:${broadcaster_s}`);
                (async() => {
                    var msg = 'chatthew.db_update offline cleanup successful';
                    try {
                        await db.query("update users set msg_today=0",[]);
			await db.query("update stream set end_time='?' where id=(select id from stream order by id desc limit 1)",[ts]);
                    } catch (err) {
                        msg = `chatthew.db_update offline cleanup failed: ${err}`
                    } finally {
                        console.log(msg);
                    }
                })();		
            }

            // FOLLOW
            if (notification.subscription.type == "channel.follow") {
                console.log(`event:channel.follow at:${event_info.followed_at} channel:${broadcaster_s} user:${user_s}`);
            }

            // SUBSCRIPTION
            if (notification.subscription.type == "channel.subscribe") {
                console.log(`event:channel.subscribe  at:${ts}  channel:${broadcaster_s}  user:${user_s}  tier:${event_info.tier}  gift:${event_info.is_gift}`);
            }

            // CHEER
            if (notification.subscription.type == "channel.cheer") {
                console.log(`event:channel.cheer at:${ts}  channel:${broadcaster_s}  user:${user_s}  bits:${event_info.bits}  message:"${event_info.message}"`);
            }

            // RAID
            if (notification.subscription.type == "channel.raid") {
                const raid_to = `${event_info.to_broadcaster_user_name}.${event_info.to_broadcaster_user_login}.${event_info.to_broadcaster_user_id}`;
                const raid_from = `${event_info.from_broadcaster_user_name}.${event_info.from_broadcaster_user_login}.${event_info.from_broadcaster_user_id}`;
                console.log(`event:channel.raid  channel:${raid_to}  user:${raid_from}  viewers:${event_info.viewers}`);
            }

            // BAN
            if (notification.subscription.type == "channel.ban") {
                const mod = `${event_info.moderator_user_name}.${event_info.moderator_user_login}.${event_info.moderator_user_id}`;
                const ban = event_info.is_permanent ? 'ban' : 'timeout';
                console.log(`event:channel.${ban}  at:${event_info.banned_at}  channel:${broadcaster_s}  user:${user_s}  by:${mod}  reason:"${event_info.reason}"  ends:${ban ? '' : event_info.ends_at}`);
            }

            // HYPE TRAIN START
            if (notification.subscription.type == "channel.hype_train.begin") {
                console.log(`event:channel.hype_train.begin  at:${event_info.started_at}  channel:${broadcaster_s}  level:${event_info.level}  total:${event_info.total}`);
            }

            // HYPE TRAIN LEVEL UP
            if (notification.subscription.type == "channel.hype_train.progress") {
                console.log(`event:channel.hype_train.progress  at:${event_info.started_at}  channel:${broadcaster_s}  level:${event_info.level}  total:${event_info.total}`);
            }

            // HYPE TRAIN END
            if (notification.subscription.type == "channel.hype_train.end") { }

            // POINT REDEMPTION
            if (notification.subscription.type == "channel.channel_points_custom_reward_redemption.add") {
                const reward = event_info.reward;
                console.log(`event:channel.redemption at:${ts} channel:${broadcaster_s} user:${user_s} reward:${reward.id}."${reward.title}" message:"${event_info.user_input}"`);
            }


            //console.log(JSON.stringify(notification.event, null, 4));
            res.sendStatus(204);
	    
        }
        else if (MESSAGE_TYPE_VERIFICATION === req.headers[MESSAGE_TYPE]) {
            res.status(200).send(notification.challenge);
        }
        else if (MESSAGE_TYPE_REVOCATION === req.headers[MESSAGE_TYPE]) {
            res.sendStatus(204);
            console.log(`${notification.subscription.type} notifications revoked!`);
            console.log(`reason: ${notification.subscription.status}`);
            console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
        } else {
            res.sendStatus(204);
            console.log(`Unknown message type: ${req.headers[MESSAGE_TYPE]}`);
        }
    } else {
        console.log('[403] mismatched signature');    // Signatures didn't match.
        res.sendStatus(403);
    }
});

app.listen(port, () => {
    console.log(`Handler listening at http://localhost:${port}`);
})

function getSecret() {
    return process.env.ESUBSECRET;
}

// Build the message used to get the HMAC.
function getHmacMessage(request) {
    return (request.headers[TWITCH_MESSAGE_ID] +
        request.headers[TWITCH_MESSAGE_TIMESTAMP] +
        request.body);
}

// Get the HMAC.
function getHmac(secret, message) {
    return crypto.createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

// Verify whether our hash matches the hash that Twitch passed in the header.
function verifyMessage(hmac, verifySignature) {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
}


module.exports = { app };
