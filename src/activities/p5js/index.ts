import { activityDescription } from "../ActivityDescription";
import { HtmlTestActivityBaseConfig } from "../html-test-activity-base/createTestActivityPage";
import supportsGlobalContext from "../../languages/features/supportsGlobal";
import supportsIsolated from "../../languages/features/supportsIsolated";
import dedent from "dedent-js";
import createTestActivityPages from '../html-test-activity-base/createTestActivityPages';
import typeDeclarationFiles from './typeDeclarationFiles';

interface P5ActivityConfig extends HtmlTestActivityBaseConfig {
    description: string;
    hiddenHtml: string;
    languages: {
        code?: { enabled: boolean, defaultValue: { [languageName: string]: string } };
    }
}

const [activityPage, configPage] = createTestActivityPages({
    hasCss: false,
    hasHtml: false,
    hasTests: false,
    hiddenHtml: {
        configurable: true
    },
    typeDeclarations: typeDeclarationFiles,
});

const p5jsActivityDescription = activityDescription({
    id: 'core/p5js',
    displayName: 'p5.js Playground',
    requiredFeatures: [
        supportsGlobalContext,
        supportsIsolated
    ] as const,
    activityPage,
    configPage,
    defaultConfig: {
        description: dedent`
        # Title
        ## Subtitle
        Text
        `,
        hiddenHtml: dedent`
        <script defer src="https://cdn.jsdelivr.net/npm/p5@1.4.0/lib/p5.js"></script>

        <style>
            body {
                margin: 0;
                height: 100vh;
                width: 100vw;
            }
        </style>
        `,
        languages: {
            code: { enabled: true, defaultValue: {
                javascript: dedent`
                function setup() {
                    createCanvas(400, 400);
                }
                  
                function draw() {
                    background(220);
                }
                `
            } },
        }
    } as P5ActivityConfig
});

export default p5jsActivityDescription;