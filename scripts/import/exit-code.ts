// The exit codes of `pnpm import:live`, so a script or a person can tell the outcomes apart.

/** Everything imported, nothing to report. */
export const EXIT_OK = 0
/** A product page could not be imported at all (or the run crashed): the catalog is incomplete. */
export const EXIT_FAILED = 1
/** Every page was imported, but something warned (a picture that failed to download, say). */
export const EXIT_WARNINGS = 3

export function importExitCode({ failedPages, warnings }: { failedPages: number; warnings: number }): number {
  if (failedPages > 0) return EXIT_FAILED
  return warnings > 0 ? EXIT_WARNINGS : EXIT_OK
}
