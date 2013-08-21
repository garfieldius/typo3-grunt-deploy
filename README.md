# GruntJS TYPO3 Deployment

This is a sample grunt configuration that can be used for building and deploying a TYPO3 project. It has been developed, assuming a [modernpackage](http://github.com/georgringer/modernpackage) setup.

## Installation

1. Make sure node and the *grunt-cli* package is installed by running `npm install -g grunt-cli`
2. Copy all the files in this repository (except for this README of course) into the *typo3conf/ext* folder
3. Run `npm install` to install all the dependencies
4. Adapt the props.yml file to your needs.
5. (Optional but recommended) Add the folder *node_modules* and the file *npm-debug.log* to your .gitignore

## Usage

There are two main tasks

* default
* deploy

to get an overview of what each task does, just run

    grunt --help

### Building (default)

The first task, the default task, is an alias for several *sub*-tasks, which do the following actions

1. Clean up by removing previous builds
2. Minify and concatenate Javascript files using [UglifyJS](http://github.com/mishoo/UglifyJS2)
3. Build and compress a CSS file from a [less](http://lesscss.org) source using [recess](https://github.com/twitter/recess)
4. Generate pre-compressed versions of the result of the two aforementioned tasks
5. Update a typoscript file to use the newly generated assets. A sample of how this Typoscript may look like is available in the *setup.ts* file.

Versioning is done by defining an environment variable called *BUILDNUMBER*, usefull if using this together with a CI tool like jenkins. If it is not available the current timestamp is used.

All settings that may need to be adjusted, as set as properties in the *props.yml* file. You can set globally valid settings their and may override them in a *props.SOMEVALUE.yml* if you have an environment variable called *ENVIRONMENT*.

Example:

    env ENVIRONMENT=dev BUILDNUMBER=4 grunt

Will try to read *props.yml* and *props.dev.yml*

Example output

    Running "clean:build" (clean) task
    Cleaning theme_mytheme/Resources/Public/Production...OK

    Running "uglify:build" (uglify) task
    File "theme_mytheme/Resources/Public/Production/scripts.4.js" created.

    Running "recess:build" (recess) task
    File "theme_mytheme/Resources/Public/Production/styles.4.css" created.
    Uncompressed size: 60040 bytes.
    Compressed size: 7025 bytes gzipped (47815 bytes minified).

    Running "compress:build" (compress) task
    Created theme_mytheme/Resources/Public/Production/styles.4.css.gz (8937 bytes)
    Created theme_mytheme/Resources/Public/Production/scripts.4.js.gz (39654 bytes)

    Running "tsconfig" task

    Done, without errors.

Inside the build.yml is the build configuration in YAML format for third party tasks, like ssh or UglifyJS. Before grunt is initialized with it, it's values are processed via the grunt template processor. You can the default references like the grunt documentation says, all values in the *props.yml* and all environment variables using *env*.

Example:
Write the result from UglifyJS to the users home, giving it the users name

```yaml

uglify:
  '[...]'
    files:
      -
        dest: '<%= env.HOME %>/scripts.<%= env.USER %>.js'
        src:
          - '<%= assetsPath %>/Javascript/jquery.js'
          - '<%= assetsPath %>/Javascript/bootstrap.js'

```

### Deploying

The second task is `grunt deploy`

It runs all the tasks of the default tasks and deploys the result onto a remote host using ssh. This is what happens:

1. Create a tgz file with the contents of the *typo3conf/ext* folder. ".git" paths and documentations are always excluded. Additional excludes (in the example development extensions like phpunit or extension builder) can be listed in the props.yml
2. Copy the tar into the /tmp/ folder of a remote host
3. Unpack that tgz
4. Backup the existing ext folder and move the fresh one into it's place
5. Remove the caching folder *typo3temp/Cache/Code/core_cache* of the target installation. Otherwise a fatal error will be generated if an extension was heavily refactored or even removed.
6. Run the [coreapi](https://github.com/etobi/ext-coreapi) task "dbcompare" to have the latest DB schema in place
7. Run the [coreapi](https://github.com/etobi/ext-coreapi) task *clearallcachesexceptpagecache*
8. Go back to the local installation and reset the typoscript changed in step 5 of the default task. This way git won't complain about changed files if you deploy from your local machine.

## TODO

* Add PHP specific tasks like running phpunit and behat tests or a code sniffer

## License

Provided under the [BSD 3-Clause License](http://opensource.org/licenses/BSD-3-Clause)

Copyright (c) 2013, Georg Großberger
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of Georg Großberger nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

