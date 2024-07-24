import { queue } from '@/main.js'
import { getUrlInfo, getYtInfo } from '@/utils/youtube.js'
import {
	bold,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'
import { handle as handlePlayCommand } from './play.js'

export default {
	data: new SlashCommandBuilder()
		.setName('playnext')
		.setDescription('Adds a YouTube video next to the current track on the queue')
		.addStringOption((option) =>
			option
				.setName('url')
				.setDescription('Youtube link of the song')
				.setRequired(true),
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if(!queue.queue.length)
			return await handlePlayCommand(interaction)

		await interaction.deferReply()

		// Read URL sent by the user
		const url = interaction.options.data[0].value as string
		const urlInfo = getUrlInfo(url)
		if (!url || !urlInfo.videoId) return await interaction.editReply('Invalid URL')

		// Get youtube video information
		const ytinfo = await getYtInfo(urlInfo.videoId)
		if (!ytinfo)
			return await interaction.editReply(`Invalid YouTube ID: ${urlInfo.videoId}`)

		// Add to the queue
		queue.addNext({ id: urlInfo.videoId, title: ytinfo.videoDetails.title, ytdetails: ytinfo.videoDetails })
		
		// Reply to the user if everything went ok
		return interaction.editReply(
			`🪇 "${bold(ytinfo.videoDetails.title)}" will be played next.`,
		)
	},
}
