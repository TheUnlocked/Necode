import { isNotNull } from '~utils/typeguards';
import createMiKePolicy from './MiKePolicy';
import { RtcPolicy } from "./RtcPolicy";

const allPolicies: RtcPolicy[] = (await Promise.all([
    createMiKePolicy('./noop.mike'),
    createMiKePolicy('./ring.mike'),
    createMiKePolicy('./breakout.mike'),
])).filter(isNotNull);

export default allPolicies;