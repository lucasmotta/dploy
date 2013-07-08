colors	= require "colors"
fs 		= require "fs"
YAML 	= require "yamljs"
Signal	= require "signals"
exec	= require("child_process").exec
argv 	= require("optimist").argv

FTP 	= require "./ftp"
SFTP 	= require "./sftp"


module.exports = class Deploy

	server 			: null

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

	constructor: (@server = "default") ->
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
			# If no arguments were found, use the "default" setup
			@config = YAML.parse(data.toString())[@server]
			unless @config
				return console.log "Error:".bold.red, "We couldn't find the settings for " + "#{@server}".bold.red
				process.exit(code=0)

			@revisionPath = if @config.path.local then @config.path.local + @config.revision else @config.revision
			
			# Call git
			@setupGit()

	setupGit: ->
		console.log "Connecting to ".bold.yellow + "#{@server}".bold.underline.yellow + "...".bold.yellow

		# Get the HEAD hash id so we can compare to the hash on the server
		exec "git log --pretty=format:'%H' -n 1", (error, stdout, stderr) =>
			return console.log "This is not a valid .git repository.".bold.red if error
			@local_hash	= stdout

			# Call the FTP
			@setupFTP()

	setupFTP: ->
		# Create a new instance of the FTP
		@connection = new SFTP()
		@connection.failed.add => return console.log "Connection failed.".bold.red unless @isConnected
		@connection.connected.add =>
			@isConnected = true
			@numConnections++
			@connections.push @connection

			# Once is connected, check the revision files
			@checkRevision()

		# Connect using the config information
		@connection.connect @config


	setupMultipleFTP: ->
		con = new SFTP()
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
			console.log "No diffs between local and remote :)".blue
			return @removeConnections()

		# Call git to get the tree list of the modified items
		exec "git diff --name-status #{old_rev} #{new_rev}", { maxBuffer: 5000*1024 }, (error, stdout, stderr) =>
			return console.log "This is not a valid .git repository. #{error}".bold.red if error

			# Add the revision file
			@toUpload.push name:@revisionPath

			# Split the lines to get a list of items
			files = stdout.split "\n"
			for detail in files
				# Check if the file was deleted, modified or added
				data = detail.split "\t"
				if data.length > 1
					# The file was deleted
					if data[0] == "D"
						@toDelete.push name:data[1] if @canDelete data[1]
					# Everything else
					else
						@toUpload.push name:data[1] if @canUpload data[1]
						
			# Start uploading the files
			@upload @connection
			i = @config.slots - 1
			@setupMultipleFTP() while i-- > 0

	# Add the entire tree to our "toUpload" group
	addAll: ->
		console.log "Uploading files...".bold.yellow

		# Call git to get the tree list of all our tracked files
		exec "git ls-tree -r --name-only HEAD", { maxBuffer: 5000*1024 }, (error, stdout, stderr) =>
			return console.log "This is not a valid .git repository.".bold.red if error
			
			# Add the revision file
			@toUpload.push name:@revisionPath

			# Split the lines to get individual files
			files = stdout.split "\n"
			for detail in files
				# Add them to our "toUpload" group
				@toUpload.push name:detail if @canUpload detail
			
			# Start uploading the files
			@upload @connection
			i = @config.slots - 1
			@setupMultipleFTP() while i-- > 0

	# Method to check if you can upload those files or not
	canUpload: (name) =>
		# Return false if the name is empty
		return no if name.length <= 0

		# Check if your are settings the local path
		if @config.path.local
			# Check if the name of the file matchs with the local path
			# And also ignore where the revision file is
			if name.indexOf(@config.path.local) == 0 or name.indexOf(@config.revision) >= 0
				return yes
			else
				return no
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
			

	upload: (ftp) ->
		# Files to delete
		if @toDelete.length
			# We loop between all the files that we need to delete until they are all done.
			for item in @toDelete
				unless item.started
					@deleteItem ftp, item
					return

		# Files to upload
		if @toUpload.length
			# We loop between all files that wee need to upload until they are all done
			for item in @toUpload
				unless item.started
					@addItem ftp, item
					return


		for item in @toDelete
			return console.log "todelete", item.name if !item.completed

		for item in @toUpload
			return console.log "toupload", item.name if !item.completed

		# Everything is updated, we can finish the process now.
		@removeConnections()


	# Check if the file is inside subfolders
	# If it's is, create the folders first and then upload the file.
	addItem: (ftp, item) =>
		item.started = true

		# If you set a local path, we need to replace the remote name to match the remote path
		if @config.path.local
			remoteName = item.name.split(@config.path.local).join("")
		else
			remoteName = item.name

		# Split the name to see if there's folders to create
		nameSplit = remoteName.split "/"

		# If there is, we will have to create the folders
		if nameSplit.length > 1
			nameSplit.length = nameSplit.length - 1
			folder = nameSplit.join("/")

			if @dirCreated[folder]
				@uploadItem ftp, item
				return

			# Create the folder recursively in the server 
			ftp.mkdir @config.path.remote + folder, (error) =>
				unless @dirCreated[folder]
					if error
						# console.log "[ + ]".green, "Fail creating directory: #{folder}:".red
					else
						# console.log "[ + ]".green, "Directory created: #{folder}:".green unless @dirCreated[folder]
						# Set the folder as created
						@setFolderAsCreated folder
				
				if error
					item.started = false
					@upload ftp
				else
					# Upload the file once the folder is created
					@uploadItem ftp, item

		else
			# No folders need to be created, so we just upload the file
			@uploadItem ftp, item

	# Upload the file to the remote path
	uploadItem: (ftp, item) =>
		# If you set a local path, we need to replace the remote name to match the remote path
		if @config.path.local
			remoteName = item.name.split(@config.path.local).join("")
		else
			remoteName = item.name

		# Set the entire remote path
		remote_path = @config.path.remote + remoteName

		# Upload the file to the FTP
		ftp.upload item.name, remote_path, (error) =>
			if error
				console.log "[ + ]".blue, "Fail uploading file #{item.name}:".red, error
				item.started = false
				item.completed = false
			else
				console.log "[ + ]".blue + " File uploaded: #{item.name}:".blue
				item.completed = true

			# Keep uploading the rest
			@upload ftp

	# Delete an item from the remote server
	deleteItem: (ftp, item) =>
		item.started = true

		# If you set a local path, we need to replace the remote name to match the remote path
		if @config.path.local
			remoteName = item.name.split(@config.path.local).join("")
		else
			remoteName = item.name

		# Set the entire remote path
		remote_path = @config.path.remote + remoteName

		# Delete the file from the server
		ftp.delete remote_path, (error) =>
			if error
				console.log "[ × ]".grey, "Fail deleting file #{item.name}:".red
			else
				console.log "[ × ]".grey, "File Deleted: #{item.name}:".grey

			item.completed = true

			# Keep uploading the rest
			@upload ftp


	removeConnections: =>
		for con in @connections
			con.closed.add =>
				@numConnections--
				@complete() if @numConnections == 0
			con.close()

	# Dispose the connections
	dispose: =>
		if @completed
			con.dispose() for con in @connections

			@completed.dispose()
			@completed = null

	# Everything is completed.
	complete: =>
		# Delete the revision file and complete :)
		fs.unlink @revisionPath, (err) =>
			console.log "Uploaded completed for ".green + "#{@server}".bold.green
			@completed.dispatch()

