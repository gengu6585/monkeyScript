const HtmlWebpackPlugin = require('html-webpack-plugin')
const { merge } = require('webpack-merge')
const base = require('./webpack.config.base')

module.exports = merge(base, {
  mode: process.env.NODE_ENV || 'production',
  devtool: 'eval-source-map',
  output: {
    filename: '[name].bundle.js',
    path: __dirname + '/dist',
  },
  devServer: {
    hot: false, // 禁用热重载
    liveReload: false, // 禁用实时重载
    // webSocketServer: false, // 禁用 WebSocket 服务器
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
