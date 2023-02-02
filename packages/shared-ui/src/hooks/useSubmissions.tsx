import { createContext, forwardRef, PropsWithChildren, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { ActivitySubmissionEntity } from "~api/entities/ActivitySubmissionEntity";
import { DisposeFn } from "~utils/types";
import tracked from "~shared/trackedEventEmitter";
import SocketInfo from "../types/SocketInfo";
import ActivityDescription from '../types/ActivityDescription';
import { useApiGet } from './useApi';
import api from '~api/src/handles';
import { callWith } from '~utils/src/fp';
import { useSnackbar } from 'notistack';
import { useLoadingContext } from './useLoadingContext';

export interface VersionedSubmission<T> {
    schemaVer: number;
    data: T;
}

type SubmissionLoadListener<T> = (submission: T) => void;

interface SubmissionContextValue<T extends VersionedSubmission<any>> {
    submit<V extends T['schemaVer']>(schemaVer: V, data: (T & { schemaVer: V })['data']): Promise<void>;
    addSubmissionLoadListener(callback: SubmissionLoadListener<T>): DisposeFn;
}

const submissionContext = createContext<SubmissionContextValue<VersionedSubmission<any>>>({
    submit: async () => {},
    addSubmissionLoadListener: () => () => {},
});

interface SubmissionProviderRef {
    areSubmissionsUsed: boolean;
    submissions: readonly ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>[];
    loadSubmission(submission: ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>): void;
}

export interface SubmissionProviderProps extends PropsWithChildren {
    classroomId: string | undefined;
    activity: ActivityDescription<unknown> | undefined;
    socketInfo: SocketInfo | undefined;
    onSubmission?: (submissionEntity: ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>) => void;
}

const EMPTY = [] as ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>[];

export const MockSubmissionProvider = submissionContext.Provider;

export const SubmissionProvider = forwardRef<SubmissionProviderRef, SubmissionProviderProps>(function SubmissionProvider({
    classroomId,
    activity,
    socketInfo,
    onSubmission,
    children,
}, ref) {
    const onSubmissionRef = useRef(onSubmission);

    useEffect(() => {
        onSubmissionRef.current = onSubmission;
    }, [onSubmission]);

    const { data: submissions, mutate } = useApiGet<ActivitySubmissionEntity<{ user: 'deep', activity: 'none' }>[]>(
        api.classroom(classroomId).live.submissions({ include: { user: true } }) as any,
        { fallbackData: EMPTY, disabled: !activity },
    );

    const [areSubmissionsUsed, setAreSubmissionsUsed] = useState(false);
    const submissionLoadListeners = useRef(new Set<SubmissionLoadListener<any>>());

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

    useImperativeHandle(ref, () => ({
        areSubmissionsUsed,
        submissions: submissions!,
        loadSubmission: (submission) => {
            submissionLoadListeners.current.forEach(callWith(submission.attributes.data));
        }
    }), [areSubmissionsUsed, submissions]);

    const { startUpload, finishUpload } = useLoadingContext();
    const { enqueueSnackbar } = useSnackbar();

    return <submissionContext.Provider
        value={useMemo(() => ({
            submit: (schemaVer, data) => {
                if (!socketInfo?.socket) {
                    enqueueSnackbar('A network error occurrred. Copy your work to a safe place and refresh the page.', { variant: 'error' });
                    return Promise.reject();
                }
                startUpload();
                return new Promise<void>((resolve, reject) => {
                    socketInfo.socket.emit('submission', { schemaVer, data }, error => {
                        finishUpload();
                        if (error) {
                            enqueueSnackbar(error, { variant: 'error' });
                            reject(new Error(error));
                        }
                        else {
                            enqueueSnackbar('Submission successful!', { variant: 'info' });
                            resolve();
                        }
                    });
                });
            },
            addSubmissionLoadListener: callback => {
                submissionLoadListeners.current.add(callback);
                setAreSubmissionsUsed(true);
                return () => {
                    submissionLoadListeners.current.delete(callback);
                    if (submissionLoadListeners.current.size === 0) {
                        setAreSubmissionsUsed(false);
                    }
                };
            }
        }), [socketInfo, startUpload, finishUpload, enqueueSnackbar])}>{children}</submissionContext.Provider>;
});

export default function useSubmissions<T extends VersionedSubmission<any>>(onLoadSubmission: (submission: T) => void) {
    const { submit, addSubmissionLoadListener } = useContext<SubmissionContextValue<T>>(submissionContext as any);
    
    useEffect(() => {
        return addSubmissionLoadListener(onLoadSubmission);
    }, [addSubmissionLoadListener, onLoadSubmission]);

    return submit;
}
