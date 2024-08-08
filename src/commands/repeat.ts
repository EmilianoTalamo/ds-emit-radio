
import { player, queue } from '@/main.js'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('repeat')
		.setDescription('Repeats the current song'),
	async execute(interaction: ChatInputCommandInteraction) {
		player.repeat = !player.repeat

		return await interaction.reply(`🔂 Repeat is ${player.repeat ? 'ON' : 'OFF'}`)
		
	},
}
