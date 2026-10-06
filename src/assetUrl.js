// The manifest is computed from public/ by Vite for every production build.
export function assetUrl(path) {
  const version = __PUBLIC_ASSET_VERSIONS__[path];
  return `${import.meta.env.BASE_URL}${path}${version ? `?v=${version}` : ''}`;
}
