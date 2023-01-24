import createMiKePolicy from './MiKePolicy';
import { RtcPolicy } from "./RtcPolicy";

const allPolicies: RtcPolicy[] = await Promise.all([
    createMiKePolicy('./ring.mike'),
]);

export default allPolicies;