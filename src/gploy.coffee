colors	= require "colors"

Deploy = require "./deploy"
Generator = require "./generator"

module.exports = class GPLOY

	servers		: null
	connection	: null

	constructor: ->
		# Call the gploy.yaml template generator
		if process.argv[2] == "init" or process.argv[2] == "--init" or process.argv[2] == "--i"
			new Generator()
		# Open the help
		else if process.argv[2] == "help" or process.argv[2] == "--help" or process.argv[2] == "-h"
			console.log "show help"
		# Deploy
		else
			@servers = process.argv.splice(2, process.argv.length)
			@servers.push "default" if @servers.length is 0

			@deploy()

	deploy: =>
		# Dispose the current connection
		if @connection
			@connection.dispose()
			@connection = null

		# Keep deploying until all servers are updated
		if @servers.length
			@connection = new Deploy @servers[0]
			@connection.completed.add @deploy
			@servers.shift()
		# Finish the process
		else
			console.log "All Completed :)".green.bold
			process.exit(code=0)