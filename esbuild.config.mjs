import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const entryPoints = [
  { in: "src/client/main.ts", out: "app" },
  { in: "src/client/map.ts", out: "map" },
  { in: "src/client/band-form.ts", out: "band-form" },
];

const options = {
  entryPoints,
  bundle: true,
  outdir: "public/dist",
  target: "es2020",
  minify: !watch,
  sourcemap: watch,
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
