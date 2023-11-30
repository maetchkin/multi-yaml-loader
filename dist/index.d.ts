import { marked } from 'marked';
import type { Schema } from 'yaml/types';
import webpack4 from 'webpack4';
import { LoaderContext } from 'webpack5';
export type MaybeKeepFiles = {
    keepFiles?: boolean;
};
export type MaybeKeepFilesRoots = {
    keepFilesRoots?: boolean;
};
export type MaybeHasSpace = {
    space?: boolean;
};
export type MaybeHasFrom = {
    from?: string;
};
export type HasRootContext = {
    rootContext: string;
};
export type HasDocRoot = {
    docRoot: string;
};
export type MaybeHasRootContext = Partial<HasRootContext>;
export type LoaderOptions = MaybeKeepFiles & MaybeKeepFilesRoots & MaybeHasSpace & MaybeHasRootContext & MaybeHasCustomTags & MaybeHasMdImageLoader & MaybeHasMarked;
export type MdImageLoaderFunc = (state: LoaderState, href: string, baseUrl: string) => string;
export type CustomTagFunc = (state: LoaderState) => Schema.CustomTag;
export type MaybeHasMdImageLoader = {
    mdImageLoader?: MdImageLoaderFunc;
};
export type MaybeHasMarked = {
    marked?: marked.MarkedOptions;
};
export type MaybeHasCustomTags = {
    customTags?: CustomTagFunc[];
};
export type LoaderState = Pick<webpack4.loader.LoaderContext & LoaderContext<any>, "resourcePath" | "rootContext" | "context" | "resourceQuery"> & MaybeHasFrom & HasDocRoot;
export type UnionLoaderContext = webpack4.loader.LoaderContext | LoaderContext<any>;
export type IncDeep = string | number;
export type IncList = IncDeep[][];
export type IncMap = Record<string, IncList>;
export type HasIncMap = {
    incs: IncMap;
};
export type HasDoc = {
    doc: any;
};
export type DocumentObject = HasIncMap & HasDoc & {
    state: LoaderState;
};
export type DocumentsMap = Record<string, DocumentObject>;
export type Packed = HasDoc & HasIncMap;
export type PackedDocumentsMap = Record<string, Packed>;
export type PackedResult = [PackedDocumentsMap, string];
export type MaybeNullableStrValue = {
    strValue?: string | null | void;
};
export type HasTagStr = {
    tag: string;
};
export declare class IncludeError extends Error {
    constructor(err: string, fileName: string);
}
declare const getMarkdown: (content: string, { marked: maybeMarkedOptions, mdImageLoader }: LoaderOptions, state: LoaderState) => {
    doc: string;
    incs: IncMap;
};
declare const Loader: (this: UnionLoaderContext & HasDocRoot) => void;
export { getMarkdown, Loader };
export default Loader;
