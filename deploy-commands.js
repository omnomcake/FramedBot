const { REST, SlashCommandBuilder, Routes } = require('discord.js');
require('dotenv').config();

var params = new SlashCommandBuilder().setName('card').setDescription('Replies with generated card!')
    .addStringOption(option => option.setName('name').setDescription('Card Name').setRequired(true))
    .addStringOption(option => option.setName('set').setDescription('Card Set Code - 3 Character Format').setRequired(true));

var optionCommand = new SlashCommandBuilder().setName('gamestart').setDescription('Configures and starts a game for the server.')
    .addIntegerOption(option => option.setName('length').setDescription('Duration of the game to start for this server in days. 7 if not set. 7 Minimum.'))
    .addStringOption(option => option.setName('date').setDescription('Date to start the game - MM/DD format. Today if not set.'))
    .addBooleanOption(option => option.setName('repeating').setDescription('Do you want the game to Repeat? Yes if not set.'));
    
const commands = [
	optionCommand
]
	.map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

rest.put(Routes.applicationCommands(process.env.APP_ID), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);