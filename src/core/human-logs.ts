/**
 * Good log messages increases customer satisfaction, as they work as sort of a guide, helping the user achieve what they wanted to achieve.
 * Good logs minimize the amount of support calls, improve customer satisfaction and trust in your product, ultimately being a win-win
 * for both the creators of software and the users.
 *
 * Inspired by Vercel's Error design framework (https://vercel.com/design/error#error-design-framework), human-logs allows you to
 * take events, explanations and solutions, and connect them like lego-pieces, to create user-friendly logs in a
 * versatile manner.
 *
 * Focus on understanding the errors.
 *
 */

function replaceTemplateParams(input: TemplatedMessage): string {
	let result = input.template
	for (const key in input.params) {
		const value = input.params[key]
		const placeholder = `{${key}}`
		result = result.split(placeholder).join(value)
	}
	return result
}

function isTemplatedMessage(solution: any): solution is TemplatedMessage {
	if (solution.template) return true
	return false
}

type TemplatedMessage = {
	template: string
	params: Record<string, string>
}

type EventType = TemplatedMessage | string

type ActionType = {
	text: string
	href: string
}

type SolutionType =
	| (TemplatedMessage & {
			action?: ActionType[]
	  })
	| {
			message: string
			action?: ActionType[]
	  }

export type HumanLogsObject = {
	events: Record<string, EventType>
	explanations: Record<string, EventType>
	solutions: Record<string, SolutionType>
}

export type HumanLogResponse = {
	message: string
	action?: ActionType[]
}

export function createHumanLogs<HumanLogs extends HumanLogsObject>(options: HumanLogs) {
	return function ({
		event,
		explanation,
		solution
	}: {
		event?: keyof HumanLogs['events']
		explanation?: keyof HumanLogs['explanations']
		solution?: keyof HumanLogs['solutions']
	}) {
		let message = ''
		let action: ActionType[] | undefined
		// Event
		if (event && options.events[event as string]) {
			const eventTypeOrString = options.events[event as string]

			if (isTemplatedMessage(eventTypeOrString)) {
				message += replaceTemplateParams(eventTypeOrString) + ' '
			} else {
				message += eventTypeOrString + ' '
			}
		}
		// Explanation
		if (explanation && options.explanations[explanation as string]) {
			const eventTypeOrString = options.explanations[explanation as string]

			if (isTemplatedMessage(eventTypeOrString)) {
				message += replaceTemplateParams(eventTypeOrString) + ' '
			} else {
				message += eventTypeOrString + ' '
			}
		}
		// Solution
		if (solution && options.solutions[solution as string]) {
			const solutionType = options.solutions[solution as string]

			if (isTemplatedMessage(solutionType)) {
				message += replaceTemplateParams(solutionType) + ' '
			} else {
				message += solutionType.message + ' '
			}
			action = solutionType.action
		}

		return {
			message,
			action,
			toString() {
				return `${message}${action ? action.map((a) => `${a.text} (${a.href})`).join(' or ') : ''}`
			}
		} as const
	}
}

export const createHumanLog = createHumanLogs({
	events: {
		create_project_failed: 'Creating your project failed',
		replay_failed: 'Replaying failed',
		config_load_failed: 'Loading Flytrap configuration failed',
		transform_failed: 'Transforming your code failed',
		capture_failed: 'Could not send your capture to Flytrap API'
	},
	explanations: {
		database_unresponsive: 'because we could not connect to our database.',
		replay_missing_config_values:
			'because your Flytrap configuration is missing one or more values. Required values are `publicApiKey` and `projectId`.',
		invalid_config: 'because your config file is invalid.',
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
		generic_unexpected_error: 'because of an unexpected error.'
	},
	solutions: {
		define_flytrap_config: {
			message:
				'Define your Flytrap configuration by following the instructions on our setup guide.',
			action: [
				{
					text: 'Go to instructions &rarr;',
					href: 'https://www.useflytrap.com/docs/guides/configuration'
				}
			]
		},
		check_status_page: {
			message:
				'Please try again later. You can monitor the uptime of our services on our status page.',
			action: [
				{
					text: 'Go to Flytrap status page &rarr;',
					href: 'https://status.useflytrap.com'
				}
			]
		},
		config_esm_inside_commonjs: {
			message:
				'You can solve this error by renaming your config to "flytrap.config.mjs". Learn more on our docs page.',
			action: [
				{
					text: 'Flytrap configuration docs',
					href: 'https://www.useflytrap.com/docs/configuration'
				}
			]
		},
		stringify_capture_failed_solution: {
			message: `Please send us a message and we will immediately help you.`,
			action: [
				{
					text: 'Join our Discord',
					href: 'https://discord.gg/k5KyVb43EM'
				},
				{
					text: 'contact our support engineer',
					href: 'mailto:rasmus@useflytrap.com'
				}
			]
		},
		configuration_fix: {
			message: 'Solve this by configuring your Flytrap configuration file correctly.',
			action: [
				{
					text: 'Learn more on the Flytrap configuration docs',
					href: 'https://www.useflytrap.com/docs/configuration'
				}
			]
		},
		config_default_export: {
			message:
				'Define your Flytrap config using a default export: `export default defineFlytrapConfig(...)`.'
		},
		critical_contact_us: {
			message: 'This should never happen. Please reach out to us.',
			action: [
				{
					text: 'Contact our support engineer',
					href: 'rasmus@useflytrap.com'
				},
				{
					text: 'Join our Discord',
					href: 'https://discord.gg/k5KyVb43EM'
				}
			]
		},
		try_again_contact_us: {
			message: 'Please try again.',
			action: [
				{
					text: 'If the problem continues, please contact us.',
					href: 'https://www.useflytrap.com/contact'
				}
			]
		}
	}
})
