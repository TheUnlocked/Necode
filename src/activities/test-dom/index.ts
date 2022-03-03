import { activityDescription } from "../ActivityDescription";
import createTestActivityPages, { HtmlTestActivityBaseConfig } from "../html-test-activity-base/HtmlTestActivity";
import supportsGlobal from "../../languages/features/supportsGlobal";
import supportsIsolated from "../../languages/features/supportsIsolated";
import dedent from "dedent-js";

interface DomTestActivityConfig extends HtmlTestActivityBaseConfig {
    description: string;
    hiddenHtml: string;
    tests: {
        source: string,
        mustPassToSubmit: boolean
    };
    languages: {
        code: { enabled: boolean, defaultValue: { [languageName: string]: string } };
    };
}

const [activityPage, configPage] = createTestActivityPages();

const testDomActivityDescription = activityDescription({
    id: 'core/test-dom',
    displayName: 'DOM Programming',
    requiredFeatures: [
        supportsGlobal,
        supportsIsolated
    ] as const,
    activityPage,
    configPage,
    defaultConfig: {
        description: dedent`
        # Problem Name
        Put a description of the problem here.

        You can use triple \`-delimited blocks to write code:
        \`\`\`js
        function addOne(n) {
            return n + 1;
        }
        \`\`\`

        Learn more about markdown [here](https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown).
        You can even use GitHub-flavored markdown (GFM)!

        ## Subproblem
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec laoreet maximus mauris at rhoncus. Donec in lacus id tortor fermentum finibus. Nulla leo arcu, porttitor in justo nec, gravida varius mauris. Donec commodo at sapien eu dictum. Quisque arcu nisi, consequat vel turpis luctus, imperdiet cursus diam. Morbi ultrices at arcu quis efficitur. Integer ut vestibulum mi. Donec nec porta ante.
        `,
        hiddenHtml: dedent`
        <!-- You can put extra HTML here which the student won't be able to touch.
            This can be useful for embedding styles/scripts without distracting the student.
            Note that if they really want to, the student can usually still write code
            to change anything in the hidden section. -->

        <!-- By default the student's HTML will just be appended to the hidden HTML.
            If you want to embed the student's HTML into a specific place in the hidden HTML,
            use the user-content tag like this: -->
        <user-content></user-content>
        `,
        languages: {
            html: { enabled: true, defaultValue: dedent`
            <meta name="color-scheme" content="dark light" />

            <h1>Hello, World!</h1>
            ` },
            code: { enabled: true, defaultValue: {} },
            css: { enabled: true, defaultValue: dedent`
            /* This makes the iframe look at home on this site,
             * but it's still just starter code. Feel free to play around! */
            
            @import url('https://fonts.googleapis.com/css2?family=Roboto&display=swap');

            body {
                background-color: #1e1e1e;
                color: white;
                font-family: "Roboto", "Helvetica", "Arial", sans-serif;
                font-weight: 400;
            }
            ` },
        },
        tests: {
            mustPassToSubmit: true,
            source: dedent`
            // ^
            // Click the ? in the top-left corner of this pane
            // to learn about how to write tests in Necode.

            check(false, "Tests haven't been configured yet.");

            `
        }
    } as DomTestActivityConfig
});

export default testDomActivityDescription;