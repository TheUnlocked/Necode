import { createContext, Dispatch } from "react";
import { MergeDispatch } from "../util/merge-reducer";

export type MetaInfo = {
    title: string;
};

export const TransformMetaContext = createContext<MergeDispatch<MetaInfo>>(() => undefined);