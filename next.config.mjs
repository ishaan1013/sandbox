/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "cdn.simpleicons.org",
      },
    ],
  },
}

export default nextConfig
