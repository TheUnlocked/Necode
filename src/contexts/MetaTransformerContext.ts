import { LinkProps } from "next/link";
import { createContext } from "react";
import { MergeDispatch } from "../util/merge-reducer";

export type MetaInfo = {
    title: string;
    path: { label: string, href?: LinkProps['href'] }[];
};

export const MetaTransformerContext = createContext<MergeDispatch<MetaInfo>>(() => undefined);
