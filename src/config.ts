import {
	Client,
	Collection,
	ColorResolvable,
	GatewayIntentBits,
} from 'discord.js'
import { player } from './main.js'
import { getCookies, getLastVerion, getVersion } from './utils/services.js'
import Queue from './services/queue.js'
import { Player } from './services/player.js'
import { Connection } from './handlers/channel.js'
import { SpotifyWebApi } from './utils/spotify.js'

interface DsClient extends Client<true> {
	commands?: Collection<any, any>
}

export const instances = () => {
	const queue = new Queue()
	const player = new Player()
	const connection = new Connection()
	const spotify = new SpotifyWebApi()

	return { queue, player, connection, spotify }
}

export const config = async () => {
	const client = initiateClient()
	client.commands = new Collection()

	setColor()

	const lastversion = await getLastVerion()

	const currentVersion = await getVersion()

	return {
		client,
		lastversion,
		currentVersion,
	}
}

const initiateClient = (): DsClient => {
	return new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildVoiceStates,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	})
}

const setColor = () => {
	player.color = (process.env.BOT_COLOR as ColorResolvable) || 'Default'
}

// Removed ytdl agent configuration; now using yt-dlp command line tool.
