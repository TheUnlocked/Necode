import ActivityDescription from "../ActivityDescription";
// import { CreateTestActivity } from "./TestActivityConfigPage";
import { TestActivity, TestActivityConfigPage, TestActivityConfig } from "./HtmlTestActivity";
import supportsAmbient from "../../languages/features/supportsAmbient";
import supportsIsolated from "../../languages/features/supportsIsolated";
import dedent from "dedent-js";

const testBasedActivityDescription: ActivityDescription<TestActivityConfig, [
    typeof supportsAmbient,
    typeof supportsIsolated
]> = {
    id: 'testbased:html',
    displayName: 'DOM Programming',
    supportedFeatures: [
        supportsAmbient,
        supportsIsolated
    ],
    configPage: TestActivityConfigPage,
    activityPage: TestActivity,
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
        <!-- You can put extra HTML here which the student won't be able to touch (e.g. for imports/scripts).
            If you want to embed the student's code into the hidden HTML, use the user-content tag like so: -->
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
        tests: dedent`
        // Write assertions using check syntax:
        check(1 === 1);

        // You can also use the declare syntax to check for
        // functions/variables that the student needs to implement:
        declare function foo(n);
        check(foo(3) === 9);

        // You can even query the DOM in a check statement:
        check(document.getElementById('counter').innerText === '5');

        // This editor uses typescript,
        // so you can also use type annotations:
        declare function foo2(n: number): number;
        check(foo2(3) === 9);

        // Give helpful hint messages to students if their code fails a check:
        check(foo(4) === 16, 'You can use * to multiply two numbers!');

        // Or if you just want to show the student the source code
        // of the check that they failed, use SHOW_TEST:
        check(foo(1) === 1, SHOW_TEST);

        // You don't need to worry about assertion conditions throwing errors,
        // but you can wrap them in a lambda anyways if you want:
        function err(n: number) {
            if (n === 0) {
                return true;
            }
            throw new Error('Gave non-zero argument');
        }
        check(err(1), 'The check fails like normal');
        check(() => err(1), 'This check is exactly the same');

        // Note that in order to make check catch errors, there are
        // special source code transformations applied to function calls.
        // Those won't work if you rename the function:
        const check2 = check;
        check2(err(1), 'This will crash the test code :(');
        check2(() => err(1), 'This is still safe though');

        // You can also check for errors:
        checkError(err(1), 'This check always passes');

        // And if you're looking for a specific error,
        // you can add a callback to verify that the thrown error is correct.
        checkError(err(1), 'Whoops, wrong error message!', err => {
            if (err.message !== 'Gave zero argument') {
                return false;
            }
            return true;
        });

        // Other useful functions at your disposal include:

        // Wait some time (max 500ms)
        wait(200);
        
        // Wait until a condition or a timeout (max 500ms)
        waitFor(() => document.getElementById('my-elt'), 100);

        // waitFor is particularly useful when paired with check.
        // For example, this code will check if an element
        // with ID 'my-elt' appears within 100ms.
        check(
            waitFor(() => document.getElementById('my-elt'), 100),
            'The element took too long to appear!'
        );
        `
    }
};

export default testBasedActivityDescription;