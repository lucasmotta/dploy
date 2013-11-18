module.exports = (grunt) ->

	# Load tasks
	Object.keys(require("./package.json").dependencies).forEach (dep) -> grunt.loadNpmTasks dep if dep.substring(0,6) is "grunt-"

	# Project configuration
	grunt.initConfig
		
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
					"style/main.css": "style/main.styl"
		

		# Watch for changes
		watch:
			stylus:
				files: ["style/**/*.styl"]
				tasks: ["stylus:source"]

	grunt.registerTask "default", ["stylus:source", "watch"]
	grunt.registerTask "release", ["stylus:release"]
	