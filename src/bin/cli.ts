#!/usr/bin/env node
import { Command } from "commander";
import fse from "fs-extra";
import { parseProgram } from "../parser";
import { TypeEnv } from "../types";
import { getRelations } from "../relation";
import { runInterp } from "../run";
import { printFacts } from "../utils";

const pkg = require("../../package.json");

async function main() {
    const program = new Command();

    program
        .name("souffle-ts")
        .description(pkg.description)
        .version(pkg.version, "-v, --version", "Print package version")
        .helpOption("-h, --help", "Print help message");

    program.argument("[file(s)]", "Either one or more Datalog files");

    program
        .option("--stdin", "Read input from STDIN instead of files")
        .option("--parse", "Print AST of parsed Datalog source and exit")
        .option("--instance <type>", "Type of instance - either csv or sqlite", "csv");

    program.parse(process.argv);

    const fileNames = program.args;
    const options = program.opts();

    if (options.help || (fileNames.length === 0 && !options.stdin)) {
        console.log(program.helpInformation());

        return;
    }

    const fileMap = new Map<string, string>();

    if (options.stdin) {
        fileMap.set("stdin", await fse.readFile(process.stdin.fd, { encoding: "utf-8" }));
    } else {
        const contents = await Promise.all(
            fileNames.map((fileName) => fse.readFile(fileName, { encoding: "utf-8" }))
        );

        for (let i = 0; i < fileNames.length; i++) {
            fileMap.set(fileNames[i], contents[i]);
        }
    }

    const dl = [...fileMap.values()].join("\n");
    const ast = parseProgram(dl);

    if (options.parse) {
        /**
         * @todo Introduce JSON AST
         */
        console.log(ast);

        return;
    }

    const env = TypeEnv.buildTypeEnv(ast);
    const relations = getRelations(ast, env);
    const result = await runInterp(dl, relations, options.instance);

    const facts = await result.allFacts();
    console.log(printFacts(facts, result));
    result.release();
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((e) => {
        console.error(e.message);

        process.exit(1);
    });
