# Figuro

Simple image hosting for twitter client

## Feature

- Build custom image hosting service for twitter clients (cf. Tweetbot)
- Yes, that's all!

## Usage

### Server

#### Install

This project require imagemagick.

```bash
$ git clone git@github.com:deholic/figuro.git figuro
$ cd figuro
$ npm install
$ node app.js /or/ forever app.js
```

#### Setting
1. Open ./figuro/figuro.js
2. Modify to your hostname in 26 line

### Client

Set your custom image upload API Endpoint in your twitter client.
http://[YOUR_SERVER_HOST]/upload
