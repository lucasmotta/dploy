ftp		= require "ftp"
Signal	= require "signals"

module.exports = class FTP

	
	connection	: null
	connected	: null
	failed		: null
	closed		: null

	constructor: ->
		@connected	= new Signal()
		@failed		= new Signal()
		@closed		= new Signal()

		# Create a new instance of the FTP
		@connection = new ftp()
		@connection.on "error", => @failed.dispatch()
		@connection.on "ready", => @connected.dispatch()

	###
	Connect to the FTP

	@param config <object> Configuration file for your connection
	###
	connect: (config) ->
		@connection.connect
			host		: config.host
			port		: config.port
			user		: config.user
			password	: config.pass

	###
	Close the connection
	###
	close: (callback) ->
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
		@connection.get path, callback

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
		@connection.delete remote_path, callback

	###
	Create a directory

	@param path: <string> The path of the directory you want to create
	@param callback: <function> Callback method
	###
	mkdir: (path, callback) ->
		@connection.mkdir path, true, callback


		