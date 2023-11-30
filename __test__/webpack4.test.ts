import type { Compiler, Stats }           from 'webpack4';
import getWebpack4Compiler                from './getWebpack4Compiler';
import sanitizeSnapshot                   from './sanitizeSnapshot';

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
    'webpack4',
    () => {
        const compiler = getWebpack4Compiler('documents/simple.yaml', {keepFiles:true, space:true});
        return compile(compiler)
            .then(
                (stats: Stats) => {
                    //console.log('stats', stats.toString() );
                    const code = stats?.compilation?.assets;
                    expect(sanitizeSnapshot(code)).toMatchSnapshot("documents-simple");
                }
            )
        ;
    }
);
