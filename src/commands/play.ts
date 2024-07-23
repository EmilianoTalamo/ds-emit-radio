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
		const joined = await joinVoice(interaction)

		if (!joined)
			return await interaction.reply('You must be in a voice channel to play.')

		const url = interaction.options.data[0].value as string

		const urlInfo = getUrlInfo(url)

		if (!url || !urlInfo.videoId) return await interaction.reply('Invalid URL')

		const ytinfo = await getYtInfo(urlInfo.videoId)

		if (!ytinfo)
			return await interaction.reply(`Invalid YouTube ID: ${urlInfo.videoId}`)

		queue.add({ id: urlInfo.videoId, title: ytinfo.videoDetails.title })

		if (player.status === 'idle') player.play(interaction.channelId)

		return interaction.reply(
			`🥝 "${ytinfo.videoDetails.title}" added to the queue.`,
		)
	},
}
