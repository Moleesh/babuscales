# resources/

Standardized home for the app's build-time/reference *data* assets, kept
separate from `app/src` (code) and `docs` (prose). One dedicated folder per
asset kind, so "where do I put a new schema/label/template" always has one
answer:

- **`schemas/`** — ticket-schema JSON files (the paste-box/drop-zone format
  parsed by `app/src/engines/schemaEngine`). `default-ticket-schema.json` and
  `godown-ticket-schema.json` are reference examples an operator can paste
  into Settings to try; they are not read by the running app automatically
  (the active schema lives in the DB — see `FieldSchemaCard.tsx`). Any new
  example or starter schema goes here.
- **`labels/`** — reserved for label/translation packs. Today the app's
  labels are TypeScript, not standalone data files: fixed-field and
  app-chrome strings live in `app/src/i18n/strings.ts` (+ `packs/ta.ts`),
  and custom schema-field labels resolve via the `weighing.label.<FieldId>`
  key convention (`app/src/engines/schemaEngine/fieldLabelKeys.ts`). This
  folder is the designated landing spot if/when a language pack is ever
  extracted into its own JSON file instead of a `.ts` module — nothing to
  move yet.
- **`templates/`** — reserved for print templates. Today ticket/report
  slips are generated programmatically (`app/src/engines/print/
  renderMonoSlip.ts`, `renderReportMonoSlip.ts`) — there is no static HTML
  template file yet. This folder is the designated landing spot for one
  if/when the print engine moves to file-based templates.

Rule of thumb: if it's data the app or an operator loads/pastes rather than
code that runs, it belongs under `resources/<kind>/`, not scattered under
`docs/` or `app/src/`.
