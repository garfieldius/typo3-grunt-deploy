/*                                                      *
 * (c) 2013 Georg Großberger                            *
 *                                                      *
 * This is free software, you can use it freely under   *
 * the terms of the BSD 3-Clause License                *
 * for details, please visit                            *
 * http://opensource.org/licenses/BSD-3-Clause          *
 *                                                      */

module.exports = function(grunt) {
	"use strict";

	var fs = require("fs");

	// Load properties
	var properties = grunt.file.readYAML("props.yml");
	var env = process.env;

	// If an env is set, try to merge "local" properties
	if (env.ENVIRONMENT) {
		var overrideProperties = "props."+ env.ENVIRONMENT + ".yml";
		if (grunt.file.exists(overrideProperties)) {
			properties = mergeObjects(properties, grunt.file.readYAML(overrideProperties));
		}
	} else {
		// Otherwise we assume production
		env.ENVIRONMENT = "Production";
	}

	properties.buildId = env.BUILDNUMBER || new Date().getTime();
	properties = processObject(properties, env);
	properties.env = env;


	// Load config
	var config = grunt.file.readYAML("build.yml");
	config = processObject(config, properties);

	// Process config

	// Add private key for ssh operations
	var privateKeyFile = properties.ssh.privateKeyFile;
	if (privateKeyFile) {
		privateKeyFile = grunt.template.process(privateKeyFile, {data: {home: process.env.HOME}});
		config.sftp.options.privateKey = grunt.file.read(privateKeyFile);
		config.sshexec.options.privateKey = grunt.file.read(privateKeyFile);
		delete properties.ssh.privateKeyFile;
	}

	// Collect files for deployment
	config.compress.deploy.files =  fs.readdirSync(".").filter(function(file) {
		if (grunt.file.isDir(file)) {
			if (properties.deploy.exclude.indexOf(file) == -1) {
				return true;
			}
		}
		return false;

	}).map(function(entry) {
		return {
			src: [entry + '/**'],
			filter: function(filepath) {
				return !/\.git/.test(filepath) && !/Private\/Bootstrap/.test(filepath) && !/\/Documentation\//.test(filepath) && !/\/doc\//.test(filepath);
			}
		}
	});

	// Initialize grunt
	grunt.config.init(config);

	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-recess');
	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.loadNpmTasks('grunt-ssh');

	// Custom task: Add the generated assets via typoscript to the frontend
	grunt.registerTask('tsconfig', 'Set TypoScript configs', function() {
		typoscriptFileAction(function(data) {
			var id = properties.buildId;
			return data
				.replace(/\/[a-z0-9\.]+\.css/, "/styles." + id + ".css")
				.replace(/\/[a-z0-9\.]+\.js/, "/scripts." + id + ".js");
		})
	});

	// Custom task: reset the typoscript and remove the tar
	grunt.registerTask('postclean', 'Reset the typoscript so git will not complain about changed files', function() {

		grunt.file.delete('current.tgz');

		typoscriptFileAction(function(data) {
			return data
				.replace(/\/[a-z0-9\.]+\.css/, "/all.css")
				.replace(/\/[a-z0-9\.]+\.js/, "/all.js");
		})
	});

	// Custom task: create the target folder if it does not exist yet
	grunt.registerTask('targetfolder', 'Create the target folder if it does not exist', function() {
		var path = properties.targetPath;
		if (!grunt.file.exists(path)) {
			if (!grunt.file.mkdir(path)) {
				grunt.fail.fatal("Cannot create target path");
			}
		} else if (!grunt.file.isDir(path)) {
			grunt.fail.fatal("Target path exists, but is not a directory");
		}
	});

	// Build the project
	grunt.registerTask('default', ['clean', 'uglify', 'recess', 'compress:build', 'tsconfig']);

	// Deploy the project, includes the build tasks
	grunt.registerTask('deploy', ['default', 'compress:deploy', 'sftp', 'sshexec:unpack', 'sshexec:replace', 'sshexec:tempcached', 'sshexec:dbtables', 'sshexec:clearcaches', 'postclean']);


	// Helper functions


	/**
	 * Load the typoscript, apply a callback and save it again
	 *
	 * @param callback
	 */
	function typoscriptFileAction(callback) {
		if (!properties.typoscriptFile) {
			return;
		}

		var filename = properties.typoscriptFile;
		var data = grunt.file.read(filename);

		data = callback("" + data);

		grunt.file.write(filename, data);
	}

	// Merge two objects
	// From mootools 1.4 (https://github.com/mootools/mootools-core/blob/master/Source/Core/Core.js)

	function mergeObjects(source, k, v) {

		if (typeof k == 'string') {
			return mergeOne(source, k, v);
		}

		for (var i = 1, l = arguments.length; i < l; i++) {
			var object = arguments[i];
			for (var key in object) {
				source = mergeOne(source, key, object[key]);
			}
		}
		return source;
	}

	function mergeOne(source, key, current){
		switch (typeof current) {
			case 'object':
				if (typeof source[key] == 'object') {
					mergeObjects(source[key], current);
				} else {
					source[key] = current;
				}
				break;

			case 'array':
				source[key] = current;
				break;

			default:
				source[key] = current;
		}
		return source;
	}

	// Template processing of an object, recursively
	// From gruntjs (https://github.com/gruntjs/grunt/blob/master/lib/grunt/config.js#L60)
	function processObject(object, data) {
		return grunt.util.recurse(object, function(value) {

			if (typeof value !== 'string') {
				return value;
			}

			return grunt.template.process(value, {data: data});
		})
	}
};
