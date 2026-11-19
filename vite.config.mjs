import {defineConfig} from 'vite';
// Open local tabs can still request hashed chunks from the preceding build.
// Keep them available while replacing index.html with the current build.
export default defineConfig({build:{emptyOutDir:false}});
