module.exports = (grunt) ->

	# Load tasks
	Object.keys(require("./package.json").devDependencies).forEach (dep) -> grunt.loadNpmTasks dep if dep.substring(0,6) is "grunt-"

	# Project configuration
	grunt.initConfig
		
		# Compile Coffee
		coffee: 
			source: 
				expand: true
				cwd: "src"
				src: ["**/*.coffee"]
				dest: "lib"
				ext: ".js"

		# CoffeeLint
		coffeelint:
			options:
				no_tabs: level: "ignore"
				indentation: level: "ignore"
				max_line_length: level: "ignore"

			source: ["src/**/*.coffee"]

		# Bump files
		bump:
			options:
				pushTo: "origin master"

		# Publish to NPM
		shell:
			publish:
				command: "npm publish"

		# Watch for changes
		watch:
			coffee:
				files: ["src/**/*.coffee"]
				tasks: ["coffee"]


	grunt.registerTask "default", ["coffeelint", "coffee"]
	grunt.registerTask "release", "Release a new version, push it and publish", (target) ->
		target ?= "patch"
		grunt.task.run "coffeelint", "bump-only:#{target}", "coffee", "bump-commit", "shell:publish"