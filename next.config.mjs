/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Service-/Module-Layer darf serverseitig Prisma nutzen
    serverComponentsExternalPackages: [
      "@prisma/client",
      "bcryptjs",
      "@react-pdf/renderer",
    ],
  },
};

export default nextConfig;
