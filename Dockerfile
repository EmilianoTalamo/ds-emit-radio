FROM node:22.19.0-bookworm-slim

RUN apt-get update -y && apt-get upgrade -y
RUN apt-get update -y \
	&& apt-get install -y -q --no-install-recommends \
		ffmpeg libogg0 libopus0 opus-tools python3 python3-pip curl jq \
	&& pip3 install --no-cache-dir --break-system-packages yt-dlp

RUN npm i -g node-gyp esbuild

RUN apt-get autoremove