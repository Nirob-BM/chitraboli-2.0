/// <reference types="vite/client" />
/// <reference types="vite-imagetools/client" />

declare module "*&as=srcset" {
  const src: string;
  export default src;
}
declare module "*?w=1280&format=jpg" {
  const src: string;
  export default src;
}
