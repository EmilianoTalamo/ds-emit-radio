import 'dotenv/config'
import {
	handleCommands,
	loadCommands,
	registerCommands,
} from './utils/commands.js'
import { REST } from 'discord.js'

// Removed youtubei.js import - now using yt-dlp
import { Events } from 'discord.js'
import { idlePresence } from './handlers/activity.js'
import { config, instances } from './config.js'
import { checkYtDlpInstalled } from './utils/ytdlp.js'

// Env loading
const token = process.env.DS_BOT_TOKEN
const clientId = process.env.DS_CLIENT_ID
const guildId = process.env.DS_GUILD_ID

// Initiate classes
export const { queue, player, connection, spotify } = instances()

// Config
export const { client, lastversion, currentVersion } = await config()

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
	console.error('🚨 Unhandled Promise Rejection:', reason)
	// Don't crash the bot for network timeouts and other recoverable errors
	if (reason && typeof reason === 'object' && 'code' in reason) {
		const errorCode = (reason as any).code
		if (errorCode === 'UND_ERR_CONNECT_TIMEOUT' || 
			errorCode === 'ECONNRESET' || 
			errorCode === 'ENOTFOUND' || 
			errorCode === 'ETIMEDOUT') {
			console.log('⚠️  Network error occurred, but bot will continue running')
			return
		}
	}
	console.error('Promise:', promise)
})

process.on('uncaughtException', (error) => {
	console.error('🚨 Uncaught Exception:', error)
	// Don't crash for network-related errors
	if (error.message?.includes('Connect Timeout Error') || 
		error.message?.includes('UND_ERR_CONNECT_TIMEOUT') ||
		error.message?.includes('ECONNRESET') ||
		error.message?.includes('ETIMEDOUT')) {
		console.log('⚠️  Network timeout occurred, but bot will continue running')
		return
	}
	// For other critical errors, still exit
	console.error('💀 Critical error - bot will restart')
	process.exit(1)
})

const main = async () => {
	// Check if yt-dlp is installed
	const ytDlpInstalled = await checkYtDlpInstalled()
	if (!ytDlpInstalled) {
		console.error('❌ yt-dlp is not installed. Please install it with: pip3 install yt-dlp')
		process.exit(1)
	}
	console.info('✅ yt-dlp is installed and ready')

	const loadCommandsResult = await loadCommands(client)
	if (loadCommandsResult) console.info('✅ Successfully loaded commands.')
	else console.error('❌ Error loading commands.')

	console.info('\n🧠 Registering commands to Discord...')
	const rest = new REST().setToken(token || '')
	await registerCommands(rest, clientId, guildId, client.commands)
	console.info('✅ Done Registering commands to Discord...')

	client.once(Events.ClientReady, (readyClient) => {
        console.info(`\nℹ️ Current yt-dlp version: ${currentVersion}`)
        console.info(`🆕 Latest yt-dlp version: ${lastversion}`)
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
