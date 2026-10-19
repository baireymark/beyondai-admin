const config = {
  '*.{ts,tsx,js,mjs,cjs}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{json,md,css,yml,yaml}': ['prettier --write'],
  // Type-check the whole project once when any TypeScript file is staged.
  '*.{ts,tsx}': () => 'tsc --noEmit',
};

export default config;
