import { Track } from "@spotify/web-api-ts-sdk";

export const secondsToMinutesAndSeconds = (time: number | string): string => {
	let parsedTime = 0
	if(typeof time === 'string') {
		parsedTime = parseInt(time)
	} else if(typeof time === 'number') {
		parsedTime = time
	}
	
	if(isNaN(parsedTime) || parsedTime <= 0) return '0:00'
	const minutes = Math.floor(parsedTime / 60);
	const seconds = parsedTime - minutes * 60;

	return `${minutes}:${zeroPad(seconds, 2)}`
}

const zeroPad = (num: number, places: number) => String(num).padStart(places, '0')

export const joinArtists = (artists: Track['artists']) => {
	return artists.map(artist => artist.name).join(', ')
}