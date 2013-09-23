colors	= require "colors"
fs 		= require "fs"
path	= require "path"
Signal	= require "signals"

module.exports = class Generator


	constructor: ->
		usage  = "GPLOY\n".bold
		usage += "Command line tool to deploy websites using FTP/SFTP and git.\n\n".grey

		usage += "Usage:\n"
		usage += "  gploy [#{'environment(s)'.green}]\n\n"

		usage += "Commands:\n"
		usage += "  install \t\t #{'# Install the gploy.yaml and the post-commit script'.grey}\n"
		usage += "  -h, --help \t\t #{'# Show this instructions'.grey}\n\n"

		usage += "Flags:\n"
		usage += "  -i, --ignore-include \t #{'# Ignore the files that are on your include list'.grey}\n\n"

		usage += "Examples:\n"
		usage += "  gploy \t\t #{'# Deploy to the first environment on your gploy.yaml'.grey}\n"
		usage += "  gploy dev \t\t #{'# Deploy to the environment \"dev\" on your gploy.yaml'.grey}\n"
		usage += "  gploy dev stage \t #{'# Deploy to the environments \"dev\" and \"stage\" on your gploy.yaml'.grey}\n"
		usage += "  gploy dev stage -i \t #{'# Deploy to the environments \"dev\" and \"stage\" on your gploy.yaml and ignore the \"include\" parameter'.grey}\n"
		usage += "  gploy install \t #{'# Install GPLOY files'.grey}\n"
		usage += "  gploy -h \t\t #{'# Show the instructions'.grey}"

		console.log usage