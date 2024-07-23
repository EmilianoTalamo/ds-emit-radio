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
	errors: number
	constructor() {
		this.player = createAudioPlayer()
		this.status = 'idle'
		this.textChannel = ''
		this.errors = 0

		this.player.on(AudioPlayerStatus.Playing, () => {
			if (queue.queue[0]) {
				send(this.textChannel, `▶️ Playing "${queue.queue[0]?.title || 'song'}"`)
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
			this.errors++
			send(this.textChannel, `💥 ${err.message} on ${queue.queue[0].title}`)
			if(this.errors > 5) {
				send(this.textChannel, `❌ Aborting player to avoid spam due to multiple errors.`)
				this.stop()
			}
		})
	}

	async play(channel?: string) {
		this.textChannel = channel || this.textChannel
		queue.refreshInfo()

		// If there's nothing to play, do nothing.
		if (!queue.queue.length) {
			this.stop()
			return false
		}

		if(!queue.queue[0].title || !queue.queue[0].id) {
			queue.removeFirst()
			this.play()
			return
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
		this.errors = 0
		leaveVoice()
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
