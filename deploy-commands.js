const { REST, SlashCommandBuilder, Routes } = require('discord.js');
require('dotenv').config();


var optionCommand = new SlashCommandBuilder().setName('gamestart').setDescription('Configures and starts a game for the server.')
    .addIntegerOption(option => option.setName('gamenumber').setDescription('Framed game Number to start tracking from.').setRequired(true))
    .addIntegerOption(option => option.setName('length').setDescription('Duration of the game to start for this server in days. 7 if not set. 7 Minimum.'));
    
var gameEndCommand = new SlashCommandBuilder().setName('gameend').setDescription('Ends the current game, posts scores, and starts a new game for the server with configured length.');

var catchUpCommand = new SlashCommandBuilder().setName('catchup').setDescription('Catches up the discord bot on any results it may have missed')

var setScoreChannel = new SlashCommandBuilder().setName('setscore').setDescription('Sets the current Channel as the Channel to report scores in when you end a game.')

const commands = [
	optionCommand,
    gameEndCommand,
    catchUpCommand,
    setScoreChannel
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);