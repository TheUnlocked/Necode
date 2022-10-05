import { Box } from "@mui/system";
import { useRouter } from "next/router";
import { ComponentType, useCallback, useEffect } from "react";
import { useDrag, createEmptyPreviewImage } from "use-dnd";
import { CreateLiveActivityInfo } from "../../../websocketServer/src/types";
import { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import { PartialAttributesOf } from '../../api/Endpoint';
import { ActivityEntity } from '../../api/entities/ActivityEntity';
import { activityDragDropType } from '../../dnd/types';
import useActivityDescription from '../../hooks/useActivityDescription';
import useImported from '../../hooks/useImported';
import useNecodeFetch from '../../hooks/useNecodeFetch';
import BrokenWidget from './BrokenWidget';
import DefaultActivityWidget from "./DefaultActivityWidget";
import SkeletonWidget from "./SkeletonWidget";

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

    const { upload } = useNecodeFetch();

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

    const activityType = useActivityDescription(props.activity?.attributes.activityType);

    const configChangeHandler = useCallback((configuration: any) => {
        onActivityChange?.({ configuration });
    }, [onActivityChange]);

    const displayNameChangeHandler = useCallback((displayName: string) => {
        onActivityChange?.({ displayName });
    }, [onActivityChange]);

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
            await upload(`/api/classroom/${classroomId}/activity/live`, {
                method: 'POST',
                body: JSON.stringify({
                    id,
                    networks: activityType.configurePolicies?.(props.activity!.attributes.configuration),
                } as CreateLiveActivityInfo)
            });
    
            router.push(`/classroom/${classroomId}/activity`);
        }
    }

    return <Box sx={{ opacity: isDragging ? 0 : 1 }}>
        <Widget
            id={id}
            classroomId={classroomId}
            activityTypeId={props.activity.attributes.activityType}
            activityConfig={props.activity.attributes.configuration}
            onActivityConfigChange={configChangeHandler}
            displayName={props.activity.attributes.displayName}
            onDisplayNameChange={displayNameChangeHandler}
            startActivity={startActivity}
            goToConfigPage={activityType.configPage ? goToConfigPage : undefined}
            dragHandle={drag} />
    </Box>;
}
