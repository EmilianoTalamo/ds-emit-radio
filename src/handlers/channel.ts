import client, { player } from '../main.js'
import { CommandInteraction, EmbedBuilder, GuildMember, TextChannel, VoiceBasedChannel } from 'discord.js'
import { joinVoiceChannel, VoiceConnection } from '@discordjs/voice'

export class Connection {
	connection: VoiceConnection | null
	constructor() {
		this.connection = null

		setInterval(() => {
			const guilds = client.guilds.cache
			guilds.forEach(guild => {
				const botMember = guild.members.cache.get(client.user.id);
				const botVoiceChannel = botMember?.voice.channel;
		
				if (botVoiceChannel) {
						const membersInVoiceChannel = botVoiceChannel.members;
		
						if (membersInVoiceChannel.size < 2) {
							// If the bot is left alone on a channel
							// stop the player, clear the queue and leave
							player.stop()
						}
				}
		});
		
		}, 10*1000*60) // 10 minutes
	}

	joinVoiceByChannelId = (channel: VoiceBasedChannel) => {
		if (!channel) return false

		const guildId = channel.guild.id

		this.connection = joinVoiceChannel({
			channelId: channel.id,
			guildId,
			adapterCreator: channel.guild.voiceAdapterCreator,
		})

		this.connection.subscribe(player.player)

		return true
	}

	joinVoiceByUserWhoInteracted = (interaction: CommandInteraction) => {
		const member = interaction.member as GuildMember
		const channel = member?.voice?.channel

		if (!channel) return false

		this.joinVoiceByChannelId(channel)

		return true
	}

	leaveVoice = () => {
		if(this.connection) {
			this.connection.destroy();
			return true
		}
		return false
	}
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