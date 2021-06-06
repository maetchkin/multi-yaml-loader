import getWebpackCompiler from './getWebpackCompiler';
import type { Compiler, Stats }           from "webpack";

const compile =  (compiler: Compiler) =>
    new Promise(
        (resolve, reject) => {
            compiler.run(
                (error, stats) => {
                    error ? reject(error) : resolve(stats)
                }
            );
        }
    )
;

test(
    'webpack',
    () => {
        const compiler = getWebpackCompiler('documents/simple.yaml', {keepFiles:true, space:true});
        return compile(compiler)
            .then(
                (stats: Stats) => {
                    console.log('stats', stats.toString() );
                    const code = stats?.compilation?.assets;
                    expect(code).toMatchSnapshot("documents-simple");
                }
            )
        ;
    }
);

