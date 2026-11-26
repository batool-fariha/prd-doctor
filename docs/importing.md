# Importing from Notion and Google Docs

Most PRDs live in Notion or Google Docs. This page lists each way to get one into PRD Doctor, what happens to it, and what was changed to support it. Everything runs in the browser. No document text goes to a server, and none of the routes below adds a network request.

## Summary

| Source | How | Result |
|---|---|---|
| Notion | Copy the page and paste it | Works. Headings, nested lists and to-dos are kept (already supported, see `scripts/paste-check.mts`). |
| Notion | Export as **Markdown & CSV**, then drop in the page's `.md` | Works. Callouts and toggles used to leave `<aside>` and `<details>` tags in the text. These are now removed and their text is kept. |
| Notion | Drop in the export **`.zip`** itself | **New.** The top-level page is read from the zip in the browser, including the `Part-1.zip` that large exports are split into. |
| Google Docs | Copy and paste | Works (already supported). |
| Google Docs | **File > Download > Microsoft Word (.docx)** | Works. Google's heading styles ("heading 1", "heading 2") become headings, so sections are detected. |
| Google Docs | **File > Download > Markdown (.md)** | Works. It's a plain Markdown file. |

## Notion

**Export as Markdown & CSV.** Notion's export is a `.zip`. Each page is a Markdown file named after the page with a 32-character id on the end, for example `Checkout redesign 1a2b…f809.md`. Sub-pages sit in a folder next to it.

- **Choosing the zip.** PRD Doctor reads the zip's directory and picks the top-level page. If there are several at the top level, it picks the largest. It doesn't pick a sub-page, even when a sub-page is bigger.
- **Large exports.** Notion splits these into `Export-…-Part-1.zip` files inside the download, so one level of nested zip is opened too.
- **File name.** The id is dropped from the name shown next to the editor.
- **How the zip is read.** The browser's built-in `DecompressionStream` inflates it, so no library is added and nothing is uploaded. The code is in `lib/notion.ts`.

**Notion-specific Markdown.** Notion writes some blocks as HTML because Markdown has no syntax for them:

- A callout becomes `<aside>…</aside>`.
- A toggle can become `<details><summary>…</summary>…</details>`.

Before this change those tags reached the analysis as stray text. Now the tags are removed and their text is kept, whether the `.md` file comes on its own or from the zip. Only the tags are removed; nothing is ever rendered as HTML.

**Properties.** Lines like `Owner: Sam Lee` and `Status: In review` under the title are left as they are. They are ordinary text, and an owner line is useful evidence.

## Google Docs

- **.docx download.** Word files go through mammoth, then the same HTML-to-text step used for pasted rich text, so headings become `#` lines and are detected as sections. Google names its heading styles in lower case ("heading 1"). `scripts/import-check.mts` builds a `.docx` with those exact style names and checks that the headings survive.
- **Markdown download.** Google Docs can download a document as `.md`. This is read like any Markdown file.
- **Copy and paste.** Covered by `scripts/paste-check.mts`.

## How this was checked

`npm run import` (part of `npm test`) runs `scripts/import-check.mts`. It builds the test files in code: Notion export zips (deflated, stored and nested), a Notion page with a callout, a toggle and properties, and a Google Docs style `.docx`. It then runs them through the same functions the app uses.

These files are shaped like the real exports, but they are not files downloaded from Notion or Google. If a real export reads wrongly, please open an issue with the file *structure*: file names, which tags appear and how headings look. Don't include the document's content.

## Not supported

- **Notion's HTML or PDF export.** Use **Markdown & CSV**, or use PDF through the normal PDF route.
- **Linking a Notion or Google account and importing directly.** That would mean sending tokens and document text through a server, which breaks the privacy promise.
