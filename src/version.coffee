fs      = require "fs"
Signal  = require "signals"

module.exports = class Generator


	constructor: ->
		packageConfig = require "../package.json"

		console.log "v" + packageConfig.version
		process.exit(code=0)