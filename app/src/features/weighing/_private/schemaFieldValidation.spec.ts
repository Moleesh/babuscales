import { describe, expect, it } from "vitest";

import type { FormulaContext } from "@engines/formulaEngine";
import { fromInt } from "@engines/formulaEngine/Decimal";
import type { Field, ValidationRule } from "@engines/schemaEngine";

import {
    evaluateFieldVisible,
    failingValidationRules,
    hasBlockingCustomFieldError,
} from "./schemaFieldValidation";

describe("evaluateFieldVisible", () => {
    it("returns true when Visible is undefined", () => {
        const field: Field = {
            FieldId: "test",
            Kind: "Text",
            Label: { en: "Test" },
        };
        expect(evaluateFieldVisible(field)).toBe(true);
    });

    it("returns true when Visible is true", () => {
        const field: Field = {
            FieldId: "test",
            Kind: "Text",
            Label: { en: "Test" },
            Visible: true,
        };
        expect(evaluateFieldVisible(field)).toBe(true);
    });

    it("returns false when Visible is false", () => {
        const field: Field = {
            FieldId: "test",
            Kind: "Text",
            Label: { en: "Test" },
            Visible: false,
        };
        expect(evaluateFieldVisible(field)).toBe(false);
    });
});

describe("failingValidationRules: pass/fail evaluation", () => {
    it("returns empty array when rules is undefined", () => {
        const ctx: FormulaContext = { getVariable: () => "" };
        expect(failingValidationRules(undefined, ctx)).toEqual([]);
    });

    it("returns empty array when all rules pass (formulas evaluate to true)", () => {
        const rules: ValidationRule[] = [
            {
                Formula: "Gross > 50",
                Severity: "Warn",
                Message: { en: "Gross should be > 50" },
            },
            {
                Formula: "Net > 0",
                Severity: "Block",
                Message: { en: "Net must be > 0" },
            },
        ];
        const ctx: FormulaContext = {
            getVariable: (name: string) => {
                if (name === "Gross") return fromInt(100);
                if (name === "Net") return fromInt(50);
                return fromInt(0);
            },
        };
        expect(failingValidationRules(rules, ctx)).toEqual([]);
    });

    it("returns failing rules (formulas that evaluate to false)", () => {
        const rule1: ValidationRule = {
            Formula: "Gross > 100",
            Severity: "Warn",
            Message: { en: "Gross should be > 100" },
        };
        const rule2: ValidationRule = {
            Formula: "Net > 50",
            Severity: "Block",
            Message: { en: "Net must be > 50" },
        };
        const rules = [rule1, rule2];
        const ctx: FormulaContext = {
            getVariable: (name: string) => {
                if (name === "Gross") return fromInt(50); // fails first rule
                if (name === "Net") return fromInt(100); // passes second rule
                return fromInt(0);
            },
        };
        const result = failingValidationRules(rules, ctx);
        expect(result).toEqual([rule1]);
    });
});

describe("failingValidationRules: broken formula handling", () => {
    it("treats a broken rule formula as not failing (silently inert)", () => {
        const goodRule: ValidationRule = {
            Formula: "Gross > 50",
            Severity: "Warn",
            Message: { en: "Gross should be > 50" },
        };
        const brokenRule: ValidationRule = {
            Formula: "InvalidFunction()",
            Severity: "Block",
            Message: { en: "Broken rule" },
        };
        const rules = [goodRule, brokenRule];
        const ctx: FormulaContext = { getVariable: () => fromInt(30) };
        const result = failingValidationRules(rules, ctx);
        // Only goodRule should be in the result (it fails)
        expect(result).toEqual([goodRule]);
    });
});

describe("failingValidationRules: multiple rules", () => {
    it("includes multiple failing rules in result", () => {
        const rule1: ValidationRule = {
            Formula: "Gross > 100",
            Severity: "Warn",
            Message: { en: "Rule 1" },
        };
        const rule2: ValidationRule = {
            Formula: "Net > 50",
            Severity: "Block",
            Message: { en: "Rule 2" },
        };
        const rule3: ValidationRule = {
            Formula: "Tare > 10",
            Severity: "Warn",
            Message: { en: "Rule 3" },
        };
        const rules = [rule1, rule2, rule3];
        const ctx: FormulaContext = {
            getVariable: (name: string) => {
                if (name === "Gross") return fromInt(50); // fails
                if (name === "Net") return fromInt(30); // fails
                if (name === "Tare") return fromInt(20); // passes
                return fromInt(0);
            },
        };
        const result = failingValidationRules(rules, ctx);
        expect(result).toEqual([rule1, rule2]);
    });
});

describe("hasBlockingCustomFieldError: visibility interaction", () => {
    it("returns false when no fields are provided", () => {
        const ctx: FormulaContext = { getVariable: () => "" };
        expect(hasBlockingCustomFieldError([], ctx)).toBe(false);
    });

    it("returns false when no visible fields have blocking validation errors", () => {
        const fields: Field[] = [
            {
                FieldId: "field1",
                Kind: "Text",
                Label: { en: "Field 1" },
                Visible: true,
                Validate: [
                    {
                        Formula: "1 > 0",
                        Severity: "Warn",
                        Message: { en: "Warning only" },
                    },
                ],
            },
        ];
        const ctx: FormulaContext = { getVariable: () => fromInt(0) };
        expect(hasBlockingCustomFieldError(fields, ctx)).toBe(false);
    });

    it("returns true when a visible field has a blocking validation error", () => {
        const fields: Field[] = [
            {
                FieldId: "field1",
                Kind: "Text",
                Label: { en: "Field 1" },
                Visible: undefined, // visible by default
                Validate: [
                    {
                        Formula: "1 < 0", // fails
                        Severity: "Block",
                        Message: { en: "Blocking error" },
                    },
                ],
            },
        ];
        const ctx: FormulaContext = { getVariable: () => "" };
        expect(hasBlockingCustomFieldError(fields, ctx)).toBe(true);
    });
});

describe("hasBlockingCustomFieldError: hidden-field handling", () => {
    it("ignores blocking errors on hidden fields", () => {
        const fields: Field[] = [
            {
                FieldId: "field1",
                Kind: "Text",
                Label: { en: "Field 1" },
                Visible: false,
                Validate: [
                    {
                        Formula: "1 < 0",
                        Severity: "Block",
                        Message: { en: "Blocking error on hidden field" },
                    },
                ],
            },
        ];
        const ctx: FormulaContext = { getVariable: () => "" };
        expect(hasBlockingCustomFieldError(fields, ctx)).toBe(false);
    });
});

describe("hasBlockingCustomFieldError: multiple fields, some hidden", () => {
    it("returns false when all blocking errors are on hidden fields", () => {
        const fields: Field[] = [
            {
                FieldId: "field1",
                Kind: "Text",
                Label: { en: "Field 1" },
                Visible: false,
                Validate: [
                    {
                        Formula: "1 < 0",
                        Severity: "Block",
                        Message: { en: "Error on hidden field" },
                    },
                ],
            },
            {
                FieldId: "field2",
                Kind: "Text",
                Label: { en: "Field 2" },
                Visible: true,
                Validate: [
                    {
                        Formula: "1 > 0", // passes
                        Severity: "Block",
                        Message: { en: "No error on visible field" },
                    },
                ],
            },
        ];
        const ctx: FormulaContext = { getVariable: () => "" };
        expect(hasBlockingCustomFieldError(fields, ctx)).toBe(false);
    });
});

describe("hasBlockingCustomFieldError: multiple fields, all visible", () => {
    it("returns true when multiple visible fields have blocking errors", () => {
        const fields: Field[] = [
            {
                FieldId: "field1",
                Kind: "Text",
                Label: { en: "Field 1" },
                Validate: [
                    {
                        Formula: "1 < 0",
                        Severity: "Block",
                        Message: { en: "Error 1" },
                    },
                ],
            },
            {
                FieldId: "field2",
                Kind: "Text",
                Label: { en: "Field 2" },
                Validate: [
                    {
                        Formula: "1 < 0",
                        Severity: "Block",
                        Message: { en: "Error 2" },
                    },
                ],
            },
        ];
        const ctx: FormulaContext = { getVariable: () => "" };
        expect(hasBlockingCustomFieldError(fields, ctx)).toBe(true);
    });
});

describe("hasBlockingCustomFieldError: severity filtering", () => {
    it("ignores warning-severity validation failures", () => {
        const fields: Field[] = [
            {
                FieldId: "field1",
                Kind: "Text",
                Label: { en: "Field 1" },
                Validate: [
                    {
                        Formula: "1 < 0",
                        Severity: "Warn",
                        Message: { en: "Warning only" },
                    },
                ],
            },
        ];
        const ctx: FormulaContext = { getVariable: () => "" };
        expect(hasBlockingCustomFieldError(fields, ctx)).toBe(false);
    });
});
