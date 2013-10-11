# dploy - LMFM
## lmfm-dploy



## Team
-	**Producer:** 
-	**Lead Designer:** 
-	**Lead Developer:** 

## Getting Started

### Install Grunt
If you don't already have the grunt command line interface installed run the following command in terminal (you may be prompted to type your password)

```
sudo npm install -g grunt-cli
```

### Install Grunt Dependencies
To install the dependencies, change to the project's root directory in terminal and run this command (you may be prompted to type your password):

```
sudo npm install --save-dev
```

### Install Vendor Libraries
Just include the js file to the **vendors** folder.

## Compile and Watch
To compile your CoffeeScript, Stylus and Handlebars, you can run the command bellow.
This command will also **watch** for changes (added, modified and deleted) and it will compile automatically for you.

```
grunt
```

## Stop watching
To stop the watch task running **ctrl + z**.

## Build Release Version
To build a release version, you will run the following code on terminal.

```
grunt build
```

This task will clean the **release** folder, process and uglify your JavaScript to a single file *(main.js)*, minify your CSS and copy all other assets to the **release** folder.

## Project Structure
-	**source/**
	-	**bootstrap/** - bootstrap content, you shouldn't need to change anything in this directory
		-	***index.html*** - html file generated from comments in your styles
		-	**template.hb** - handlebars template for generating bootstrap html
	-	**coffee/**
		-	**app.coffee** - the root of your application
		-	**main.coffee** - the main file called from html, your require configuration goes here
	-	**img/** - all your applications images
		-	**meta/** - all your applications meta images like apple touch icons
	-	***js/*** - generated javascript, you shouldn't change anything in this directory
	-	**style/** - styling
		-	**components/** - your components styles
		-	**lib/** - useful helper styles
		-	**layout.styl** - layout styles
		-	***main.css*** - generated CSS, don't change directly
		-	**main.styl** - The main style, use only for importing components
		-	**settings.styl** - the global style settings like primary colour and font size
		-	**typography.styl** - typographical styles
	-	**template/** - Handlebars templates
	-	**vendor/** - javascript libraries
	-	**index.html** - root html page
-	***release/*** - compiled release version of project, don't change directly

## Server Details

### Local

Enter details here.

### Dev

Enter details here.

### Stage

Enter details here.

### Live

Enter details here.

## Deployment Instructions

### Dev

### Dev

### Stage

### Live

## Browser and device support

### Browsers
-	Chrome
-	Firefox
-	Internet Explorer 9
-	Internet Explorer 10

### Devices

#### Phones
-	iPhone 4
-	iPhone 4s
-	iPhone 5
-	Google Nexus

#### Tablets
-	iPad