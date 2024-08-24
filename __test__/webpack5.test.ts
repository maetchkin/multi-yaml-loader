import type { Compiler, Stats }           from 'webpack5';
import getWebpack5Compiler                from './getWebpack5Compiler';
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
    'webpack5',
    () => {
        const compiler = getWebpack5Compiler('documents/simple.yaml', {keepFiles:true, space:true});
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

afterAll(
    async () => {
        await new Promise(
            resolve =>
                setTimeout(
                    () => resolve(void(0)),
                    2500
                )
        ); // avoid jest open handle error
    }
);
