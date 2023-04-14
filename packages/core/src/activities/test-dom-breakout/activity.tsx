import { NetworkId } from '@necode-org/activity-dev';
import { ActivityPageProps } from '@necode-org/plugin-dev';
import { Config } from '.';
import BreakoutRoomProvider from '../../components/BreakoutRoomProvider';
import createBreakoutRoomsWidget from '../../components/createBreakoutRoomsWidget';
import { HTAFeatures } from '../html-test-activity-base/createTestActivityPage';
import createTestActivityPages from '../html-test-activity-base/createTestActivityPages';

const pages = createTestActivityPages({ networked: true });

export const Activity = pages[0]().then(InternalActivity => function Activity(props: ActivityPageProps<HTAFeatures, Config>) {
    const { rooms } = props.activityConfig;
    return <BreakoutRoomProvider network={NetworkId.NET_0} numRooms={rooms.length} roomNames={rooms}>
        {roomId => <InternalActivity roomId={roomId} {...props} />}
    </BreakoutRoomProvider>;
});

export const ActivityConfig = pages[1]() as unknown as Promise<React.FC<ActivityPageProps<HTAFeatures, Config>>>;

export const Widget = createBreakoutRoomsWidget('rooms');
