import { assertStagingEnvironment, loadStagingEnvironment } from './staging-env.js';

await loadStagingEnvironment();
assertStagingEnvironment();
await import('../server/index.js');
