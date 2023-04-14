import { ArrowLeft, ArrowRight } from '@mui/icons-material';
import { Box, Card, CardActionArea, CardContent, IconButton, Stack, Typography } from '@mui/material';
import { NetworkId, useSignal, useSnackbar } from '@necode-org/activity-dev';
import { useCallback, useContext, useMemo, useState } from 'react';
import { ScrollMenu, VisibilityContext } from 'react-horizontal-scrolling-menu';

export interface BreakoutRoomSelectorProps {
    network: NetworkId;
    numRooms: number;
    roomNames?: string[];
    children: (roomId?: number) => JSX.Element;
}

function LeftArrow() {
    const { isFirstItemVisible, scrollPrev } = useContext(VisibilityContext);

    return <Box display="flex" flexDirection="column" justifyContent="center" mr={1}>
        <IconButton disabled={isFirstItemVisible} onClick={() => scrollPrev()}>
            <ArrowLeft />
        </IconButton>
    </Box>;
}

function RightArrow() {
    const { isLastItemVisible, scrollNext } = useContext(VisibilityContext);

    return <Box display="flex" flexDirection="column" justifyContent="center" ml={1}>
        <IconButton disabled={isLastItemVisible} onClick={() => scrollNext()}>
            <ArrowRight />
        </IconButton>
    </Box>;
}

const menuHeight = '68px';

export default function BreakoutRoomProvider({ network, numRooms, roomNames, children }: BreakoutRoomSelectorProps) {
    const signal = useSignal(network);

    const [currentRoom, setCurrentRoom] = useState<number>();
    const rooms = useMemo(() => [...new Array(numRooms)].map((_, i) => ({
        id: i + 1,
        name: roomNames?.[i] ?? `Room ${i + 1}`,
    })), [numRooms, roomNames]);

    const { enqueueSnackbar } = useSnackbar();

    const joinRoom = useCallback(async (room: number) => {
        try {
            if (currentRoom !== undefined) {
                await signal('leaveRoom', {});
                setCurrentRoom(undefined);
            }
            await signal('joinRoom', { room });
            setCurrentRoom(room);
        }
        catch (e) {
            console.error(e);
            if (e instanceof Error) {
                enqueueSnackbar(`Failed to join room: ${e.message}`, { variant: 'error' });
            }
            else {
                enqueueSnackbar(`Failed to join room.`, { variant: 'error' });
            }
        }
    }, [currentRoom, signal, enqueueSnackbar]);

    return <Stack height="100%">
        <Box mb={1} height={menuHeight} sx={{
            ".breakout-room-selector-scroll-container": {
                // Chromium
                "&::-webkit-scrollbar": {
                    display: "none",
                },
                "&": {
                    // Old Edge
                    "-ms-overflow-style": "none",
                    // Firefox
                    "scrollbar-width": "none",
                }
            },
        }}>
            <ScrollMenu LeftArrow={LeftArrow} RightArrow={RightArrow} scrollContainerClassName="breakout-room-selector-scroll-container">
                {rooms.map(room => <Card key={room.id} variant={room.id === currentRoom ? 'outlined' : 'elevation'} sx={{
                    ml: room.id === 1 ? 0 : 1,
                    minWidth: 110,
                }}>
                    <CardActionArea disabled={room.id === currentRoom} onClick={() => joinRoom(room.id)}>
                        <CardContent sx={{ px: 2, py: 1.5 }}>
                            <Typography variant="body1" component="div" whiteSpace="nowrap">{room.name}</Typography>
                            <Typography variant="body2">{room.id === currentRoom ? "Joined." : "Click to join."}</Typography>
                        </CardContent>
                    </CardActionArea>
                </Card>)}
            </ScrollMenu>
        </Box>
        <Box height={`calc(100% - ${menuHeight} - 8px)`}>
            {children(currentRoom)}
        </Box>
    </Stack>;
}