import { connection, player, queue } from '@/main.js'
import {
	AudioPlayer,
	AudioPlayerStatus,
	createAudioPlayer,
	createAudioResource,
} from '@discordjs/voice'
import { ColorResolvable, EmbedBuilder } from 'discord.js'
import { getAudioStream } from '../utils/youtube.js'
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
			if (queue.queue[0]) {
				this.setStatus('playing')
			}
		})

		this.player.on(AudioPlayerStatus.Idle, () => {
			if (!this.repeat) queue.removeFirst()
			if (!queue.queue.length) {
				this.setStatus('idle')
			} else this.play()
		})

		this.player.on('error', async (err) => {
			console.error('AudioPlayer error')
			console.error(err)
			
			// Handle specific error types that might indicate stream issues
			const errorMessage = err.message.toLowerCase()
			if (errorMessage.includes('stream') || 
				errorMessage.includes('connection') ||
				errorMessage.includes('timeout') ||
				errorMessage.includes('network')) {
				console.log(`⚠️  Stream issue detected for ${queue.queue[0]?.title}, attempting to continue...`)
				// Don't immediately skip, let it try to recover
				return
			}
			
			await send(
				this.textChannel,
				`💥 ${err.message} on ${queue.queue[0].title}`,
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

		if (!queue.queue[0].title || !queue.queue[0].id) {
			// Faulty song with no info, remove and play next
			queue.removeFirst()
			this.play()
			return
		}


		try {
			// Load the audio resource with volume control and stream options for long videos
			const stream = await getAudioStream(queue.queue[0].id)
			const resource = createAudioResource(stream, {
				inlineVolume: true,
				metadata: {
					title: queue.queue[0].title,
					id: queue.queue[0].id
				}
			})

			// Set volume to 20%
			if (resource.volume) {
				resource.volume.setVolume(0.2)
			}

			// Handle stream errors to prevent premature stopping
			stream.on('error', (error) => {
				console.error(`Stream error for ${queue.queue[0].title}:`, error.message)
				// Don't immediately skip, let the audio player handle it
			})

			// Check that the resource is valid
			if (resource) this.player.play(resource)
			else {
				send(this.textChannel, 'Error streaming YouTube data.')
				return
			}
		} catch (error) {
			console.log(`⚠️  Failed to stream ${queue.queue[0].title}, skipping...`)
			queue.removeFirst()
			this.play()
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
			musicPresence(queue?.queue?.[0]?.title || '')
		}
	}
}

const generateNowPlayingEmbed = () => {
	return new EmbedBuilder()
		.setColor(player.color)
        .setDescription(
            `${player.repeat ? '🔁' : '▶️'}  Now ${player.repeat ? 'repeating' : 'playing'} (${secondsToMinutesAndSeconds(queue.queue[0].ytdetails?.lengthSeconds || 0)})`,
        )
		.setTitle(queue.queue[0].title || 'song')
		.setURL(`https://youtu.be/${queue.queue[0].id}`)
        .setThumbnail(queue.queue[0].ytdetails?.thumbnails?.[0]?.url || null)
}
