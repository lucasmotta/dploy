colors	= require "colors"
fs 		= require "fs"
exec	= require("child_process").exec

module.exports = class Generator

	fileName : ".git/hooks/post-commit"

	constructor: ->
		@_generatePostCommit()

	# Generate the content of the post-commit hook
	# TODO Create from an external file
	_generatePostCommit: ->
		fileName = @fileName

		content	= '#!/bin/bash' + '\n\n'
		content += "# GPLOY\n"
		content	+= 'message=$(git log -1 --all --pretty=%B)' + '\n'
		content	+= 'tag="#gploy"' + '\n'
		content	+= 'if [[ "$message" = *"$tag"* ]]; then' + '\n'
		content	+= '\tservers=${tag}${message#*${tag}}' + '\n'
		content	+= '\tnoTag=${servers//#/""}' + '\n'
		content	+= '\teval $noTag' + '\n'
		content	+= 'fi\n'

		if fs.existsSync fileName
			fileData = fs.readFileSync(fileName).toString()
			if fileData.toLowerCase().indexOf("gploy") >= 0
				return console.log "Done!".bold.green + " Your project already had gploy installed :) ".green
			
			# Remove the bash import if it's already there
			content = content.replace(new RegExp("#!\/bin\/bash", "g"), "") if fileData.indexOf("#!/bin/bash") >= 0

		fs.appendFile fileName, content, (error) ->
			return console.log "Error:".bold.red, "The post-commit file could not be created. Check the permissions of the folder.".red if error

			fs.chmodSync fileName, "0755"
			console.log "Done!".bold.green + " Your project is ready to #gploy :) ".green
