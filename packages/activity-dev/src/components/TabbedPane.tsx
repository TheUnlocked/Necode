import { ButtonBase } from '@mui/material';
import { ReactElement } from 'react';
import Lazy from '~shared-ui/components/Lazy';
import Pane, { BasePaneProps } from './Pane';
import PaneTab, { PaneTabProps } from './PaneTab';
import PaneTitle from './PaneTitle';

interface TabProps {
    label: string | JSX.Element;
    selected: boolean;
    onClick(): void;
}

function Tab({ label, selected, onClick }: TabProps) {
    return <ButtonBase onClick={onClick} sx={({ palette }) => ({
        flexShrink: 0,
        borderRadius: "0 0 4px 4px",
        mb: 1,
        pt: 1,
        backgroundColor: selected ? undefined : palette.background.default,
        border: `1px solid ${selected ? 'transparent' : palette.divider}`,
        borderTop: '1px solid transparent',
        cursor: "pointer",
        "&:hover": {
            backgroundColor: palette.action.hover
        }
    })}>
        {typeof label === 'string'
            ? <PaneTitle selectable={false} color={selected ? undefined : 'disabled'} sx={{ mx: 1 }}>{label}</PaneTitle>
            : label}
    </ButtonBase>;
}

export interface TabbedPaneProps extends BasePaneProps {
    icon?: JSX.Element;
    label: string | JSX.Element;
    value: string;
    onChange?(newValue: string): void;
    /**
     * Should this act like a regular pane when there is only one child?
     * @default false
     */
    actUntabbedWithOneChild?: boolean;
    children: ReactElement<PaneTabProps, typeof PaneTab>[];
}

export default function TabbedPane({ icon, label, value, onChange, actUntabbedWithOneChild, children, ...baseProps }: TabbedPaneProps) {
    children = children.filter(child => {
        if (child.type !== PaneTab) {
            console.error(`Found ${child.type.name} inside TabbedPane. Panes can only include PaneTab elements. Ignoring child.`);
            return false;
        }
        return true;
    });

    const filteredTabs = children.filter(x => !x.props.hidden);

    if (filteredTabs.length === 0) {
        console.warn('All tabs are invisible');
    }

    if (filteredTabs.length === 1 && actUntabbedWithOneChild) {
        const rawTabLabel = filteredTabs[0].props.label;
        const tabLabel = typeof rawTabLabel === 'string'
            ? <PaneTitle sx={{ mr: 1 }}>{rawTabLabel}</PaneTitle>
            : rawTabLabel;
        
        if (value !== filteredTabs[0].props.value) {
            console.warn('There is only one tab and actUntabbedWithOneChild is set, but that tab is not selected.');
            return <Pane label={label} icon={icon} toolbar={tabLabel} {...baseProps}></Pane>;
        }
        return <Pane label={label} icon={icon} toolbar={tabLabel} {...baseProps}>{filteredTabs[0]}</Pane>;
    }

    const tabElts = filteredTabs.map(child => 
        <Tab label={child.props.label} selected={child.props.value === value} onClick={() => onChange?.(child.props.value)} key={child.props.value} />);

    const activeTab = filteredTabs.find(x => x.props.value === value);
    
    return <Pane label={label} icon={icon} toolbar={<>{tabElts}</>} bleedToolbar {...baseProps}>
        {filteredTabs.map(tab => <Lazy show={tab === activeTab} key={tab.props.value}>{tab}</Lazy>)}
    </Pane>;
}