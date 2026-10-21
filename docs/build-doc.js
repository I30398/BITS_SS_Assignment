// Builds a self-contained HTML document (images embedded) from the Markdown doc.
// Missing screenshots become a visible placeholder box.
// Usage: npm i marked@4 (anywhere on NODE_PATH)  &&  node docs/build-doc.js
// 2025MT03083 / Ajeet Kumar Yadav
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const DOCS = __dirname;
const NAME = '2025MT03083_Ajeet_Kumar_Yadav_FoodExpress_Documentation';
const md = fs.readFileSync(path.join(DOCS, `${NAME}.md`), 'utf8');

let missing = 0;
const withImages = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
  const file = path.resolve(DOCS, src);
  if (!fs.existsSync(file)) {
    missing++;
    return `<div class="ph">Screenshot pending: <code>${path.basename(src)}</code></div>`;
  }
  const data = fs.readFileSync(file).toString('base64');
  return `<figure><img alt="${alt}" src="data:image/png;base64,${data}"><figcaption>${alt}</figcaption></figure>`;
});

const html = `<!doctype html>
<html><head><meta charset="utf-8">
<title>2025MT03083 / Ajeet Kumar Yadav - FoodExpress</title>
<style>
  body { font-family: "Segoe UI", Arial, sans-serif; max-width: 980px; margin: 32px auto; padding: 0 20px; color: #0f172a; line-height: 1.5; }
  h1 { border-bottom: 3px solid #16a34a; padding-bottom: 8px; }
  h2 { border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 40px; page-break-before: auto; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; }
  code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 12.5px; }
  pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; }
  pre code { background: none; color: inherit; }
  figure { margin: 16px 0; text-align: center; page-break-inside: avoid; }
  figure img { max-width: 100%; border: 1px solid #cbd5e1; }
  figcaption { font-size: 12px; color: #64748b; }
  .ph { border: 2px dashed #f59e0b; background: #fffbeb; padding: 28px; text-align: center; margin: 12px 0; color: #92400e; }
  blockquote { border-left: 4px solid #94a3b8; margin: 0; padding-left: 12px; color: #475569; }
  footer { margin-top: 48px; font-size: 12px; color: #64748b; text-align: center; }
</style></head>
<body>
${marked.parse(withImages)}
<footer>2025MT03083 / Ajeet Kumar Yadav</footer>
</body></html>`;

fs.writeFileSync(path.join(DOCS, `${NAME}.html`), html);
console.log(`Wrote docs/${NAME}.html (${missing} screenshot(s) still pending)`);
