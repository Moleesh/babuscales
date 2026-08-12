import { describe, expect, it } from "vitest";

import { createMemoryAdapter } from "./adapters/memory";
import { addReportDef, deleteReportDef, loadReportDefs } from "./reportDefs";

describe("reportDefs: load/add/delete round trip", () => {
    it("loadReportDefs returns an empty list when nothing was ever saved", async () => {
        const db = createMemoryAdapter();
        expect(await loadReportDefs(db)).toEqual([]);
    });

    it("addReportDef persists a new definition and returns its id", async () => {
        const db = createMemoryAdapter();
        const id = await addReportDef(db, { Name: "My report", View: "tickets", GroupBy: "party", Filter: "all" });
        expect(id).toBeTruthy();
        const defs = await loadReportDefs(db);
        expect(defs).toEqual([{ Id: id, Name: "My report", View: "tickets", GroupBy: "party", Filter: "all" }]);
    });

    it("addReportDef appends to an existing list rather than replacing it", async () => {
        const db = createMemoryAdapter();
        await addReportDef(db, { Name: "First", View: "tickets", GroupBy: "party", Filter: "all" });
        await addReportDef(db, { Name: "Second", View: "summary", GroupBy: "material", Filter: "half" });
        const defs = await loadReportDefs(db);
        expect(defs.map((d) => d.Name)).toEqual(["First", "Second"]);
    });

    it("deleteReportDef removes only the matching id", async () => {
        const db = createMemoryAdapter();
        const id1 = await addReportDef(db, { Name: "First", View: "tickets", GroupBy: "party", Filter: "all" });
        const id2 = await addReportDef(db, { Name: "Second", View: "summary", GroupBy: "material", Filter: "half" });
        await deleteReportDef(db, id1);
        const defs = await loadReportDefs(db);
        expect(defs.map((d) => d.Id)).toEqual([id2]);
    });

    it("deleteReportDef on an unknown id is a harmless no-op", async () => {
        const db = createMemoryAdapter();
        await addReportDef(db, { Name: "First", View: "tickets", GroupBy: "party", Filter: "all" });
        await deleteReportDef(db, "does-not-exist");
        const defs = await loadReportDefs(db);
        expect(defs).toHaveLength(1);
    });

    it("loadReportDefs falls back to an empty list when the saved row fails validation", async () => {
        const db = createMemoryAdapter();
        await db.saveConfig({
            ConfigId: "report-defs-Ticket",
            ConfigKind: "Preset",
            Body: { Definitions: [{ Id: "x" /* missing Name/View/GroupBy/Filter */ }] },
        });
        expect(await loadReportDefs(db)).toEqual([]);
    });
});
