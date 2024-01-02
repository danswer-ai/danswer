interface SomeNonNestedObject {
  [key: string]: any;
}

export function objectsAreEquivalent(
  a: SomeNonNestedObject,
  b: SomeNonNestedObject
): boolean {
  // NOTE: only works for non-nested objects
  const aProps = Object.getOwnPropertyNames(a);
  const bProps = Object.getOwnPropertyNames(b);

  if (aProps.length !== bProps.length) {
    return false;
  }

  for (let i = 0; i < aProps.length; i++) {
    const propName = aProps[i];
    if (a[propName] !== b[propName]) {
      return false;
    }
  }

  return true;
}

export function containsObject(
  list: SomeNonNestedObject[],
  obj: SomeNonNestedObject
): boolean {
  // NOTE: only works for non-nested objects
  return list.some((item) => objectsAreEquivalent(item, obj));
}
