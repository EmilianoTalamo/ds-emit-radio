import client, { player } from '../main.js'
import { CommandInteraction, EmbedBuilder, GuildMember, TextChannel } from 'discord.js'
import { joinVoiceChannel } from '@discordjs/voice'

let connection: any = null

export const joinVoice = (interaction: CommandInteraction) => {
	const member = interaction.member as GuildMember
	const channel = member?.voice?.channel

	if (!channel) return false

	const guildId = channel.guild.id

	connection = joinVoiceChannel({
		channelId: channel.id,
		guildId,
		adapterCreator: channel.guild.voiceAdapterCreator,
	})

	connection.subscribe(player.player)

	return true
}

export const leaveVoice = () => {
	connection.destroy()
}

export const send = (channelId: string, message: string) => {
	if (!channelId) return false

	const channel = client.channels.cache.get(channelId) as TextChannel

	if(channel.isVoiceBased()) return false
		
	channel.send(message)
}

export const sendEmbed = (channelId: string, embed: EmbedBuilder) => {
	if(!channelId) return false

	const channel = client.channels.cache.get(channelId) as TextChannel

	if(channel.isVoiceBased()) return false
	
	channel.send({ embeds: [embed]})
}