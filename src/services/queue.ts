import { QueueItem } from '@/interfaces/queue.interface.js'
import { player, queue } from '@/main.js'
import { getYtInfo, search } from '@/utils/youtube.js'
import { bold, EmbedBuilder } from 'discord.js'

import _ from 'lodash'

class Queue {
	queue: QueueItem[]

	constructor() {
		this.queue = []
	}

	async print() {
		if (!this.queue.length) return false
		const reducedQueue = this.queue.slice(0, 5)
		let msg = ''
		reducedQueue.forEach((item, index) => {
			let title = `${item.title || item.id}\n`
			msg += index ? title : bold(title)
		})
		if (this.queue.length > 5)
			msg += `\n...and ${this.queue.length - 5} more songs.`
		return generateQueueEmbed(msg)
	}

	add(song: QueueItem) {
		this.queue.push(song)
	}

	addNext(song: QueueItem) {
		this.queue.splice(1, 0, song)
	}

	clear() {
		this.queue = []
	}

	async shuffle() {
		// Shuffle without affecting the first element of the queue
		if (this.queue.length < 3) return false
		const queueCopy = [...this.queue]
		const first = queueCopy.shift() as QueueItem
		this.queue = [first, ..._.shuffle(queueCopy)]
		await this.refreshInfo()
		return true
	}

	removeFirst() {
		this.queue.shift()
		this.refreshInfo()
	}

	remove(item: QueueItem) {
		this.queue.splice(this.queue.indexOf(item), 1)
		this.refreshInfo()
	}

	async refreshInfo() {
		// Get the info of the first 5 items on the queue
		// that don't have a title
		for (let i = 0; i <= 5; i++) {
			const item = this.queue[i]
			if (item && !item.id && item.title) {
				// Queue item with title but no yt id
				const result = await this.getId(item)
				if (!result) {
					this.refreshInfo()
					break
				}
			} else if (item && item.id && !item?.title) {
				// Queue item with ytid but no title
				const result = await this.getInfo(item)
				if (!result) {
					this.refreshInfo()
					break
				}
			}
		}
	}

	getInfo = async (item: QueueItem) => {
		if (!item.id && item.title) {
			await this.getId(item)
		}
		if (!item.id) {
			this.remove(item)
			return false
		}
		const ytinfo = await getYtInfo(item.id)
		if (ytinfo) {
			item.title = item.title ? item.title : ytinfo.videoDetails.title
			item.ytdetails = ytinfo.videoDetails
		} else {
			queue.remove(item)
			return false
		}
		return true
	}

	getId = async (item: QueueItem) => {
		if (!item.title) {
			await this.getInfo(item)
		}

		if (!item.title) {
			queue.remove(item)
			return false
		}

		const ytEquivalent = await search(item.title)

		if (!ytEquivalent) {
			queue.remove(item)
			return false
		}

		item.id = ytEquivalent.videoId

		await this.getInfo(item)

		return true
	}
}

const generateQueueEmbed = (queue: string) => {
	return new EmbedBuilder()
		.setColor(player.color)
		.setDescription(queue)
		.setTitle('Current queue:')
}

export default Queue
