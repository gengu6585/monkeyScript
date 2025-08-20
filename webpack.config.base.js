const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = {
  devtool: 'eval-cheap-module-source-map',
  entry: {
    app: './src/index.js',
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
    ],
  },
  plugins: [new VueLoaderPlugin()],
  devServer: {
    headers: {
      'Cross-Origin-Resource-Policy': 'cross-origin', 
      // 'Cross-Origin-Opener-Policy': 'same-origin'    
    },
  }
}
