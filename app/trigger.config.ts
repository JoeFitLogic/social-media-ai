import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_knwzkbecqllxmmghlgxo",
  dirs: ["./src/trigger"],
  maxDuration: 1800,
  build: {
    external: ["@supabase/supabase-js", "@supabase/realtime-js"],
  },
});
