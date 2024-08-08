import { isBotAlone, isUserWithBot } from '@/handlers/channel.js'
import { connection, player, queue } from '@/main.js'
import { joinArtists } from '@/utils/format.js'
import { identifyService } from '@/utils/services.js'
import { getSongInfo } from '@/utils/spotify.js'
import { getUrlInfo, getYtInfo, search } from '@/utils/youtube.js'
import {
	bold,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Plays a YouTube video/Spotify song, or adds it to the queue')
		.addStringOption((option) =>
			option
				.setName('url')
				.setDescription('Youtube or Spotify link of the song')
				.setRequired(true),
		),
	async execute(interaction: ChatInputCommandInteraction) {
		await handle(interaction)
	},
}

export const handle = async (
	interaction: ChatInputCommandInteraction,
	next: boolean = false,
) => {
	// This command shouldn't be triggered if the bot is playing music
	// and the user is in a different voice channel.
	if (
		player.status === 'playing' &&
		!isUserWithBot(interaction) &&
		!isBotAlone()
	) {
		return await interaction.reply(
			`I'm currently playing music in a different voice channel than yours. Join us!`,
		)
	}

	// Join user voice channel
	const joined = await connection.joinVoiceByUserWhoInteracted(interaction)
	if (!joined)
		return await interaction.reply('You must be in a voice channel to play.')

	await interaction.deferReply()

	// Read URL sent by the user
	const url = interaction.options.data[0].value as string

	const service = identifyService(url)

	let songName = ''

	if (service === 'spotify')
		songName = await handleSpotify(interaction, url, next)
	else songName = await handleYoutube(interaction, url, next)

	if (!songName) return

	// Start reproduction if the bot is idle
	if (player.status === 'idle') player.play(interaction.channelId)

	// Reply to the user if everything went ok
	return interaction.editReply(`🥝 "${bold(songName)}" added to the queue.`)
}

const handleYoutube = async (
	interaction: ChatInputCommandInteraction,
	url: string,
	next: boolean = false,
) => {
	const urlInfo = getUrlInfo(url)
	if (!url || !urlInfo.videoId) {
		await interaction.editReply('Invalid URL')
		return ''
	}

	// Get youtube video information
	const ytinfo = await getYtInfo(urlInfo.videoId)
	if (!ytinfo) {
		await interaction.editReply(`Invalid ID: ${urlInfo.videoId}`)
		return ''
	}

	// Add to the queue
	const queueItem = {
		id: urlInfo.videoId,
		title: ytinfo.videoDetails.title,
		ytdetails: ytinfo.videoDetails,
	}
	next ? queue.addNext(queueItem) : queue.add(queueItem)

	return ytinfo.videoDetails.title
}

const handleSpotify = async (
	interaction: ChatInputCommandInteraction,
	url: string,
	next: boolean = false,
) => {
	const info = await getSongInfo(url)

	if (!url || !info || !info.name) {
		await interaction.editReply('Invalid Spotify URL')
		return ''
	}

	const ytEquivalent = await search(`${joinArtists(info.artists)} ${info.name}`)

	if (!ytEquivalent) {
		await interaction.editReply(
			`Couldn't find a matching song on YouTube Music.`,
		)
		return ''
	}

	return await handleYoutube(
		interaction,
		`https://youtube.com/watch?v=${ytEquivalent.videoId}`,
		next,
	)
}
