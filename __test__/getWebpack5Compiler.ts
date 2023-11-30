import * as path                        from "path";
import * as webpack                     from "webpack5";
import type { Configuration }           from "webpack5";


const getWebpack5Compiler = (entry: string, loaderOptions = {}, config: Partial<Configuration> = {}) => {
  const fullConfig: Configuration = {
    mode:    "development",
    devtool:  false,
    entry:  path.resolve(__dirname, entry),

    output: {
      path: path.resolve(__dirname, "../outputs/v5"),
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

export default getWebpack5Compiler;
