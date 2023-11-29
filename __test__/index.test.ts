import * as path                            from 'path';
import * as fs                              from 'fs';
import * as tmp                             from 'tmp';
import Loader, {IncludeError}               from 'multi-yaml-loader';
import {Schema}                             from "yaml/types";
// @ts-ignore
import {LoaderState}                        from "../src";
import {MockLoaderContext}                  from './mock-loader';
import type {LoaderOptionsQuery}            from './mock-loader';

export const createLoading = (file: string, options?: LoaderOptionsQuery) =>
    new Promise<string>(
        (resolve, reject) => {
            const ctx = new MockLoaderContext(file, resolve, reject, options || {});
            Loader.call(ctx);
        }
    )
        .then(
            (moduleYamlString: string): any => {
                const tmpobj = tmp.fileSync();
                fs.writeSync(tmpobj.fd, moduleYamlString);
                const content: any = require(tmpobj.name);
                return content;
            }
        )
;

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
    'commented include',
    () => createLoading("documents/commented-include.yaml")
        .then(
            data => {
                const content = data.result;
                expect(content).toEqual(
                    {
                        name: "commented",
                        content: [
                            {name: 'simple'},
                            {name: 'simple'}
                        ]
                    }
                );
            }
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

test(
    'absolute',
    () => createLoading("./documents/link-to-abs-include.yaml")
            .then(
                data => {
                    expect(data.result.content.content.name).toEqual("simple");
                }
            )
);

test(
    'merge',
    () => createLoading("./documents/merge.yaml")
            .then(
                data => {
                    const {name, a, c, d} = data.result;
                    expect(name).toEqual("merge");
                    expect(a.name).toEqual("simple");
                    expect(a.value).toEqual(false);
                    expect(c.name).toEqual("merge");
                    expect(c.a.name).toEqual("simple");
                    expect(d[0].d1.name).toEqual("simple");
                    expect(d[0].d1.value).toEqual(false);
                }
            )
);


test(
    '!yaml',
    () => createLoading("./documents/has-yaml-include.yaml")
            .then(
                data => {
                    const {name, content} = data.result;
                    expect(name).toEqual("has-yaml-include");
                    expect(content.name).toEqual("simple");
                }
            )
);

test(
    '!md',
    () => createLoading("./documents/has-md-include.yaml")
            .then(
                data => {
                    const {name, content} = data.result;
                    expect(name).toEqual("has-md-include");
                    expect(content).toMatchSnapshot("md-include-content");
                }
            )
);

test(
    '!md marked BaseURL',
    () => createLoading("./documents/has-md-include.yaml", { options:{ marked: { baseUrl: '/dist/path/img/' } }})
            .then(
                data => {
                    const {name, content} = data.result;
                    expect(name).toEqual("has-md-include");
                    expect(content).toMatchSnapshot("md-baseurl-include-content");
                }
            )
);

test(
    '!md mdImageLoader',
    () => {
        const mdImageLoaderLog = [];
        const mdImageLoader = (state: LoaderState, href: string, baseUrl: string ): string => {
            mdImageLoaderLog.push({state, href})
            return path.join(baseUrl, href);
        }
        return createLoading("./documents/has-md-include.yaml", {
            options: {
                mdImageLoader,
                marked: {baseUrl: '/dist/path/img/'}
            }
        })
            .then(
                data => {
                    const {name, content} = data.result;
                    expect(name).toEqual("has-md-include");
                    expect(content).toMatchSnapshot("md-mdImageLoader-content");
                    expect(mdImageLoaderLog).toMatchSnapshot("md-mdImageLoader-mdImageLoaderLog");
                }
            )
    }
);

test(
    '!json',
    () => createLoading("./documents/has-json-include.yaml")
            .then(
                data => {
                    const {name, content} = data.result;
                    expect(name).toEqual("has-json-include");
                    expect(content.name).toEqual("simple");
                }
            )
);

test(
    'custom-tags',
    () => createLoading(
        "./documents/has-custom-tags.yaml",
        {
            options: {
                customTags: [
                    (state: LoaderState) => ({
                        tag: '!custom',
                        identify:  () => true,
                        resolve: (doc, cst) => {
                            const {resourcePath, context} = state;
                            const value = 'strValue' in cst
                                ? (cst as {strValue: any} ).strValue
                                : ''
                            ;
                            const resource = resourcePath.replace(context, '').replace(/^\//, '');
                            return `custom[${value}][${resource}]`;
                        }
                    }) as Schema.CustomTag
                ]
            }
        }
    )
            .then(
                data => {
                    const {name, content} = data.result;
                    expect(name).toEqual("has-custom-tags");
                    expect(content).toEqual("custom[custom content][has-custom-tags.yaml]");
                }
            )
);
