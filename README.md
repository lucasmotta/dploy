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
dploy -h
```

## Version
```
dploy --version
dploy -v
```

## Debug / Silent
```
dploy --debug
dploy --silent
```

## Commands

### dploy <*envs...*>
Anything else after the `dploy` command will be used as an environment, like this:  

```
dploy dev stage production
```  
In this case _DPLOY_ will expect to find **dev**, **stage** and **production** configs on your `dploy.yaml` file.

## Basic example
If you only have one server, just name whatever you want and run `dploy`.

```yaml
server_name:
  host: "ftp.myserver.com"
  user: "user"
  pass: "password"
  path:
    local: "www/"
    remote: "public_html/"
```

Deploying from the command line:

```
dploy server_name
```

## All DPLOY settings


```yaml
server_name:
  scheme: <string> (ftp)
  host: <string>
  port: <int>
  user: <string>
  pass: <string>
  revision: <string> (.rev)
  confirm: <boolean> (true)
  path:
    local: <path>           # relative to your repository
    remote: <path>
  submodules: <object>
  map: <object>
  include: <object>
  exclude: <array>
  options:
    privateKey: <path>      # sftp only
    publicKey: <path>       # sftp only
    passphrase: <string>    # sftp only
    secure: <boolean>       # ftp only
    secureOptions: <object> # ftp only
```

### scheme
* Type: `String`  
* Default: `ftp`  

_DPLOY_ has two available schemes: **ftp** and **sftp**. If you are using `sftp`, please update this accordingly.

### host
* Type: `String`  
* Default: `none`

### port
* Type: `Number`  
* Default: `none`

The port used to access your server - usually this is set automatically.

### user
* Type: `String`  
* Default: `none`

### pass
* Type: `String`  
* Default: `none`

If you don't set a password and if you are using SFTP, DPLOY will try look for the **options.privateKey** and **options.publicKey**.  
But if we can't find any of those options, you will be prompted to type the password manually.

### revision
* Type: `String`  
* Default: `.rev`  

To check the different between your local files and what's on the server, we have to create a temporary file with the reference of the last commit you've uploaded. This parameter defines the name of this file.

### confirm
* Type: `Boolean`  
* Default: `true`  

Will prompt you before actually uploading the files - this is true by default to avoid mistakes.

### path.local
* Type: `String`  
* Default: `none`  

The local folder that you want to upload to the server. If you don't set anything, the entire folder of your project will be uploaded.

### path.remote
* Type: `String`  
* Default: `none`

The remote folder where your files will be uploaded. If you don't set anything, your files will be uploaded to the root of your server. We **highly recommend** that you set this!

### submodules
* Type: `Object`
* Default: `none`

Now you can upload your submodules whenever they change too, without having to create another dploy config.
To do it so, you can give an object where the `key` is the path of your submodule and the `value` the destination of your submodule.
If you set the value to `true`, the destination will be the same as it's current path.

```yaml
submodules:
  "folder/my-submodule": "public/my-submodule" # upload your submodule to a different path
  "nested/folders/inside/your/project/submodule-name": true # will keep the same path of your key
```

### map
* Type: `Object`
* Default: `none`

You can now map the files tracked by git to deploy different files - usually files that are not being tracked.
This is useful if you are not tracking minified files on git. Now you can map the source files and when they change, then you upload the minified file.
It accepts an object list, where the `key` is the file you are tracking and the `value` is the file you want to map to. Both `key` and `value` accept wildcards:

```yaml
map:
  "source/js/**/*.coffee": "public/js/app.js"
  "source/css/**/*.sass": "public/css/*.css"
```


### exclude  
* Type: `Array`  
* Default: `none`

Exclude files that are tracked by git, but that you don't want on your server. You can target individual files or use wildcard to target multiple files and file types.

* Individual files: `exclude: ["dploy.yaml", "package.json", "path/to/file.js"]`.
* Using glob: `exclude: ["*.yaml", "*.json", "path/**/*.js", "**/*.md"]`.

### include
* Type: `Object`  
* Default: `none`

The **include** parameter is similar to the **exclude**. But instead of an array, it expects an object.  
The **key** of your object is what *DPLOY* is gonna search locally and the **value** of your object is the destination on the remote server (this path is relative to the **path.remote**!). Again you can also target individual files or multiple using [glob](https://github.com/isaacs/minimatch) on the key of your object.

```yaml
include:
  "videos/kitty.mp4": "videos/"
  "videos/*.mp4": "another/folder/inside/remote/path/"
  "*.json": "data/"
```

## Options
Options that are specific for the scheme should be set here. So for example, if you are using `sftp` you can set options for the `privateKey`, `publicKey` and `passphrase`. While for the `ftp` scheme you can set `secure` and `secureOptions`.

Check all the available configs for [ftp](https://github.com/mscdex/node-ftp#methods) and [sftp](https://github.com/mscdex/ssh2#client-methods).


### options.privateKey
* Type: `path`  
* Default: `none`  
* Scheme: `sftp`  

When using SFTP, you can set the path of your private key instead of the password:
```yaml
options:
  privateKey: ~/.ssh/id_rsa
```

### options.publicKey
* Type: `path`  
* Default: `none`  
* Scheme: `sftp`  

It works in the same way of the **privateKey**:
```yaml
options:
  publicKey: ~/.ssh/id_rsa.pub
```

### options.passphrase
* Type: `String`  
* Default: `none`  
* Scheme: `sftp`  

For an encrypted private key, this is the passphrase used to decrypt it.


### options.secure
* Type: `mixed`  
* Default: `false`  
* Scheme: `ftp`  

Set this parameter only if you are using FTPS. Set to `true` for both control and data connection encryption, `control` for control connection encryption only, or `implicit` for implicitly encrypted control connection.

### options.secureOptions
* Type: `object`  
* Default: `none`  
* Scheme: `ftp`  

Additional options to be passed together with the `secure` parameter.


## Include flag
If you are using the **include** parameter on your `dploy.yaml`, you will neeed to use the `--include-files` flag to upload those extra files.

```
dploy stage --include-files
```  
Or using a shortcut:  

```
dploy stage -i
```

## Catchup flag
If you already have your files on the server (from a previous manual upload or if you somehow deleted the revision file), setting this flag will upload only the revision file and nothing more. It can be used for multiple servers too.

```
dploy stage --catchup
```  
Or using a shortcut:  

```
dploy stage -c
```

## Multiple environments
Most of the times we have to work on different environments (dev, stage, production…).  
With _DPLOY_ is really easy to make multiple deploys using a single command. All you need to do is create different configurations on your `dploy.yaml` file, like this:

```yaml
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

## Mapping non-tracked files
This example will upload your local `public` folder to your remote `public_html` folder and:

* Whenever a `.coffee` file changes inside the `source/js` folder, the file `public/js/app.min.js` will be uploaded to `public_html/js/app.min.js`
* Whenever a `.sass` file changes inside the `source/css` folder, all the `.css` files inside `public/css` will be uploaded to `public_html/css/`

```yaml
server_name:
  host: "ftp.myserver.com"
  user: "user"
  pass: "password"
  path:
    local: "public/"
    remote: "public_html/"
  map:
    "source/js/**/*.coffee": "public/js/app.min.js"
    "source/css/**/*.sass": "public/css/*.css"
```


## Including and excluding files
This example will upload your local `deploy` folder to your remote `public_html` folder and:

* Will **include** all `.mp4` files inside your `videos` folder to a remote folder named `funny` on your server.
* Will **include** all `json`, `yaml` and `xml` files at your cwd folder to a remote folder named `data`.
* Will **exclude** all `yaml`, `json` from your `deploy` folder.
* Will **exclude** all `js` files inside the folder `deploy/path`.
* Will **exclude** all `md` files from your `deploy` folder.

```yaml
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
