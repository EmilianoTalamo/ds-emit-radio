import { isUserWithBot } from '@/handlers/channel.js'
import { player, queue } from '@/main.js'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('Randomize the playlist!'),
	async execute(interaction: ChatInputCommandInteraction) {
		// This command shouldn't be triggered if the bot is playing music
		// and the user is in a different voice channel.
		if (player.status === 'playing' && !isUserWithBot(interaction)) {
			return await interaction.reply(
				`I'm currently playing music in a different voice channel than yours. Join us!`,
			)
		}

		await interaction.deferReply()
		const result = await queue.shuffle()

		if (result) return interaction.editReply('🤪 Queue shuffled')
		return interaction.editReply('Is your queue long enough to shuffle it?')
	},
}
