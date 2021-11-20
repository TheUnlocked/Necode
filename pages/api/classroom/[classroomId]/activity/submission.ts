import { endpoint, Status } from "../../../../../src/api/Endpoint";
import { makeActivitySubmissionEntity } from "../../../../../src/api/entities/ActivitySubmissionEntity";

const apiActivitySubmission = endpoint(makeActivitySubmissionEntity, ['classroomId', 'activityId?', 'userId?', 'version?'], {
    type: 'entityType',
    GET: {
        loginValidation: true,
        async handler({ query, body, session }) {

        }
    },
    POST: {
        handler(_, _ok, fail) {
            return fail(Status.NOT_IMPLEMENTED, 'Submissions over the REST API are not permitted. Submit over a socket connection instead.');
        }
    },
    DELETE: {
        loginValidation: true,
        async handler({ query, body, session }) {

        }
    }
});

export default apiActivitySubmission;