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
		transform_traverse_failed: {
			template: 'Transforming file "{fileNamePath}" failed',
			params: { fileNamePath: '' }
		}
	},
	explanations: {
		database_unresponsive: 'because we could not connect to our database.',
		replay_missing_config_values:
			'because your Flytrap configuration is missing one or more values. Required values are `publicApiKey` and `projectId`.',
		invalid_config: 'because your config file is invalid.',
		config_not_found: 'because we could not find a configuration file.',
		config_esm_inside_commonjs:
			'because your configuration file is using ESM, but your package is using CommonJS.',
		config_no_default_export: 'because you forgot to export your config as a default export.',
		transform_pkg_not_found: 'because we could not find a package.json.',
		api_unauthorized:
			'because your API key is invalid. Please make sure that you are correctly setting your `Authorization` header in the form "Bearer sk_...", and that your API key is correct.',
		api_capture_error_response: 'because of an unexpected error.',
		api_unreachable: 'because we could not reach the Flytrap API.',
		stringify_capture_failed:
			'because stringifying the capture failed. This usually happens due to complex classes like `Proxy`.',
		encrypt_capture_failed: 'because encrypting the capture payload failed.',

		// Generic errors
		generic_unexpected_error: 'because of an unexpected error.',

		// Parsing / traversing errors
		parsing_error_explanation: {
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
					text: 'contact our support engineer',
					href: 'mailto:rasmus@useflytrap.com'
				}
			]
		},
		configuration_fix: {
			template: 'Solve this by configuring your Flytrap configuration file correctly.',
			params: {},
			actions: [
				{
					text: 'Learn more on the Flytrap configuration docs',
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
				},
				{
					text: 'Join our Discord',
					href: 'https://discord.gg/tQaADUfdeP'
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
		// Parsing / Traversing error solutions
		parsing_error_open_issue: {
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
