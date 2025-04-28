import { join } from "path";
import os from "os";
import fse from "fs-extra";
import { Relation } from "./relation";
import { spawnSync } from "child_process";
import { CSVFactSet, FactSet, SQLFactSet } from "./fact_set";
import { env } from "process";

export type SouffleOutputType = "csv" | "sqlite";

/**
 * @todo (dimo) DEPRECATED This entry point was useful for debuggin and testing but its hacky. Delete when we have something better.
 *
 * Given some datalog *without* output directives, and a list of `Relation`s that we want as output:
 *  1. Add the neccessary output directives for the required relations
 *  2. Run souffle
 *  3. Parse and return the results as a `Result` object.
 *
 * Note: The Result object may maintain reference to some on-disk resources (temp files). To free
 * those resources call Result.release()
 */
export async function runInterp(
    datalog: string,
    outputRelations: Relation[],
    type: SouffleOutputType,
    soDir?: string
): Promise<FactSet> {
    const sysTmpDir = os.tmpdir();
    const tmpDir = await fse.mkdtempSync(join(sysTmpDir, "sol-datalog-"));

    const inputFile = join(tmpDir, "input.dl");

    const outputDirectives = outputRelations.map((reln) =>
        type === "csv"
            ? `.output ${reln.name}(rfc4180=true)`
            : `.output ${reln.name}(IO=sqlite, dbname="output.sqlite")`
    );

    const finalDL = datalog + "\n" + outputDirectives.join("\n");

    fse.writeFileSync(inputFile, finalDL, {
        encoding: "utf-8"
    });

    const args = ["--wno", "all", "-D", tmpDir];

    if (soDir !== undefined) {
        args.push(`-L${soDir}`);
    }

    args.push(inputFile);

    const result = spawnSync("souffle", args, {
        encoding: "utf-8"
    });

    if (result.status !== 0) {
        throw new Error(
            `Souffle terminated with non-zero exit code (${result.status}): ${result.stderr}`
        );
    }

    if (type === "csv") {
        return new CSVFactSet(outputRelations, tmpDir);
    } else {
        return new SQLFactSet(outputRelations, tmpDir, "output.sqlite");
    }
}

/**
 * Run a compiled Souffle module with the given input facts and get the expected output relations.
 * @param inputRelations
 * @param outputRelations
 * @param type
 * @param soDir
 * @param executable
 */
export async function runCompiled(
    inputFacts: FactSet,
    outputFacts: FactSet,
    executable: string,
    soDir?: string
): Promise<void> {
    await inputFacts.persist();

    const args = ["--facts", inputFacts.directory, "--output", outputFacts.directory];

    const subEnv = soDir !== undefined ? { LD_LIBRARY_PATH: soDir, ...env } : env;

    const result = spawnSync(executable, args, {
        encoding: "utf-8",
        env: subEnv
    });

    if (result.status !== 0) {
        throw new Error(
            `Souffle terminated with non-zero exit code (${result.status}): ${result.stdout} ${result.stderr}`
        );
    }
}
