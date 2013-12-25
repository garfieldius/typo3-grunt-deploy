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
	var merge = require("merge");

	// Load properties
	var properties = grunt.file.readYAML("props.yml");
	var env = process.env;
	var ctx = env.ENVIRONMENT || env.CONTEXT || env.TYPO3_CONTEXT;

	// If an env is set, try to merge "local" properties
	if (ctx) {
		var overrideProperties = "props."+ ctx + ".yml";
		if (grunt.file.exists(overrideProperties)) {
			properties = merge(properties, grunt.file.readYAML(overrideProperties));
		}
	} else {
		// Otherwise we assume production
		env.ENVIRONMENT = "Production";
	}

	properties.buildId = env.BUILD_NUMBER || env.BUILDNUMBER || new Date().getTime();
	properties.env = env;

	// Process config

	// Add private key for ssh operations
	var privateKeyFile = properties.ssh.privateKeyFile;
	if (privateKeyFile) {
		privateKeyFile = grunt.template.process(privateKeyFile, {data: {home: process.env.HOME}});
		properties.ssh.privateKey = grunt.file.read(privateKeyFile);
	}

	// Load config
	var config = grunt.file.readYAML("build.yml");
	config.props = properties;

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
};
