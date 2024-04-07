/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(?:js|ts)$/,
      /*
       * Undici includes private property syntax that doesn't play well with
       * SWC. Since using babel-loader like this will slow down compilation,
       * this rule scopes the config to only include the undici package.
       * For more info see: https://github.com/nodejs/undici/issues/2954#issuecomment-2035743577
       */
      include: [/node_modules\/(undici)/],
      use: [
        {
          loader: "babel-loader",
          options: {
            presets: ["next/babel"],
            plugins: [
              "@babel/plugin-transform-private-property-in-object",
              "@babel/plugin-transform-private-methods",
            ],
          },
        },
      ],
    });

    return config;
  },
};

export default nextConfig;
