import { activityDescription } from "../ActivityDescription";
import createTestActivityPages, { HtmlTestActivityBaseConfig } from "../html-test-activity-base/HtmlTestActivity";
import supportsGlobalContext from "../../languages/features/supportsGlobal";
import supportsIsolated from "../../languages/features/supportsIsolated";
import dedent from "dedent-js";

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
    typeDeclarations: [
        'global.d.ts',
        'index.d.ts',
        'src/color/creating_reading.d.ts',
        'src/color/setting.d.ts',
        'src/core/shape/2d_primitives.d.ts',
        'src/core/shape/attributes.d.ts',
        'src/core/shape/curves.d.ts',
        'src/core/shape/vertex.d.ts',
        'src/core/constants.d.ts',
        'src/core/environment.d.ts',
        'src/core/rendering.d.ts',
        'src/core/structure.d.ts',
        'src/core/transform.d.ts',
        'src/data/local_storage.d.ts',
        'src/data/p5.TypedDict.d.ts',
        'src/events/acceleration.d.ts',
        'src/events/keyboard.d.ts',
        'src/events/mouse.d.ts',
        'src/events/touch.d.ts',
        'src/image/image.d.ts',
        'src/image/loading_displaying.d.ts',
        'src/image/pixels.d.ts',
        'src/io/files.d.ts',
        'src/math/calculation.d.ts',
        'src/math/math.d.ts',
        'src/math/noise.d.ts',
        'src/math/random.d.ts',
        'src/math/trigonometry.d.ts',
        'src/typography/attributes.d.ts',
        'src/typography/loading_displaying.d.ts',
        'src/utilities/array_functions.d.ts',
        'src/utilities/conversion.d.ts',
        'src/utilities/string_functions.d.ts',
        'src/utilities/time_date.d.ts',
        'src/webgl/3d_primitives.d.ts',
        'src/webgl/interaction.d.ts',
        'src/webgl/light.d.ts',
        'src/webgl/loading.d.ts',
        'src/webgl/material.d.ts',
        'src/webgl/p5.Camera.d.ts',
        'src/webgl/p5.RendererGL.d.ts',
        'src/color/p5.Color.d.ts',
        'src/core/p5.Element.d.ts',
        'src/core/p5.Graphics.d.ts',
        'src/image/p5.Image.d.ts',
        'src/io/p5.Table.d.ts',
        'src/io/p5.TableRow.d.ts',
        'src/io/p5.XML.d.ts',
        'src/math/p5.Vector.d.ts',
        'src/typography/p5.Font.d.ts',
        'src/webgl/p5.Geometry.d.ts',
        'src/webgl/p5.Shader.d.ts',
        'src/core/p5.Renderer.d.ts',
        'literals.d.ts',
        'constants.d.ts',
    ].map(x => `https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/master/types/p5/${x}`)
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