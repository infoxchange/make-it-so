/**
 * Test setup file that defines SST globals for testing
 * These globals are normally provided by SST when running sst.config.ts
 */

import { setupSstGlobals } from "./mocks/sst-globals.js";

// Set up SST global mocks for all tests
setupSstGlobals();
