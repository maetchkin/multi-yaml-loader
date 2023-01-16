import { loader } from 'webpack';
import { marked } from 'marked';
import type { Schema } from 'yaml/types';
export declare type MaybeKeepFiles = {
    keepFiles?: boolean;
};
export declare type MaybeKeepFilesRoots = {
    keepFilesRoots?: boolean;
};
export declare type MaybeHasSpace = {
    space?: boolean;
};
export declare type MaybeHasFrom = {
    from?: string;
};
export declare type HasRootContext = {
    rootContext: string;
};
export declare type HasDocRoot = {
    docRoot: string;
};
export declare type MaybeHasRootContext = Partial<HasRootContext>;
export declare type LoaderOptions = MaybeKeepFiles & MaybeKeepFilesRoots & MaybeHasSpace & MaybeHasRootContext & MaybeHasCustomTags & MaybeHasMdImageLoader & MaybeHasMarked;
export declare type MdImageLoaderFunc = (state: LoaderState, href: string, baseUrl: string) => string;
export declare type CustomTagFunc = (state: LoaderState) => Schema.CustomTag;
export declare type MaybeHasMdImageLoader = {
    mdImageLoader?: MdImageLoaderFunc;
};
export declare type MaybeHasMarked = {
    marked?: marked.MarkedOptions;
};
export declare type MaybeHasCustomTags = {
    customTags?: CustomTagFunc[];
};
export declare type LoaderState = Pick<loader.LoaderContext, "resourcePath" | "rootContext" | "context" | "resourceQuery"> & MaybeHasFrom & HasDocRoot;
export declare type IncDeep = string | number;
export declare type IncList = IncDeep[][];
export declare type IncMap = Record<string, IncList>;
export declare type HasIncMap = {
    incs: IncMap;
};
export declare type HasDoc = {
    doc: any;
};
export declare type DocumentObject = HasIncMap & HasDoc & {
    state: LoaderState;
};
export declare type DocumentsMap = Record<string, DocumentObject>;
export declare type Packed = HasDoc & HasIncMap;
export declare type PackedDocumentsMap = Record<string, Packed>;
export declare type PackedResult = [PackedDocumentsMap, string];
export declare type MaybeNullableStrValue = {
    strValue?: string | null | void;
};
export declare type HasTagStr = {
    tag: string;
};
export declare class IncludeError extends Error {
    constructor(err: string, fileName: string);
}
declare const getMarkdown: (content: string, { marked: maybeMarkedOptions, mdImageLoader }: LoaderOptions, state: LoaderState) => {
    doc: string;
    incs: IncMap;
};
declare const MYLoader: (this: loader.LoaderContext) => void;
export { getMarkdown };
export default MYLoader;
