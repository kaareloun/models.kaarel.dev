import fs from "node:fs";

const target = ".output/server/index.mjs";
const ssrChunk = "./chunks/_/ssr.mjs";
const prefix = `import('${ssrChunk}');\n`;

const code = fs.readFileSync(target, "utf-8");
if (!code.includes(`import('${ssrChunk}')`)) {
  throw new Error(`patch-server: ssr entry not found in ${target}, build layout changed`);
}
if (!code.startsWith(prefix)) {
  fs.writeFileSync(target, prefix + code);
  console.log(`patch-server: eager ssr import added to ${target}`);
}

const externalsDir = ".output/server/node_modules";
if (fs.existsSync(externalsDir)) {
  fs.rmSync(externalsDir, { recursive: true, force: true });
  console.log("patch-server: removed partial externals, resolving deps from repo node_modules");
}
