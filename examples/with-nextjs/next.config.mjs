import { FlytrapTransformPlugin } from 'useflytrap/transform'

/** @type {import('next').NextConfig} */
const nextConfig = {
	webpack(config) {
		config.plugins = config.plugins ?? []
		config.plugins.push(FlytrapTransformPlugin.webpack())
		return config
	}
}

export default nextConfig
