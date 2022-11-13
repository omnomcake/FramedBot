require('dotenv').config();

const { Client, GatewayIntentBits, ConnectionService } = require('discord.js');
const mySql = require('mysql');
const cron = require('node-cron');

var dbConnection;

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, 
    GatewayIntentBits.MessageContent] });
var lastMessageId;
var channel;
var waitForDb;
var userId;


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

    // var task = cron.schedule('0 * * * *', () =>{
    //     console.log('Checking for completed games at midnight eastern');
    // }, {
    //     scheduled: true,
    //     timezone: "America/New_York"
    // });         

    // task.start();
});

client.on('messageCreate', msg => {
    // You can view the msg object here with console.log(msg)
    // console.log(msg)
        checkMessage(msg)
    });

client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;

	    const { commandName } = interaction;

        if(commandName === 'gamestart'){            
            saveSettings(interaction); 
            await interaction.reply({ content: 'Settings saved successfully.', ephemeral: true });
        }
        else if(commandName === 'gameend'){
            // using Dial Up hard coded for testing for now. 
            var server = interaction.guildId;
            channel = interaction.channelId;
            userId = interaction.user.id;
            var query = 'call sp_endGame(\'' + server + '\')';
            var dbConn = connectDb();

            dbConn.connect(function(err){
                if(err){
                    console.log("[" + new Date().toISOString() + "] Unable to connect to DB");
                    return
                }

                console.log("[" + Date.now() + "] Connected to Database");
                dbConn.query(query, (err, results) => {
                    if(err){
                        console.log("[" + new Date().toISOString() + "] Data Failed To Retrieve - " + query);
                        return;
                    }
                    if(results[0][0]['NO SETTINGS'] === undefined){
                        
                    }
                    else{
                        client.channels.cache.get(channel).send('<@' + userId + '> No Scores Channel Found - Use /setscore function in the channel you want to report scores to.');
                        return;
                    }

                    var resultTable = results[1];                    

                    dbConn.end();
                    
                    var place = 1;
                    var placeCount = 1;
                    var string = 'Framed Scores for This Week:\n1. ';
                    for (let i = 0; i < resultTable.length; i++){
                        if(placeCount > 1){
                            string += ", "
                        }                 
                        string += '<@' + resultTable[i]['framed_users_discord_id'] + '>';

                        if(i < resultTable.length - 1 && resultTable[i]['total'] === resultTable[i + 1]['total']){
                            placeCount++;
                            continue;
                        }
                        else{
                            string += ": " + resultTable[i]['total'] + '\n';
                            placeCount = 1;
                           
                            if(i < resultTable.length - 1){
                                place++;
                                string += place + ". ";
                            }                            
                        }
                    }
                    var channelId = results[2][0]['framed_server_settings_scores_channel'];
                    client.channels.cache.get(channelId).send(string);
                });
            }) 
            await interaction.reply({ content: 'Game Ended, results processing.', ephemeral: true });
        }
        else if(commandName === 'catchup'){
            var guildId = interaction.guildId;
            channel = interaction.channel;
            lastMessageId = channel.lastMessageId;
            var query = 'select framed_server_settings_last_message_id from framed_server_settings where framed_server_settings_server_id in (select framed_servers_id from framed_servers where framed_servers_discord_id = ' + guildId + ') '

            var dbConn = connectDb();
            dbConn.connect(function(err){
                if(err){
                    console.log("[" + new Date().toISOString() + "] Unable to connect to DB");
                    return
                }

                console.log("[" + Date.now() + "] Connected to Database");
                dbConn.query(query, async (err, results) => {
                    if(err){
                        console.log("[" + new Date().toISOString() + "] Data Failed To Retrieve - " + query);
                        return;
                    }
                    
                    lastMessageId = results[0]['framed_server_settings_last_message_id'];
                    let messages = [];

                    let message = await channel.messages
                        .fetch({ limit: 1 })
                        .then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

                    while (message) {
                        await channel.messages
                        .fetch({ limit: 100, before: message.id })
                        .then(messagePage => {
                            messagePage.forEach(msg => {
                                if(msg.id > lastMessageId){
                                    checkMessage(msg);
                                }
                            });

                            // Update our message pointer to be last message in page of messages
                            message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
                        })
                    }

                    dbConn.end();
                });
            })
            await interaction.reply({ content: 'Catchup Processing.', ephemeral: true });
        }
        else if(commandName === 'setscore'){
            var guildId = interaction.guildId;
            channel = interaction.channel;
            
            waitForDb = true;
            var duration = interaction.options.getInteger('length') || 7;
            var start = interaction.options.getString('date') || new Date().toISOString().split('T')[0];
            var repeat = interaction.options.getBoolean('repeating') || true;
            var server = interaction.guildId;
            var serverName = interaction.guild.name;
            channel = interaction.channelId;
            
            var query = 'call sp_saveSettings(\'' + server + '\', \'' + serverName + '\', \'' + channel + '\', ' + duration + ', \'' + start + '\', ' + repeat + ')';
            var dbConn = connectDb();
            dbConn.connect(function(err){
                if(err){
                    console.log("[" + new Date().toISOString() + "] Unable to connect to DB");
                    waitForDb = false;
                    return;
                }

                console.log("[" + Date.now() + "] Connected to Database");
                dbConn.query(query, (err) => {
                    if(err){
                        console.log("[" + new Date().toISOString() + "] Data Failed To Store - " + query)
                    }
                    else{
                        console.log("[" + new Date().toISOString() + "] Settings Data Stored Successfully");
                    }

                    var query = 'call sp_saveScoreChannel(\'' + guildId + '\', \'' + channel + '\')'; 
                    dbConn.query(query, (err) => {
                        if(err){
                            console.log("[" + new Date().toISOString() + "] Data Failed To Store - " + query)
                        }
                        else{
                            console.log("[" + new Date().toISOString() + "] Settings Data Stored Successfully");
                        }
    
                        dbConn.end();
                    });
                });
            });
            
            await interaction.reply({ content: 'Score Channel Set Successfully', ephemeral: true });
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

// function to process a message and submit it to DB if it's a result. 
function checkMessage(msg){
    if (msg.content.includes('Framed #') && (msg.content.includes('🟥') || msg.content.includes('🟩'))) {
        userId = msg.author.id;
        var userName = msg.author.username;
        var score = (msg.content.match(/🟥/g) || []).length;
        var index = msg.content.indexOf('#');
        var gameNum = msg.content.substring(index+1, index+4);
        var guildId = msg.guildId;
        var guildName = msg.guild.name;
        messageId = msg.id;
        if(score > 6){
            score = 6;
        }
        // msg.reply(`Hello ${msg.author.username}`);
        // msg.reply('Miss Count: ' + (msg.content.match(/🟥/g) || []).length);
        
        var query = 'call sp_addScore(\'' + userId + '\', \'' + userName + '\', ' + '\'' + guildId + '\', \'' + guildName + '\', ' + gameNum + ', ' + score + ', \'' + messageId + '\', @result);'

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
}

function saveSettings(interaction){
    var duration = interaction.options.getInteger('length') || 7;
    var start = interaction.options.getString('date') || new Date().toISOString().split('T')[0];
    var repeat = interaction.options.getBoolean('repeating') || true;
    var server = interaction.guildId;
    var serverName = interaction.guild.name;
    channel = interaction.channelId;
    
    var query = 'call sp_saveSettings(\'' + server + '\', \'' + serverName + '\', \'' + channel + '\', ' + duration + ', \'' + start + '\', ' + repeat + ')';
    var dbConn = connectDb();
    dbConn.connect(function(err){
        if(err){
            console.log("[" + new Date().toISOString() + "] Unable to connect to DB");
            return;
        }

        console.log("[" + Date.now() + "] Connected to Database");
        dbConn.query(query, (err) => {
            if(err){
                console.log("[" + new Date().toISOString() + "] Data Failed To Store - " + query)
            }
            else{
                console.log("[" + new Date().toISOString() + "] Settings Data Stored Successfully");
            }

            dbConn.end();
        });
    })  
}

function checkDbBlock(){
    if(waitForDb){
        checkDbBlock();        
    }
    else{
        return;
    }
}
