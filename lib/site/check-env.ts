// Importing this checks the environment (see required-env.ts). It is a module of its own so that
// next.config.ts can import it before anything that reads SITE_URL while loading: that would
// fail first, naming only itself, instead of listing everything that is missing.
import { assertRequiredEnv } from './required-env'

assertRequiredEnv()
