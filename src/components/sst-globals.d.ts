// When make-it-so SST/Pulumi constructs are created in an app's sst.config.ts file (or a stack imported from there) SST
// makes several global objects available to us. This provides types for those globals.
//
// WARNING: These must only be used in code that will run inside the `run()` of an sst.config.ts file.
import "sst3/platform/src/global.d.ts";
