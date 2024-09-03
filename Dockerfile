FROM node:18.18.2-bullseye-slim

RUN apt-get update -y && apt-get upgrade -y
RUN apt-get update -y \
	&& apt-get install -y -q --no-install-recommends \
		ffmpeg libogg0 libopus0 opus-tools python3

RUN npm i -g node-gyp esbuild

RUN apt-get autoremove