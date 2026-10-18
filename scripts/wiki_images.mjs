// wiki_images.mjs - Find [[File:...]] image references in wikitext (shared by import_images and the canonical builder).
// `after` is the heading the image sits under ("" = before the first heading, e.g. the cover).

export function imagesOf(wikitext) {
  const out = [];
  let after = "";
  for (const line of wikitext.replace(/\r/g, "").split("\n")) {
    const h = /^=+\s*(.*?)\s*=+\s*$/.exec(line);
    if (h) { after = h[1]; continue; }
    for (const m of line.matchAll(/\[\[File:([^\]|]+)((?:\|[^\]]*)?)\]\]/gi)) {
      const name = m[1].trim().replace(/ /g, "_");
      const opts = m[2].split("|").slice(1).map((s) => s.trim());
      const caption = [...opts].reverse().find((o) => o && !/^(thumb|thumbnail|frame|frameless|left|right|center|none|\d+px|\d+x\d+px|upright.*|link=.*|alt=.*)$/i.test(o)) ?? "";
      out.push({ name, caption, after });
    }
  }
  return out;
}

/** Local file name used under public/images/. */
export const localName = (name) => name.toLowerCase();
