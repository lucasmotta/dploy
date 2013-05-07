colors	= require "colors"

Deploy = require './deploy'
Generator = require './generator'

module.exports = class GPLOY

	servers		: null
	connection	: null

	constructor: ->
		if process.argv[2] == "init"
			new Generator()
		else
			@servers = process.argv.splice(2, process.argv.length)
			@servers.push "default" if @servers.length is 0

			@deploy()

	deploy: =>
		if @connection
			@connection.dispose()
			@connection = null
			console.log ""

		if @servers.length
			@connection = new Deploy @servers[0], @deploy
			@connection.completed.add @deploy
			@servers.shift()
		else
			console.log "All Completed".green.bold
			process.exit(code=0)