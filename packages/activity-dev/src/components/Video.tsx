import { useCallback, useEffect, useState, forwardRef } from 'react';
import { assignRef, SimpleRef } from '~shared-ui/util/simpleRef';

export interface VideoProps extends React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> {
    srcObject?: HTMLVideoElement['srcObject'];
    ref?: SimpleRef<HTMLVideoElement>;
}

export default forwardRef(function Video({ srcObject, muted, autoPlay, ...props }: Omit<VideoProps, 'ref'>, ref) {
    const [video, setVideo] = useState<HTMLVideoElement>();

    const handleVideoLoad = useCallback((video: HTMLVideoElement) => {
        assignRef(ref, video);
        setVideo(video);
    }, [ref]);

    useEffect(() => {
        if (video && muted !== undefined) {
            video.muted = muted;
        }
    }, [video, muted]);

    useEffect(() => {
        if (video) {
            if (srcObject === undefined) {
                video.srcObject = null;
            }
            else {
                try {
                    video.srcObject = srcObject;
                }
                catch (e) {
                    // There may be an error about cancelling play. That's fine, we can just ignore it.
                }
                if (autoPlay) {
                    video.play();
                }
            }
        }
    }, [video, autoPlay, srcObject]);
    
    return <video {...props} autoPlay={autoPlay} ref={handleVideoLoad} />;
});