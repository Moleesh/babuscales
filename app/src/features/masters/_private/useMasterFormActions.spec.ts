import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MasterDraft, MasterRow } from "@db/types";
import type { MasterColumn } from "@engines/schemaEngine";

import { useMasterFormActions } from "./useMasterFormActions";
import { emptyForm, type MasterFormState } from "./masterFormState";

const col = (overrides: Partial<MasterColumn>): MasterColumn => ({
    FieldId: "f1",
    Kind: "Text",
    ...overrides,
});

const masterRow = (overrides: Partial<MasterRow>): MasterRow => ({
    MasterId: "m1",
    MasterKind: "Party",
    Name: "Acme",
    Body: {},
    IsActive: true,
    UpdatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
});

interface Harness {
    form: MasterFormState;
    selected: MasterRow | null;
    save: (draft: MasterDraft) => Promise<MasterRow>;
    remove: (masterId: string) => Promise<void>;
}

const setup = (opts: {
    cacheRows?: MasterRow[];
    columns?: MasterColumn[];
    decimalsAllowed?: boolean;
    initialForm?: MasterFormState;
    initialSelected?: MasterRow | null;
    saveImpl?: (draft: MasterDraft) => Promise<MasterRow>;
    removeImpl?: (id: string) => Promise<void>;
}) => {
    const harness: Harness = {
        form: opts.initialForm ?? emptyForm(),
        selected: opts.initialSelected ?? null,
        save: vi.fn(opts.saveImpl ?? ((draft: MasterDraft) => Promise.resolve(masterRow({ ...draft, MasterId: draft.MasterId ?? "new" })))),
        remove: vi.fn(opts.removeImpl ?? (() => Promise.resolve(undefined))),
    };

    const { result, rerender } = renderHook(() =>
        useMasterFormActions({
            activeKind: "Party",
            columns: opts.columns ?? [],
            selected: harness.selected,
            form: harness.form,
            setForm: (f) => {
                harness.form = f;
            },
            setSelected: (s) => {
                harness.selected = s;
            },
            save: harness.save,
            remove: harness.remove,
            cacheRows: opts.cacheRows ?? [],
            decimalsAllowed: opts.decimalsAllowed ?? false,
        }),
    );

    return { result, rerender, harness };
};

describe("useMasterFormActions: selectRow / startNew", () => {
    it("selectRow populates selected + form from the row, clears error", () => {
        const { result, rerender, harness } = setup({});
        act(() => result.current.selectRow(masterRow({ Name: "Beta" })));
        rerender();
        expect(harness.selected?.Name).toBe("Beta");
        expect(harness.form.name).toBe("Beta");
        expect(result.current.error).toBeNull();
    });

    it("startNew clears selected back to null and form back to empty", () => {
        const { result, rerender, harness } = setup({ initialSelected: masterRow({}) });
        act(() => result.current.startNew());
        rerender();
        expect(harness.selected).toBeNull();
        expect(harness.form).toEqual(emptyForm());
    });
});

describe("useMasterFormActions: handleSave validation", () => {
    it("does nothing (no save call) for a blank name", async () => {
        const { result } = setup({ initialForm: { ...emptyForm(), name: "   " } });
        await act(async () => result.current.handleSave());
        expect(result.current.error).toBeNull();
    });

    it("sets a numeric-validation error and does not call save", async () => {
        const columns = [col({ FieldId: "qty", Kind: "Number" })];
        const { result, harness } = setup({
            columns,
            initialForm: { ...emptyForm(), name: "Acme", extra: { qty: "abc" } },
        });
        await act(async () => result.current.handleSave());
        expect(result.current.error).toBe("masters.error.invalidNumber");
        expect(harness.save).not.toHaveBeenCalled();
    });

    it("rejects a duplicate name (case/whitespace-insensitive) against another row in cacheRows", async () => {
        const { result, harness } = setup({
            cacheRows: [masterRow({ MasterId: "other", Name: "  Acme  " })],
            initialForm: { ...emptyForm(), name: "acme" },
        });
        await act(async () => result.current.handleSave());
        expect(result.current.error).toBe("masters.error.duplicateName");
        expect(harness.save).not.toHaveBeenCalled();
    });

    it("an unchanged rename (same MasterId) is not flagged as a duplicate", async () => {
        const { result, harness } = setup({
            cacheRows: [masterRow({ MasterId: "m1", Name: "Acme" })],
            initialSelected: masterRow({ MasterId: "m1", Name: "Acme" }),
            initialForm: { ...emptyForm(), name: "Acme" },
        });
        await act(async () => result.current.handleSave());
        expect(result.current.error).toBeNull();
        expect(harness.save).toHaveBeenCalledTimes(1);
    });
});

describe("useMasterFormActions: handleSave success path", () => {
    it("calls save with the built draft, then resets to a new blank form (not re-selecting the saved row)", async () => {
        const { result, harness } = setup({
            initialForm: { ...emptyForm(), name: "New Co" },
        });
        await act(async () => result.current.handleSave());
        expect(harness.save).toHaveBeenCalledWith(
            expect.objectContaining({ MasterKind: "Party", Name: "New Co" }),
        );
        expect(harness.selected).toBeNull();
        expect(harness.form).toEqual(emptyForm());
    });

    it("includes the existing MasterId and IsActive when editing a selected row", async () => {
        const { result, harness } = setup({
            initialSelected: masterRow({ MasterId: "m1", IsActive: false }),
            initialForm: { ...emptyForm(), name: "Acme" },
        });
        await act(async () => result.current.handleSave());
        expect(harness.save).toHaveBeenCalledWith(
            expect.objectContaining({ MasterId: "m1", IsActive: false }),
        );
    });

    it("saving flips true then back to false around the async save call", async () => {
        let resolveSave: (row: MasterRow) => void = () => undefined;
        const { result, harness } = setup({
            initialForm: { ...emptyForm(), name: "Acme" },
            saveImpl: () => new Promise((resolve) => { resolveSave = resolve; }),
        });
        let savePromise!: Promise<void>;
        act(() => {
            savePromise = result.current.handleSave();
        });
        expect(result.current.saving).toBe(true);
        await act(async () => {
            resolveSave(masterRow({}));
            await savePromise;
        });
        expect(result.current.saving).toBe(false);
        expect(harness.save).toHaveBeenCalledTimes(1);
    });
});

describe("useMasterFormActions: handleDelete", () => {
    it("does nothing when nothing is selected", async () => {
        const { result, harness } = setup({});
        await act(async () => result.current.handleDelete());
        expect(harness.remove).not.toHaveBeenCalled();
    });

    it("removes the selected row's MasterId then resets to a new blank form", async () => {
        const { result, harness } = setup({ initialSelected: masterRow({ MasterId: "m1" }) });
        await act(async () => result.current.handleDelete());
        expect(harness.remove).toHaveBeenCalledWith("m1");
        expect(harness.selected).toBeNull();
        expect(harness.form).toEqual(emptyForm());
    });
});
