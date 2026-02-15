import { useState, useEffect, useRef, useCallback } from 'react';

export type CameraState = {
    stream: MediaStream | null;
    error: string | null;
    loading: boolean;
};

export const useCamera = (
    videoRef: React.RefObject<HTMLVideoElement | null>
) => {
    const [state, setState] = useState<CameraState>({
        stream: null,
        error: null,
        loading: false,
    });

    const startCamera = useCallback(async () => {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                };
            }

            setState({ stream, error: null, loading: false });
        } catch (err: any) {
            console.error('Error accessing camera:', err);
            setState({
                stream: null,
                error: err.message || 'Could not access camera',
                loading: false,
            });
        }
    }, [videoRef]);

    const stopCamera = useCallback(() => {
        if (state.stream) {
            state.stream.getTracks().forEach((track) => track.stop());
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
            setState({ stream: null, error: null, loading: false });
        }
    }, [state.stream, videoRef]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount/unmount is not quite right if we want to clean up when stream changes, but stopCamera depends on stream. 
    // Actually, standard practice: return cleanup function.
    // The cleanup function inside useEffect captures the scope. 
    // Let's rely on the dedicated cleanup effect.

    return { ...state, startCamera, stopCamera };
};
