FROM node:20.15.1-bullseye-slim

RUN apt-get update -y && apt-get upgrade -y
RUN apt-get update -y \
	&& apt-get install -y -q --no-install-recommends \
		ffmpeg libogg0 libopus0 opus-tools

RUN apt-get autoremove