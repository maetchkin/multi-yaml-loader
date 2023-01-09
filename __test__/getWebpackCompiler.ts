import * as path                        from "path";
import * as webpack                     from "webpack";
/*import { createFsFromVolume, Volume }   from "memfs";*/
import type { Configuration }           from "webpack";


const getWebpackCompiler = (entry: string, loaderOptions = {}, config: Partial<Configuration> = {}) => {
  const fullConfig: Configuration = {
    mode:    "development",
    devtool:  false,
    entry:  path.resolve(__dirname, entry),

    output: {
      path: path.resolve(__dirname, "../outputs"),
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

export default getWebpackCompiler;
