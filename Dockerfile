FROM node:20.15.1-bullseye-slim

RUN apt-get update -y && apt-get upgrade -y
RUN apt-get update -y \
	&& apt-get install -y -q --no-install-recommends \
		ffmpeg

RUN apt-get autoremove