// webpack.config.js optimization
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const webpack = require('webpack');
const dotenv = require('dotenv');
const fs = require('fs');

// Get the path to .env file
const envPath = path.resolve(__dirname, '.env');

// Check if the .env file exists
const envFileExists = fs.existsSync(envPath);
console.log(`Checking for .env file at: ${envPath}`);
console.log(`.env file exists: ${envFileExists}`);

// Parse the .env file
let env = {};
if (envFileExists) {
  const envConfig = dotenv.config({ path: envPath });
  
  if (envConfig.error) {
    console.error('Error loading .env file:', envConfig.error);
  } else {
    env = envConfig.parsed || {};
    console.log('Loaded environment variables from .env:', Object.keys(env));
  }
}

// Ensure we always have our API URL defined
if (!env.REACT_APP_API_URL) {
  console.log('REACT_APP_API_URL not found in .env, using default');
  env.REACT_APP_API_URL = 'http://localhost:8000';
}

// Reduce env variables to a format webpack can use
const envKeys = Object.keys(env).reduce((prev, next) => {
  prev[`process.env.${next}`] = JSON.stringify(env[next]);
  return prev;
}, {});

// Ensure NODE_ENV is always set
envKeys['process.env.NODE_ENV'] = JSON.stringify(process.env.NODE_ENV || 'development');

// Log the environment keys being used
console.log('Using environment keys:', envKeys);

module.exports = {
  // ... other webpack configuration
  
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
          output: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0,
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name(module) {
            // Get the name. E.g. node_modules/packageName/not/this/part.js
            // or node_modules/packageName
            const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
            
            // npm package names are URL-safe, but some servers don't like @ symbols
            return `npm.${packageName.replace('@', '')}`;
          },
        },
      },
    },
  },
  
  plugins: [
    // ... other plugins
    
    // Add the plugin for environment variables
    new webpack.DefinePlugin(envKeys),
    
    // Compress assets with gzip
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 10240,
      minRatio: 0.8,
    }),
    
    // Analyze bundle size (only in production build)
    process.env.ANALYZE && new BundleAnalyzerPlugin(),
  ].filter(Boolean),
  
  // ... other webpack configuration
};
