import { isBotAlone, isUserWithBot } from '@/handlers/channel.js'
import { connection, player, queue } from '@/main.js'
import { youtubeAPI, YouTubeSearchResult } from '@/utils/youtubeApi.js'
import { getYtInfo } from '@/utils/youtube.js'
import {
	AutocompleteInteraction,
	bold,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
} from 'discord.js'

// Cache to store search results temporarily
const searchCache = new Map<string, YouTubeSearchResult>()

// Helper function to parse duration string to seconds
const parseDurationToSeconds = (duration: string): number => {
	const parts = duration.split(':').map(Number)
	if (parts.length === 2) {
		// Format: "3:45"
		return parts[0] * 60 + parts[1]
	} else if (parts.length === 3) {
		// Format: "1:23:45"
		return parts[0] * 3600 + parts[1] * 60 + parts[2]
	}
	return 0
}

export default {
	data: new SlashCommandBuilder()
		.setName('search')
		.setDescription('Search for YouTube music tracks and add to queue')
		.addStringOption((option) =>
			option
				.setName('query')
				.setDescription('Search for music tracks on YouTube')
				.setRequired(true)
				.setAutocomplete(true)
		),
	async execute(interaction: ChatInputCommandInteraction) {
		await handleSearch(interaction)
	},
	async autocomplete(interaction: AutocompleteInteraction) {
		await handleAutocomplete(interaction)
	},
}

const handleSearch = async (interaction: ChatInputCommandInteraction) => {
	// Check if user is in correct voice channel
	if (
		player.status === 'playing' &&
		!isUserWithBot(interaction) &&
		!isBotAlone()
	) {
		return await interaction.reply(
			`I'm currently playing music in a different voice channel than yours. Join us!`,
		)
	}

	// Join user voice channel
	const joined = await connection.joinVoiceByUserWhoInteracted(interaction)
	if (!joined)
		return await interaction.reply('You must be in a voice channel to search.')

	await interaction.deferReply()

	const query = interaction.options.getString('query', true)
	
	// Handle error/special values from autocomplete
	if (['waiting', 'error', 'no_results', 'no_valid_results'].includes(query)) {
		return await interaction.editReply('❌ Please try searching again with a different query.')
	}
	
	// Check if it's a video ID (from autocomplete selection)
	const videoIdPattern = /^[a-zA-Z0-9_-]{11}$/
	let videoId: string

	let searchResult: YouTubeSearchResult | undefined

	if (videoIdPattern.test(query)) {
		// This is a selection from autocomplete (just the video ID)
		videoId = query
		searchResult = searchCache.get(videoId)
		
		if (searchResult) {
			// We have cached search data, use it directly
			await interaction.editReply('🎵 Adding selected track to queue...')
		} else {
			// Fallback if cache miss
			await interaction.editReply('🎵 Getting track information...')
		}
	} else {
		// This is a direct search query - search for the best match
		await interaction.editReply('🔍 Searching for tracks...')
		
		if (!youtubeAPI.isConfigured()) {
			return await interaction.editReply(
				'❌ YouTube API is not configured. Please set GOOGLE_API_KEY environment variable.'
			)
		}

		const results = await youtubeAPI.searchVideos(query, 1)
		if (!results.length) {
			return await interaction.editReply(
				`❌ No music tracks found for "${query}"`
			)
		}

		videoId = results[0].id
		searchResult = results[0]
		await interaction.editReply('🎵 Adding track to queue...')
	}

	// Create queue item using cached search data or fetch from yt-dlp
	let queueItem: any
	
	if (searchResult) {
		// Use the exact search result data that was displayed to user
		queueItem = {
			id: videoId,
			title: `${searchResult.artist} - ${searchResult.track}`,
			ytdetails: {
				title: `${searchResult.artist} - ${searchResult.track}`,
				lengthSeconds: searchResult.duration ? parseDurationToSeconds(searchResult.duration) : 0,
				thumbnails: searchResult.thumbnail ? [{ url: searchResult.thumbnail }] : [],
			},
		}
	} else {
		// Fallback to yt-dlp for verification
		const ytinfo = await getYtInfo(videoId)
		if (!ytinfo) {
			return await interaction.editReply(
				`❌ Unable to access track: ${videoId}`
			)
		}
		
		queueItem = {
			id: videoId,
			title: ytinfo.basic_info.title,
			ytdetails: ytinfo.basic_info,
		}
	}
	
	queue.add(queueItem, interaction.user)

	// Start playing if bot is idle
	if (player.status === 'idle') {
		player.play(interaction.channelId)
	}

	// Reply with success
	return await interaction.editReply(
		`🥝 "${bold(queueItem.title)}" added to the queue.`
	)
}

const handleAutocomplete = async (interaction: AutocompleteInteraction) => {
	const focusedValue = interaction.options.getFocused()
	
	// Only search if query is 3+ characters
	if (focusedValue.length < 3) {
		return await interaction.respond([
			{
				name: 'Type at least 3 characters to search...',
				value: 'waiting',
			},
		])
	}

	// Don't search if it's already a video ID selection
	if (focusedValue.match(/^[a-zA-Z0-9_-]{11}$/)) {
		return await interaction.respond([])
	}

	if (!youtubeAPI.isConfigured()) {
		return await interaction.respond([
			{
				name: '❌ GOOGLE_API_KEY not configured',
				value: 'error',
			},
		])
	}

	try {
		const results = await youtubeAPI.searchVideos(focusedValue, 10)
		
		if (!results.length) {
			return await interaction.respond([
				{
					name: `No tracks found for "${focusedValue}"`,
					value: 'no_results',
				},
			])
		}

		// Clear old cache entries to prevent memory leaks (keep last 100)
		if (searchCache.size > 100) {
			const entries = Array.from(searchCache.entries())
			searchCache.clear()
			// Keep the last 50 entries
			entries.slice(-50).forEach(([key, value]) => {
				searchCache.set(key, value)
			})
		}

		const choices = results.map((result) => {
			// Cache the search result for later use
			searchCache.set(result.id, result)
			
			// Format as ARTIST - TRACK (TIME)
			const artist = result.artist || 'Unknown Artist'
			const track = result.track || 'Unknown Track'
			const duration = result.duration ? ` (${result.duration})` : ''
			
			// Create display name with proper formatting - ensure it's under 100 chars
			let displayName = `${artist} - ${track}${duration}`
			if (displayName.length > 100) {
				// Truncate the track name if needed
				const maxTrackLength = 100 - artist.length - duration.length - 3 // 3 for " - "
				const truncatedTrack = track.length > maxTrackLength 
					? track.substring(0, maxTrackLength - 3) + '...'
					: track
				displayName = `${artist} - ${truncatedTrack}${duration}`
			}
			
			// Video ID is always 11 characters, so it will never exceed 100 chars
			const value = result.id
			
			return { name: displayName, value }
		}).filter(choice => choice.value.length <= 100) // Extra safety check

		if (choices.length === 0) {
			return await interaction.respond([
				{
					name: 'No valid results found',
					value: 'no_valid_results',
				},
			])
		}

		await interaction.respond(choices)
	} catch (error) {
		console.error('Autocomplete error:', error)
		// Return empty array instead of error message to avoid Discord API errors
		await interaction.respond([])
	}
}
