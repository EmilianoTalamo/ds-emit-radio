
import { queue } from '@/main.js'
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export default {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Show the current queue'),
	async execute(interaction: ChatInputCommandInteraction) {
		const msg = await queue.print()

		if(msg)
			return await interaction.reply(msg)

		return await interaction.reply(`There's nothing on the queue.`)
		
	},
}
