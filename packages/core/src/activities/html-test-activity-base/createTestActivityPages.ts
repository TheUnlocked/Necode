import { Importable } from '~utils/types';
import { ActivityConfigPageProps, ActivityPageProps, Feature } from '@necode-org/plugin-dev';
import type { HTAFeatures, HtmlTestActivityBaseConfig, HtmlTestActivityOptions } from './createTestActivityPage';
import type createTestActivityPage from './createTestActivityPage';

let createTestActivityPagePromise: Promise<typeof createTestActivityPage>;

export default function createTestActivityPages<
    Config extends HtmlTestActivityBaseConfig,
    ActivityFeatures extends readonly Feature[] = HTAFeatures,
>(options: HtmlTestActivityOptions<ActivityFeatures>): [
    activityPage: Importable<(props: ActivityPageProps<ActivityFeatures, Config>) => JSX.Element>,
    configPage: Importable<(props: ActivityConfigPageProps<ActivityFeatures, Config>) => JSX.Element>,
] {
    createTestActivityPagePromise ??= import('./createTestActivityPage').then(x => x.default);
    const activityPage = async () => (await createTestActivityPagePromise)({ isEditor: false, options });
    const configPage = async () => (await createTestActivityPagePromise)({ isEditor: true, options });

    return [activityPage, configPage];
}