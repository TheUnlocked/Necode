import { Box } from "@mui/material";
import { useApiFetch, useCompatibleLanguages, useImperativeDialog } from '@necode-org/activity-dev';
import { ActivityConfigWidgetProps } from '@necode-org/plugin-dev';
import { isEqual } from 'lodash';
import { useRouter } from "next/router";
import { ComponentType, useCallback, useEffect, useState } from "react";
import { createEmptyPreviewImage, useDrag } from "use-dnd";
import { ActivityEntity } from '~api/entities/ActivityEntity';
import type { PartialAttributesOf } from '~backend/Endpoint';
import DefaultActivityWidget from "~shared-ui/components/DefaultActivityWidget";
import useImported from '~shared-ui/hooks/useImported';
import { usePlugins } from '~shared-ui/hooks/usePlugins';
import { activityDragDropType } from '../../dnd/types';
import ConfigureLanguageDialog from '../dialogs/ConfigureLanguageDialog';
import BrokenWidget from './BrokenWidget';
import SkeletonWidget from "./SkeletonWidget";
import api from '~api/handles';

export type DraggableComponent = ComponentType<ActivityConfigWidgetProps<any>>;

interface BaseActivityDragDropBoxProps {
    id: string;
    classroomId: string;
}

interface SkeletonActivityDragDropBoxProps extends BaseActivityDragDropBoxProps {
    skeleton: true;
    activity?: undefined;
    onActivityChange?: undefined;
}

interface RealActivityDragDropBoxProps extends BaseActivityDragDropBoxProps {
    skeleton: false;
    activity: ActivityEntity;
    onActivityChange?: (changes: PartialAttributesOf<ActivityEntity>) => void;
}

type ActivityDragDropBoxProps<IsSkeleton extends boolean>
    = IsSkeleton extends true ? SkeletonActivityDragDropBoxProps : RealActivityDragDropBoxProps;

function isSkeleton(props: ActivityDragDropBoxProps<boolean>): props is ActivityDragDropBoxProps<true> {
    return props.skeleton;
}

export function ActivityDragDropBox<IsSkeleton extends boolean>(props: ActivityDragDropBoxProps<IsSkeleton>) {
    const { id, classroomId, onActivityChange } = props;

    const router = useRouter();

    const { upload } = useApiFetch();

    const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
        type: activityDragDropType,
        item: props.activity,
        collect: ev => ({
            isDragging: Boolean(ev),
        }),
    }), [props.activity]);

    useEffect(() => {
        dragPreview(createEmptyPreviewImage());
    }, [dragPreview]);

    const { getActivity } = usePlugins();

    const activityType = getActivity(props.activity?.attributes.activityType);

    const configChangeHandler = useCallback((configuration: any) => {
        if (!isEqual(props.activity?.attributes.configuration, configuration)) {
            onActivityChange?.({ configuration });
        }
    }, [props.activity?.attributes.configuration, onActivityChange]);

    const displayNameChangeHandler = useCallback((displayName: string) => {
        onActivityChange?.({ displayName });
    }, [onActivityChange]);

    const { getLanguage } = usePlugins();
    const firstEnabledLanguageName = props.activity?.attributes.enabledLanguages[0];
    const [language, setLanguage] = useState(getLanguage(firstEnabledLanguageName));
    const supportedLanguages = useCompatibleLanguages(activityType?.requiredFeatures ?? []);

    useEffect(() => {
        setLanguage(getLanguage(firstEnabledLanguageName));
    }, [firstEnabledLanguageName, getLanguage]);

    const [configureLanguageDialog, openConfigureLanguageDialog] = useImperativeDialog(ConfigureLanguageDialog, {
        availableLanguages: supportedLanguages,
        enabledLanguage: language,
        saveEnabledLanguage: lang => {
            setLanguage(lang);
            upload(api.classroom(classroomId).activity(id), {
                method: 'PATCH',
                body: {
                    enabledLanguages: [lang.name],
                },
            });
        },
    });

    const ConfigWidget = useImported(activityType?.configWidget);
    const shouldShowSkeleton = isSkeleton(props) || (activityType?.configWidget && !ConfigWidget);

    if (shouldShowSkeleton) {
        return <Box>
            <SkeletonWidget />
        </Box>;
    }

    if (!activityType) {
        return <BrokenWidget
            id={id}
            classroomId={classroomId}
            activityTypeId={props.activity.attributes.activityType}
            activityConfig={props.activity.attributes.configuration}
            onActivityConfigChange={configChangeHandler}
            displayName={props.activity.attributes.displayName}
            onDisplayNameChange={displayNameChangeHandler}
            startActivity={startActivity}
            goToConfigPage={goToConfigPage}
            dragHandle={drag} />;
    }

    const Widget = ConfigWidget ?? DefaultActivityWidget;

    async function goToConfigPage() {
        router.push({ pathname: `/classroom/${classroomId}/manage/activity/${id}` });
    }

    async function startActivity() {
        if (activityType) {
            await upload(api.classroom(classroomId).live, {
                method: 'POST',
                body: {
                    id,
                    networks: activityType.configurePolicies?.(props.activity!.attributes.configuration),
                },
            });
    
            router.push(`/classroom/${classroomId}/activity`);
        }
    }

    return <Box sx={{ opacity: isDragging ? 0 : 1 }}>
        {configureLanguageDialog}
        <Widget
            id={id}
            classroomId={classroomId}
            activityType={activityType}
            activityConfig={props.activity.attributes.configuration}
            onActivityConfigChange={configChangeHandler}
            displayName={props.activity.attributes.displayName}
            onDisplayNameChange={displayNameChangeHandler}
            startActivity={startActivity}
            goToConfigPage={activityType.configPage ? goToConfigPage : openConfigureLanguageDialog}
            dragHandle={drag} />
    </Box>;
}
