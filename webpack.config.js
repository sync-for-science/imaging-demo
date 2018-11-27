const path = require('path');

module.exports = {
  context: path.resolve(__dirname, 'src'),
  entry: {
    main: './main.js',
    redirect: './redirect.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: './[name].js'
  }
};
