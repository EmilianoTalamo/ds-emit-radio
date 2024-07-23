import { QueueItem } from '@/interfaces/queue.interface.js'

import _ from 'lodash'

class Queue {
	queue: QueueItem[]

	constructor() {
		this.queue = []
	}

	print() {
		if(!this.queue.length) return false
		const reducedQueue = this.queue.slice(0, 10)
		let msg = ''
		reducedQueue.forEach((item, index) => {
			msg += `${index === 0 ? '▶️ ' : ''}${item.title}\n`
		})
		if(this.queue.length > 10)
			msg += '\n...and more'
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
		return true
	}

	removeFirst() {
		this.queue.shift()
	}
}

export default Queue
