import { activityDescription } from "../ActivityDescription";
import createTestActivityPages, { HtmlTestActivityBaseConfig } from "../html-test-activity-base/HtmlTestActivity";
import dedent from "dedent-js";
import isLanguage from "../../languages/features/isLanguage";
import { glslDescription } from "../../languages/glsl";

interface GLSLActivityConfig extends HtmlTestActivityBaseConfig {
    description: string;
    hiddenHtml: string;
    tests?: {
        source: string,
        mustPassToSubmit: boolean
    };
    languages: {
        code: { enabled: boolean, defaultValue: { glsl: string } };
    };
}

const [activityPage, configPage] = createTestActivityPages({
    hasCss: false,
    hasHtml: false,
    hasTests: true,
    hiddenHtml: {
        configurable: true
    }
});

const glslActivityDescription = activityDescription({
    id: 'core/glsl',
    displayName: 'GLSL Playground',
    requiredFeatures: [isLanguage(glslDescription)] as const,
    activityPage,
    configPage,
    defaultConfig: {
        description: dedent`
        # Title
        ## Subtitle
        Text
        `,
        hiddenHtml: dedent`
        <style>
            body {
                margin: 0;
                height: 100vh;
                overflow: hidden;
            }

            #error-box {
                margin: 8px;
                white-space: pre-wrap;
            }
        </style>

        <canvas id="gl"></canvas>

        <script>
            let uTime, uRes;

            const canvas = document.getElementById('gl');
            const gl = canvas.getContext('webgl');

            function updateSize(width, height) {
                if (uRes) {
                    gl.uniform2f(uRes, width, height);
                }
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            }

            new ResizeObserver(([{ contentRect: { width, height } }]) => {
                updateSize(Math.ceil(width), Math.ceil(height));
            }).observe(document.body);

            function showError(err) {
                [...document.body.children].forEach(x => x.remove());
                const errorBox = document.createElement('pre');
                errorBox.id = 'error-box';
                errorBox.innerText = err;
                document.body.append(errorBox);
            }

            // setTimeout is necessary because GLSL_SHADER_CODE hasn't loaded yet.
            setTimeout(() => {
                gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            
                const buffer = gl.createBuffer();
            
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            
                const triangles = new Float32Array([
                    -1, -1,
                    1, -1,
                    -1, 1,
                    -1, 1,
                    1, -1,
                    1, 1
                ]);
            
                gl.bufferData(gl.ARRAY_BUFFER, triangles, gl.STATIC_DRAW);
            
                const vertexShader = gl.createShader(gl.VERTEX_SHADER);
                gl.shaderSource(vertexShader, GLSL_SHADER_CODE.define({ IS_VERTEX_SHADER: 1 }));
                gl.compileShader(vertexShader);

                const vertexShaderLog = gl.getShaderInfoLog(vertexShader);
                if (vertexShaderLog.length > 0) {
                    showError(vertexShaderLog);
                    return;
                }
            
                const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(fragmentShader, GLSL_SHADER_CODE.define({ IS_FRAGMENT_SHADER: 1 }));
                gl.compileShader(fragmentShader);

                const fragmentShaderLog = gl.getShaderInfoLog(fragmentShader);
                if (fragmentShaderLog.length > 0) {
                    showError(fragmentShaderLog);
                    return;
                }
            
                const program = gl.createProgram();
                gl.attachShader(program, vertexShader);
                gl.attachShader(program, fragmentShader);
                gl.linkProgram(program);
                gl.useProgram(program);
            
                uTime = gl.getUniformLocation(program, 'time');
                uRes = gl.getUniformLocation(program, 'resolution');

                updateSize(window.innerWidth, window.innerHeight);
            
                const position = gl.getAttribLocation(program, 'a_position');
                gl.enableVertexAttribArray(position);
                gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
            
                render();
            }, 0);
            
            let time = 0
            function render() {
                window.requestAnimationFrame(render);
            
                time++;
                gl.uniform1f(uTime, time);
            
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            }
        </script>
        `,
        languages: {
            code: { enabled: true, defaultValue: {
                glsl: dedent`
                #ifdef GL_ES
                precision mediump float;
                #endif

                uniform mediump float time;
                uniform mediump vec2 resolution;

                #ifdef IS_FRAGMENT_SHADER
                void main() {
                    gl_FragColor = vec4( 
                        gl_FragCoord.x / resolution.x, 
                        gl_FragCoord.y / resolution.y, 
                        mod( time/100., 1. ), 
                        1.0 
                    );
                }
                #endif


                #ifdef IS_VERTEX_SHADER
                attribute vec2 a_position;

                void main() {
                    gl_Position = vec4( a_position, 0., 1. );
                }
                #endif
                `
            } },
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
    } as GLSLActivityConfig
});

export default glslActivityDescription;