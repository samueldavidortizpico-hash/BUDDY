/** Static guard: standard text must retain native shrink behavior. No server or dependencies added. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const failures = [];
const base = readFileSync('src/components/app-text.tsx', 'utf8');
if (!/minWidth:\s*0/.test(base) || !/flexShrink:\s*1/.test(base)) failures.push('AppText lost its native shrink contract');
let texts = 0;
function visitDir(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory() && item.name !== '__tests__') visitDir(path);
    else if (/\.tsx$/.test(path)) {
      const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const declarations = new Map();
      const collect = (node) => {
        if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.initializer)) declarations.set(node.name.getText(source), node.initializer.getText(source));
        ts.forEachChild(node, collect);
      };
      collect(source);
      const resolveStyle = (style) => style + [...style.matchAll(/\b(?:s|styles)\.(\w+)/g)].map((m) => declarations.get(m[1]) ?? '').join(' ');
      const inRow = (node) => {
        for (let p = node.parent; p; p = p.parent) {
          if (ts.isJsxElement(p)) {
            const attr = p.openingElement.attributes.properties.find((a) => a.name?.getText(source) === 'style');
            if (attr && /flexDirection:\s*['"]row['"]/.test(resolveStyle(attr.getText(source)))) return true;
          }
        }
        return false;
      };
      const visit = (node) => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = node.tagName.getText(source);
          if (tag === 'AppText' || tag === 'Text') {
            texts++;
            const style = node.attributes.properties.find((p) => p.name?.getText(source) === 'style')?.getText(source) ?? '';
            if (/flexShrink:\s*0/.test(style)) failures.push(`${path}:${source.getLineAndCharacterOfPosition(node.pos).line + 1}: text disables shrink`);
            // Raw RN Text bypasses AppText's enforced default, so it must declare its own contract.
            if (tag === 'Text' && inRow(node) && !path.endsWith('app-text.tsx') && !/flex(Shrink)?:\s*1/.test(resolveStyle(style))) failures.push(`${path}: raw Text in row bypasses AppText; declare flex/flexShrink`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
  }
}
visitDir('src');
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
else console.log(`OK: ${texts} text declarations checked; AppText shrink enforced. Does not measure Yoga layout.`);
