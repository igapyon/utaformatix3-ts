function normalizeXmlDeclaration(xml: string): string {
  const trimmed = xml.trim();
  if (!trimmed.startsWith("<?xml")) return trimmed;
  return trimmed.replace(
    /^<\?xml[^?]*\?>/,
    '<?xml version="1.0" encoding="UTF-8"?>',
  );
}

function sortAttributesInStartTag(tag: string): string {
  if (!tag.startsWith("<") || tag.startsWith("</") || tag.startsWith("<?") || tag.startsWith("<!")) {
    return tag;
  }
  const match = tag.match(/^<([^\s/>]+)([\s\S]*?)(\/?)>$/);
  if (!match) return tag;
  const [, elementName, rawAttributes, selfClosing] = match;
  const attrPattern = /([^\s=]+)\s*=\s*("[^"]*"|'[^']*')/g;
  const attrs: Array<{ name: string; value: string }> = [];
  let attrMatch: RegExpExecArray | null = attrPattern.exec(rawAttributes);
  while (attrMatch) {
    attrs.push({ name: attrMatch[1], value: attrMatch[2] });
    attrMatch = attrPattern.exec(rawAttributes);
  }
  if (attrs.length === 0) {
    return `<${elementName}${selfClosing ? "/" : ""}>`;
  }
  attrs.sort((a, b) => a.name.localeCompare(b.name));
  const attrText = attrs.map((attr) => `${attr.name}=${attr.value}`).join(" ");
  return `<${elementName} ${attrText}${selfClosing ? "/" : ""}>`;
}

export function canonicalizeXmlMinimal(xml: string): string {
  const normalized = normalizeXmlDeclaration(xml);
  const withoutInterTagWhitespace = normalized.replace(/>\s+</g, "><");
  return withoutInterTagWhitespace.replace(/<[^>]+>/g, (tag) => sortAttributesInStartTag(tag));
}

export function areCanonicalXmlEqual(left: string, right: string): boolean {
  return canonicalizeXmlMinimal(left) === canonicalizeXmlMinimal(right);
}
