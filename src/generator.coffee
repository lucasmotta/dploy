colors	= require "colors"
fs 		= require "fs"
exec	= require("child_process").exec

module.exports = class Generator

	fileName : ".git/hooks/post-commit"

	constructor: ->

		# Generate the content of the post-commit hook
		# TODO Create from an external file
		content	= '#!/bin/bash' + '\n\n'
		content	+= 'message=$(git log -1 --all --pretty=%B)' + '\n'
		content	+= 'tag="#gploy"' + '\n'
		content	+= 'if [[ "$message" = *"$tag"* ]]; then' + '\n'
		content	+= '\tservers=${tag}${message#*${tag}}' + '\n'
		content	+= '\tnoTag=${servers//#/""}' + '\n'
		content	+= '\teval $noTag' + '\n'
		content	+= 'fi'

		fs.writeFile @fileName, content, (error) ->
			return console.log "Error:".bold.red, "The post-commit file could not be created. Check the permissions of the folder.".red if error

			fs.chmod @fileName, "0755", (error) ->
				return console.log "Done!".bold.green + " Your project is ready to #gploy :) ".green
