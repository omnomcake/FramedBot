require('dotenv').config();

const { Client, GatewayIntentBits, ConnectionService } = require('discord.js');
const mySql = require('mysql');
var dbConnection;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent] });

client.on('ready', () => {
    console.log('Logged in as ' + client.user.tag + '!');

    dbConnection = mySql.createConnection({
        host:process.env.DB_HOST,
        port:process.env.DB_PORT,
        user:process.env.DB_USER,
        password:process.env.DB_PASSWORD,
        database:process.env.DB_NAME
    });

    dbConnection.connect();
});

client.on('messageCreate', msg => {
    // You can view the msg object here with console.log(msg)
    console.log(msg)
     if (msg.content.includes('Framed #') && (msg.content.includes('🟥') || msg.content.includes('🟩'))) {
        var userId = msg.author.id;
        var userName = msg.author.username;
        var score = (msg.content.match(/🟥/g) || []).length;
        var index = msg.content.indexOf('#');
        var gameNum = msg.content.substring(index+1, index+4);

        // msg.reply(`Hello ${msg.author.username}`);
        // msg.reply('Miss Count: ' + (msg.content.match(/🟥/g) || []).length);
        
        var query = 'call sp_addScore(\'' + userId + '\', \'' + userName + '\', ' + gameNum + ', ' + score + ', @result);'
        dbConnection.query(query);
     }
    });

// Authenticate
client.login(process.env.DISCORD_TOKEN)
