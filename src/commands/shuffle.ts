import { queue } from '@/main.js'
import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('shuffle')
		.setDescription('Randomize the playlist!'),
	async execute(interaction: ChatInputCommandInteraction) {
		const result = queue.shuffle()

		if(result)
			return interaction.reply('🤪 Queue shuffled')
		return interaction.reply('Is your queue long enough to shuffle it?')
	},
}
