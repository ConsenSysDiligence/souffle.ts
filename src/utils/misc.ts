import fse from "fs-extra";
import path from "path";
import { FactMap, FactSet } from "../fact_set";

export function flatten<T>(arg: T[][]): T[] {
    const res: T[] = [];
    for (const x of arg) {
        res.push(...x);
    }

    return res;
}

export function searchRecursive(targetPath: string, filter: (entry: string) => boolean): string[] {
    const stat = fse.statSync(targetPath);
    const results: string[] = [];

    if (stat.isFile()) {
        if (filter(targetPath)) {
            results.push(path.resolve(targetPath));
        }

        return results;
    }

    for (const entry of fse.readdirSync(targetPath)) {
        const resolvedEntry = path.resolve(targetPath, entry);
        const stat = fse.statSync(resolvedEntry);

        if (stat.isDirectory()) {
            results.push(...searchRecursive(resolvedEntry, filter));
        } else if (stat.isFile() && filter(resolvedEntry)) {
            results.push(resolvedEntry);
        }
    }

    return results;
}

export function repeat<T>(a: T, n: number): T[] {
    const res: T[] = [];
    for (let i = 0; i < n; i++) {
        res.push(a);
    }

    return res;
}

export function printFacts(facts: FactMap, result: FactSet): string {
    const res: string[] = [];
    const orderedRelns = [...facts.entries()];
    orderedRelns.sort(([reln1], [reln2]) => (reln1 < reln2 ? -1 : reln1 === reln2 ? 0 : 1));

    for (const [relnName, facts] of orderedRelns) {
        const rel = result.relation(relnName);

        res.push(`/// ${relnName}`);
        res.push("===============");
        res.push(rel.fields.map(([field]) => field).join(" "));

        for (const fact of facts) {
            res.push(fact.toCSVRow().join("    "));
        }
    }

    return res.join("\n");
}
