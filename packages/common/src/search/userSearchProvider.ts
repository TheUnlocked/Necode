import { UserEntity } from '../api/entities/UserEntity';
import SearchProvider from './SearchProvider';

function invertedScore(field: string, query: string) {
    if (query === '') {
        return 0;
    }

    const index = field.toLocaleLowerCase().indexOf(query);
    return index < 0 ? 1 : index / field.length;
}

export default {
    getScore(user, query) {
        return query.toLocaleLowerCase().split(' ')
            .map(subQuery => 1 - [
                    invertedScore(user.attributes.firstName, subQuery),
                    invertedScore(user.attributes.lastName, subQuery),
                    invertedScore(user.attributes.displayName, subQuery),
                ]
                .reduce((result, next) => result * next, 1))
            .reduce((result, next) => result * next, 1);
    },
} as SearchProvider<UserEntity<any>>;