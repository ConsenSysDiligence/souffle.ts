export function isPrimitive(a: any): boolean {
    return (
        typeof a === "bigint" ||
        typeof a === "boolean" ||
        typeof a === "number" ||
        typeof a === "string" ||
        a === undefined ||
        a === null
    );
}

// Hack to recognize big ints
export function isBigInt(a: any): boolean {
    return typeof a === "number" || typeof a === "bigint";
}

export function hasKeysOf(a: Record<string, any>, b: Record<string, any>): boolean {
    const hasProperty = Object.prototype.hasOwnProperty;

    for (const key in a) {
        if (!hasProperty.call(b, key)) {
            return false;
        }
    }

    return true;
}

export interface StructEqualityComparable {
    getStructId(): any;
}

export function isStructEqualityComparable(a: any): a is StructEqualityComparable {
    return typeof a.getStructId === "function";
}

/**
 * Computes structural equality between two JavaScript objects.
 * Handles only primitive types and JSON-style objects
 * (i.e. object whose constructor is `Object`).
 *
 * To handle any other kind of objects, you need to make sure it inherits
 * from `StructEqualityComparable` and implement `getFields()`
 * for that object correctly.
 */
export function eq(a: any, b: any, visited?: Map<any, any>): boolean {
    if (a === b) {
        return true;
    }

    if (visited === undefined) {
        visited = new Map<any, any>();
    }

    if (visited.has(a)) {
        /**
         * Note identity equality here
         */
        return visited.get(a) === b;
    }

    visited.set(a, b);

    if (isPrimitive(a) || isPrimitive(b)) {
        return a === b;
    }

    if (isBigInt(a) && isBigInt(b)) {
        return a === b;
    }

    if (a instanceof Array && b instanceof Array) {
        if (a.length !== b.length) {
            return false;
        }

        for (const key in a) {
            if (!eq(a[key], b[key], visited)) {
                return false;
            }
        }

        return true;
    }

    if (a instanceof Set && b instanceof Set) {
        if (a.size !== b.size) {
            return false;
        }

        for (const key of a.keys()) {
            if (!b.has(key)) {
                return false;
            }
        }

        return true;
    }

    if (a.constructor === Object && b.constructor === Object) {
        if (!hasKeysOf(a, b) || !hasKeysOf(b, a)) {
            return false;
        }

        for (const key in a) {
            if (!eq(a[key], b[key], visited)) {
                return false;
            }
        }

        return true;
    }

    if (isStructEqualityComparable(a) && isStructEqualityComparable(b)) {
        if (a.constructor !== b.constructor) {
            return false;
        }

        const fieldsA = a.getStructId();
        const fieldsB = b.getStructId();

        if (fieldsA.length !== fieldsB.length) {
            return false;
        }

        /**
         * Note here we rely on getFields always returning fields in the same order
         * to avoid having to sort fieldsA and fieldsB.
         */
        for (let i = 0; i < fieldsA.length; i++) {
            if (!eq(fieldsA[i], fieldsB[i], visited)) {
                return false;
            }
        }

        return true;
    }

    throw new Error(
        `Cannot compare ${a} (type ${typeof a} constr ${
            a.constructor
        }) and ${b} (type ${typeof b} constr ${b.constructor}) structurally`
    );
}
