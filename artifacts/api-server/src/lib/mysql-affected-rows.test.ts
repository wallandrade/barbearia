import assert from "node:assert/strict";
import test from "node:test";
import { mysqlAffectedRows } from "./mysql-affected-rows";

test("mysql2 devolve [header] com affectedRows, nao rowsAffected", () => {
  assert.equal(mysqlAffectedRows([{ affectedRows: 1, insertId: 0 }]), 1);
  assert.equal(mysqlAffectedRows({ rowsAffected: 2 }), 2);
  assert.equal(mysqlAffectedRows([{ insertId: 0 }]), 0);
  assert.equal(mysqlAffectedRows(undefined), 0);
});
