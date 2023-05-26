/**
 * we're using Flytrap to debug Flytrap, how meta is that?
 */
import { defineFlytrapConfig } from './dist/index'

export default defineFlytrapConfig({
	projectId: 'flytrap',
	publicApiKey: 'pk_some_api_key',
	secretApiKey: 'sk_some_secret_key',
	mode: 'capture'
})
