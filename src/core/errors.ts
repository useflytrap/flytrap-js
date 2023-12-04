import { createHumanLogs } from 'human-logs'

export const createHumanLog = createHumanLogs({
	events: {
		create_project_failed: 'Creating your project failed',
		replay_failed: 'Replaying failed',
		config_load_failed: 'Loading Flytrap configuration failed',
		transform_failed: 'Transforming your code failed',
		capture_failed: 'Could not send your capture to Flytrap API',
		parsing_failed: {
			template: 'Parsing file "{fileNamePath}" failed.',
			params: { fileNamePath: '' }
		},
		transform_file_failed: {
			template: 'Transforming file "{fileNamePath}" failed',
			params: { fileNamePath: '' }
		},
		transform_hoisting_failed: {
			template: `Hoisting function {functionName}() in file "{fileNamePath}" failed`,
			params: {
				functionName: '',
				fileNamePath: ''
			}
		},
		sending_artifacts_failed: 'Sending artifacts to the Flytrap API failed',
		// Troubleshooting mode
		troubleshooting_error_captured: 'An error was captured while in troubleshooting mode.'
	},
	explanations: {
		database_unresponsive: 'because we could not connect to our database.',
		missing_config_values:
			'because your Flytrap configuration is missing one or more values. Required values are `publicApiKey` and `projectId`.',
		invalid_config: 'because your config file is invalid.',
		config_not_found: 'because we could not find a configuration file.',
		config_esm_inside_commonjs:
			'because your configuration file is using ESM, but your package is using CommonJS.',
		config_no_default_export: 'because you forgot to export your config as a default export.',
		api_unauthorized:
			'because your API key is invalid. Please make sure that you are correctly setting your `Authorization` header in the form "Bearer sk_...", and that your API key is correct.',
		api_capture_error_response: 'because of an unexpected error.',
		api_unreachable: 'because we could not reach the Flytrap API.',
		stringify_capture_failed:
			'because stringifying the capture failed. This usually happens due to complex classes like `Proxy`.',
		encrypt_capture_failed: 'because encrypting the capture payload failed.',

		// Transform errors
		transform_pkg_not_found: 'because we could not find a package.json.',
		transform_parent_scope_not_found:
			'because Flytrap could not find a parent scope for your function.',

		// Replay errors
		missing_replay_config_values:
			'because your Flytrap configuration is missing one or more values. Required values for replaying are `captureId`, `secretApiKey` & `privateKey`. Please set them to enable replaying.',
		replay_data_not_loaded:
			'because replay data has not yet been loaded. Please wait a while and re-run the code.',

		// Generic errors
		generic_unexpected_error: 'because of an unexpected error.',

		// `Arguments` errors
		invalid_arguments_callee_use:
			'because you use `arguments.callee` in your code, which Flytrap does not support.',

		// Troubleshooting mode
		troubleshooting_capture_explanation: {
			template:
				'This can happen if there is an error in your code, but also because of some unexpected behavior with the Flytrap SDK. View details below: \n\nLast errored function ID: "{lastErroredFunctionId}"\nLast errored call ID: "{lastErroredCallId}"\nIf your code works perfectly without the Flytrap plugin, but has errors with the Flytrap plugin, please reach out to us and we will help you immediately.',
			params: {
				lastErroredFunctionId: '',
				lastErroredCallId: ''
			}
		},

		// Request fail explanations
		request_failed: {
			template: 'because a {method} request to "{endpoint}" failed. Error: \n\n{error}\n',
			params: {
				method: '',
				endpoint: '',
				error: ''
			}
		},

		// Encryption & decryption
		encrypt_failed_invalid_plaintext_type: {
			template:
				'because encrypting failed due to invalid plaintext type. Expected "string", received "{plaintext}".',
			params: {
				plaintext: ''
			}
		},
		encrypt_failed_invalid_key_type: {
			template:
				'because encrypting failed due to invalid public key type. Expected "string", received "{publicKey}".',
			params: {
				publicKey: ''
			}
		},
		decrypt_failed_invalid_ciphertext_type: {
			template:
				'because decrypting failed due to invalid ciphertext type. Expected "string", received "{ciphertext}".',
			params: {
				ciphertext: ''
			}
		},
		decrypt_failed_invalid_key_type: {
			template:
				'because decrypting failed due to invalid private key type. Expected "string", received "{privateKey}".',
			params: {
				privateKey: ''
			}
		},
		decode_base64_failed: {
			template:
				'because base64 decoding the value "{inputValue}" errored. Error: \n\n{decodeError}\n',
			params: {
				inputValue: '',
				decodeError: ''
			}
		},
		encode_base64_failed: {
			template:
				'because base64 encoding the value "{inputValue}" errored. Error: \n\n{encodeError}\n',
			params: {
				inputValue: '',
				encodeError: ''
			}
		},

		// Object stringifying
		stringify_object_failed: {
			template:
				'because stringifying an object failed during the process. Error: \n\n{stringifyError}\n',
			params: {
				stringifyError: ''
			}
		},
		// Object parsing
		parsing_object_failed: {
			template: 'because parsing an object failed during the process. Error: \n\n{parsingError}\n',
			params: {
				parsingError: ''
			}
		},

		// Code parsing / traversing errors
		parsing_code_explanation: {
			template: 'View the error below: \n\n{parsingError}\n',
			params: {
				parsingError: ''
			}
		},
		traverse_failed: {
			template:
				'because traversing your source-code failed. View the error below: \n\n{traverseError}\n',
			params: {
				traverseError: ''
			}
		}
	},
	solutions: {
		define_flytrap_config: {
			template:
				'Define your Flytrap configuration by following the instructions on our setup guide.',
			params: {},
			actions: [
				{
					text: 'Go to instructions &rarr;',
					href: 'https://docs.useflytrap.com/config/introduction'
				}
			]
		},
		check_status_page: {
			template:
				'Please try again later. You can monitor the uptime of our services on our status page.',
			params: {},
			actions: [
				{
					text: 'Go to Flytrap status page &rarr;',
					href: 'https://status.useflytrap.com'
				}
			]
		},
		config_esm_inside_commonjs: {
			template:
				'You can solve this error by renaming your config to "flytrap.config.mjs". Learn more on our docs page.',
			params: {},
			actions: [
				{
					text: 'Flytrap configuration docs',
					href: 'https://docs.useflytrap.com/config/introduction'
				}
			]
		},
		stringify_capture_failed_solution: {
			template: `Please send us a message and we will immediately help you.`,
			params: {},
			actions: [
				{
					text: 'Join our Discord',
					href: 'https://discord.gg/tQaADUfdeP'
				},
				{
					text: 'Contact our support engineer',
					href: 'rasmus@useflytrap.com'
				}
			]
		},
		configuration_fix: {
			template: 'Solve this by configuring your Flytrap configuration file correctly.',
			params: {},
			actions: [
				{
					text: 'Learn more',
					href: 'https://docs.useflytrap.com/config/introduction'
				}
			]
		},
		config_default_export: {
			template:
				'Define your Flytrap config using a default export: `export default defineFlytrapConfig(...)`.',
			params: {}
		},
		critical_contact_us: {
			template: 'This should never happen. Please reach out to us.',
			params: {},
			actions: [
				{
					text: 'Contact our support engineer',
					href: 'rasmus@useflytrap.com'
				}
			]
		},
		try_again_contact_us: {
			template: 'Please try again.',
			params: {},
			actions: [
				{
					text: 'If the problem continues, please contact us.',
					href: 'mailto:rasmus@useflytrap.com'
				}
			]
		},
		// Troubleshooting mode solutions
		troubleshooting_open_issue: {
			template: 'Open an issue',
			params: {},
			actions: [
				{
					text: 'Open an issue',
					href: 'https://github.com/useflytrap/flytrap-js/issues/new?assignees=skoshx&labels=bug&projects=&template=---bug-report.yml'
				}
			]
		},
		join_discord: {
			template: 'Our Discord server is the fastest way to get help with your problem.',
			params: {},
			actions: [
				{
					text: 'Join our Discord',
					href: 'https://discord.gg/tQaADUfdeP'
				}
			]
		},
		// Parsing / Traversing error solutions
		open_issue: {
			template:
				"If you think this error shouldn't be happening, open an issue on GitHub and provide the code that caused this error.",
			params: {},
			actions: [
				{
					text: 'Open an issue',
					href: 'https://github.com/useflytrap/flytrap-js/issues/new?assignees=skoshx&labels=bug&projects=&template=---bug-report.yml'
				}
			]
		},
		parsing_error_configure_babel_parser_options: {
			template: 'You can configure the options for the Babel parser.',
			params: {},
			actions: [
				{
					text: 'Read the docs',
					href: 'https://docs.useflytrap.com/config/introduction#understanding-the-configuration-file'
				}
			]
		}
	}
})
