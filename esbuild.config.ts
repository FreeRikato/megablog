import fs from "node:fs";
import { build } from "esbuild";
import packageJson from "./package.json";

// Define a minimal type for package.json to avoid 'any' lint errors
interface PackageJson {
	dependencies?: Record<string, string>;
}

const pkg = packageJson as PackageJson;
const dependencies = pkg.dependencies || {};

const run = async () => {
	console.log("[esbuild] Starting production build...");

	await build({
		entryPoints: ["src/server.ts"],
		outfile: "dist/server.js",
		bundle: true,
		format: "esm" as const,
		platform: "node" as const,
		target: "node22",
		loader: { ".ts": "ts" as const },
		alias: { "@": "./src" },

		// Exclude node_modules from the bundle (best practice for backend)
		external: Object.keys(dependencies),

		// Production Optimizations
		sourcemap: false,
		minify: true,
		minifySyntax: true,
		minifyWhitespace: true,
		minifyIdentifiers: true,
		treeShaking: true,
		keepNames: false,

		// Drop console.log and debugger in production artifacts
		drop: ["console", "debugger"],

		// Generate analysis data
		metafile: true,
		logLevel: "info" as const,
		charset: "utf8" as const,
	}).then((result) => {
		if (result.metafile) {
			fs.writeFileSync("dist/meta.json", JSON.stringify(result.metafile));
			console.log("[esbuild] Metafile generated at dist/meta.json");
		}
		console.log("[esbuild] Build completed successfully.");
	});
};

run().catch(() => process.exit(1));
