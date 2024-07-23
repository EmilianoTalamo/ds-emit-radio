import { queue } from '@/main.js'
import {
	AudioPlayer,
	AudioPlayerStatus,
	createAudioPlayer,
	createAudioResource,
} from '@discordjs/voice'
import { getAudioStream } from '../utils/youtube.js'
import { leaveVoice, send } from '@/handlers/channel.js'
import { idlePresence, musicPresence } from '@/handlers/activity.js'

export class Player {
	player: AudioPlayer
	status: 'idle' | 'playing'
	textChannel: string
	constructor() {
		this.player = createAudioPlayer()
		this.status = 'idle'
		this.textChannel = ''

		this.player.on(AudioPlayerStatus.Playing, () => {
			if (queue.queue[0]) {
				send(this.textChannel, `▶️ Playing "${queue.queue[0].title}"`)
				this.setStatus('playing')
			}
		})

		this.player.on(AudioPlayerStatus.Idle, () => {
			queue.removeFirst()
			if (!queue.queue.length) {
				this.setStatus('idle')
			} else this.play()
		})

		this.player.on('error', (err) => {
			console.error('AudioPlayer error')
			console.error(err)
			send(this.textChannel, `💥 ${err.message}`)
		})
	}

	async play(channel?: string) {
		this.textChannel = channel || this.textChannel

		// If there's nothing to play, do nothing.
		if (!queue.queue.length) {
			this.stop()
			return false
		}

		// Load the audio resource
		const resource = createAudioResource(getAudioStream(queue.queue[0].id))

		// Check that the resource is valid
		if (resource) this.player.play(resource)
		else {
			send(this.textChannel, 'Error streaming YouTube data.')
			return
		}

		this.setStatus('playing')
	}

	async stop(channel?: string) {
		this.textChannel = channel || this.textChannel

		queue.clear()
		this.player.stop()
		this.setStatus('idle')
		leaveVoice()
	}

	async skip(channel?: string) {
		this.textChannel = channel || this.textChannel

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
