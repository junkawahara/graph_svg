const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
  devtool: 'source-map',
  entry: './src/renderer/index.ts',
  target: 'web',
  output: {
    path: path.resolve(__dirname, 'dist-web'),
    filename: 'index.js',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      'path': false,
      'fs': false
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html'
    })
  ]
};
