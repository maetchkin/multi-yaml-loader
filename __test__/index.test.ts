import {createLoading} from "./mock-loader";
import {IncludeError}  from 'multi-yaml-loader';


test(
    'no include',
    () => createLoading("documents/simple.yaml")
        .then(
            data => expect(data).toHaveProperty(
                'result',
                { name: 'simple' }
            )
        )
);

test(
    'with include',
    () => createLoading("documents/example.yaml")
        .then(
            data => expect(data).toHaveProperty(
                'result',
                { name: 'example', content: { name: 'simple' } }
            )
        )
);


test(
    'array include',
    () => createLoading("documents/array.yaml")
        .then(
            data => expect(data).toHaveProperty(
                'result',
                [{name:'item-1'},{name:'item-2'}]
            )
        )
);

test(
    'cycle include',
    () => createLoading("documents/cycle.yaml")
        .then(
            data => {
                expect(data.result === data.result.self).toEqual(true);
            }
        )
);


test(
    'not exists throws IncludeError',
    () => expect( createLoading("documents/not-exists.yaml") )
            .rejects.toThrow( IncludeError )
);


test(
    'broken include throws IncludeError',
    () =>   expect(
                createLoading("documents/broken.yaml")
            )
            .rejects.toThrow( IncludeError )
);


test(
    'relative',
    () => createLoading("./documents/path/to/inner/example.yaml")
            .then(
                data => {
                    expect(data.result.content.content.content.name).toEqual("simple");
                }
            )
);

/*



test(
    'merge',
    () => createLoading("merge.yaml")
            .then(
                res => {
                    // console.log('merge', res);
                    const {name, a, b, c} = res;
                    expect(name).toEqual("merge");
                    expect(a.name).toEqual("simple");
                    expect(a.value).toEqual(false);
                    expect(c.name).toEqual("merge");
                    expect(c.a.name).toEqual("simple");
                }
            )
);
*/
