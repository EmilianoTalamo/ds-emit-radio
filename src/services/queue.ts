import { QueueItem } from '@/interfaces/queue.interface.js'
import { player, queue } from '@/main.js'
import { getYtInfo, search } from '@/utils/youtube.js'
import { bold, EmbedBuilder, User } from 'discord.js'

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

		if (player.repeat)
			msg += `\n \n 🔁 The player is currently on repeat.`
		return generateQueueEmbed(msg)
	}

	add(song: QueueItem, user?: User) {
		if (user) {
			song.addedBy = {
				id: user.id,
				username: user.username,
				displayName: user.displayName || user.username,
				avatar: user.avatar
			}
		}
		this.queue.push(song)
	}

	addNext(song: QueueItem, user?: User) {
		if (user) {
			song.addedBy = {
				id: user.id,
				username: user.username,
				displayName: user.displayName || user.username,
				avatar: user.avatar
			}
		}
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
		// Don't automatically refresh - let the caller decide when to refresh
	}

	// Remove first item and refresh - used when not followed by play()
	removeFirstAndRefresh() {
		this.queue.shift()
		this.refreshInfo()
	}

	remove(item: QueueItem) {
		this.queue.splice(this.queue.indexOf(item), 1)
		// Don't call refreshInfo here to avoid infinite loops during validation
	}

	// Remove item and trigger refresh - used when not in the middle of refreshInfo
	removeAndRefresh(item: QueueItem) {
		this.queue.splice(this.queue.indexOf(item), 1)
		this.refreshInfo()
	}

	async refreshInfo() {
		// Get the info of the first 5 items on the queue
		// that don't have complete information
		let processed = 0
		let i = 0
		
		console.log(`🔄 RefreshInfo: Processing queue (${this.queue.length} items)`)
		
		while (i < this.queue.length && i < 5 && processed < 5) {
			const item = this.queue[i]
			if (!item) {
				i++
				continue
			}
			
			let shouldIncrement = true
			
			if (!item.id && item.title) {
				// Queue item with title but no yt id (from Spotify)
				console.log(`🔍 Processing item ${i}: "${item.title}" (searching for YouTube ID)`)
				processed++
				const result = await this.getId(item)
				if (!result) {
					// Item was removed, don't increment i to check the new item at this index
					console.log(`❌ Item ${i} removed: "${item.title}"`)
					shouldIncrement = false
				} else {
					console.log(`✅ Item ${i} processed: "${item.title}" -> ${item.id}`)
				}
			} else if (item.id && (!item.title || !item.ytdetails)) {
				// Queue item with ytid but missing title or ytdetails
				console.log(`🔍 Processing item ${i}: ${item.id} (getting video info)`)
				processed++
				const result = await this.getInfo(item)
				if (!result) {
					// Item was removed, don't increment i to check the new item at this index
					console.log(`❌ Item ${i} removed: ${item.id}`)
					shouldIncrement = false
				} else {
					console.log(`✅ Item ${i} processed: ${item.id} -> "${item.title}"`)
				}
			}
			
			if (shouldIncrement) {
				i++
			}
		}
		
		console.log(`🔄 RefreshInfo complete: ${processed} items processed, ${this.queue.length} items remaining`)
	}

	getInfo = async (item: QueueItem) => {
		if (!item.id && item.title) {
			await this.getId(item)
		}
		if (!item.id) {
			console.log(`⚠️  Removing item "${item.title}" - no video ID found`)
			this.remove(item)
			return false
		}
        const ytinfo = await getYtInfo(item.id)
        if (ytinfo) {
            item.title = item.title ? item.title : ytinfo.basic_info.title
            item.ytdetails = ytinfo.basic_info
			return true
		} else {
			// Video became unavailable after being added, remove it
			console.log(`⚠️  Removing unavailable video: ${item.id}`)
			this.remove(item)
			return false
		}
	}

	getId = async (item: QueueItem) => {
		if (!item.title) {
			console.log(`⚠️  Removing item - no title to search for`)
			this.remove(item)
			return false
		}

		const ytEquivalent = await search(item.title)

		if (!ytEquivalent) {
			console.log(`⚠️  No YouTube equivalent found for: "${item.title}"`)
			this.remove(item)
			return false
		}

		item.id = ytEquivalent.videoDetails?.videoId || ytEquivalent.videoId

		// Now get the full info for the found video
		if (!item.id) {
			console.log(`⚠️  No video ID found for: "${item.title}"`)
			this.remove(item)
			return false
		}
		const ytinfo = await getYtInfo(item.id)
		if (ytinfo) {
			item.title = item.title ? item.title : ytinfo.basic_info.title
			item.ytdetails = ytinfo.basic_info
			return true
		} else {
			// The found video is also unavailable
			console.log(`⚠️  Found video ${item.id} is also unavailable for: "${item.title}"`)
			this.remove(item)
			return false
		}
	}
}

const generateQueueEmbed = (queue: string) => {
	return new EmbedBuilder()
		.setColor(player.color)
		.setDescription(queue)
		.setTitle('Current queue:')
}

export default Queue
