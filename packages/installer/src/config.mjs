import ts from "typescript";
export function transformConfig(
  source,
  { withCore = false, coreOnly = false } = {},
) {
  const file = ts.createSourceFile(
    "astro.config.mjs",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (file.parseDiagnostics.length)
    throw new Error("Configuration has syntax errors; no files changed.");
  let emdashName;
  const imported = new Map();
  for (const node of file.statements)
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const from = node.moduleSpecifier.text;
      if (from === "emdash/astro") emdashName = node.importClause?.name?.text;
      imported.set(from, node);
    }
  if (!emdashName)
    throw new Error(
      "Cannot identify the default emdash/astro import. Use manual configuration.",
    );
  const calls = [];
  function visit(n) {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === emdashName
    )
      calls.push(n);
    ts.forEachChild(n, visit);
  }
  visit(file);
  if (
    calls.length !== 1 ||
    calls[0].arguments.length !== 1 ||
    !ts.isObjectLiteralExpression(calls[0].arguments[0])
  )
    throw new Error(
      "Expected one emdash({ ... }) call with a literal configuration. Use manual configuration.",
    );
  const object = calls[0].arguments[0];
  if (object.properties.some(ts.isSpreadAssignment))
    throw new Error(
      "EmDash configuration spreads cannot be safely rewritten. Use manual configuration.",
    );
  const properties = [...object.properties],
    imports = [],
    factory = ts.factory;
  const nameOf = (n) =>
    n.name && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name))
      ? n.name.text
      : undefined;
  if (
    (withCore || coreOnly) &&
    !properties.some((p) => nameOf(p) === "sandboxRunner")
  )
    throw new Error(
      "Configure an official EmDash sandboxRunner before installing Core. No runner is selected automatically.",
    );
  function add(packageName, exportName, preferred, property) {
    let alias;
    const declaration = imported.get(packageName);
    if (declaration) {
      if (exportName === "default")
        alias = declaration.importClause?.name?.text;
      else {
        const bindings = declaration.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings))
          alias = bindings.elements.find(
            (e) => (e.propertyName?.text ?? e.name.text) === exportName,
          )?.name.text;
      }
      if (!alias)
        throw new Error(
          "Existing import from " +
            packageName +
            " needs manual configuration.",
        );
    } else {
      if (new RegExp("\\b" + preferred + "\\b").test(source))
        throw new Error(
          "Identifier " + preferred + " is already in use; configure manually.",
        );
      alias = preferred;
      imports.push(
        exportName === "default"
          ? `import ${alias} from '${packageName}';`
          : `import { ${exportName} as ${alias} } from '${packageName}';`,
      );
    }
    const matches = properties
      .map((p, i) => (nameOf(p) === property ? i : -1))
      .filter((i) => i >= 0);
    if (matches.length > 1)
      throw new Error(
        "Duplicate " + property + " properties require manual configuration.",
      );
    const index = matches[0];
    let items = [];
    if (index !== undefined) {
      const p = properties[index];
      if (
        !ts.isPropertyAssignment(p) ||
        !ts.isArrayLiteralExpression(p.initializer) ||
        p.initializer.elements.some(ts.isSpreadElement)
      )
        throw new Error(
          property +
            " must be a literal array without spreads. Use manual configuration.",
        );
      items = [...p.initializer.elements];
    }
    const exists = items.some((n) =>
      exportName === "default"
        ? ts.isIdentifier(n) && n.text === alias
        : ts.isCallExpression(n) &&
          ts.isIdentifier(n.expression) &&
          n.expression.text === alias,
    );
    if (!exists)
      items.push(
        exportName === "default"
          ? factory.createIdentifier(alias)
          : factory.createCallExpression(
              factory.createIdentifier(alias),
              undefined,
              [],
            ),
      );
    const p = factory.createPropertyAssignment(
      property,
      factory.createArrayLiteralExpression(items, true),
    );
    if (index !== undefined) properties[index] = p;
    else properties.push(p);
  }
  if (withCore || coreOnly)
    add(
      "@emquix/quixforms-core-plugin",
      "default",
      "quixFormsCore",
      "sandboxed",
    );
  if (!coreOnly)
    add(
      "@emquix/quixforms-advanced",
      "quixFormsAdvanced",
      "quixFormsAdvanced",
      "plugins",
    );
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const replacement = printer.printNode(
    ts.EmitHint.Expression,
    factory.updateObjectLiteralExpression(object, properties),
    file,
  );
  const changed =
    source.slice(0, object.getStart(file)) +
    replacement +
    source.slice(object.end);
  return (imports.length ? imports.join("\n") + "\n" : "") + changed;
}
