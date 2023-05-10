/**
 * we're using flytrap to debug flytrap, how meta is that?
 */
/*module.exports = {
	captureId: '064e6528-f4b6-4f2d-a30b-2dd7b70b2784',
	projectId: 'flytrap',
	publicApiKey: 'pk_some_api_key',
	secretApiKey: 'sk_some_secret_key'
}*/

import { defineFlytrapConfig } from './dist/index'

// TODO: ESM / TS support in future
export default defineFlytrapConfig({
	captureId: 'flytrap',
	projectId: 'flytrap',
	publicApiKey: 'pk_some_api_key',
	secretApiKey: 'sk_some_secret_key',
	mode: 'capture'
})
