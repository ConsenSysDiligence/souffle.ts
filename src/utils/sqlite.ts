import { Database } from "sqlite";
import { Relation } from "../relation";
import { AliasT, DatalogType, NumberT, SubT } from "../types";

function datalogToSqlType(typ: DatalogType): string {
    if (typ === NumberT) {
        return "INTEGER";
    }

    if (typ instanceof SubT) {
        return datalogToSqlType(typ.parentT);
    }

    if (typ instanceof AliasT) {
        return datalogToSqlType(typ.originalT);
    }

    return "TEXT";
}

export async function createTableForRelation(db: Database, reln: Relation): Promise<void> {
    const sql = `CREATE TABLE IF NOT EXISTS ${reln.name} (${reln.fields.map(([fieldName, fieldT]) => `${fieldName} ${datalogToSqlType(fieldT)}`).join(", ")});`;
    await db.run(sql);
}
