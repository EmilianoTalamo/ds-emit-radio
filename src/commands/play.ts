import { joinVoice } from '@/handlers/channel.js'
import { player, queue } from '@/main.js'
import { getUrlInfo, getYtInfo } from '@/utils/youtube.js'
import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Plays a YouTube video or adds it to the queue')
		.addStringOption((option) =>
			option
				.setName('url')
				.setDescription('Youtube link of the song')
				.setRequired(true),
		),
	async execute(interaction: ChatInputCommandInteraction) {
		// Join user voice channel
		const joined = await joinVoice(interaction)
		if (!joined)
			return await interaction.reply('You must be in a voice channel to play.')

		// Read URL sent by the user
		const url = interaction.options.data[0].value as string
		const urlInfo = getUrlInfo(url)
		if (!url || !urlInfo.videoId) return await interaction.reply('Invalid URL')

		// Get youtube video information
		const ytinfo = await getYtInfo(urlInfo.videoId)
		if (!ytinfo)
			return await interaction.reply(`Invalid YouTube ID: ${urlInfo.videoId}`)

		// Add to the queue
		queue.add({ id: urlInfo.videoId, title: ytinfo.videoDetails.title, ytdetails: ytinfo.videoDetails })

		// Start reproduction if the bot is idle
		if (player.status === 'idle') player.play(interaction.channelId)
		
		// Reply to the user if everything went ok
		return interaction.reply(
			`🥝 "${ytinfo.videoDetails.title}" added to the queue.`,
		)
	},
}
