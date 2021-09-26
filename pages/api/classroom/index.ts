import { ClassroomEntity } from "../../../src/util/APITypes";

export type PostRequestData = Omit<ClassroomEntity['attributes'], 'members'>;

