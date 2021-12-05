import { Box } from "@mui/system";
import { useRouter } from "next/router";
import { ComponentType, useRef } from "react";
import { ConnectableElement, useDrag, useDrop } from "react-dnd";
import ActivityDescription, { ActivityConfigWidgetProps } from "../../activities/ActivityDescription";
import { useLoadingContext } from "../../api/client/LoadingContext";
import { compose } from "../../util/fp";
import { LocalActivity } from "./ActivityListPane";
import DefaultActivityWidget from "./DefaultActivityWidget";
import SkeletonWidget from "./SkeletonWidget";

export const activityDragDropType = 'application/lesson-activity+json';

export type DraggableComponent = ComponentType<ActivityConfigWidgetProps<any>>;

interface BaseActivityDragDropBoxProps {
    id: string;
    classroomId: string;
    moveItem: (id: string, to: number) => void;
    findItem: (id: string) => { index: number };
    getRealActivityId: (id: string) => Promise<string>;
}

interface SkeletonActivityDragDropBoxProps extends BaseActivityDragDropBoxProps {
    skeleton: true;
}

interface RealActivityDragDropBoxProps extends BaseActivityDragDropBoxProps {
    skeleton: false;
    activity: ActivityDescription<any>;
    activityConfig: any;
    onActivityConfigChange: (newConfig: any) => void;
}

type ActivityDragDropBoxProps<IsSkeleton extends boolean>
    = IsSkeleton extends true ? SkeletonActivityDragDropBoxProps : RealActivityDragDropBoxProps;

export function ActivityDragDropBox<IsSkeleton extends boolean>(props: ActivityDragDropBoxProps<IsSkeleton>) {
    const { id, classroomId, moveItem, findItem, getRealActivityId } = props;

    const router = useRouter();

    const { startUpload, finishUpload } = useLoadingContext();

    const originalIndex = findItem(id).index;

    const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
        type: activityDragDropType,
        item: { id, originalIndex },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        }),
        end: (item, monitor) => {
            const { id: droppedId, originalIndex } = item
            const didDrop = monitor.didDrop();
            if (!didDrop) {
                moveItem(droppedId, originalIndex);
            }
        }
    }), [id, originalIndex, moveItem]);

    const boxRef = useRef<Element | null>(null);
    function setBoxRef(x: ConnectableElement) {
        boxRef.current = x as Element;
        return x;
    }

    const [, drop] = useDrop<LocalActivity, unknown, unknown>(() => ({
        accept: activityDragDropType,
        canDrop: () => false,
        hover({ id: draggedId }, monitor) {
            if (draggedId !== id) {
                const { index: dragIndex } = findItem(draggedId);
                const hoverIndex = originalIndex;

                // Determine rectangle on screen
                const hoverBoundingRect = boxRef.current!.getBoundingClientRect()

                // Get vertical middle
                const hoverMiddleY =
                    (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2

                // Determine mouse position
                const clientOffset = monitor.getClientOffset()

                // Get pixels to the top
                const hoverClientY = clientOffset!.y - hoverBoundingRect.top

                // Only perform the move when the mouse has crossed half of the items height
                // When dragging downwards, only move when the cursor is below 50%
                // When dragging upwards, only move when the cursor is above 50%

                // Dragging downwards
                if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                    return
                }

                // Dragging upwards
                if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                    return
                }

                moveItem(draggedId, hoverIndex);
            }
        }
    }), [id, findItem, moveItem]);

    if (props.skeleton) {
        return <Box>
            <SkeletonWidget />
        </Box>;
    }

    const {
        activity,
        activityConfig,
        onActivityConfigChange,
    } = props as ActivityDragDropBoxProps<false>;

    const Widget = activity.configWidget ?? DefaultActivityWidget;

    async function goToConfigPage() {
        router.push({ pathname: `/classroom/${classroomId}/manage/activity/${await getRealActivityId(id)}` });
    }

    async function startActivity() {
        startUpload();
        await fetch(`/api/classroom/${classroomId}/activity/live`, {
            method: 'POST',
            body: JSON.stringify({ id, rtcPolicy: activity.rtcPolicy } as LiveActivityInfo)
        }).finally(finishUpload);

        router.push(`/classroom/${classroomId}/activity`);
    }

    return <Box ref={compose(setBoxRef, drop, dragPreview)} sx={{ opacity: isDragging ? 0 : 1 }}>
        <Widget
            id={id}
            classroomId={classroomId}
            activity={activity}
            activityConfig={activityConfig}
            onActivityConfigChange={onActivityConfigChange}
            startActivity={startActivity}
            goToConfigPage={activity.configPage ? goToConfigPage : undefined}
            dragHandle={drag} />
    </Box>;
}
