
path = require "path"

module.exports = (grunt) ->

	# Load tasks
	Object.keys(require("./package.json").dependencies).forEach (dep) -> grunt.loadNpmTasks dep if dep.substring(0,6) is "grunt-"

	# Project configuration
	grunt.initConfig
		# Clean directories
		clean:
			source: ["js"]
			release: ["release"]

		# Compile CoffeeScript
		coffee:
			compile:
				options:
					bare: true
					sourceMap: true
				expand: true
				cwd: "coffee"
				src: ["**/*.coffee"]
				dest: "js"
				ext: ".js" 

		
		# Compile Stylus
		stylus: 
			source: 
				options:
					compress: false
					urlfunc: "embed"
				files: 
					"style/main.css": "style/main.styl"

			release: 
				options:
					compress: true
					urlfunc: "embed"
				files: 
					"release/style/main.css": "css/main.styl"
		

		# Watch for changes
		watch:
			coffee:
				files: ["coffee/**/*.coffee"]
				options:
					nospawn: true
			
			stylus:
				files: ["style/**/*.styl"]
				tasks: ["stylus:source"]
			

		

		# Notify messages
		notify:
			source:
				options:
					title: "dploy - LMFM"
					message: "Compilation completed and now watching for changes..."
			
			watch:
				options:
					title: "dploy - LMFM"
					message: "File updated."

			failed:
				options:
					title: "dploy - LMFM"
					message: "Error on the compilation"

	
	grunt.registerTask "hasFailed", ->
		if grunt.fail.errorcount > 0
			grunt.fail.errorcount = 0
			grunt.task.run "notify:failed"
		# else
		# 	grunt.task.run "notify:watch"
	

	# Watch for file changes
	grunt.event.on "watch", (action, filepath) ->
		# Return if it's not a Coffee file
		return if filepath.indexOf(".coffee") < 0

		# Get the path of the coffee files
		source_coffee = "coffee"
		source_js = "js"
		file_name = filepath.split("#{source_coffee}/").join("")
		notification = null
		tasks = []

		grunt.option "force", true

		if action is "deleted"
			# Change the coffee path to the js path
			# And also change the "coffee" extension to "js"
			filepath = filepath.split(source_coffee).join(source_js)
			filepath = filepath.split(".coffee").join(".js")
			notification = "The file #{file_name} was deleted."
			tasks = ["clean", "notify:watch"]

			# Delete a specific file and notify that the file was deleted
			grunt.config ["clean"], [filepath]
			grunt.config ["notify", "watch", "options", "message"], notification
			grunt.task.run tasks
		else
			# Remove the path from the file that was changed
			filepath = filepath.split(source_coffee).join("")
			filepath = filepath.slice(1, filepath.length) if filepath.indexOf("/") is 0
			notification = if action is "changed" then "The file #{file_name} was updated!" else "The file #{file_name} was created!"
			tasks = ["coffee", "hasFailed"]
			
			grunt.config ["notify", "watch", "options", "message"], notification
			grunt.config ["notify", "failed", "options", "message"], "Failed to compile #{file_name}"
			grunt.config ["coffee", "compile", "src"], filepath

			# Run the the CoffeeScript and check for errors
			grunt.task.run tasks


	grunt.registerTask "default", ["clean:source","coffee","stylus:source","notify:source","watch"]
	