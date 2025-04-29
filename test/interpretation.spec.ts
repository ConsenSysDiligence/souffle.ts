import expect from "expect";
import fse from "fs-extra";
import { printFacts, searchRecursive } from "../src/utils";
import {
    FactMap,
    FactSet,
    getRelations,
    parseProgram,
    Program,
    Relation,
    runInterp,
    TypeEnv
} from "../src";
import { doesNotReject } from "assert";

const samples = searchRecursive("test/samples/", (name) => name.endsWith(".out")).map(
    (x) => x.slice(0, -3) + "dl"
);

for (const sample of samples) {
    describe(sample, () => {
        let expectedOut: string;
        let dlFileContents: string;
        let ast: Program;
        let env: TypeEnv;
        let relations: Relation[];
        let result: FactSet;
        let facts: FactMap;

        before(() => {
            expectedOut = fse.readFileSync(sample.slice(0, -2) + "out", { encoding: "utf-8" });
            dlFileContents = fse.readFileSync(sample, { encoding: "utf-8" });
        });

        it("Parsing works", () => {
            expect(() => {
                ast = parseProgram(dlFileContents);
            }).not.toThrow();
        });

        it("Type Env Builds", () => {
            expect(() => {
                env = TypeEnv.buildTypeEnv(ast);
            }).not.toThrow();
        });

        it("We can extract relations", () => {
            expect(() => {
                relations = getRelations(ast, env);
            }).not.toThrow();
        });

        it("We can run Souffle in interpreter mode", async () => {
            doesNotReject(async () => {
                result = await runInterp(dlFileContents, relations, "csv");
                facts = await result.allFacts();
            });
        });

        it("Results match expected", () => {
            expect(printFacts(facts, result)).toEqual(expectedOut);
        });

        after(() => {
            result.release();
        });
    });
}
