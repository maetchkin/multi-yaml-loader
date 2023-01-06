import { loader } from 'webpack';
import { OptionObject } from 'loader-utils';
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
export declare type LoaderOptions = OptionObject & MaybeKeepFiles & MaybeKeepFilesRoots & MaybeHasSpace & HasRootContext;
export declare type LoaderState = Pick<loader.LoaderContext, "resourcePath" | "rootContext" | "context" | "resourceQuery"> & MaybeHasFrom;
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
export declare class IncludeError extends Error {
    constructor(err: string, fileName: string);
}
declare const MYLoader: (this: loader.LoaderContext) => void;
export default MYLoader;
