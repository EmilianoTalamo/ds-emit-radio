import 'dotenv/config'
import {
	handleCommands,
	loadCommands,
	registerCommands,
} from './utils/commands.js'
import { ColorResolvable, REST } from 'discord.js'

import { Client, Collection, Events, GatewayIntentBits } from 'discord.js'
import Queue from './services/queue.js'
import { Player } from './services/player.js'
import { idlePresence } from './handlers/activity.js'
import { Connection } from './handlers/channel.js'

interface DsClient extends Client<true> {
	commands?: Collection<any, any>
}

// Env loading
const token = process.env.DS_BOT_TOKEN
const clientId = process.env.DS_CLIENT_ID
const guildId = process.env.DS_GUILD_ID

// Create a new client instance
const client: DsClient = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
})

// Initiate classes
export const queue = new Queue()
export const player = new Player()
export const connection = new Connection()

player.color = process.env.BOT_COLOR as ColorResolvable || 'Default'

// Initiate client commands
client.commands = new Collection()

const main = async () => {

	console.info('Loading command files...')
	const loadCommandsResult = await loadCommands(client)
	if(loadCommandsResult)
		console.info('Successfully loaded commands.')
	else
		console.error('Error loading commands.')
	
	console.info('Registering commands to Discord...')
	const rest = new REST().setToken(token || '')
	await registerCommands(rest, clientId, guildId, client.commands)
	console.info('Done Registering commands to Discord...')

	client.once(Events.ClientReady, (readyClient) => {
		console.info(`Ready! Logged in as ${readyClient.user.tag}`)
		idlePresence()
	})
	
	handleCommands(client)
	
	// Log in to Discord with your client's token
	client.login(token)
}

try {
	main()
}
catch(err) {
	console.error('FATAL ERROR')
	console.error(err)
}

export default client
