# CHANGELOG (v2)
The new release of DPLOY is a complete rewrite of the codebase, but still following the same principle of storing a revision file on your server to keep track with your local repository.

JavaScript ES6 is being used instead of CoffeeScript and all code is based on Promises. This allows the new DPLOY to be more modular and easier to maintain and add new features.

More errors are being tracked, so now it's easier to test and debug problems.

## (Breaking) Changes
As this is a major release, some things may break in your current workflow. This is a list of the changes you should be aware, and if you spot any other issues, please create a ticket on Github.

### privateKey, publicKey, passphrase, secure and secureOptions
They were moved inside the new `options` parameter and will get a deprecated message if you set it directly. This change allows you to add more custom options to the scheme you are using - check all the available configs for [ftp](https://github.com/mscdex/node-ftp#methods) and [sftp](https://github.com/mscdex/ssh2#client-methods).

```yaml
options:
  privateKey: ~/.ssh/id_rsa
  passphrase: secretpassphrase
```

### check: true
The check parameter is now set to `true` as default.

### --ignore-include replaced by --include
Note that now to upload the files inside the `include` option, you should set the `include` flag:

```sh
dploy production --include
```

You can also use the shorthand version: `-i`.

## What's New

### dploy.yaml or dploy.json
Now you can have your config file on the YAML format (as before) or as JSON.

<table>
  <tbody>
    <tr>
      <th>dploy.yaml</th>
      <th>dploy.json</th>
    </tr>
    <tr>
      <td valign="top"><pre lang="yaml">server_name:
  host: "ftp.myserver.com"
  user: "user"
  pass: "password"
  path:
    local: "www/"
    remote: "public_html/"</pre></td>
      <td valign="top"><pre lang="json">{
  "server_name": {
    "host": "ftp.myserver.com",
    "user": "user",
    "pass": "password",
    "path": {
      "local": "www/",
      "remote": "public_html/"
    }
  }
}</pre></td>
    </tr>
  </tbody>
</table>


### Submodules
You can now upload your submodules when they are updated - DPLOY will also keep track of their revisions and it will only upload the files that were changed. You just have to set the submodules you want to upload by using the `submodules` option.  
The key value is the source of your submodule and the value is the destination where your submodule will be uploaded:

```yaml
submodules:
  # upload your submodule to a different path
  secret/folder/my-submodule: public/my-submodule
  # the destination will be the same as the key
  nested/folders/inside/your/project/submodule-name: true
```

### Map / Alias
Now you can create rules to upload files when some other file has changed. That means that you can now ignore the minified/compiled files from Git and map the source files instead.  
Both the key and the value do accept wildcards - the key is the file you are mapping and the value is the file you want to upload when the mapped file changes.


```yaml
map:
  "source/coffee/**/*.coffee": "public/js/app.js"
  "source/sass/*.scss": "public/css/*.css"
  "source/index.jade": "public/index.html"
```
To read more about it, check the issue #72.


### The `path.remote` is created dynamically
If it is your first upload, the remote path will be created dynamically. That means that you don't have to create it manually anymore :)
