colors	= require "colors"

Deploy = require "./deploy"
Generator = require "./generator"
Help = require "./help"

module.exports = class DPLOY

	servers			: null
	connection		: null
	ignoreInclude	: false

	constructor: ->
		# Call the DPLOY generator
		if process.argv.indexOf("install") >= 0
			new Generator()
		# Open the help
		else if process.argv.indexOf("--help") >= 0 or process.argv.indexOf("-h") >= 0
			new Help()
		# Deploy
		else
			@servers = process.argv.splice(2, process.argv.length)
			# Check if we should ignore the include parameter for this deploy
			@ignoreInclude = @servers.indexOf("-i") >= 0 or @servers.indexOf("--ignore-include") >= 0
			# Remove the ignore flag from the server list
			@servers = @servers.filter (value) -> value isnt "-i" and value isnt "--ignore-include"
			# If you don't set any servers, add an empty one to upload the first environment only
			@servers.push null if @servers.length is 0

			@deploy()

	deploy: =>
		# Dispose the current connection
		if @connection
			@connection.dispose()
			@connection = null

		# Keep deploying until all servers are updated
		if @servers.length
			@connection = new Deploy @servers[0], @ignoreInclude
			@connection.completed.add @deploy
			@servers.shift()
		# Finish the process
		else
			console.log "All Completed :)".green.bold
			process.exit(code=0)