import { useEffect, useRef, useState } from "react";
import useGetRequest from "../api/client/GetRequestHook";
import { ActivitySubmissionEntity } from "../api/entities/ActivitySubmissionEntity";
import tracked from "../util/trackedEventEmitter";
import { SocketInfo } from "./SocketHook";

export function useSubmissions(classroomId: string | undefined, socketInfo: SocketInfo | undefined, onSubmission?: (submissionEntity: ActivitySubmissionEntity<{
    user: 'deep',
    activity: 'none'
}>) => void) {
    const onSubmissionRef = useRef(onSubmission);

    useEffect(() => {
        onSubmissionRef.current = onSubmission;
    }, [onSubmission]);

    const { data: allSubmissionsEntity } = useGetRequest<ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>[]>(
        classroomId ? `/api/classroom/${classroomId}/activity/submission?include=user` : null,
        { revalidateOnFocus: false }
    );

    const [submissions, setSubmissions] = useState<ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>[]>([]);

    useEffect(() => {
        if (allSubmissionsEntity) {
            setSubmissions(allSubmissionsEntity);
        }
    }, [allSubmissionsEntity]);

    useEffect(() => {
        if (socketInfo?.socket) {
            const ws = tracked(socketInfo.socket);

            ws.on('submission', submission => {
                setSubmissions(submissions => {
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
    }, [socketInfo]);

    return submissions;
}