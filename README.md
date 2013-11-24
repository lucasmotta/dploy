# DPLOY

**DPLOY is an FTP/SFTP deployment tool built in node.js**  
Uploads the latest changes by comparing the version on your server with your git repository.


## Install
Install DPLOY and it's dependancies globally by running:

```
npm install dploy -g
```

## Help
```
dploy --help
```

## Commands
### dploy
Will deploy the first environment that you have on your `dploy.yaml`

### dploy install
Will install the `dploy.yaml` file and set up a `post-commit` script on your `.git/hooks` folder so you can _DPLOY_ from your commit message as well.

### dploy …rest
Anything else after the `dploy` command will be used as an environment, like this:  
  
```
dploy dev stage production
```  
In this case _DPLOY_ will expect to find **dev**, **stage** and **production** configs on your `dploy.yaml` file.

## Basic example
If you only have one server, just name whatever you want and run `dploy`.   

```
server_name:
    host: "ftp.myserver.com"
    user: "user"
    pass: "password"
    path:
        local: "deploy/"
        remote: "public_html/"
```

Deploying on the command line:

```
dploy
```

You can also set the environment that you want to upload:  
  
```
dploy server_name
```

## Attributes of the dploy.yaml
### scheme
* Type: `String`  
* Default: `ftp`  

_DPLOY_ has two available schemes: **ftp** and **sftp**. You must provide this information, because we don't like to play guessing games.

### host
* Type: `String`  
* Default: `none`

### port
* Type: `Number`  
* Default: `21` when ftp and `22` when sftp

The port that your hosting server is using. Note that the default value is different depending on **scheme** that you are using.

### user
* Type: `String`  
* Default: `none`

### pass
* Type: `String`  
* Default: `none`

If you don't set a password and if you are using SFTP, DPLOY will try look for the **privateKey** and **publicKey**.  
But if we can't find any of those options, you will be prompted to type the password manually.

### privateKey
* Type: `path`  
* Default: `none`  
* Scheme: `sftp`  

When using SFTP, you can set the path of your private key instead of the password. The default locations are usually:
```
privateKey: ~/.ssh/id_rsa
privateKey: ~/.ssh/id_dsa
```

### publicKey
* Type: `path`  
* Default: `none`  
* Scheme: `sftp`  

It works in the same way of the **privateKey**. The default locations are usually:
```
publicKey: ~/.ssh/id_rsa.pub
publicKey: ~/.ssh/id_dsa.pub
```

### secure
* Type: `mixed`  
* Default: `false`  
* Scheme: `ftp`  

Set this parameter only if you are using FTPS. Set to `true` for both control and data connection encryption, `control` for control connection encryption only, or `implicit` for implicitly encrypted control connection.

### secureOptions
* Type: `object`  
* Default: `none`  
* Scheme: `ftp`  

Additional options to be passed together with the `secure` parameter.

### revision
* Type: `String`  
* Default: `.rev`  

To check the different between your local files and what's on the server, we have to create a temporary file with the reference of the last commit you've uploaded. This parameter defines the name of this file.

### slots
* Type: `Number`  
* Default: `1`  

To make the upload faster, you can create multiple connections to your server.

### check
* Type: `Boolean`  
* Default: `false`  

If you set this parameter to `true`, you will be prompted to confirm the list of files before the actual action.

### branch
* Type: `String` or `Array`  
* Default: `none`  

You can set a list of branches that are allowed to deploy to your server. This will also help you to avoid accidental uploads to different servers.  
Note that you can also set a string (a single branch), rather than a list.

### path.local
* Type: `String`  
* Default: `none`  

The local folder that you want to upload to the server. If you don't set anything, the entire folder of your project will be uploaded.

### path.remote
* Type: `String`  
* Default: `none`    

The remote folder where your files will be uploaded. If you don't set anything, your files will be uploaded to the root of your server. We **highly recommend** that you set this!

### exclude  
* Type: `Array`  
* Default: `none`    

Exclude files that are tracked by git, but that you don't want on your server. You can target individual files or use [glob](https://github.com/isaacs/minimatch) to target multiple files and file types.
  
* Individual files: `exclude: ["dploy.yaml", "package.json", "path/to/file.js"]`.
* Using glob: `exclude: ["*.yaml", "*.json", "path/**/*.js", "**/*.md"]`.

### include
* Type: `Object`  
* Default: `none`    

The **include** parameter is similar to the **exclude**. But instead of an array, it expects an object.  
The **key** of your object is what *DPLOY* is gonna search locally and the **value** of your object is the destination on the remote server (this path is relative to the **path.remote**!). Again you can also target individual files or multiple using [glob](https://github.com/isaacs/minimatch) on the key of your object.

```
include:
    "videos/kitty.mp4": "videos/"
    "videos/*.mp4": "another/folder/inside/remote/path/"
    "*.json": "data/"
```

## Ignore include flag
If you are using the **include** parameter on your `dploy.yaml`, you will note that those files will always be uploaded to the server, no matter if they were modified or not (because they aren't necessarily tracked by git).  
In order to avoid re-uploading those files all the time, there's a tag called `--ignore-include` that you can set when calling _DPLOY_.  
  
```
dploy stage --ignore-include
```  
Or using a shortcut:  
  
```
dploy stage -i
```


## Multiple environments
Most of the times we have to work on different environments (dev, stage, production…).  
With _DPLOY_ is really easy to make multiple deploys using a single command. All you need to do is create different configurations on your `dploy.yaml` file, like this:

```
dev:
    host: "dev.myserver.com"
    user: "dev_user"
    pass: "dev_password"
    path:
        local: "deploy/"
        remote: "public_html/"

stage:
    host: "stage.myserver.com"
    user: "stage_user"
    pass: "stage_password"
    path:
        local: "deploy/"
        remote: "public_html/"

production:
    host: "myserver.com"
    user: "production_user"
    pass: "production_password"
    path:
        local: "deploy/"
        remote: "public_html/"
```

Deploy to **stage** environment only:

```
dploy stage
```
Or if you want to upload to more than one environment:  
  
```
dploy dev stage production
```

## Including and excluding files
This example will upload your local `deploy` folder to your remote `public_html` folder and:    

* Will **include** all `.mp4` files inside your `videos` folder to a remote folder named `funny` on your server.
* Will **include** all `json`, `yaml` and `xml` files at your cwd folder to a remote folder named `data`.
* Will **exclude** all `yaml`, `json` from your `deploy` folder.
* Will **exclude** all `js` files inside the folder `deploy/path`.
* Will **exclude** all `md` files from your `deploy` folder.

```
server_name:
    host: "ftp.myserver.com"
    user: "user"
    pass: "password"
    path:
        local: "deploy/"
        remote: "public_html/"
    exclude: ["deploy/*.yaml", "deploy/*.json", "deploy/path/**/*.js", "deploy/**/*.md"]
    include:
        "videos/*.mp4": "funny/"
        "*.json *.yaml *.xml": "data/"
            
```

# Contribute
Feel free to contribute to DPLOY in any way. If you have any issues, questions or suggestions, just create it at the issues page.  
If you want to create your own fork, follow the instructions bellow to build **DPLOY**:  

### build
You need to install the dependencies from npm first and then just use grunt to compile the CoffeeScript:

```
grunt
```

### watch
You can watch the changes by running the watch task from grunt:

```
grunt watch
```

# Mentions
**DPLOY** was inspired by another great tool written in Ruby, called [dandelion](https://github.com/scttnlsn/dandelion) from [Scott Nelson](https://github.com/scttnlsn).


# License
The MIT License

Copyright (c) 2013 Lean Mean Fighting Machine, Inc. http://lmfm.co.uk

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.