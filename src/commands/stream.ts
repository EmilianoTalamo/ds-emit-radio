import { isBotAlone, isUserWithBot } from '@/handlers/channel.js'
import { connection, player, queue } from '@/main.js'
import { getStreamInfo, checkFfmpegInstalled } from '@/utils/stream.js'
import {
	bold,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('stream')
		.setDescription('Plays a radio stream or MP3 file from a URL')
		.addStringOption((option) =>
			option
				.setName('url')
				.setDescription('URL of the radio stream or MP3 file')
				.setRequired(true),
		),
	async execute(interaction: ChatInputCommandInteraction) {
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
			return await interaction.reply('You must be in a voice channel to stream.')

		await interaction.deferReply()

		// Check if ffmpeg is installed
		const ffmpegInstalled = await checkFfmpegInstalled()
		if (!ffmpegInstalled) {
			return await interaction.editReply(
				'❌ ffmpeg is not installed or not available. ffmpeg is required to stream audio from URLs.'
			)
		}

		// Get the URL from the user
		const url = interaction.options.getString('url', true)

		// Validate and get stream info
		const streamInfo = await getStreamInfo(url)
		if (!streamInfo) {
			return await interaction.editReply(
				'❌ Invalid stream URL. Please provide a valid radio stream or MP3 file URL.'
			)
		}

		// Create queue item for the stream
		const queueItem = {
			id: url, // Use the URL as the ID for streams
			title: streamInfo.title,
			ytdetails: undefined, // Streams don't have YouTube details
		}

		// Add to queue using addNext (like playnext command)
		if (queue.queue.length === 0) {
			// If queue is empty, add normally
			queue.add(queueItem, interaction.user, 'stream')
		} else {
			// If queue has items, add next
			queue.addNext(queueItem, interaction.user, 'stream')
		}

		// Start playing if bot is idle
		if (player.status === 'idle') {
			player.play(interaction.channelId)
		}

		// Reply with success
		return await interaction.editReply(
			`🎵 "${bold(streamInfo.title)}" added to the queue.`
		)
	},
}