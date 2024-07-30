import { queue } from '@/main.js'
import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'
import { handle as handlePlayCommand } from './play.js'

export default {
	data: new SlashCommandBuilder()
		.setName('playnext')
		.setDescription(
			'Adds a YouTube video/Spotify song next to the current track on the queue',
		)
		.addStringOption((option) =>
			option
				.setName('url')
				.setDescription('Youtube/Spotify link of the song')
				.setRequired(true),
		),
	async execute(interaction: ChatInputCommandInteraction) {
		if (!queue.queue.length) return await handlePlayCommand(interaction, false)

		return await handlePlayCommand(interaction, true)
	},
}
