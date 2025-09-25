import { google, youtube_v3 } from 'googleapis'

export interface YouTubeSearchResult {
	id: string
	title: string
	artist: string
	track: string
	channelTitle: string
	duration?: string
	thumbnail?: string
}

class YouTubeAPI {
	private youtube: youtube_v3.Youtube
	private apiKey: string

	constructor() {
		this.apiKey = process.env.GOOGLE_API_KEY || ''
		if (!this.apiKey) {
			console.warn('⚠️  GOOGLE_API_KEY not found in environment variables')
		}
		
		this.youtube = google.youtube({
			version: 'v3',
			auth: this.apiKey,
		})
	}

	/**
	 * Search for YouTube Music videos with enhanced targeting
	 */
	async searchVideos(query: string, maxResults: number = 10): Promise<YouTubeSearchResult[]> {
		if (!this.apiKey) {
			console.error('YouTube API key not configured')
			return []
		}

		try {
			// Search with music focus but less restrictive
			const response = await this.youtube.search.list({
				part: ['snippet'],
				q: query,
				type: ['video'],
				videoCategoryId: '10', // Music category
				maxResults: maxResults * 3, // Get more results to filter better
				order: 'relevance',
				videoDefinition: 'any',
				videoDuration: 'any', // Allow any duration for better results
				safeSearch: 'none',
			})

			if (!response.data.items) {
				return []
			}

			// Light filtering to remove obvious non-music content
			const musicVideos = response.data.items.filter(item => {
				const title = item.snippet?.title?.toLowerCase() || ''
				const channel = item.snippet?.channelTitle?.toLowerCase() || ''
				
				// Only filter out very obvious non-music content
				const excludeTerms = [
					'tutorial', 'how to make', 'reaction to', 'reacting to', 'interview with',
					'live stream', 'podcast episode', 'documentary', 'behind the scenes',
					'making of', 'gameplay', 'walkthrough', 'guide to', 'lesson', 'course',
					'unboxing', 'review of', 'trailer for'
				]
				
				const hasExcludedTerms = excludeTerms.some(term => 
					title.includes(term) || channel.includes(term)
				)
				
				// Score videos to prefer music content but don't exclude others
				let score = 0
				
				// Positive indicators
				const musicIndicators = [
					'official', 'music', 'records', 'entertainment', 'vevo', 'audio',
					'topic', 'sound', 'song', 'album', 'single', 'ep', ' - ', 'ft.', 'feat.'
				]
				
				musicIndicators.forEach(term => {
					if (title.includes(term) || channel.includes(term)) {
						score += 1
					}
				})
				
				// Prefer shorter durations (likely music videos)
				if (title.includes('official') || channel.includes('vevo') || channel.includes('records')) {
					score += 2
				}
				
				// Don't exclude, just deprioritize if no music indicators and has excluded terms
				return !hasExcludedTerms || score > 0
			})
			
			// Sort by score (music indicators) but keep original order as fallback
			.sort((a, b) => {
				const scoreA = this.getMusicScore(a.snippet?.title || '', a.snippet?.channelTitle || '')
				const scoreB = this.getMusicScore(b.snippet?.title || '', b.snippet?.channelTitle || '')
				return scoreB - scoreA
			})
			.slice(0, maxResults)

			// Get video IDs for duration lookup
			const videoIds = musicVideos
				.map(item => item.id?.videoId)
				.filter(Boolean) as string[]

			// Get video details including duration
			const videoDetails = await this.getVideoDetails(videoIds)

			return musicVideos
				.map((item) => {
					const videoId = item.id?.videoId
					const snippet = item.snippet
					const details = videoDetails.find(d => d.id === videoId)

					if (!videoId || !snippet?.title) return null

					// Decode HTML entities for proper character display
					const decodedTitle = this.decodeHtmlEntities(snippet.title)
					const decodedChannel = this.decodeHtmlEntities(snippet.channelTitle || '')

					const { artist, track } = this.extractArtistAndTrack(decodedTitle, decodedChannel)

					return {
						id: videoId,
						title: decodedTitle,
						artist,
						track,
						channelTitle: decodedChannel,
						duration: details?.duration || '',
						thumbnail: snippet.thumbnails?.default?.url || '',
					}
				})
				.filter(Boolean) as YouTubeSearchResult[]
		} catch (error: any) {
			console.error('YouTube API search error:', error.message)
			return []
		}
	}

	/**
	 * Get video details including duration
	 */
	private async getVideoDetails(videoIds: string[]): Promise<Array<{ id: string; duration: string }>> {
		if (!videoIds.length) return []

		try {
			const response = await this.youtube.videos.list({
				part: ['contentDetails'],
				id: videoIds,
			})

			return response.data.items?.map(item => ({
				id: item.id || '',
				duration: this.parseDuration(item.contentDetails?.duration || ''),
			})) || []
		} catch (error) {
			console.error('Error fetching video details:', error)
			return []
		}
	}

	/**
	 * Calculate music score for sorting
	 */
	private getMusicScore(title: string, channel: string): number {
		const titleLower = title.toLowerCase()
		const channelLower = channel.toLowerCase()
		let score = 0
		
		// High priority indicators
		if (channelLower.includes('vevo') || channelLower.includes('records') || channelLower.includes('official')) score += 10
		if (titleLower.includes('official') && (titleLower.includes('video') || titleLower.includes('audio'))) score += 8
		if (channelLower.includes('topic')) score += 7
		if (titleLower.includes(' - ')) score += 5
		
		// Medium priority indicators
		if (titleLower.includes('ft.') || titleLower.includes('feat.')) score += 3
		if (channelLower.includes('music') || channelLower.includes('entertainment')) score += 3
		if (titleLower.includes('remix') || titleLower.includes('cover')) score += 2
		
		// Low priority indicators
		if (titleLower.includes('song') || titleLower.includes('track')) score += 1
		
		return score
	}

	/**
	 * Decode HTML entities (like &#39; for apostrophes)
	 */
	private decodeHtmlEntities(text: string): string {
		return text
			.replace(/&#39;/g, "'")
			.replace(/&quot;/g, '"')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
			.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
	}

	/**
	 * Extract artist and track from title and channel
	 */
	private extractArtistAndTrack(title: string, channelTitle: string): { artist: string; track: string } {
		// Clean up common suffixes
		let cleanTitle = title
			.replace(/\s*\(Official .*?\)/gi, '')
			.replace(/\s*\[Official .*?\]/gi, '')
			.replace(/\s*- Official .*$/gi, '')
			.replace(/\s*\| Official .*$/gi, '')
			.replace(/\s*Official Video$/gi, '')
			.replace(/\s*Official Audio$/gi, '')
			.replace(/\s*Music Video$/gi, '')
			.replace(/\s*\(.*?Version\)/gi, '')
			.replace(/\s*\[.*?Version\]/gi, '')
			.replace(/\s*\(HD\)/gi, '')
			.replace(/\s*\[HD\]/gi, '')
			.replace(/\s*\(4K\)/gi, '')
			.replace(/\s*\[4K\]/gi, '')
			.trim()

		// Try to extract artist - track pattern
		const dashPattern = cleanTitle.match(/^(.+?)\s*[-–—]\s*(.+)$/)
		if (dashPattern) {
			return {
				artist: dashPattern[1].trim(),
				track: dashPattern[2].trim()
			}
		}

		// Check if channel name contains artist info
		const channelPatterns = [
			/^(.+?)\s*(?:Official|Music|Records|Entertainment|VEVO)$/i,
			/^(.+?)\s*-\s*Topic$/i,
			/^(.+?)(?:\s*$)/
		]

		for (const pattern of channelPatterns) {
			const match = channelTitle.match(pattern)
			if (match && match[1]) {
				const potentialArtist = match[1].trim()
				// Check if title starts with this artist name
				const titleLower = cleanTitle.toLowerCase()
				const artistLower = potentialArtist.toLowerCase()
				
				if (titleLower.startsWith(artistLower)) {
					const track = cleanTitle.substring(potentialArtist.length)
						.replace(/^[\s\-–—]+/, '')
						.trim()
					if (track) {
						return {
							artist: potentialArtist,
							track: track
						}
					}
				}
				
				// If not, use channel as artist and title as track
				if (potentialArtist.length > 2 && !potentialArtist.includes('Topic')) {
					return {
						artist: potentialArtist,
						track: cleanTitle
					}
				}
			}
		}

		// Fallback: try to find artist in title with common patterns
		const titlePatterns = [
			/^(.+?)\s*(?:ft\.|feat\.|featuring)\s*(.+?)\s*[-–—]\s*(.+)$/i,
			/^(.+?)\s*(?:by|from)\s*(.+)$/i
		]

		for (const pattern of titlePatterns) {
			const match = cleanTitle.match(pattern)
			if (match) {
				return {
					artist: match[2]?.trim() || match[1]?.trim() || 'Unknown Artist',
					track: match[3]?.trim() || match[1]?.trim() || cleanTitle
				}
			}
		}

		// Last resort: use channel as artist if it looks like an artist name
		if (channelTitle && !channelTitle.includes('Various') && !channelTitle.includes('Compilation')) {
			const cleanChannel = channelTitle
				.replace(/\s*(?:Official|Music|Records|Entertainment|VEVO|Topic)$/gi, '')
				.trim()
			
			if (cleanChannel.length > 2) {
				return {
					artist: cleanChannel,
					track: cleanTitle
				}
			}
		}

		// Ultimate fallback
		return {
			artist: 'Unknown Artist',
			track: cleanTitle || 'Unknown Track'
		}
	}

	/**
	 * Parse ISO 8601 duration to readable format
	 */
	private parseDuration(isoDuration: string): string {
		const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
		if (!match) return ''

		const hours = parseInt(match[1] || '0')
		const minutes = parseInt(match[2] || '0')
		const seconds = parseInt(match[3] || '0')

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
		} else {
			return `${minutes}:${seconds.toString().padStart(2, '0')}`
		}
	}

	/**
	 * Check if API is configured
	 */
	isConfigured(): boolean {
		return !!this.apiKey
	}
}

export const youtubeAPI = new YouTubeAPI()
