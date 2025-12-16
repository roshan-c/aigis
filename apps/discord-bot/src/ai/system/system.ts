export const system: string = await Bun.file(
  new URL("./SYSTEM.MD", import.meta.url),
).text();
