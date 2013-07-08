ssh2	= require "ssh2"
Signal	= require "signals"
fs 		= require "fs"

module.exports = class SFTP

	
	sftp 		: null
	connection	: null
	connected	: null
	failed		: null
	closed		: null
	closing 	: null

	constructor: ->
		@connected	= new Signal()
		@failed		= new Signal()
		@closed		= new Signal()
		@closing 	= false

		# Create a new instance of the FTP
		@connection = new ssh2()
		@connection.on "error", => @failed.dispatch() unless @closing
		@connection.on "close", (hadError) =>
			if @hadError
				@failed.dispatch() unless @closing
		@connection.on "ready", =>
			@connection.sftp (error, sftp) =>
				return @failed.dispatch() if error

				@sftp = sftp
				@connected.dispatch()

	###
	Connect to the FTP

	@param config <object> Configuration file for your connection
	###
	connect: (config) ->
		@connection.connect
			host		: config.host
			port		: config.port
			username	: config.user
			password	: config.pass

	###
	Close the connection
	###
	close: (callback) ->
		return if @closing
		@closing = true

		@connection.on "end", => @closed.dispatch()
		@connection.end()

	###
	Dispose
	###
	dispose: ->
		if @connected
			@connected.dispose()
			@connected = null

		if @failed
			@failed.dispose()
			@failed = null

		if @closed
			@closed.dispose()
			@closed = null

	###
	Retrieve a file on the server

	@param path: <string> The path of your file
	@param callback: <function> Callback method
	###
	get: (path, callback) ->
		console.log "get", path
		@sftp.readFile path, "utf-8", (error, data) =>
			console.log error, data.toString()

	###
	Upload a file to the server

	@param local_path: <string> The local path of your file
	@param remote_path: <string> The remote path where you want your file to be uploaded at
	@param callback: <function> Callback method
	###
	upload: (local_path, remote_path, callback) ->
		@connection.put local_path, remote_path, callback

	###
	Delete a file from the server

	@param remote_path: <string> The remote path you want to delete
	@param callback: <function> Callback method
	###
	delete: (remote_path, callback) ->
		@connection.delete local_path, callback

	###
	Create a directory

	@param path: <string> The path of the directory you want to create
	@param callback: <function> Callback method
	###
	mkdir: (path, callback) ->
		@connection.mkdir path, true, callback


		