import { QueueItem } from '@/interfaces/queue.interface.js'
import { getYtInfo } from '@/utils/youtube.js'

import _ from 'lodash'

class Queue {
	queue: QueueItem[]

	constructor() {
		this.queue = []
	}

	async print() {
		if(!this.queue.length) return false
		const reducedQueue = this.queue.slice(0, 5)
		let msg = ''
		reducedQueue.forEach((item, index) => {
			msg += `${index === 0 ? '▶️ ' : ''}${item.title || item.id}\n`
		})
		if(this.queue.length > 5)
			msg += `\n...and ${this.queue.length - 5} more songs.`
		return msg
	}

	add(song: QueueItem) {
		this.queue.push(song)
	}

	clear() {
		this.queue = []
	}

	shuffle() {
		// Shuffle without affecting the first element of the queue
		if (this.queue.length < 3) return false
		const queueCopy = [...this.queue]
		const first = queueCopy.shift() as QueueItem
		this.queue = [first, ..._.shuffle(queueCopy)]
		this.refreshInfo()
		return true
	}

	removeFirst() {
		this.queue.shift()
		this.refreshInfo()
	}

	async refreshInfo() {
		// Get the info of the first 5 items on the queue
		// that don't have a title
		for(let i = 0; i <= 5; i++) {
			const item = this.queue[i]
			if(item && !item?.title) {
				const ytinfo = await getYtInfo(item.id)
				if(ytinfo)
					item.title = ytinfo.videoDetails.title
				else {
					this.queue.splice(this.queue.indexOf(item), 1)
					this.refreshInfo()
					break
				}
			}
		}
	}
}

export default Queue
