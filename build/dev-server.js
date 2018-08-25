const webpackDevServer = require('webpack-dev-server');
const webpack = require('webpack');
const opn = require("opn");

const config = require('../webpack.config.js');
const options = {
  contentBase: './dist',
  hot: true,
  host: 'localhost'
};

webpackDevServer.addDevServerEntrypoints(config, options);
const compiler = webpack(config);
const server = new webpackDevServer(compiler, options);

server.listen(5000, 'localhost', () => {
  console.log('dev server listening on port 5000');
  opn(`http://127.0.0.1:5000`);
});