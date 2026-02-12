import { connection, player, queue } from '@/main.js'
import {
	AudioPlayer,
	AudioPlayerStatus,
	createAudioPlayer,
	createAudioResource,
} from '@discordjs/voice'
import { ColorResolvable, EmbedBuilder } from 'discord.js'
import { getAudioStream } from '../utils/youtube.js'
import { getStreamAudio } from '../utils/stream.js'
import { send, sendEmbed } from '@/handlers/channel.js'
import { idlePresence, musicPresence } from '@/handlers/activity.js'
import { secondsToMinutesAndSeconds } from '@/utils/format.js'

export class Player {
	player: AudioPlayer
	status: 'idle' | 'playing'
	repeat: boolean
	textChannel: string
	errors: number
	color: ColorResolvable
	constructor() {
		this.player = createAudioPlayer()
		this.status = 'idle'
		this.repeat = false
		this.textChannel = ''
		this.errors = 0
		this.color = 'Default'

		this.player.on(AudioPlayerStatus.Playing, () => {
			try {
				if (queue.queue[0]) {
					this.setStatus('playing')
				}
			} catch (error) {
				console.error('Error in Playing status handler:', error)
			}
		})

		this.player.on(AudioPlayerStatus.Idle, () => {
			try {
				if (!this.repeat) queue.removeFirst()
				if (!queue.queue.length) {
					this.setStatus('idle')
				} else {
					// play() will call refreshInfo(), so we don't need to call it separately
					this.play()
				}
			} catch (error) {
				console.error('Error in Idle status handler:', error)
				// Attempt to set status to idle as a fallback
				try {
					this.setStatus('idle')
				} catch (statusError) {
					console.error('Failed to set status to idle:', statusError)
				}
			}
		})

		this.player.on('error', async (err) => {
			try {
				console.error('AudioPlayer error')
				console.error(err)
				
				// Handle specific error types that might indicate stream issues
				const errorMessage = err.message.toLowerCase()
				if (errorMessage.includes('stream') || 
					errorMessage.includes('connection') ||
					errorMessage.includes('timeout') ||
					errorMessage.includes('network')) {
					const currentSong = queue.queue[0]
					const songTitle = currentSong?.title || 'Unknown song'
					console.log(`⚠️  Stream issue detected for ${songTitle}, attempting to continue...`)
					// Don't immediately skip, let it try to recover
					return
				}
				
				// Safely get current song info
				const currentSong = queue.queue[0]
				const songTitle = currentSong?.title || 'Unknown song'
				
				await send(
					this.textChannel,
					`💥 ${err.message} on ${songTitle}`,
				)
				if (err.message === 'Status code: 403') {
					this.stop()
					await send(
						this.textChannel,
						`☠️ Restarting bot due to 403 error. Wait a minute before using another command.`,
					)
					return process.exit()
				}
				this.errors++
				if (this.errors >= 5) {
					send(
						this.textChannel,
						`❌ Aborting player to avoid spam due to multiple errors.`,
					)
					this.stop()
				}
			} catch (handlerError) {
				console.error('Critical error in error handler:', handlerError)
				// Attempt to stop the player gracefully
				try {
					this.stop()
				} catch (stopError) {
					console.error('Failed to stop player during error recovery:', stopError)
				}
			}
		})
	}

	async play(channel?: string) {
		this.textChannel = channel || this.textChannel
		queue.refreshInfo()

		// If there's nothing to play, do nothing.
		if (!queue.queue.length) {
			this.stop(this.textChannel, false)
			send(this.textChannel, 'Nothing else to play.')
			return false
		}

		const currentSong = queue.queue[0]
		if (!currentSong || !currentSong.title || !currentSong.id) {
			// Faulty song with no info, remove and play next
			console.log('⚠️  Removing faulty song from queue')
			queue.removeFirst()
			this.play()
			return
		}


		try {
			// Check if this is a stream or a YouTube video based on the command
			const isStream = currentSong.command === 'stream'
			let stream
			
			if (isStream) {
				// Handle stream URLs (radio streams, MP3 files, etc.)
				stream = await getStreamAudio(currentSong.id!)
			} else {
				// Handle YouTube videos
				stream = await getAudioStream(currentSong.id!)
			}
			
			const resource = createAudioResource(stream, {
				inlineVolume: true,
				metadata: {
					title: currentSong.title,
					id: currentSong.id,
					isStream: isStream
				}
			})

			// Set volume to 20%
			if (resource.volume) {
				resource.volume.setVolume(0.2)
			}

		// Handle stream errors to prevent premature stopping
		stream.on('error', (error) => {
			try {
				const currentSong = queue.queue[0]
				const songTitle = currentSong?.title || 'Unknown song'
				console.error(`Stream error for ${songTitle}:`, error.message)
				// Don't immediately skip, let the audio player handle it
			} catch (err) {
				console.error('Stream error occurred, but failed to log details:', err)
			}
		})

			// Check that the resource is valid
			if (resource) this.player.play(resource)
			else {
				send(this.textChannel, 'Error streaming YouTube data.')
				return
			}
		} catch (error) {
			try {
				const songTitle = currentSong?.title || 'Unknown song'
				console.log(`⚠️  Failed to stream ${songTitle}, skipping...`)
				console.error('Stream error:', error)
				queue.removeFirst()
				this.play()
			} catch (recoveryError) {
				console.error('Failed to recover from stream error:', recoveryError)
				// Try to stop the player to prevent further issues
				try {
					this.stop()
				} catch (stopError) {
					console.error('Failed to stop player during error recovery:', stopError)
				}
			}
			return
		}

		this.setStatus('playing')

		sendEmbed(this.textChannel, generateNowPlayingEmbed())
	}

	async stop(channel?: string, leave: boolean = true) {
		this.textChannel = channel || this.textChannel
		queue.clear()
		this.player.stop()
		this.errors = 0
		if(leave)
			connection.leaveVoice()
		this.setStatus('idle')
	}

	async skip(channel?: string) {
		this.textChannel = channel || this.textChannel
		this.errors = 0
		if (queue.queue.length) {
			queue.removeFirst()
			this.play()
		}
	}

	setStatus(status: 'idle' | 'playing') {
		if (status === 'idle') {
			this.status = 'idle'
			idlePresence()
		} else if (status === 'playing') {
			this.status = 'playing'
			musicPresence(queue?.queue?.[0]?.title || 'music')
		}
	}
}

const generateNowPlayingEmbed = () => {
	const currentSong = queue.queue[0]
	const isStream = currentSong.command === 'stream'
	
	// Truncate title if it's too long to prevent embed errors
	let title = currentSong.title || 'song'
	if (title.length > 140) {
		title = title.substring(0, 137) + '...'
	}
	
	const embed = new EmbedBuilder()
		.setColor(player.color)
		.setAuthor({ name: player.repeat ? 'Now repeating' : 'Now playing' })
		.setTitle(title)
	
	// Set URL and thumbnail based on whether it's a stream or YouTube video
	if (isStream) {
		embed.setURL(currentSong.id || '')
	} else {
		embed.setURL(`https://youtu.be/${currentSong.id}`)
		embed.setThumbnail(currentSong.ytdetails?.thumbnails?.[0]?.url || null)
	}
	
	if (!isStream) {
		embed.addFields({
			name: 'Song duration',
			value: secondsToMinutesAndSeconds(currentSong.ytdetails?.lengthSeconds || 0),
			inline: true
		})
	}
	
	embed.addFields({
		name: 'Queue length',
		value: queue.queue.length.toString(),
		inline: true
	})
	
	// Add playlist field if song was added via playlist and playlist info is available
	if (currentSong.command === 'playlist' && currentSong.playlist) {
		embed.addFields({
			name: 'Playlist',
			value: `[${currentSong.playlist.name}](${currentSong.playlist.url})`,
			inline: false
		})
	}
	
	embed
	
	if (currentSong.addedBy) {
		let footerText = `Added by ${currentSong.addedBy.displayName}`
		
		if (currentSong.command) {
			footerText += ` - via /${currentSong.command}`
		}
		
		const footerOptions: { text: string; iconURL?: string } = {
			text: footerText
		}
		
		if (currentSong.addedBy.avatar) {
			footerOptions.iconURL = `https://cdn.discordapp.com/avatars/${currentSong.addedBy.id}/${currentSong.addedBy.avatar}.png`
		}
		
		embed.setFooter(footerOptions)
	}
	
	return embed
}