colors	= require "colors"
fs 		= require "fs"
path	= require "path"
Signal	= require "signals"

module.exports = class Generator


	constructor: ->
		usage  = "DPLOY\n".bold
		usage += "Command line tool to deploy websites using FTP/SFTP and git.\n\n".grey

		usage += "Usage:\n"
		usage += "  dploy [#{'environment(s)'.green}]\n\n"

		usage += "Commands:\n"
		usage += "  install \t\t #{'# Install the dploy.yaml and the post-commit script'.grey}\n"
		usage += "  -h, --help \t\t #{'# Show this instructions'.grey}\n\n"

		usage += "Flags:\n"
		usage += "  -i, --ignore-include \t #{'# Ignore the files that are on your include list'.grey}\n\n"

		usage += "Examples:\n"
		usage += "  dploy \t\t #{'# Deploy to the first environment on your dploy.yaml'.grey}\n"
		usage += "  dploy dev \t\t #{'# Deploy to the environment \"dev\" on your dploy.yaml'.grey}\n"
		usage += "  dploy dev stage \t #{'# Deploy to the environments \"dev\" and \"stage\" on your dploy.yaml'.grey}\n"
		usage += "  dploy dev stage -i \t #{'# Deploy to the environments \"dev\" and \"stage\" on your dploy.yaml and ignore the \"include\" parameter'.grey}\n"
		usage += "  dploy install \t #{'# Install dploy files'.grey}\n"
		usage += "  dploy -h \t\t #{'# Show the instructions'.grey}"

		console.log usage
		process.exit(code=0)