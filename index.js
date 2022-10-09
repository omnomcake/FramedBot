require('dotenv').config();

const { Client, GatewayIntentBits, ConnectionService } = require('discord.js');
const mySql = require('mysql');
const cron = require('node-cron');

var dbConnection;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent] });

client.on('ready', () => {
    console.log('Logged in as ' + client.user.tag + '!');

    dbConnection = connectDb();

    dbConnection.connect((err) => {
        if(err){
          console.log('Error connecting to Db');
          return;
        }
        console.log('Connection established');
        dbConnection.end();
      });

    var task = cron.schedule('30 12 * * *', () =>{
        console.log('Checking for completed games at midnight eastern');
    }, {
        scheduled: true,
        timezone: "America/New_York"
    });         

    task.start();
});

client.on('messageCreate', msg => {
    // You can view the msg object here with console.log(msg)
    // console.log(msg)
     if (msg.content.includes('Framed #') && (msg.content.includes('🟥') || msg.content.includes('🟩'))) {
        var userId = msg.author.id;
        var userName = msg.author.username;
        var score = (msg.content.match(/🟥/g) || []).length;
        var index = msg.content.indexOf('#');
        var gameNum = msg.content.substring(index+1, index+4);
        var guildId = msg.guildId;
        var guildName = msg.guild.name;

        if(score > 6){
            score = 6;
        }
        // msg.reply(`Hello ${msg.author.username}`);
        // msg.reply('Miss Count: ' + (msg.content.match(/🟥/g) || []).length);
        
        var query = 'call sp_addScore(\'' + userId + '\', \'' + userName + '\', ' + '\'' + guildId + '\', \'' + guildName + '\', ' + gameNum + ', ' + score + ', @result);'

        var dbConn = connectDb();
        dbConn.connect(function(err){
            if(err){
                console.log("[" + new Date().toISOString() + "] Unable to connect to DB");
                return
            }

            console.log("[" + Date.now() + "] Connected to Database");
            dbConn.query(query, (err) => {
                if(err){
                    console.log("[" + new Date().toISOString() + "] Data Failed To Store - " + query)
                }
                else{
                    console.log("[" + new Date().toISOString() + "] Data Stored Successfully");
                }

                dbConn.end();
              });
        })
        
        
     }
    });

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

	    const { commandName } = interaction;

        if(commandName === 'gamestart'){
            
            var duration = interaction.options.getInteger('length') || 7;
            var start = interaction.options.getString('date') || new Date().toISOString().split('T')[0];
            var repeat = interaction.options.getBoolean('repeating') || true;
            var server = interaction.guildId;
            var serverName = interaction.guild.name;
            var channel = interaction.channelId;
            
            var query = 'call sp_saveSettings(\'' + server + '\', \'' + serverName + '\', \'' + channel + '\', ' + duration + ', \'' + start + '\', ' + repeat + ')';
            dbConnection.query(query, (err) => {
                if(err){
                    console.log("[" + new Date().toISOString() + "]Data Failed To Store - " + query)
                    // msg.react('🚫');
                }
                else{
                    console.log("[" + new Date().toISOString() + "]Save Settings - Data Stored Successfully");
                }
                
                // msg.react('✅');
              });
        }
    })

// Authenticate
client.login(process.env.DISCORD_TOKEN)

function connectDb(){
    return mySql.createConnection({
        host:process.env.DB_HOST,
        port:process.env.DB_PORT,
        user:process.env.DB_USER,
        password:process.env.DB_PASSWORD,
        database:process.env.DB_NAME
    });
}
