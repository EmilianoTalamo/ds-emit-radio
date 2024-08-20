import 'dotenv/config'
import {
	handleCommands,
	loadCommands,
	registerCommands,
} from './utils/commands.js'
import { REST } from 'discord.js'

import { Events } from 'discord.js'
import { idlePresence } from './handlers/activity.js'
import { config, instances } from './config.js'

// Env loading
const token = process.env.DS_BOT_TOKEN
const clientId = process.env.DS_CLIENT_ID
const guildId = process.env.DS_GUILD_ID

// Initiate classes
export const { queue, player, connection, spotify } = instances()

// Config
export const { client, agent, lastversion, currentVersion } = await config()

const main = async () => {
	const loadCommandsResult = await loadCommands(client)
	if (loadCommandsResult) console.info('✅ Successfully loaded commands.')
	else console.error('❌ Error loading commands.')

	console.info('\n🧠 Registering commands to Discord...')
	const rest = new REST().setToken(token || '')
	await registerCommands(rest, clientId, guildId, client.commands)
	console.info('✅ Done Registering commands to Discord...')

	client.once(Events.ClientReady, (readyClient) => {
		console.info(`\nℹ️ Current ytdl version: ${currentVersion}`)
		console.info(`🆕 Lastest ytdl version: ${lastversion}`)
		console.info(`\n🏃 Ready! Logged in as ${readyClient.user.tag}`)
		idlePresence()
	})

	handleCommands(client)

	// Log in to Discord with your client's token
	client.login(token)
}

try {
	main()
} catch (err) {
	console.error('FATAL ERROR')
	console.error(err)
}

export default client
