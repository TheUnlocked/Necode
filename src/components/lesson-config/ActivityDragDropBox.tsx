import { Box } from "@mui/system";
import { useRouter } from "next/router";
import { ComponentType, useEffect, useRef } from "react";
import { ConnectableElement, useDrag } from "react-dnd";
import { getEmptyImage } from 'react-dnd-html5-backend';
import { LiveActivityInfo } from "../../../websocketServer/src/types";
import { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import { useLoadingContext } from "../../api/client/LoadingContext";
import { ActivityEntity } from '../../api/entities/ActivityEntity';
import useActivityDescription from '../../hooks/useActivityDescription';
import fetch from '../../util/fetch';
import BrokenWidget from './BrokenWidget';
import DefaultActivityWidget from "./DefaultActivityWidget";
import SkeletonWidget from "./SkeletonWidget";

export const activityDragDropType = 'application/lesson-activity+json';

export type DraggableComponent = ComponentType<ActivityConfigWidgetProps<any>>;

interface BaseActivityDragDropBoxProps {
    id: string;
    classroomId: string;
}

interface SkeletonActivityDragDropBoxProps extends BaseActivityDragDropBoxProps {
    skeleton: true;
    activity?: undefined;
    onActivityConfigChange?: (newConfig: any) => void;
}

interface RealActivityDragDropBoxProps extends BaseActivityDragDropBoxProps {
    skeleton: false;
    activity: ActivityEntity;
    onActivityConfigChange: (newConfig: any) => void;
}

type ActivityDragDropBoxProps<IsSkeleton extends boolean>
    = IsSkeleton extends true ? SkeletonActivityDragDropBoxProps : RealActivityDragDropBoxProps;

function isSkeleton(props: ActivityDragDropBoxProps<boolean>): props is ActivityDragDropBoxProps<true> {
    return props.skeleton;
}

export function ActivityDragDropBox<IsSkeleton extends boolean>(props: ActivityDragDropBoxProps<IsSkeleton>) {
    const { id, classroomId } = props;

    const router = useRouter();

    const { startUpload, finishUpload } = useLoadingContext();

    const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
        type: activityDragDropType,
        item: props.activity,
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        }),
    }), [props.activity]);

    useEffect(() => {
        dragPreview(getEmptyImage());
    }, [dragPreview]);

    const boxRef = useRef<Element | null>(null);
    function setBoxRef(x: ConnectableElement) {
        boxRef.current = x as Element;
        return x;
    }

    const activityType = useActivityDescription(props.activity?.attributes.activityType);

    if (isSkeleton(props)) {
        return <Box>
            <SkeletonWidget />
        </Box>;
    }

    if (!activityType) {
        return <BrokenWidget
            id={id}
            classroomId={classroomId}
            activityConfig={props.activity.attributes.configuration}
            onActivityConfigChange={props.onActivityConfigChange}
            startActivity={startActivity}
            goToConfigPage={goToConfigPage}
            dragHandle={drag} />
    }

    const Widget = activityType.configWidget ?? DefaultActivityWidget;

    async function goToConfigPage() {
        router.push({ pathname: `/classroom/${classroomId}/manage/activity/${id}` });
    }

    async function startActivity() {
        startUpload();
        await fetch(`/api/classroom/${classroomId}/activity/live`, {
            method: 'POST',
            body: JSON.stringify({ id, rtcPolicy: activityType!.rtcPolicy } as LiveActivityInfo)
        }).finally(finishUpload);

        router.push(`/classroom/${classroomId}/activity`);
    }

    return <Box ref={setBoxRef} sx={{ opacity: isDragging ? 0 : 1 }}>
        <Widget
            id={id}
            classroomId={classroomId}
            activity={activityType}
            activityConfig={props.activity.attributes.configuration}
            onActivityConfigChange={props.onActivityConfigChange}
            startActivity={startActivity}
            goToConfigPage={activityType.configPage ? goToConfigPage : undefined}
            dragHandle={drag} />
    </Box>;
}
