import React from "react";
import { prerenderToNodeStream } from "react-dom/static";
import { Root } from "./Root";

export async function render(initialData) {
  const { prelude } = await prerenderToNodeStream(
    <Root initialData={initialData} />,
    { signal: AbortSignal.timeout(30_000) },
  );
  const chunks = [];
  for await (const chunk of prelude) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
