require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent] });

client.on('ready', () => {
    console.log('Logged in as ' + client.user.tag + '!');
});

client.on('messageCreate', msg => {
    // You can view the msg object here with console.log(msg)
    console.log(msg)
     if (msg.content.includes('Framed #') && (msg.content.includes('🟥') || msg.content.includes('🟩'))) {
       msg.reply(`Hello ${msg.author.username}`);
       msg.reply('Miss Count: ' + (msg.content.match(/🟥/g) || []).length);
     }
    });

// Authenticate
client.login(process.env.DISCORD_TOKEN)
