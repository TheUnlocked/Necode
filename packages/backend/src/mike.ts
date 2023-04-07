import { MiKe } from '@necode-org/mike';
import { events, necodeLib } from '@necode-org/mike-config';
import { JsLibraryImplementation } from '@necode-org/mike/codegen/js';
import { createJavascriptTarget } from '@necode-org/mike/codegen/js/JavascriptTarget';
import { createMiKeDiagnosticsManager } from '@necode-org/mike/diagnostics';

const EXTERNALS = 'externals';
const necodeLibImpl: JsLibraryImplementation<typeof necodeLib> = {
    types: {
        User: () => ({ serialize: 'x=>x', deserialize: 'x=>x', }),
        Policy: () => ({ serialize: 'x=>x', deserialize: 'x=>x', }),
        Group: () => ({ serialize: `x=>x.serialize()`, deserialize: `${EXTERNALS}.deserializeGroup` }),
        SignalData: () => ({ serialize: 'x=>{throw new Error("SignalData is not serializable")}', deserialize: 'x=>x' }),
        // Internal types (unspeakable)
        $Bug: () => ({ serialize: '', deserialize: '' }),
        $Branch: () => ({ serialize: '', deserialize: '' }),
    },
    values: {
        link: () => ({ emit: `${EXTERNALS}.link` }),
        unlink: () => ({ emit: `${EXTERNALS}.unlink` }),
        Group: () => ({ emit: `${EXTERNALS}.makeGroup` }),
        BUG: () => ({ emit: `${EXTERNALS}.BUG` }),
        _$BRANCH: () => ({ emit: '' }), // Should never appear
    },
};

export function compileMiKeProgram(source: string) {
    const mike = new MiKe();
    mike.setEvents(events);

    mike.addLibrary(necodeLib);
    mike.setTarget(createJavascriptTarget(['some', 'none']));
    mike.addLibraryImplementation(necodeLibImpl);

    const diagnostics = createMiKeDiagnosticsManager();
    mike.setDiagnosticsManager(diagnostics);

    mike.init();

    mike.loadScript(source);
    
    return {
        compiled: mike.tryValidateAndEmit(),
        diagnostics: diagnostics.getDiagnostics(),
    };
}