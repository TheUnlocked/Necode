import { useEffect, useRef } from "react";
import { ActivitySubmissionEntity } from "~api/entities/ActivitySubmissionEntity";
import tracked from "../util/trackedEventEmitter";
import { SocketInfo } from "./useSocket";
import ActivityDescription from '../activities/ActivityDescription';
import { useGetRequest } from './useGetRequest';

export function useSubmissions(
    classroomId: string | undefined,
    activity: ActivityDescription<unknown> | undefined,
    socketInfo: SocketInfo | undefined,
    onSubmission?: (submissionEntity: ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>) => void
) {
    const onSubmissionRef = useRef(onSubmission);

    useEffect(() => {
        onSubmissionRef.current = onSubmission;
    }, [onSubmission]);

    const { data: submissions, mutate } = useGetRequest<ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>[]>(
        activity ? `/~api/classroom/${classroomId}/activity/submission?include=user` : undefined,
        {
            fallbackData: [],
        }
    );

    useEffect(() => {
        if (socketInfo?.socket) {
            const ws = tracked(socketInfo.socket);

            ws.on('startActivity', async () => {
                mutate();
            });

            ws.on('submission', submission => {
                mutate(submissions => {
                    if (!submissions) {
                        submissions = [];
                    }

                    const existingIndex = submissions.findIndex(x => x.attributes.user.id === submission.attributes.user.id);
                    
                    if (existingIndex === -1) {
                        return [...submissions, submission];
                    }

                    if (submissions[existingIndex].attributes.version > submission.attributes.version) {
                        return submissions;
                    }

                    return [
                        ...submissions.slice(0, existingIndex),
                        submission,
                        ...submissions.slice(existingIndex + 1)
                    ];
                });
                onSubmissionRef.current?.(submission);
            });

            return () => ws.offTracked();
        }
    }, [socketInfo, classroomId, mutate]);

    return submissions!;
}