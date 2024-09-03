import {
	Client,
	Collection,
	ColorResolvable,
	GatewayIntentBits,
} from 'discord.js'
import { player } from './main.js'
import { getCookies, getLastVerion, getVersion } from './utils/services.js'
import ytdl from '@distube/ytdl-core'
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

	player.getTrustedToken()

	return { queue, player, connection, spotify }
}

export const config = async () => {
	const client = initiateClient()
	client.commands = new Collection()

	setColor()

	const agent = await setAgent()

	const lastversion = await getLastVerion()

	const currentVersion = getVersion()

	return {
		client,
		agent,
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

const setAgent = async () => {
	const host = process.env.HOST
	// Set yt cookies
	const cookies = await getCookies()
	console.info(`🍪 ${cookies.length} cookies loaded.`)
	const agentOptions = {
		localAddress: host || '0.0.0.0',

		pipelining: 5,
		headers: {
			referer: 'https://www.youtube.com/',
			'User-Agent':
				'com.google.android.youtube/19.29.37 (Linux; U; Android 11) gzip',
			'Accept-Language': 'en-US,en;q=0.9',
		},
	}

	let agent: ytdl.Agent | undefined = undefined

	if (process.env.PROXY_URL) {
		console.info('🌎 Using proxy')
		agent = ytdl.createProxyAgent({
			uri: process.env.PROXY_URL,
		}, cookies)
	} else {
		agent = ytdl.createAgent(
			cookies.length ? cookies : undefined,
			cookies.length ? agentOptions : undefined,
		)
	}

	return agent
}
