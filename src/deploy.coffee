colors		= require "colors"
fs			= require "fs"
YAML		= require "yamljs"
Signal		= require "signals"
expand		= require "glob-expand"
minimatch	= require "minimatch"
prompt		= require "prompt"
exec		= require("child_process").exec

FTP 	= require "./scheme/ftp"
SFTP 	= require "./scheme/sftp"


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

	constructor: (@server, @ignoreInclude = false) ->
		@completed		= new Signal()
		@connections	= []
		@numConnections	= 0
		@toUpload		= []
		@toDelete		= []
		@dirCreated		= {}
		@isConnected	= false

		# Load the config file
		fs.readFile "gploy.yaml", (error, data) =>
			if error
				return console.log "Error:".bold.red, "The file \"gploy.yaml\" could not be found."
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

			# Setup the default configuration
			@setupDefaultConfig()

			# Set the revision path
			@revisionPath = if @config.path.local then @config.path.local + @config.revision else @config.revision

			# Call git
			@checkBranch()

	# Set the default config
	setupDefaultConfig: ->
		@config.scheme ?= "ftp" 
		@config.port ?= (if @config.scheme is "ftp" then 21 else 22)
		@config.slots ?= 1
		@config.revision ?= ".rev"
		@config.path ?= {}
		@config.path.local ?= ""
		@config.path.remote ?= ""
		@config.exclude ?= []
		@config.include ?= {}


	# Check if the branch you are working on can be deployed to that server
	checkBranch: ->
		@setupGit() unless @config.branch

		@config.branch = [@config.branch] if typeof @config.branch is "string"

		exec "git rev-parse --abbrev-ref HEAD", (error, stdout, stderr) =>
			return console.log "This is not a valid .git repository.".bold.red if error
			currentBranch = stdout.replace /\s/g,''

			for branch in @config.branch
				if currentBranch is branch
					return @setupGit()

			console.log "Error: ".red.bold + "You are not allowed to deploy from ".red + "#{currentBranch}".bold.underline.red + " to ".red + "#{@server}".bold.underline.red
			@removeConnections(false)


	# Get the HEAD hash id so we can compare to the hash on the server
	setupGit: ->
		console.log "Connecting to ".bold.yellow + "#{@server}".bold.underline.yellow + "...".bold.yellow

		exec "git log --pretty=format:'%H' -n 1", (error, stdout, stderr) =>
			return console.log "This is not a valid .git repository.".bold.red if error
			@local_hash	= stdout

			# Call the server
			@setupServer()

	# Connect to your server
	setupServer: ->
		# Create a new instance of your server based on the scheme
		@connection = if @config.scheme is "sftp" then new SFTP() else new FTP()
		@connection.failed.add => return console.log "Connection failed.".bold.red unless @isConnected
		@connection.connected.add =>
			@isConnected = true
			@numConnections++
			@connections.push @connection

			# Once is connected, check the revision files
			@checkRevision()

		# Connect using the config information
		@connection.connect @config

	# Create more connections of your server
	setupMultipleServers: ->
		con = if @config.scheme is "sftp" then new SFTP() else new FTP()
		con.connected.add =>
			# Once is connected, check the revision files
			@connections.push con
			@numConnections++
			@upload con

		# Connect using the config information
		con.connect
			host		: @config.host
			port		: @config.port
			user		: @config.user
			password	: @config.pass


	setFolderAsCreated: (folder) =>
		i = folder.lastIndexOf "/"

		return if @dirCreated[folder]

		while i > 0
			content = folder.slice 0, i
			@dirCreated[content] = true
			i = content.lastIndexOf "/"

		@dirCreated[folder] = true


	# Check if the revision files exist, if not we will have to create one.
	checkRevision: ->
		console.log "Checking revisions...".bold.yellow
		
		# Retrieve the revision file from the server so we can compare to our local one
		@connection.get @config.path.remote + @config.revision, (error, data) =>
			# If the file was not found, we need to create one with HEAD hash
			if error
				fs.writeFile @revisionPath, @local_hash, (error) =>
					return console.log "Error creating revision file.".red if error

					# Since this is our first upload, we will upload our entire local tree
					@addAll()
				return

			# Update our local revision file with the HEAD hash
			fs.writeFileSync @revisionPath, @local_hash

			# If the remote revision file exists, let's get it's content
			if typeof data is "string"
				@remote_hash = data
				@checkDiff @remote_hash, @local_hash
			else
				data.on "data", (e) =>
					data.end()
					@remote_hash = e.toString()

					# Get the diff tree between the local and remote revisions 
					@checkDiff @remote_hash, @local_hash

	# Get the diff tree between the local and remote revisions 
	checkDiff: (old_rev, new_rev) ->
		console.log "Checking diffs...".bold.yellow

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
			return console.log "This is not a valid .git repository. #{error}".bold.red if error

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

	# Add the entire tree to our "toUpload" group
	addAll: ->
		console.log "Uploading files...".bold.yellow

		# Call git to get the tree list of all our tracked files
		exec "git ls-tree -r --name-only HEAD", { maxBuffer: 5000*1024 }, (error, stdout, stderr) =>
			return console.log "This is not a valid .git repository.".bold.red if error
			
			# Add the revision file
			@toUpload.push name:@revisionPath, remote:@config.revision

			# Split the lines to get individual files
			files = stdout.split "\n"
			for detail in files
				# If you set a local path, we need to replace the remote name to match the remote path
				remoteName = if @config.path.local then detail.split(@config.path.local).join("") else detail

				# Add them to our "toUpload" group
				@toUpload.push name:detail, remote:remoteName if @canUpload detail
			
			@includeExtraFiles()
			if @config.check then @askBeforeUpload() else @startUploads()
			return
			

	# Include extra files from the config file
	includeExtraFiles: ->
		return false if @ignoreInclude

		for key of @config.include
			files = expand({ filter: "isFile", cwd:process.cwd() }, key.split(" "))
			for file in files
				@toUpload.push name:file, remote:@config.include[key] + file
		return true


	# Method to check if you can upload those files or not
	canUpload: (name) =>
		# Return false if the name is empty
		return no if name.length <= 0

		# Check if your are settings the local path
		if @config.path.local
			# Check if the name of the file matchs with the local path
			# And also ignore where the revision file is
			return no if name.indexOf(@config.path.local) < 0

		return !minimatch(name, exclude) for exclude in @config.exclude

		yes

	# Method to check if you can delete those files or not
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
	
	askBeforeUpload: ->
		return unless @hasFilesToUpload() 

		scheme = properties:
			answer:
				pattern: /y|n|Y|N/
				description: "Are you sure you want to upload those files?".bold.red + " (y/n)"
				message: "The answer should be YES (y) or NO (y)."
				required: true

		if @toDelete.length
			console.log "Files that will be deleted:".bold.red
			console.log("[ ? ]".grey, "#{file.name}".red) for file in @toDelete

		if @toUpload.length
			console.log "Files that will be uploaded:".bold.blue
			console.log("[ ? ]".blue, "#{file.name}".blue) for file in @toUpload

		prompt.message = "Question"

		prompt.start()
		prompt.get scheme, (error, result) =>
			if result.answer.toLowerCase() == "y"
				@startUploads()
			else
				console.log "Upload aborted by the user.".red
				@removeConnections(false)


	startUploads: ->
		return unless @hasFilesToUpload() 

		@upload @connection
		i = @config.slots - 1
		@setupMultipleServers() while i-- > 0

	hasFilesToUpload: ->
		if @toUpload.length == 0 and @toDelete.length == 0
			console.log "No files to upload".blue
			@removeConnections()
			return false
		return true

	upload: (server) ->
		# Files to delete
		if @toDelete.length
			# We loop between all the files that we need to delete until they are all done.
			for item in @toDelete
				unless item.started
					@deleteItem server, item
					return

		# Files to upload
		if @toUpload.length
			# We loop between all files that wee need to upload until they are all done
			for item in @toUpload
				unless item.started
					@addItem server, item
					return


		for item in @toDelete
			return console.log "todelete", item.name if !item.completed

		for item in @toUpload
			return console.log "toupload", item.name if !item.completed

		# Everything is updated, we can finish the process now.
		@removeConnections()


	# Check if the file is inside subfolders
	# If it's is, create the folders first and then upload the file.
	addItem: (server, item) =>
		item.started = true

		# Split the name to see if there's folders to create
		nameSplit = item.remote.split "/"

		# If there is, we will have to create the folders
		if nameSplit.length > 1
			nameSplit.length = nameSplit.length - 1
			folder = nameSplit.join("/")

			if @dirCreated[folder]
				@uploadItem server, item
				return

			# Create the folder recursively in the server 
			server.mkdir @config.path.remote + folder, (error) =>
				unless @dirCreated[folder]
					if error
						# console.log "[ + ]".green, "Fail creating directory: #{folder}:".red
					else
						# console.log "[ + ]".green, "Directory created: #{folder}:".green unless @dirCreated[folder]
						# Set the folder as created
						@setFolderAsCreated folder
				
				if error
					item.started = false
					@upload server
				else
					# Upload the file once the folder is created
					@uploadItem server, item

		else
			# No folders need to be created, so we just upload the file
			@uploadItem server, item

	# Upload the file to the remote path
	uploadItem: (server, item) =>
		# Set the entire remote path
		remote_path = @config.path.remote + item.remote

		# Upload the file to the server
		server.upload item.name, remote_path, (error) =>
			if error
				console.log "[ + ]".blue, "Fail uploading file #{item.name}:".red, error
				item.started = false
				item.completed = false
			else
				console.log "[ + ]".blue + " File uploaded: #{item.name}:".blue
				item.completed = true

			# Keep uploading the rest
			@upload server

	# Delete an item from the remote server
	deleteItem: (server, item) =>
		item.started = true

		# Set the entire remote path
		remote_path = @config.path.remote + item.remote

		# Delete the file from the server
		server.delete remote_path, (error) =>
			if error
				console.log "[ × ]".grey, "Fail deleting file #{item.name}:".red
			else
				console.log "[ × ]".grey, "File Deleted: #{item.name}:".grey

			item.completed = true

			# Keep uploading the rest
			@upload server


	removeConnections: (displayMessage = true) =>
		if @numConnections > 0
			for con in @connections
				con.closed.add =>
					@numConnections--
					@complete(displayMessage) if @numConnections == 0
				con.close()
		else
			@complete(displayMessage)

	# Dispose the connections
	dispose: =>
		if @completed
			con.dispose() for con in @connections

			@completed.dispose()
			@completed = null

	# Everything is completed.
	complete: (displayMessage) =>
		# Delete the revision file and complete :)
		fs.unlink @revisionPath, (err) =>
			console.log "Upload completed for ".green + "#{@server}".bold.underline.green if displayMessage
			@completed.dispatch()

