import { createContentlayerPlugin } from "next-contentlayer"
import { FlytrapTransformPlugin } from "useflytrap/transform"

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack(config) {
		config.plugins = config.plugins ?? [];
		config.infrastructureLogging = { level: 'error' }
		config.plugins.push(FlytrapTransformPlugin.webpack())
		return config
	},
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  redirects() {
    return [
      {
        source: "/components",
        destination: "/docs/components/accordion",
        permanent: true,
      },
      {
        source: "/docs/components",
        destination: "/docs/components/accordion",
        permanent: true,
      },
      {
        source: "/examples",
        destination: "/examples/mail",
        permanent: false,
      },
      {
        source: "/docs/primitives/:path*",
        destination: "/docs/components/:path*",
        permanent: true,
      },
      {
        source: "/figma",
        destination: "/docs/figma",
        permanent: true,
      },
      {
        source: "/docs/forms",
        destination: "/docs/components/form",
        permanent: false,
      },
      {
        source: "/docs/forms/react-hook-form",
        destination: "/docs/components/form",
        permanent: false,
      },
    ]
  },
}

export default nextConfig;

/* const withContentlayer = createContentlayerPlugin({
  // Additional Contentlayer config options
  webpack(config) {
		config.plugins = config.plugins ?? [];
		config.infrastructureLogging = { level: 'error' }
		config.plugins.push(FlytrapTransformPlugin.webpack())
		return config
	},
})

export default withContentlayer(nextConfig) */
