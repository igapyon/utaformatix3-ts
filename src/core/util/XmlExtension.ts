function fail(message: string): never {
  throw new Error(message);
}

export function getElementListByTagName(element: Element, name: string, allowEmpty = true): Element[] {
  const nodes = element.getElementsByTagName(name);
  if (!allowEmpty && nodes.length === 0) {
    fail(`XmlElementNotFound: ${name}`);
  }
  const result: Element[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes.item(i);
    if (node) {
      result.push(node);
    }
  }
  return result;
}

export function getSingleElementByTagName(element: Element, name: string): Element {
  const node = element.getElementsByTagName(name).item(0);
  if (!node) {
    fail(`XmlElementNotFound: ${name}`);
  }
  return node;
}

export function getSingleElementByTagNameOrNull(element: Element, name: string): Element | null {
  return element.getElementsByTagName(name).item(0);
}

export function getRequiredAttributeAsInteger(element: Element, attribute: string): number {
  const value = element.getAttribute(attribute);
  const parsed = value == null ? Number.NaN : Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    fail(`XmlElementAttributeValueIllegal: ${attribute} in ${element.tagName}`);
  }
  return parsed;
}

export function getRequiredAttributeAsLong(element: Element, attribute: string): number {
  return getRequiredAttributeAsInteger(element, attribute);
}

export function getRequiredAttribute(element: Element, attribute: string): string {
  const value = element.getAttribute(attribute);
  if (value == null) {
    fail(`XmlElementAttributeValueIllegal: ${attribute} in ${element.tagName}`);
  }
  return value;
}

export function getInnerValue(element: Element): string {
  const value = element.firstChild?.nodeValue;
  if (value == null) {
    fail(`XmlElementValueIllegal: ${element.tagName}`);
  }
  return value;
}

export function getInnerValueOrNull(element: Element): string | null {
  return element.firstChild?.nodeValue ?? null;
}

export function setSingleChildValue(element: Element, name: string, value: unknown): void {
  const child = getSingleElementByTagName(element, name);
  if (!child.firstChild) {
    child.textContent = String(value);
    return;
  }
  child.firstChild.nodeValue = String(value);
}

export function insertAfterThis(element: Element, child: Element): void {
  const parent = element.parentNode;
  if (!parent) {
    fail("XmlInsertAfterFailed: parent is null");
  }
  if (element.nextSibling) {
    parent.insertBefore(child, element.nextSibling);
  } else {
    parent.appendChild(child);
  }
}

export function cloneElement(element: Element): Element {
  return element.cloneNode(true) as Element;
}

export function appendNewChildTo(
  document: Document,
  node: Node,
  localName: string,
  handler: (element: Element) => void,
): Node {
  const child = document.createElement(localName);
  handler(child);
  return node.appendChild(child);
}

