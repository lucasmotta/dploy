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
		

		# Watch for changes
		watch:
			coffee:
				files: ["src/**/*.coffee"]
				tasks: ["coffee"]

	grunt.registerTask "default", ["coffee"]