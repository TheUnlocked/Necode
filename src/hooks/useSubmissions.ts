import { useEffect, useRef, useState } from "react";
import { ActivitySubmissionEntity } from "../api/entities/ActivitySubmissionEntity";
import tracked from "../util/trackedEventEmitter";
import { SocketInfo } from "./useSocket";
import useNecodeFetch from './useNecodeFetch';

export function useSubmissions(classroomId: string | undefined, socketInfo: SocketInfo | undefined, onSubmission?: (submissionEntity: ActivitySubmissionEntity<{
    user: 'deep',
    activity: 'none'
}>) => void) {
    const onSubmissionRef = useRef(onSubmission);

    useEffect(() => {
        onSubmissionRef.current = onSubmission;
    }, [onSubmission]);

    const [submissions, setSubmissions] = useState<ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>[]>([]);

    const { download } = useNecodeFetch();

    useEffect(() => {
        if (socketInfo?.socket) {
            const ws = tracked(socketInfo.socket);

            ws.on('startActivity', async () => {
                if (classroomId) {
                    try {
                        const submissions = await download<ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>[]>(
                            `/api/classroom/${classroomId}/activity/submission?include=user`,
                            { errorMessage: null },
                        );
                        setSubmissions(submissions);
                    }
                    catch (err) {
                        setSubmissions([]);
                    }
                }
            });

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
    }, [socketInfo, classroomId, download]);

    return submissions;
}