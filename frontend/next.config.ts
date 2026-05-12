import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    async redirects() {
        return [
            {
                source: "/panel/envios",
                destination: "/envios",
                permanent: false,
            },
            {
                source: "/panel/envios/:shipmentId",
                destination: "/envios/:shipmentId",
                permanent: false,
            },
        ];
    },
};

export default nextConfig;
