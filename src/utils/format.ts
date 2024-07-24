export const secondsToMinutesAndSeconds = (time: number | string): string => {
	let parsedTime = 0
	if(typeof time === 'string')
		parsedTime = parseInt(time)
	
	if(isNaN(parsedTime)) return '0:0'
	const minutes = Math.floor(parsedTime / 60);
	const seconds = parsedTime - minutes * 60;

	return `${minutes}:${zeroPad(seconds, 2)}`
}

const zeroPad = (num: number, places: number) => String(num).padStart(places, '0')