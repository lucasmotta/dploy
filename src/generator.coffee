colors	= require "colors"
fs 		= require "fs"
path	= require "path"
Signal	= require "signals"

module.exports = class Generator


	constructor: ->
		@_gployCompleted = new Signal()
		@_gployCompleted.add @_generatePostCommit

		@_postCommitCompleted = new Signal()
		@_postCommitCompleted.add @_completed

		console.log "Installing ".yellow + "GPLOY".bold.yellow + "...".yellow

		@_generateGPLOY()

	_generateGPLOY: =>
		fileName = "gploy.yaml"

		# If the file does not exist, copy the generator example to user's folder
		fs.createReadStream(path.resolve(__dirname, "../generator/gploy.yaml")).pipe(fs.createWriteStream(fileName)) unless fs.existsSync fileName

		@_gployCompleted.dispatch()


	# Generate the content of the post-commit hook
	_generatePostCommit: =>
		# Ignore the installation if it's not a .git repository
		return @_postCommitCompleted.dispatch() unless fs.existsSync ".git"
			
		fileName = ".git/hooks/post-commit"
		content	= fs.readFileSync(path.resolve(__dirname, "../generator/post-commit")).toString()

		# Check if the file already exists
		if fs.existsSync fileName
			# If it does, read the content to see if the command already exists in the file
			fileData = fs.readFileSync(fileName).toString()
			if fileData.toLowerCase().indexOf("gploy") >= 0
				return @_postCommitCompleted.dispatch()
			
			# Remove the bash import if it's already there
			content = content.replace(new RegExp("#!\/bin\/bash", "g"), "") if fileData.indexOf("#!/bin/bash") >= 0

		# Append the command to the file
		fs.appendFile fileName, content, (error) =>
			if error
				console.log "Error:".bold.red, "The post-commit file could not be created. Check the permissions of the folder.".red
				return @_postCommitCompleted.dispatch()

			fs.chmodSync fileName, "0755"
			@_postCommitCompleted.dispatch()
	
	_completed: =>
		console.log "Done!".bold.green + " Your project is ready to ".green + "GPLOY".green.bold + " :) ".green
		process.exit(code=0)