import * as path                        from "path";
import * as webpack                     from "webpack4";
import type { Configuration }           from "webpack4";


const getWebpack4Compiler = (entry: string, loaderOptions = {}, config: Partial<Configuration> = {}) => {
  const fullConfig: Configuration = {
    mode:    "development",
    devtool:  false,
    entry:  path.resolve(__dirname, entry),

    output: {
      path: path.resolve(__dirname, "../outputs/v4"),
      filename: "[name].bundle.js",
      chunkFilename: "[name].chunk.js"
    },
    module: {
      rules: [
        {
          test: /\.ya?ml$/i,
          rules: [
            {
              loader: 'multi-yaml-loader',
              options: loaderOptions
            }
          ],
        },
      ],
    },
    plugins: [],
    ...config,
  };

  const compiler = webpack(fullConfig);
/*

  if (!config.outputFileSystem) {
    compiler.outputFileSystem = createFsFromVolume(new Volume());
  }
*/

  return compiler;
};

export default getWebpack4Compiler;
