const HtmlWebpackPlugin = require('html-webpack-plugin')
const { merge } = require('webpack-merge')
const base = require('./webpack.config.base')

module.exports = merge(base, {
  mode: process.env.NODE_ENV || 'production',
  devtool: 'source-map',
  output: {
    filename: '[name].bundle.js',
    path: __dirname + '/dist',
  },
  devServer: {
    headers: {
      'Cross-Origin-Resource-Policy': 'cross-origin', 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
    },
    hot: false, // 禁用热重载
    liveReload: false, // 禁用实时重载
    // 禁用 dev 客户端注入，避免打包产物请求 sockjs-node 导致 ERR_SSL_PROTOCOL_ERROR
    injectClient: false,
  },
  module: {
    rules: [
      {
        test: /\.(less|css)$/,
        use: ['style-loader', 'css-loader', 'less-loader'],
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf|png|svg|jpg|gif)$/,
        use: {
          loader: 'url-loader',
          options: {
            limit: 20480,
          },
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
})
