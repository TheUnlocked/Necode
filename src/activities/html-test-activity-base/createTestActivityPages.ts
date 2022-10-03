import { Importable } from '../../util/types';
import { ActivityConfigPageProps, ActivityPageProps } from '../ActivityDescription';
import type { HtmlTestActivityBaseConfig, HtmlTestActivityOptions } from './createTestActivityPage';
import type createTestActivityPage from './createTestActivityPage';

let createTestActivityPagePromise: Promise<typeof createTestActivityPage>;

export default function createTestActivityPages<Config extends HtmlTestActivityBaseConfig>(options: HtmlTestActivityOptions = {}): [
    activityPage: Importable<(props: ActivityPageProps<Config>) => JSX.Element>,
    configPage: Importable<(props: ActivityConfigPageProps<Config>) => JSX.Element>,
] {
    createTestActivityPagePromise ??= import('./createTestActivityPage').then(x => x.default);
    const activityPage = async () => (await createTestActivityPagePromise)({ isEditor: false, options });
    const configPage = async () => (await createTestActivityPagePromise)({ isEditor: true, options });

    return [activityPage, configPage];
}