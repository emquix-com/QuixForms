import { definePlugin, type PluginDescriptor } from "emdash";
export function quixFormsAdvanced(): PluginDescriptor {
  return {
    id: "quixforms-advanced",
    version: "0.1.0",
    format: "native",
    entrypoint: "@emquix/quixforms-advanced",
    adminEntry: "@emquix/quixforms-advanced/admin",
  };
}
export function createPlugin() {
  return definePlugin({
    id: "quixforms-advanced",
    version: "0.1.0",
    admin: {
      entry: "@emquix/quixforms-advanced/admin",
      pages: [{ path: "/", label: "QuixForms Advanced", icon: "list" }],
    },
  });
}

export default createPlugin;
