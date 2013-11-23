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
		@sftp = new ssh2()
		@sftp.on "error", => @failed.dispatch() unless @closing
		@sftp.on "close", (hadError) =>
			if @hadError
				@failed.dispatch() unless @closing
		@sftp.on "ready", =>
			@sftp.sftp (error, connection) =>
				return @failed.dispatch() if error

				@connection = connection
				@connected.dispatch()

	###
	Connect to the FTP
	@param config <object> Configuration file for your connection
	###
	connect: (config) ->
		@sftp.connect
			host		: config.host
			port		: config.port
			username	: config.user
			password	: config.pass
			privateKey	: config.privateKey
			publicKey	: config.publicKey

	###
	Close the connection
	###
	close: (callback) ->
		return if @closing
		@closing = true

		@sftp.on "end", => @closed.dispatch()
		@sftp.end()

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
		@connection.readFile path, "utf-8", callback

	###
	Upload a file to the server

	@param local_path: <string> The local path of your file
	@param remote_path: <string> The remote path where you want your file to be uploaded at
	@param callback: <function> Callback method
	###
	upload: (local_path, remote_path, callback) ->
		@connection.fastPut local_path, remote_path, callback

	###
	Delete a file from the server

	@param remote_path: <string> The remote path you want to delete
	@param callback: <function> Callback method
	###
	delete: (remote_path, callback) ->
		# Split the path of the file
		i = remote_path.lastIndexOf "/"
		paths = []
		while i > 0
			content = remote_path.slice 0, i
			paths.push content
			i = content.lastIndexOf "/"

		@connection.unlink remote_path, (error) =>
			return callback.apply(this, [error]) if error
			@_rdelete paths, callback

	###
	@private
	Delete directories recursively
	###
	_rdelete: (paths, callback) ->
		path = paths.shift()
		@connection.opendir path, (error, handle) => # Open the directory
			return callback.apply(this, [error]) if error

			@connection.readdir handle, (error, list) => # Read the directory
				return callback.apply(this, [error]) if error or paths.length == 0 # If any errors reading the folder, just call the callback
				if list.length <= 2 # 2 because it includes the "." and ".."
					@connection.rmdir path, (error) => # Remove the directory if the directory is empty
						return callback.apply(this, [error]) if error or paths.length == 0 # If any errors reading the folder, just call the callback
						@_rdelete paths, callback # Keep cleaning the rest
				else
					return callback.apply(this, [error])


	###
	Create a directory

	@param path: <string> The path of the directory you want to create
	@param callback: <function> Callback method
	###
	mkdir: (path, callback) ->
		i = path.length
		paths = []
		while i > 0
			content = path.slice 0, i
			paths.push content
			i = content.lastIndexOf "/"

		@_rmkdir paths, callback

	###
	@private
	Create directories recursively
	###
	_rmkdir: (paths, callback) ->
		path = paths.pop()
		@connection.opendir path, (error, handle) =>
			if error
				@connection.mkdir path, (error) =>
					return callback.apply(this, [error]) if error or paths.length == 0
					@_rmkdir paths, callback
			else
				return callback.apply(this, [undefined]) if paths.length == 0
				@_rmkdir paths, callback