import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import botkit from 'botkit';
import dotenv from 'dotenv';
import yelp from 'yelp-fusion';

dotenv.config({ silent: true });


// initialize
const app = express();
// botkit controller
const controller = botkit.slackbot({
  debug: false,
});
// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM((err) => {
  // start the real time message client
  if (err) { throw new Error(err); }
});

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  // bot.reply(message, 'Hello there!');
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});
// controller.on('user_typing', (bot, message) => {
//   bot.reply(message, 'stop typing!');
// });
controller.hears(['help'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Hello! I can query restaurants in Hanover, NH if you let me know you\'re hungry and reply to my questions! If you want a gif, let me know and I\'ll send you one');
});

controller.hears(['I am hungry'], ['direct_message'], (bot, message) => {
  bot.startConversation(message, (err, convo) => {
    convo.say('Let\'s find you some food');
    convo.ask('What are you hungry for?', (res1, convo) => {
      convo.next();
      const cuisine = res1.text;
      convo.ask('Where are you located?', (res2, convo) => {
        convo.next();
        const loc = res2.text;
        let reply = 'Here are some places you can get that nearby!';
        const yelpClient = yelp.client(process.env.YELP_API_KEY);
        yelpClient.search({
          term: cuisine,
          location: loc,
        }).then((response) => {
          response.jsonBody.businesses.forEach((business) => {
            console.log(business.name);
            reply += `\n${business.name}`;
            console.log(reply);
            // do something with business
          });
          bot.reply(message, reply);
          // console.log(response.jsonBody.businesses[0].name);
        }).catch((e) => {
          console.log(e);
        });
      });
    });
  });
});
controller.hears('send me a gif', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  const replyWithAttachment = {
    text: 'ok!',
    attachments: [
      {
        title: 'here is a GIF ! ',
        title_link: 'https://media.giphy.com/media/fIXtW1VlTyPba/giphy.gif',
        text: 'click me ^^',
        color: '#084887',
      },
    ],
  };
  bot.reply(message, replyWithAttachment);
});
controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'Hi!!! How can I help you?');
});

controller.hears('.*', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'What are you talking about?');
});


// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable only if you want templating
app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
app.set('views', path.join(__dirname, '../src/views'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
app.listen(port);

console.log(`listening on: ${port}`);
