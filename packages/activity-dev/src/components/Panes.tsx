import { ReactElement, useMemo } from 'react';
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';
import { useTheme } from '@mui/material';
import { isNotNull } from '~utils/typeguards';
import Pane from './Pane';
import PassthroughPane from './PassthroughPane';
import useIsSizeOrSmaller from '../hooks/useIsSizeOrSmaller';
import TabbedPane from './TabbedPane';

export type PaneLike = typeof Pane | typeof TabbedPane | typeof PassthroughPane;

interface PaneColumnWeight {
    column: number;
    rows: number[];
}

export interface PanesLayout {
    panesPerColumn: number[];
    weights?: (number | PaneColumnWeight)[];
}

interface NormalizedPanesLayout {
    /** @contract Positive integers */
    panesPerColumn: number[];
    /** @contract Matches panesPerColumn contents */
    weights: PaneColumnWeight[];
}

export interface PanesLayouts<T extends PanesLayout = PanesLayout> {
    thin: T;
    medium: T;
    wide: T;
}

function normalizeLayout({ panesPerColumn, weights }: PanesLayout, numPanes: number): NormalizedPanesLayout {
    if (panesPerColumn.some(x => x < 1 || x % 1 !== 0)) {
        throw new Error(`Panes 'layouts' prop can only describe a positive integer number of panes for each column.`);
    }
    const layoutNumPanes = panesPerColumn.reduce((a, b) => a + b);
    if (layoutNumPanes !== numPanes) {
        throw new Error(`Panes 'layouts' prop describes ${layoutNumPanes} panes, but the Panes element only has ${numPanes} children!`);
    }
    if (weights) {
        if (weights.length < panesPerColumn.length) {
            console.warn('Weight not provided for all columns! Assuming weight of 1.');
        }
        else if (weights.length > panesPerColumn.length) {
            console.warn('Weight provided for more columns than specified. Ignoring extra weight(s).');
        }
        return {
            panesPerColumn: panesPerColumn,
            weights: panesPerColumn.map((p, i) => {
                const columnWeight = weights[i];
                switch (typeof columnWeight) {
                    case 'undefined':
                        return { column: 1, rows: new Array(p).fill(1) };
                    case 'number':
                        return { column: columnWeight, rows: new Array(p).fill(1) };
                    case 'object':
                        if (columnWeight.rows.length < p) {
                            console.warn(`Weight not provided for all rows in column ${i + 1}! Assuming weight of 1.`);
                        }
                        else if (columnWeight.rows.length > p) {
                            console.warn(`Weight provided for more rows than specified in column ${i + 1}. Ignoring extra weight(s).`);
                        }
                        return {
                            column: columnWeight.column,
                            rows: new Array(p).map((_, i) => columnWeight.rows[i] ?? 1),
                        };
                }
            }),
        };
    }
    return {
        panesPerColumn: panesPerColumn,
        weights: panesPerColumn.map(x => ({ column: 1, rows: new Array(x).fill(1) })),
    };
}

interface PanesColumnProps {
    weights: PaneColumnWeight;
    children: ReactElement<Parameters<PaneLike>[0], PaneLike>[];
}

function PanesColumn({ weights, children }: PanesColumnProps) {
    if (children.length === 1) {
        return children[0];
    }

    return <ReflexContainer orientation="horizontal">
        {children.flatMap((pane, i) => {
            const elt = <ReflexElement flex={weights.rows[i]}
                minSize={pane.props.minHeight ?? 40} maxSize={pane.props.maxHeight}
                key={i}
            >
                {pane}
            </ReflexElement>;

            if (i === 0) {
                return [elt];
            }
            
            return [<ReflexSplitter propagate key={i - 0.5} />, elt];
        })}
    </ReflexContainer>;
}

export interface PanesProps {
    layouts: PanesLayouts | PanesLayout;
    children: ReactElement<Parameters<PaneLike>[0], PaneLike>[];
}

export default function Panes({ layouts, children }: PanesProps) {
    children = children.filter(child => {
        if (![Pane, TabbedPane, PassthroughPane].includes(child.type)) {
            console.error(`Found ${child.type.name} inside Panes. Panes can only include Pane-like children (Pane, TabbedPane, PassthroughPane). Ignoring child.`);
            return false;
        }
        return true;
    });

    const numChildren = children.length;

    const theme = useTheme();
    const isThin = useIsSizeOrSmaller('sm', theme);
    const isMedOrThin = useIsSizeOrSmaller('md', theme);

    const layout = useMemo<NormalizedPanesLayout>(() =>
        'thin' in layouts
            ? normalizeLayout(layouts[isThin ? 'thin' : isMedOrThin ? 'medium' : 'wide'], numChildren)
            : normalizeLayout(layouts, numChildren),
        [layouts, numChildren, isThin, isMedOrThin]
    );

    if (layout.panesPerColumn.length === 0) {
        console.warn('Panes element has no children');
        return null;
    }

    let numPanesVisited = 0;
    const columns = layout.panesPerColumn.map((numPanes, i): ReactElement<PanesColumnProps, typeof PanesColumn> | undefined => {
        const panes = children.slice(numPanesVisited, numPanesVisited += numPanes);
        const filteredPanes = panes.filter(x => !x.props.hidden);
        if (filteredPanes.length === 0) {
            // All rows hidden, hide entire column
            return;
        }
        const weights = layout.weights[i];
        const filteredWeights = {
            column: weights.column,
            rows: weights.rows.filter((_, i) => !panes[i].props.hidden),
        };
        return <PanesColumn key={`col-${i}`} weights={filteredWeights}>{...filteredPanes}</PanesColumn>;
    }).filter(isNotNull);

    if (columns.length === 0) {
        console.warn('All columns in Panes are hidden, displaying nothing');
        return null;
    }

    if (columns.length === 1) {
        return columns[0];
    }

    return <ReflexContainer orientation="vertical">
        {columns.flatMap((col, i) => {
            const minWidth = col.props.children
                .reduce<number | undefined>(
                    (result, next) => next.props.minWidth !== undefined ? Math.max(result ?? -Infinity, next.props.minWidth) : undefined,
                    undefined
                ) ?? 40;
            const maxWidth = col.props.children
                .reduce((result, next) => Math.max(result, next.props.maxWidth ?? Infinity), Infinity);
            
            const elt = <ReflexElement minSize={minWidth} maxSize={maxWidth} flex={col.props.weights.column} key={i}>
                {col}
            </ReflexElement>;

            if (i === 0) {
                return [elt];
            }
            
            return [<ReflexSplitter propagate key={i - 0.5} />, elt];
        })}
    </ReflexContainer>;
}