colors		= require "colors"
path 		= require "path"
fs			= require "fs"
YAML		= require "yamljs"
Signal		= require "signals"
expand		= require "glob-expand"
minimatch	= require "minimatch"
prompt		= require "prompt"
exec		= require("child_process").exec


module.exports = class Deploy

	server 			: null
	ignoreInclude	: null

	local_hash		: null
	remote_hash		: null
	connection		: null
	revisionPath 	: null

	connections 	: null
	numConnections 	: null
	toUpload		: null
	toDelete		: null
	dirCreated		: null

	isConnected 	: null
	completed 		: null

	###
	@constructor

	@param	config (optional)		Default configuration for this server
	@param	server (optional)		Set the server to load from the YAML file
	@param	ignoreInclude (false)	Ignore the 'include' tag
	###
	constructor: (@config, @server, @ignoreInclude = false) ->
		@completed		= new Signal()
		@connections	= []
		@numConnections	= 0
		@toUpload		= []
		@toDelete		= []
		@dirCreated		= {}
		@isConnected	= false

		# Set the default messages for the prompt
		prompt.message = "– ".red
		prompt.delimiter = ""

		# If you set a config file, go straight to the @configLoaded
		# Otherwise load the dploy.yaml
		if @config? then @configLoaded() else @loadYAML()

	###
	Load the dploy.yaml, parse and find the current server
	###
	loadYAML: ->
		# Load the config file
		fs.readFile "dploy.yaml", (error, data) =>
			if error
				return console.log "Error:".bold.red, "The file \"dploy.yaml\" could not be found."
				process.exit(code=0)

			# Set the config file based on the arguments
			# If no arguments were found, use the first environment on the file
			yaml = YAML.parse(data.toString())
			unless @server
				for key of yaml
					@server = key
					break

			@config = yaml[@server]
			unless @config
				return console.log "Error:".bold.red, "We couldn't find the settings for " + "#{@server}".bold.red
				process.exit(code=0)

			@configLoaded()

	###
	Method for when the config file is loaded
	###
	configLoaded: ->
		@setupFallbackConfig()
		@checkPassword @checkBranch

	###
	Set the fallback configuration
	###
	setupFallbackConfig: ->
		# If the server name doesn't exist, use the host name
		@server ?= @config.host

		@config.scheme ?= "ftp"
		@config.port ?= (if @config.scheme is "ftp" then 21 else 22)
		@config.secure ?= false
		@config.secureOptions ?= {}
		@config.slots ?= 1
		@config.revision ?= ".rev"
		@config.path ?= {}
		@config.path.local ?= ""
		@config.path.remote ?= ""
		@config.exclude ?= []
		@config.include ?= {}

		# Fix the paths
		regExpPath = new RegExp("(.*[^/]$)")
		@config.path.local = "" if @config.path.local is "/"
		@config.path.local = @config.path.local.replace(regExpPath, "$1/") if @config.path.local isnt ""
		@config.path.remote = @config.path.remote.replace(regExpPath, "$1/") if @config.path.remote isnt ""

		# Set the revision path
		@revisionPath = if @config.path.local then @config.path.local + @config.revision else @config.revision
		
		@

	###
	This method will double check for the password, publicKey and privateKey
	If none of those are found, DPLOY will prompt you to type it

	@param	callback 				The callback for when the password is found
	###
	checkPassword: (callback) ->
		# If the password is set, just keep it going
		return callback.call(this) if @config.pass

		# Load the privateKey and publicKey if there's one (only for SFTP)
		if @config.privateKey or @config.publicKey and @config.scheme is "sftp"
			if @config.privateKey
				@config.privateKey = fs.readFileSync @_resolveHomeFolder(@config.privateKey)
			if @config.publicKey
				@config.publicKey = fs.readFileSync @_resolveHomeFolder(@config.publicKey)

			return callback.call(this)
		
		# If no password, privateKey or publicKey is found, prompt the user to enter the password
		prompt.get [
			name: "password"
			description: "Enter the password for ".red + "#{@config.host}:".underline.bold.red
			required: true
			hidden: true
			], (error, result) =>
				@config.pass = result.password
				callback.call(this)
		return

	###
	Check if the branch you are working on can be deployed to that server
	###
	checkBranch: ->
		return @setupGit() unless @config.branch

		@config.branch = [@config.branch] if typeof @config.branch is "string"

		exec "git rev-parse --abbrev-ref HEAD", (error, stdout, stderr) =>
			return console.log "An error occurred when retrieving the current branch.".bold.red, error if error
			currentBranch = stdout.replace /\s/g, ""

			for branch in @config.branch
				return @setupGit() if currentBranch is branch

			console.log "Error: ".red.bold + "You are not allowed to deploy from ".red + "#{currentBranch}".bold.underline.red + " to ".red + "#{@server}".bold.underline.red
			@removeConnections(false)


	###
	Get the HEAD hash id so we can compare to the hash on the server
	###
	setupGit: ->
		console.log "Connecting to ".bold.yellow + "#{@server}".bold.underline.yellow + "...".bold.yellow

		exec "git log --pretty=format:%H -n 1", (error, stdout, stderr) =>
			return console.log "An error occurred when retrieving the local hash.".bold.red, error if error
			@local_hash	= stdout

			# Call the server
			@setupServer()

	###
	Connect to the server and once it's done, check for the remote revision file
	###
	setupServer: ->
		# Create a new instance of your server based on the scheme
		scheme = require("./scheme/#{@config.scheme}")
		@connection = new scheme()
		@connection.failed.add => return console.log "Connection failed.".bold.red unless @isConnected
		@connection.connected.add =>
			@isConnected = true
			@numConnections++
			@connections.push @connection

			# Once is connected, check the revision files
			@checkRevision()

		# Connect using the config information
		@connection.connect @config

	###
	Create more connections of your server for multiple uploads
	###
	setupMultipleServers: ->
		scheme = require("./scheme/#{@config.scheme}")
		con = new scheme()
		con.connected.add =>
			# Once is connected, check the revision files
			@connections.push con
			@numConnections++
			@nextOnQueue con

		# Connect using the config information
		con.connect @config

	###
	Check if the revision files exist, if not we will create one
	###
	checkRevision: ->
		console.log "Checking revisions...".bold.yellow
		
		# Retrieve the revision file from the server so we can compare to our local one
		remotePath = @_normalize(@config.path.remote + @config.revision)
		@connection.get remotePath, (error, data) =>
			# If the file was not found, we need to create one with HEAD hash
			if error
				fs.writeFile @revisionPath, @local_hash, (error) =>
					return console.log "Error creating revision file at:".red, "#{@revisionPath}".red.bold.underline, error if error

					# Since this is our first upload, we will upload our entire local tree
					@addAll()
				return

			# Update our local revision file with the HEAD hash
			fs.writeFileSync @revisionPath, @local_hash

			# If the remote revision file exists, let's get it's content
			if typeof data is "string"
				@remote_hash = @_removeSpecialChars(data)
				@checkDiff @remote_hash, @local_hash
			else
				data.on "data", (e) =>
					data.end()
					@remote_hash = @_removeSpecialChars(e.toString())
					@checkDiff @remote_hash, @local_hash


	###
	Get the diff tree between the local and remote revisions

	@param	old_rev					The remote hash, usually it's the old version
	@param	new_rev					The local hash, usually the latest one
	###
	checkDiff: (old_rev, new_rev) ->
		# If any of the revisions is empty, add all
		return @addAll() if not /([^\s])/.test(old_rev) or not /([^\s])/.test(new_rev)

		console.log "Checking diffs between".bold.yellow, "[#{old_rev}]".yellow, ">".yellow, "[#{new_rev}]".yellow

		# If both revisions are the same, our job is done.
		# We can finish the process.
		if old_rev is new_rev
			if @config.include
				@includeExtraFiles()
				if @config.check then @askBeforeUpload() else @startUploads()
				return
			else
				console.log "No diffs between local and remote :)".blue
				return @removeConnections()

		# Call git to get the tree list of the modified items
		exec "git diff --name-status #{old_rev} #{new_rev}", { maxBuffer: 5000*1024 }, (error, stdout, stderr) =>
			return console.log "An error occurred when retrieving the 'git diff --name-status #{old_rev} #{new_rev}'".bold.red, error if error

			# Add the revision file
			@toUpload.push name:@revisionPath, remote:@config.revision

			# Split the lines to get a list of items
			files = stdout.split "\n"
			for detail in files
				# Check if the file was deleted, modified or added
				data = detail.split "\t"
				if data.length > 1
					# If you set a local path, we need to replace the remote name to match the remote path
					remoteName = if @config.path.local then data[1].split(@config.path.local).join("") else data[1]

					# The file was deleted
					if data[0] == "D"
						@toDelete.push name:data[1], remote:remoteName if @canDelete data[1]
					# Everything else
					else
						@toUpload.push name:data[1], remote:remoteName if @canUpload data[1]

			@includeExtraFiles()
			if @config.check then @askBeforeUpload() else @startUploads()
			return

	###
	Add the entire tree to our "toUpload" group
	###
	addAll: ->
		console.log "Uploading files...".bold.yellow

		# Call git to get the tree list of all our tracked files
		exec "git ls-tree -r --name-only HEAD", { maxBuffer: 5000*1024 }, (error, stdout, stderr) =>
			return console.log "An error occurred when retrieving 'git ls-tree -r --name-only HEAD'".bold.red, error if error
			
			# Split the lines to get individual files
			files = stdout.split "\n"
			for detail in files
				# If you set a local path, we need to replace the remote name to match the remote path
				remoteName = if @config.path.local then detail.split(@config.path.local).join("") else detail

				# Add them to our "toUpload" group
				@toUpload.push name:detail, remote:remoteName if @canUpload detail

			# Add the revision file
			@toUpload.push name:@revisionPath, remote:@config.revision
			
			@includeExtraFiles()
			if @config.check then @askBeforeUpload() else @startUploads()
			return
			

	###
	Include extra files from the config file
	###
	includeExtraFiles: ->
		return no if @ignoreInclude

		for key of @config.include
			files = expand({ filter: "isFile", cwd:process.cwd() }, key)
			# Match the path of the key object to remove everything that is not a glob
			match = path.dirname(key).match(/^[0-9a-zA-Z_\-/\\]+/)
			for file in files
				# If there's any match for this key, we remove from the remote file name
				# And we also clean the remote url
				remoteFile = if match and match.length then file.substring match[0].length else file
				remoteFile = @config.include[key] + remoteFile
				remoteFile = remoteFile.replace(/(\/\/)/g, "/")

				@toUpload.push name:file, remote:remoteFile
		yes


	###
	Method to check if you can upload those files or not

	@param	name (string)			The local file name
	@return <boolean> if you can delete or not
	###
	canUpload: (name) =>
		# Return false if the name is empty
		return no if name.length <= 0

		# Check if your are settings the local path
		if @config.path.local
			# Check if the name of the file matchs with the local path
			# And also ignore where the revision file is
			return no if name.indexOf(@config.path.local) < 0

		for exclude in @config.exclude
			return no if minimatch(name, exclude)

		yes

	###
	Method to check if you can delete those files or not

	@param	name (string)			The local file name
	@return <boolean> if you can delete or not
	###
	canDelete: (name) =>
		# Return false if the name is empty
		return no if name.length <= 0

		# Check if your are settings the local path
		if @config.path.local
			# Check if the name of the file matchs with the local path
			# And also ignore where the revision file is
			if name.indexOf(@config.path.local) == 0
				return yes
			else
				return no
		yes
	
	###
	Get the user's confirmation before uploading the file
	###
	askBeforeUpload: ->
		return unless @hasFilesToUpload()

		if @toDelete.length
			console.log "Files that will be deleted:".bold.red
			for file in @toDelete
				console.log("[ ? ]".grey, "#{file.remote}".red)

		if @toUpload.length
			console.log "Files that will be uploaded:".bold.blue
			for file in @toUpload
				remoteFile = @_normalize(@config.path.remote + file.remote)
				console.log("[ ? ]".blue, "#{file.name}".blue, ">".green, "#{remoteFile}".blue)

		prompt.start()
		prompt.get [
			name: "answer"
			pattern: /y|n|Y|N/
			description: "Are you sure you want to upload those files?".bold.red + " (Y/n)"
			message: "The answer should be YES (y) or NO (n)."
			], (error, result) =>
				if result.answer.toLowerCase() is "y" or result.answer.toLowerCase() is ""
					@startUploads()
				else
					console.log "Upload aborted by the user.".red
					@removeConnections(false)

	###
	Start the upload and create the other connections if necessary
	###
	startUploads: ->
		return unless @hasFilesToUpload()

		@nextOnQueue @connection
		i = @config.slots - 1
		@setupMultipleServers() while i-- > 0
		return

	###
	Check if there's file to upload/delete

	@return <boolean> if there's files or not
	###
	hasFilesToUpload: ->
		if @toUpload.length == 0 and @toDelete.length == 0
			console.log "No files to upload".blue
			@removeConnections()
			return no
		yes

	###
	Upload or delete the next file in the queue
	
	@param	connection 				The FTP/SFTP connection to use
	###
	nextOnQueue: (connection) ->
		# Files to delete
		if @toDelete.length
			# We loop between all the files that we need to delete until they are all done.
			for item in @toDelete
				unless item.started
					@deleteItem connection, item
					return

		# Files to upload
		if @toUpload.length
			# We loop between all files that wee need to upload until they are all done
			for item in @toUpload
				unless item.started
					@checkBeforeUpload connection, item
					return


		for item in @toDelete
			return if not item.completed

		for item in @toUpload
			return if not item.completed

		# Everything is updated, we can finish the process now.
		@removeConnections()


	###
	Check if the file is inside subfolders
	If it's is, create the folders first and then upload the file.
	###
	checkBeforeUpload: (connection, item) =>
		item.started = true

		# Split the name to see if there's folders to create
		nameSplit = item.remote.split "/"

		# If there is, we will have to create the folders
		if nameSplit.length > 1
			nameSplit.length = nameSplit.length - 1
			folder = nameSplit.join("/")

			if @dirCreated[folder]
				@uploadItem connection, item
				return

			# Create the folder recursively in the server
			connection.mkdir @_normalize(@config.path.remote + folder), (error) =>
				unless @dirCreated[folder]
					if error
						# console.log "[ + ]".green, "Fail creating directory: #{folder}:".red
					else
						# console.log "[ + ]".green, "Directory created: #{folder}:".green unless @dirCreated[folder]
						# Set the folder as created
						@setFolderAsCreated folder
				
				if error
					item.started = false
					@nextOnQueue connection
				else
					# Upload the file once the folder is created
					@uploadItem connection, item

		else
			# No folders need to be created, so we just upload the file
			@uploadItem connection, item

	###
	Upload the file to the remote directory
	
	@param	connection 				The FTP/SFTP connection to use
	@param 	item 					The item to upload
	###
	uploadItem: (connection, item) =>
		# Set the entire remote path
		remote_path = @_normalize(@config.path.remote + item.remote)

		# Upload the file to the server
		connection.upload item.name, remote_path, (error) =>
			if error
				console.log "[ + ]".blue, "Fail uploading file #{item.name}:".red, error
				item.started = false
				item.completed = false
			else
				console.log "[ + ]".blue + " File uploaded: #{item.name}:".blue
				item.completed = true

			# Keep uploading the rest
			@nextOnQueue connection

	###
	Delete an item from the remote server

	@param	connection 				The FTP/SFTP connection to use
	@param 	item 					The item to delete
	###
	deleteItem: (connection, item) =>
		item.started = true

		# Set the entire remote path
		remote_path = @_normalize(@config.path.remote + item.remote)

		# Delete the file from the server
		connection.delete remote_path, (error) =>
			if error
				console.log "[ × ]".grey, "Fail deleting file #{remote_path}:".red
			else
				console.log "[ × ]".grey, "File deleted: #{remote_path}:".grey

			item.completed = true

			# Keep uploading the rest
			@nextOnQueue connection
	
	###
	When we are creating the folders in the remote server we got make sure
	we don't try to rec-reate they, otherwise expect chaos
	###
	setFolderAsCreated: (folder) =>
		i = folder.lastIndexOf "/"

		return if @dirCreated[folder]

		while i > 0
			content = folder.slice 0, i
			@dirCreated[content] = true
			i = content.lastIndexOf "/"

		@dirCreated[folder] = true

	###
	Remove/destroy all connections

	@param displayMessage <true>	Set if you want to display a message for when the upload is completed
	###
	removeConnections: (displayMessage = true) =>
		if @numConnections > 0
			for con in @connections
				con.closed.add =>
					@numConnections--
					@complete(displayMessage) if @numConnections == 0
				con.close()
		else
			@complete(displayMessage)

	###
	Remove/destroy all connections
	###
	dispose: =>
		if @completed
			con.dispose() for con in @connections

			@completed.dispose()
			@completed = null

	###
	When everything is completed

	@param displayMessage <true>	Set if you want to display a message for when the upload is completed
	###
	complete: (displayMessage) =>
		# Delete the revision file localy and complete :)
		fs.unlink @revisionPath, (err) =>
			console.log "Upload completed for ".green + "#{@server}".bold.underline.green if displayMessage
			@completed.dispatch()


	# Change backslashes to forward slashes on Windows
	_normalize: (str) -> path.normalize(str).replace /\\+/g, "/"

	# Remove special chars
	_removeSpecialChars: (str) -> str.replace /[\W]/g, ""

	# Resolve User's home folder
	_resolveHomeFolder: (str) ->
		homeFolder = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE)
		return path.resolve path.join(homeFolder, str.substr(1)) if str.substr(0, 1) is "~"
		str
